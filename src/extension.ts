import * as vscode from "vscode";
import * as ts from "typescript";
import * as fs from "fs";
import { GeminiSidebarProvider } from "./GeminiSidebarProvider";
import { log } from "./log";
import { createAiClient } from "./createAiClient";
import { getAllFiles } from "./getAllFiles";
import { sendToGemini } from "./sendToGemini";
import { TsError } from "./TsError";
import { stopRequested, statusBar, IGNORED_DIRS } from "./config";



// Main run function
export async function runFix(sidebarProvider?: GeminiSidebarProvider): Promise<void> {
	const ai = createAiClient();
	if (!ai) {return;}

	statusBar.text = "ACD: Running";

	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		const msg = "❌ No workspace open.";
		vscode.window.showErrorMessage(msg);
		log(msg, true, sidebarProvider);
		statusBar.text = "ACD: Idle";
		return;
	}

	const rootPath = workspaceFolders[0].uri.fsPath;
	const files = getAllFiles(rootPath);
	const program = ts.createProgram(files, { noEmit: true });

	try {
		for (const sourceFile of program.getSourceFiles()) {
			if (stopRequested) {
				const stopMsg = "🛑 TypeScript fix stopped by user.";
				log(stopMsg, true, sidebarProvider);
				break;
			}

			if (IGNORED_DIRS.some((dir) => sourceFile.fileName.includes(`/${dir}/`))) {continue;}

			const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);
			if (!diagnostics.length) {continue;}

			const errors: TsError[] = diagnostics.map((diag) => {
				if (!diag.file || diag.start === undefined) {
					return {
						line: 0,
						column: 0,
						code: `TS${diag.code}`,
						message: ts.flattenDiagnosticMessageText(diag.messageText, "\n"),
						content: "",
						file: sourceFile.fileName
					};
				}

				const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start);
				return {
					line: line + 1,
					column: character + 1,
					code: `TS${diag.code}`,
					message: ts.flattenDiagnosticMessageText(diag.messageText, "\n"),
					content: fs.readFileSync(diag.file.fileName, "utf8"),
					file: diag.file.fileName
				};
			});

			await sendToGemini(ai, sourceFile.fileName, errors, sidebarProvider);
		}
	} catch (err: any) {
		const errMsg = `🛑 Stopped due to Gemini error: ${err.message}`;
		log(errMsg, true, sidebarProvider);
		statusBar.text = "ACD: Idle";
		return;
	}

	const completionMsg = "🎉 All TypeScript errors processed successfully!";
	vscode.window.showInformationMessage(completionMsg);
	log(completionMsg, false, sidebarProvider);
	statusBar.text = "ACD: Idle";
}


