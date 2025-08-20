import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

/**
 * Returns the per-workspace log file path.
 * Creates `.acd-logs` if it doesn't exist.
 */
export function getWorkspaceLogFile(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    // fallback to user home directory if no workspace
    const homeDir = process.env.HOME || process.env.USERPROFILE || ".";
    const fallbackDir = path.join(homeDir, ".acd-logs");
    if (!fs.existsSync(fallbackDir)) {fs.mkdirSync(fallbackDir, { recursive: true });}
    return path.join(fallbackDir, "extension.log");
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const logDir = path.join(rootPath, ".acd-logs");

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  return path.join(logDir, "extension.log");
}
