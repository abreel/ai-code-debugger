import * as vscode from "vscode";
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const IGNORED_DIRS = [".next", "node_modules", "dist"];
const MAX_ERRORS_PER_REQUEST = 5;
const MAX_CONTENT_LENGTH = 100000;

// Type for errors
interface TsError {
	line: number;
	column: number;
	code: string;
	message: string;
	content: string;
}

// Output channel
const outputChannel = vscode.window.createOutputChannel("AI Code Debugger");

// Status bar
const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
statusBar.text = "Gemini: Idle";
statusBar.show();

// Notification setting
function getNotificationSetting(): "auto" | "always" | "never" {
	const config = vscode.workspace.getConfiguration("gemini");
	const setting = config.get<string>("notifications") || "auto";
	return ["auto", "always", "never"].includes(setting) ? (setting as any) : "auto";
}

// Logging helper
function log(message: string, critical = false, sidebarProvider?: GeminiSidebarProvider) {
	const notify = getNotificationSetting();
	if (notify === "always" || (notify === "auto" && critical)) outputChannel.show();
	outputChannel.appendLine(message);
	sidebarProvider?.addLog(message);
}

// Get Gemini API key
function getGeminiApiKey(): string | undefined {
	const config = vscode.workspace.getConfiguration("gemini");
	return config.get<string>("apiKey") || process.env.GEMINI_API_KEY;
}

// Create AI client, stop immediately if no API key
function createAiClient(): GoogleGenerativeAI | null {
	const apiKey = getGeminiApiKey();
	if (!apiKey) {
		vscode.window.showErrorMessage(
			"❌ Gemini API key not set. Please configure 'gemini.apiKey' in settings."
		);
		log("❌ Gemini API key not set. Stopping execution.", true);
		return null;
	}
	return new GoogleGenerativeAI(apiKey);
}

// Recursively get files
function getAllFiles(dir: string, exts: string[] = [".ts", ".tsx"], files: string[] = []): string[] {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (IGNORED_DIRS.includes(entry.name)) continue;
			getAllFiles(fullPath, exts, files);
		} else if (exts.includes(path.extname(entry.name))) {
			files.push(fullPath);
		}
	}
	return files;
}

// Send errors to Gemini AI
async function sendToGemini(
	ai: GoogleGenerativeAI,
	file: string,
	errors: TsError[],
	sidebarProvider?: GeminiSidebarProvider,
	maxRetries = 3
): Promise<void> {
	const limitedErrors = errors.slice(0, MAX_ERRORS_PER_REQUEST);
	const errorText = limitedErrors.map(e => `${e.code} at ${e.line}:${e.column} - ${e.message}`).join("\n");

	if (errorText.length > MAX_CONTENT_LENGTH) {
		log(`⏭️ Skipping ${file} - content too large (${errorText.length} chars)`, true, sidebarProvider);
		return;
	}

	log(`⏳ Sending ${file} to Gemini...`, true, sidebarProvider);
	const contents = `File: ${file}\nErrors:\n${errorText}`;

	let attempt = 0;
	while (attempt <= maxRetries) {
		try {
			const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
			const result = await model.generateContent({
				contents: [{ role: "user", parts: [{ text: `Return JSON only:\n${contents}` }] }]
			});

			const responseText = result.response.text();

			// Critical error detection
			if (!responseText || responseText.toLowerCase().includes("error")) {
				throw new Error(`Gemini returned an error for ${file}: ${responseText}`);
			}

			let parsed: { updatedCode?: string; explanation?: string } = {};
			try { parsed = JSON.parse(responseText); }
			catch {
				const cleaned = responseText.replace(/```json\s*/, "").replace(/```$/, "").trim();
				try { parsed = JSON.parse(cleaned); } catch (err) { log(`⚠️ Failed to parse JSON for ${file}: ${err}`, true, sidebarProvider); }
			}

			if (parsed.updatedCode) {
				fs.writeFileSync(file, parsed.updatedCode, "utf8");
				vscode.window.showInformationMessage(`✅ Updated file: ${file}`);
				log(`✅ Updated file: ${file}`, true, sidebarProvider);
			} else {
				log(`⚠️ No update for: ${file}`, true, sidebarProvider);
			}

			// Success — exit retry loop
			return;

		} catch (err: any) {
			attempt++;
			const waitTime = Math.pow(2, attempt) * 1000; // exponential backoff: 2s, 4s, 8s...
			log(`⚠️ Gemini error for ${file}: ${err.message} (attempt ${attempt}/${maxRetries})`, true, sidebarProvider);

			// Stop immediately on critical error (not rate limit)
			if (!err.message.toLowerCase().includes("rate limit") || attempt > maxRetries) {
				throw err;
			}

			// Wait before retrying
			await new Promise(res => setTimeout(res, waitTime));
			log(`⏳ Retrying ${file} after ${waitTime / 1000}s...`, true, sidebarProvider);
		}
	}
}

