import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { TsError } from "./TsError";

let errorLogPath: string | null = null;

/**
 * Resolve per-workspace structured error log path
 */
function getErrorLogPath(): string | null {
  if (errorLogPath) {return errorLogPath;}

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {return null;}

  const logDir = path.join(workspaceFolders[0].uri.fsPath, ".acd-logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  errorLogPath = path.join(logDir, "errors.json");
  return errorLogPath;
}

/**
 * Save structured error into JSON file
 */
export function saveErrorToJson(error: TsError) {
  try {
    const file = getErrorLogPath();
    if (!file) {return;}

    let data: TsError[] = [];
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      data = JSON.parse(raw || "[]");
    }
    data.push(error);

    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write JSON error:", err);
  }
}

/**
 * Clear all structured errors
 */
export function clearJsonLog() {
  try {
    const file = getErrorLogPath();
    if (!file) {return;}

    fs.writeFileSync(file, "[]", "utf8");
  } catch (err) {
    console.error("Failed to clear log file:", err);
  }
}
