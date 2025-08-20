import * as fs from "fs";
import * as path from "path";
import { IGNORED_DIRS } from "./config";

// Recursively get files
export function getAllFiles(dir: string, exts: string[] = [".ts", ".tsx"], files: string[] = []): string[] {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (IGNORED_DIRS.includes(entry.name)) {continue;}
			getAllFiles(fullPath, exts, files);
		} else if (exts.includes(path.extname(entry.name))) {
			files.push(fullPath);
		}
	}
	return files;
}
