import * as fs from "fs";
import { logFilePath } from "./config";
import { TsError } from "./TsError";

// Save structured errors to JSON
export function saveErrorToJson(error: TsError) {
	try {
		let data: TsError[] = [];
		if (fs.existsSync(logFilePath)) {
			const raw = fs.readFileSync(logFilePath, "utf8");
			data = JSON.parse(raw || "[]");
		}
		data.push(error);
		fs.writeFileSync(logFilePath, JSON.stringify(data, null, 2), "utf8");
	} catch (err) {
		console.error("Failed to write JSON error:", err);
	}
}
// Clear all logs
export function clearJsonLog() {
	try {
		fs.writeFileSync(logFilePath, "[]", "utf8");
	} catch (err) {
		console.error("Failed to clear log file:", err);
	}
}
