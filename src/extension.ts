import * as vscode from "vscode";
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ✅ Load .env file in dev mode
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

function getGeminiApiKey(): string | undefined {
	// ✅ First check VS Code config
	const config = vscode.workspace.getConfiguration("gemini");
	const settingKey = config.get<string>("apiKey");

	// ✅ Fallback to .env for dev
	return settingKey || process.env.GEMINI_API_KEY;
}

function createAiClient(): GoogleGenerativeAI | null {
	const apiKey = getGeminiApiKey();
	if (!apiKey) {
		vscode.window.showErrorMessage(
			"❌ Gemini API key not set. Please configure 'gemini.apiKey' in settings."
		);
		return null;
	}
	return new GoogleGenerativeAI(apiKey);
}

function getAllFiles(
	dir: string,
	exts: string[] = [".ts", ".tsx"],
	files: string[] = []
): string[] {
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

async function sendToGemini(file: string, errors: TsError[]): Promise<void> {
	const ai = createAiClient();
	if (!ai) return;

	const limitedErrors = errors.slice(0, MAX_ERRORS_PER_REQUEST);
	const errorText = limitedErrors
		.map(
			(e) =>
				`${e.code} at ${e.line}:${e.column} - ${e.message}\nContext:\n${e.content}`
		)
		.join("\n\n");

	if (errorText.length > MAX_CONTENT_LENGTH) {
		vscode.window.showWarningMessage(`⏭️ Skipping ${file} (too large)`);
		return;
	}

	const contents = `File: ${file}\nErrors:\n${errorText}`;

	try {
		const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

		const result = await model.generateContent({
			contents: [
				{
					role: "user",
					parts: [
						{
							text: `
Return a JSON object ONLY:

{
  "updatedCode": "<full updated code ONLY>",
  "explanation": "<additional explanation or notes>"
}

Errors and file context:
${contents}
							`,
						},
					],
				},
			],
		});

		const responseText = result.response.text();
		let parsed: { updatedCode?: string; explanation?: string } = {};

		try {
			parsed = JSON.parse(responseText);
		} catch {
			const cleaned = responseText
				.replace(/```json\s*/, "")
				.replace(/```$/, "")
				.trim();
			parsed = JSON.parse(cleaned);
		}

		if (parsed.updatedCode) {
			fs.writeFileSync(file, parsed.updatedCode, "utf8");
			vscode.window.showInformationMessage(`✅ Updated file: ${file}`);
		} else {
			vscode.window.showWarningMessage(`⚠️ No update for: ${file}`);
		}
	} catch (err: any) {
		vscode.window.showErrorMessage(`❌ Gemini error: ${err.message}`);
	}
}

async function runFix(): Promise<void> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		vscode.window.showErrorMessage("No workspace open.");
		return;
	}

	const rootPath = workspaceFolders[0].uri.fsPath;
	const files = getAllFiles(rootPath);
	const program = ts.createProgram(files, { noEmit: true });

	for (const sourceFile of program.getSourceFiles()) {
		if (
			IGNORED_DIRS.some((dir) => sourceFile.fileName.includes(`/${dir}/`))
		)
			continue;

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

			const { line, character } = diag.file.getLineAndCharacterOfPosition(
				diag.start
			);
			return {
				line: line + 1,
				column: character + 1,
				code: `TS${diag.code}`,
				message: ts.flattenDiagnosticMessageText(diag.messageText, "\n"),
				content: fs.readFileSync(diag.file.fileName, "utf8"),
			};
		});

		await sendToGemini(sourceFile.fileName, errors);
	}

	vscode.window.showInformationMessage(
		"✅ Finished processing TypeScript errors."
	);
}

export function activate(context: vscode.ExtensionContext): void {
	const disposable = vscode.commands.registerCommand(
		"fixTsErrors.run",
		runFix
	);
	context.subscriptions.push(disposable);
}

export function deactivate(): void { }
