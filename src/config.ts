import * as dotenv from "dotenv";
import * as vscode from "vscode";

dotenv.config();

export const IGNORED_DIRS = [".next", "node_modules", "dist"];
export const MAX_ERRORS_PER_REQUEST = 5;
export const MAX_CONTENT_LENGTH = 100000;
// Track user settings

export let showFullPath = false;
export function setShowFullPath(show = false) {
    showFullPath = show;
}
// Output channel

export const outputChannel = vscode.window.createOutputChannel("AI Code Debugger (ACD)");
// Status bar
export const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
statusBar.text = "ACD: Idle";
statusBar.show();

export let stopRequested = false;
export let logFilePath: string;
export function requestStop(stop: boolean = true) {
	stopRequested = stop;
}
export function setLogFilePath(path: string) {
	logFilePath = path;
}
