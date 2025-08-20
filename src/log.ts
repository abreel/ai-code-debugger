import * as vscode from "vscode";
import { outputChannel, logFilePath } from "./config";
import { getNotificationSetting } from "./createAiClient";
import { GeminiSidebarProvider } from "./GeminiSidebarProvider";
import * as fs from "fs";

// Logging helper
export function log(
  message: string,
  critical = false,
  sidebarProvider?: GeminiSidebarProvider
) {
  const notify = getNotificationSetting();

  // VS Code notifications
  if (critical) {
    vscode.window.showInformationMessage(message);
  }
  if (notify === "always" || (notify === "auto" && critical)) {
    outputChannel.show();
  }
  outputChannel.appendLine(message);

  // Forward to sidebar
  sidebarProvider?.addLog(message);

  // --- Persist to workspace log file ---
  try {
    if (logFilePath) {
      fs.appendFileSync(logFilePath, message + "\n", "utf8");
    }
  } catch (err) {
    console.error("Failed to write log:", err);
  }
}
