import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { showFullPath, logFilePath } from "./config";
import { TsError } from "./TsError";
function readErrors(): TsError[] {
  try {
    if (!fs.existsSync(logFilePath)) {return [];}
    const raw = fs.readFileSync(logFilePath, "utf8").trim();
    if (!raw) {return [];}
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse log file:", err);
    return [];
  }
}


// ---------------------------
// Sidebar Provider (With Dividers)
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

	// Helper: Create a divider row
	private createDivider(): vscode.TreeItem {
		const divider = new vscode.TreeItem("━━━━━━━━━━━━━━━━━━━━", vscode.TreeItemCollapsibleState.None);
		divider.command = undefined;
		divider.tooltip = undefined;
		divider.iconPath = undefined; // no icon
		return divider;
	}

	getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
		const items: vscode.TreeItem[] = [];

		// Root level
		if (!element) {
			// --- Status ---
			const statusItem = new vscode.TreeItem(
				this.running ? "Status: 🟢 Running" : "Status: Idle",
				vscode.TreeItemCollapsibleState.None
			);
			statusItem.iconPath = new vscode.ThemeIcon(this.running ? "debug-start" : "debug-stop");
			items.push(statusItem);

			items.push(this.createDivider()); // divider

			// --- Summary ---
			const summary = new vscode.TreeItem("Summary", vscode.TreeItemCollapsibleState.Expanded);
			summary.iconPath = new vscode.ThemeIcon("graph");
			(summary as any).summary = true;
			items.push(summary);

			items.push(this.createDivider()); // divider

			// --- Files with Errors ---
			const filesGroup = new vscode.TreeItem("Errors by File", vscode.TreeItemCollapsibleState.Expanded);
			filesGroup.iconPath = new vscode.ThemeIcon("folder");
			(filesGroup as any).filesGroup = true;
			items.push(filesGroup);
		}

		// Summary section
		else if ((element as any).summary) {
			if (!fs.existsSync(logFilePath)) {return [];}
			const data: TsError[] = readErrors();

			const filesCount = new Set(data.map(e => e.file)).size;
			const fixedCount = data.filter(e => e.fixed).length;
			const unfixedCount = data.length - fixedCount;

			return [
				new vscode.TreeItem(`Files: ${filesCount}`),
				new vscode.TreeItem(`Total Errors: ${data.length}`),
				new vscode.TreeItem(`Fixed: ${fixedCount}`),
				new vscode.TreeItem(`Unfixed: ${unfixedCount}`)
			];
		}

		// Errors by file section
		else if ((element as any).filesGroup) {
			if (!fs.existsSync(logFilePath)) {return [];}
			const data: TsError[] = readErrors();

			const grouped = new Map<string, TsError[]>();
			data.forEach(err => {
				if (!err.file) {return;}
				if (!grouped.has(err.file)) {grouped.set(err.file, []);}
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
