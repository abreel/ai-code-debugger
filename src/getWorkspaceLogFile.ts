import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

// ---------------------------
// Workspace log path
// ---------------------------
export function getWorkspaceLogFile(): string {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) return "";
	const workspaceRoot = workspaceFolders[0].uri.fsPath;

	// Ensure .vscode folder exists
	const vscodeDir = path.join(workspaceRoot, ".vscode");
	if (!fs.existsSync(vscodeDir)) {
		fs.mkdirSync(vscodeDir, { recursive: true });
	}

	// Ensure .gitignore ignores it
	const gitignorePath = path.join(workspaceRoot, ".gitignore");
	try {
		if (fs.existsSync(gitignorePath)) {
			const content = fs.readFileSync(gitignorePath, "utf8");
			if (!content.includes("ts-error-logs.json")) {
				fs.appendFileSync(gitignorePath, "\n.vscode/ts-error-logs.json\n");
			}
		} else {
			fs.writeFileSync(gitignorePath, ".vscode/ts-error-logs.json\n");
		}
	} catch (err) {
		console.error("Could not update .gitignore:", err);
	}

	return path.join(vscodeDir, "ts-error-logs.json");
}
