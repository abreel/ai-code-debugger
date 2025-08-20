import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { runFix } from "./extension";
import { logFilePath, stopRequested, showFullPath, setLogFilePath, requestStop, setShowFullPath } from "./config";
import { TsError } from "./TsError";
import { GeminiSidebarProvider } from "./GeminiSidebarProvider";
import { getWorkspaceLogFile } from "./getWorkspaceLogFile";
import { clearJsonLog } from "./saveErrorToJson";

// ---------------------------
// Activate
// ---------------------------

export function activate(context: vscode.ExtensionContext): void {
	const sidebarProvider = new GeminiSidebarProvider();
	vscode.window.registerTreeDataProvider("geminiLogs", sidebarProvider);

	// Workspace-specific log file
	setLogFilePath(getWorkspaceLogFile());
	if (!fs.existsSync(logFilePath)) {
		fs.writeFileSync(logFilePath, "[]", "utf8");
	}

	// Commands
	context.subscriptions.push(
		vscode.commands.registerCommand("fixTsErrors.run", async () => {
			requestStop(false);
			sidebarProvider.setRunning(true);
			sidebarProvider.addLog("🚀 Starting TypeScript error fix...");
			await runFix(sidebarProvider);
			sidebarProvider.setRunning(false);
			sidebarProvider.addLog("✅ Finished processing errors.");
			sidebarProvider.refresh();
		}),

		vscode.commands.registerCommand("fixTsErrors.stop", () => {
			requestStop(true);
			sidebarProvider.setRunning(false);
			sidebarProvider.addLog("🛑 Stop requested.");
			sidebarProvider.refresh();
		}),

		vscode.commands.registerCommand("fixTsErrors.clearLogs", () => {
			clearJsonLog();
			sidebarProvider.addLog("🗑️ Logs cleared.");
			sidebarProvider.refresh();
		}),

		vscode.commands.registerCommand("fixTsErrors.togglePathDisplay", () => {
			setShowFullPath(!showFullPath);
			sidebarProvider.refresh();
		}),

		vscode.commands.registerCommand("fixTsErrors.exportLogs", () => {
			if (!fs.existsSync(logFilePath)) {
				vscode.window.showErrorMessage("No logs to export.");
				return;
			}
			const data: TsError[] = JSON.parse(fs.readFileSync(logFilePath, "utf8"));
			const md = ["# TypeScript Error Report", ""];
			for (const err of data) {
				md.push(`- **${err.file}:${err.line}:${err.column}** \`${err.code}\` - ${err.message} (${err.fixed ? "✅ Fixed" : "⚠️ Unfixed"})`);
			}
			const exportPath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, "ts-error-report.md");
			fs.writeFileSync(exportPath, md.join("\n"), "utf8");
			vscode.window.showInformationMessage(`📤 Exported logs to ${exportPath}`);
		}),

		vscode.commands.registerCommand("fixTsErrors.openError", (error: TsError) => {
			if (!error.file) {return;}
			vscode.workspace.openTextDocument(error.file).then(doc => {
				vscode.window.showTextDocument(doc).then(editor => {
					const pos = new vscode.Position(error.line - 1, error.column - 1);
					editor.selection = new vscode.Selection(pos, pos);
					editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
				});
			});
		})
	);
}
export function deactivate(): void { }
