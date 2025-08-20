import * as vscode from "vscode";
import { outputChannel } from "./config";
import { getNotificationSetting } from "./createAiClient";
import { GeminiSidebarProvider } from "./GeminiSidebarProvider";

// Logging helper
export function log(message: string, critical = false, sidebarProvider?: GeminiSidebarProvider) {
	const notify = getNotificationSetting();
	if (critical) vscode.window.showInformationMessage(message);
	if (notify === "always" || (notify === "auto" && critical)) outputChannel.show();
	outputChannel.appendLine(message);
	sidebarProvider?.addLog(message);
}