// Main run function
async function runFix(sidebarProvider?: GeminiSidebarProvider): Promise<void> {
	const ai = createAiClient();
	if (!ai) return; // stop if no API key

	statusBar.text = "Gemini: Running";

	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		vscode.window.showErrorMessage("No workspace open.");
		log("❌ No workspace open.", true, sidebarProvider);
		statusBar.text = "Gemini: Idle";
		return;
	}

	const rootPath = workspaceFolders[0].uri.fsPath;
	const files = getAllFiles(rootPath);
	const program = ts.createProgram(files, { noEmit: true });

	try {
		for (const sourceFile of program.getSourceFiles()) {
			if (IGNORED_DIRS.some((dir) => sourceFile.fileName.includes(`/${dir}/`))) continue;

			const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);
			if (!diagnostics.length) continue;

			const errors: TsError[] = diagnostics.map((diag) => {
				if (!diag.file || diag.start === undefined) {
					return {
						line: 0,
						column: 0,
						code: `TS${diag.code}`,
						message: ts.flattenDiagnosticMessageText(diag.messageText, "\n"),
						content: "",
					};
				}

				const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start);
				return {
					line: line + 1,
					column: character + 1,
					code: `TS${diag.code}`,
					message: ts.flattenDiagnosticMessageText(diag.messageText, "\n"),
					content: fs.readFileSync(diag.file.fileName, "utf8"),
				};
			});

			await sendToGemini(ai, sourceFile.fileName, errors, sidebarProvider);
		}
	} catch (err) {
		sidebarProvider?.addLog("🛑 Stopped due to Gemini error.");
		statusBar.text = "Gemini: Idle";
		return; // stop processing
	}

	statusBar.text = "Gemini: Idle";
}

// Sidebar provider
class GeminiSidebarProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

	private logs: string[] = [];
	private running = false;

	addLog(message: string) {
		this.logs.push(message);
		this._onDidChangeTreeData.fire(undefined);
	}

	setRunning(state: boolean) {
		this.running = state;
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(): vscode.TreeItem[] {
		const items: vscode.TreeItem[] = [];

		// Start/Stop button
		const runItem = new vscode.TreeItem(
			this.running ? "Stop TypeScript Fix" : "Start TypeScript Fix",
			vscode.TreeItemCollapsibleState.None
		);
		runItem.iconPath = new vscode.ThemeIcon(this.running ? "debug-stop" : "play-circle");
		runItem.command = { command: this.running ? "fixTsErrors.stop" : "fixTsErrors.run", title: "Toggle Run" };
		items.push(runItem);

		// Status indicator
		const statusItem = new vscode.TreeItem(`Status: ${this.running ? "Running" : "Idle"}`);
		statusItem.iconPath = new vscode.ThemeIcon(this.running ? "sync~spin" : "circle-outline");
		items.push(statusItem);

		// Logs (newest first)
		for (let i = this.logs.length - 1; i >= 0; i--) {
			const logItem = new vscode.TreeItem(this.logs[i]);
			logItem.iconPath = new vscode.ThemeIcon("debug-console");
			logItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
			items.push(logItem);
		}

		return items;
	}

	refresh() {
		this._onDidChangeTreeData.fire(undefined);
	}
}

// Activate
export function activate(context: vscode.ExtensionContext): void {
	const sidebarProvider = new GeminiSidebarProvider();
	vscode.window.registerTreeDataProvider("geminiLogs", sidebarProvider);

	// Start command
	const runDisposable = vscode.commands.registerCommand("fixTsErrors.run", async () => {
		sidebarProvider.setRunning(true);
		sidebarProvider.addLog("🚀 Starting TypeScript error fix...");
		await runFix(sidebarProvider);
		sidebarProvider.setRunning(false);
		sidebarProvider.addLog("✅ Finished processing TypeScript errors.");
	});

	// Stop command
	const stopDisposable = vscode.commands.registerCommand("fixTsErrors.stop", () => {
		sidebarProvider.setRunning(false);
		sidebarProvider.addLog("🛑 TypeScript fix stopped by user.");
	});

	context.subscriptions.push(runDisposable, stopDisposable);
}

export function deactivate(): void { }
