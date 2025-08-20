import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { showFullPath, logFilePath } from "./config";
import { TsError } from "./TsError";

// ---------------------------
// Sidebar Provider (Improved)
// ---------------------------
export class GeminiSidebarProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

	private logs: string[] = [];
	private running = false;

	addLog(message: string) {
		this.logs.push(message);
		this.refresh();
	}

	setRunning(state: boolean) {
		this.running = state;
		this.refresh();
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
		const items: vscode.TreeItem[] = [];

		// Root level
		if (!element) {
			// --- Controls ---
			const controls = new vscode.TreeItem("▶ Controls", vscode.TreeItemCollapsibleState.Expanded);
			controls.iconPath = new vscode.ThemeIcon("gear");
			(controls as any).controls = true;
			items.push(controls);

			// --- Summary ---
			const summary = new vscode.TreeItem("📊 Summary", vscode.TreeItemCollapsibleState.Expanded);
			summary.iconPath = new vscode.ThemeIcon("graph");
			(summary as any).summary = true;
			items.push(summary);

			// --- Files with Errors ---
			const filesGroup = new vscode.TreeItem("📂 Errors by File", vscode.TreeItemCollapsibleState.Expanded);
			filesGroup.iconPath = new vscode.ThemeIcon("folder");
			(filesGroup as any).filesGroup = true;
			items.push(filesGroup);
		}

		// Controls section
		else if ((element as any).controls) {
			const runItem = new vscode.TreeItem(this.running ? "Stop Fix" : "Start Fix", vscode.TreeItemCollapsibleState.None);
			runItem.iconPath = new vscode.ThemeIcon(this.running ? "debug-stop" : "play-circle");
			runItem.command = { command: this.running ? "fixTsErrors.stop" : "fixTsErrors.run", title: "Toggle Run" };

			const clearItem = new vscode.TreeItem("🗑️ Clear Logs", vscode.TreeItemCollapsibleState.None);
			clearItem.command = { command: "fixTsErrors.clearLogs", title: "Clear Logs" };
			clearItem.iconPath = new vscode.ThemeIcon("trash");

			const exportItem = new vscode.TreeItem("📤 Export Logs (Markdown)", vscode.TreeItemCollapsibleState.None);
			exportItem.command = { command: "fixTsErrors.exportLogs", title: "Export Logs" };
			exportItem.iconPath = new vscode.ThemeIcon("export");

			const togglePathItem = new vscode.TreeItem(showFullPath ? "Hide Full Paths" : "Show Full Paths", vscode.TreeItemCollapsibleState.None);
			togglePathItem.command = { command: "fixTsErrors.togglePathDisplay", title: "Toggle Path Display" };
			togglePathItem.iconPath = new vscode.ThemeIcon("symbol-file");

			return [runItem, clearItem, exportItem, togglePathItem];
		}

		// Summary section
		else if ((element as any).summary) {
			if (!fs.existsSync(logFilePath)) return [];
			const data: TsError[] = JSON.parse(fs.readFileSync(logFilePath, "utf8"));

			const filesCount = new Set(data.map(e => e.file)).size;
			const fixedCount = data.filter(e => e.fixed).length;
			const unfixedCount = data.length - fixedCount;

			return [
				new vscode.TreeItem(`Files: ${filesCount}`),
				new vscode.TreeItem(`Total Errors: ${data.length}`),
				new vscode.TreeItem(`✅ Fixed: ${fixedCount}`),
				new vscode.TreeItem(`⚠️ Unfixed: ${unfixedCount}`)
			];
		}

		// Errors by file section
		else if ((element as any).filesGroup) {
			if (!fs.existsSync(logFilePath)) return [];
			const data: TsError[] = JSON.parse(fs.readFileSync(logFilePath, "utf8"));

			const grouped = new Map<string, TsError[]>();
			data.forEach(err => {
				if (!err.file) return;
				if (!grouped.has(err.file)) grouped.set(err.file, []);
				grouped.get(err.file)!.push(err);
			});

			const fileItems: vscode.TreeItem[] = [];
			for (const [file, errs] of grouped) {
				const label = showFullPath ? file : path.basename(file);
				const fileItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
				fileItem.tooltip = file;
				fileItem.iconPath = new vscode.ThemeIcon("file-code");
				(fileItem as any).errors = errs;
				fileItems.push(fileItem);
			}
			return fileItems;
		}

		// Errors inside a file
		else if ((element as any).errors) {
			const errs: TsError[] = (element as any).errors;
			return errs.map(e => {
				const label = `${e.code} @ ${e.line}:${e.column} - ${e.fixed ? "✅" : "⚠️"}`;
				const errorItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
				errorItem.tooltip = e.message;
				errorItem.iconPath = new vscode.ThemeIcon(e.fixed ? "check" : "error");
				errorItem.command = {
					command: "fixTsErrors.openError",
					title: "Open Error",
					arguments: [e]
				};
				return errorItem;
			});
		}

		return items;
	}

	refresh() {
		this._onDidChangeTreeData.fire(undefined);
	}
}
