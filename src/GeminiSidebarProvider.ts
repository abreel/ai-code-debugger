import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { showFullPath, logFilePath } from "./config";
import { TsError } from "./TsError";

// Small helper for creating items
function makeItem(
  label: string,
  icon: string,
  collapsible: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
  command?: vscode.Command
): vscode.TreeItem {
  const item = new vscode.TreeItem(label, collapsible);
  item.iconPath = new vscode.ThemeIcon(icon);
  if (command) item.command = command;
  return item;
}

export class GeminiSidebarProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private logs: string[] = [];
  private running = false;

  addLog(msg: string) {
    this.logs.push(msg);
    this.refresh();
  }

  setRunning(state: boolean) {
    this.running = state;
    this.refresh();
  }

  getTreeItem(element: vscode.TreeItem) {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (!element) {
      // Root sections
      return [
        makeItem("▶ Controls", "gear", vscode.TreeItemCollapsibleState.Expanded),
        makeItem("📊 Summary", "graph", vscode.TreeItemCollapsibleState.Expanded),
        makeItem("📂 Errors by File", "folder", vscode.TreeItemCollapsibleState.Expanded),
      ];
    }

    // Controls
    if (element.label === "▶ Controls") {
      return [
        makeItem(this.running ? "Stop Fix" : "Start Fix", this.running ? "debug-stop" : "play-circle", vscode.TreeItemCollapsibleState.None, {
          command: this.running ? "fixTsErrors.stop" : "fixTsErrors.run",
          title: "Toggle Run",
        }),
        makeItem("🗑️ Clear Logs", "trash", vscode.TreeItemCollapsibleState.None, { command: "fixTsErrors.clearLogs", title: "Clear Logs" }),
        makeItem("📤 Export Logs", "export", vscode.TreeItemCollapsibleState.None, { command: "fixTsErrors.exportLogs", title: "Export Logs" }),
        makeItem(showFullPath ? "Hide Full Paths" : "Show Full Paths", "symbol-file", vscode.TreeItemCollapsibleState.None, {
          command: "fixTsErrors.togglePathDisplay",
          title: "Toggle Path Display",
        }),
      ];
    }

    // Summary
    if (element.label === "📊 Summary") {
      if (!fs.existsSync(logFilePath)) return [];
      const data: TsError[] = JSON.parse(fs.readFileSync(logFilePath, "utf8"));
      const filesCount = new Set(data.map(e => e.file)).size;
      const fixed = data.filter(e => e.fixed).length;

      return [
        makeItem(`Files: ${filesCount}`, "file"),
        makeItem(`Total Errors: ${data.length}`, "warning"),
        makeItem(`✅ Fixed: ${fixed}`, "check"),
        makeItem(`⚠️ Unfixed: ${data.length - fixed}`, "error"),
      ];
    }

    // Errors by file
    if (element.label === "📂 Errors by File") {
      if (!fs.existsSync(logFilePath)) return [];
      const data: TsError[] = JSON.parse(fs.readFileSync(logFilePath, "utf8"));

      const grouped = new Map<string, TsError[]>();
      data.forEach(err => {
        if (!err.file) return;
        if (!grouped.has(err.file)) grouped.set(err.file, []);
        grouped.get(err.file)!.push(err);
      });

      return [...grouped.entries()].map(([file, errs]) => {
        const label = showFullPath ? file : path.basename(file);
        const fileItem = makeItem(label, "file-code", vscode.TreeItemCollapsibleState.Collapsed);
        (fileItem as any).errors = errs;
        fileItem.tooltip = file;
        return fileItem;
      });
    }

    // Errors inside a file
    if ((element as any).errors) {
      const errs: TsError[] = (element as any).errors;
      return errs.map(e =>
        makeItem(`${e.code} @ ${e.line}:${e.column} - ${e.fixed ? "✅" : "⚠️"}`, e.fixed ? "check" : "error", vscode.TreeItemCollapsibleState.None, {
          command: "fixTsErrors.openError",
          title: "Open Error",
          arguments: [e],
        })
      );
    }

    return [];
  }

  refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }
}
