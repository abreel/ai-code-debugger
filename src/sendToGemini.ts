import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as vscode from "vscode";
import { TsError } from "./TsError";
import { GeminiSidebarProvider } from "./GeminiSidebarProvider";
import { log } from "./log";
import { saveErrorToJson } from "./saveErrorToJson";


export const MAX_ERRORS_PER_REQUEST = 5;
export const MAX_CONTENT_LENGTH = 100000;

export function delay(ms: number) {
	return new Promise(res => setTimeout(res, ms));
}

// Send errors to Gemini
export async function sendToGemini(
	ai: GoogleGenerativeAI,
	file: string,
	errors: TsError[],
	sidebarProvider?: GeminiSidebarProvider,
	maxRetries = 3,
	throttleMs = 1000): Promise<void> {
	const limitedErrors = errors.slice(0, MAX_ERRORS_PER_REQUEST);
	const errorText = limitedErrors.map(e => `${e.code} at ${e.line}:${e.column} - ${e.message}`).join("\n");

	if (errorText.length > MAX_CONTENT_LENGTH) {
		log(`⏭️ Skipping ${file} - content too large (${errorText.length} chars)`, false, sidebarProvider);
		return;
	}

	log(`⏳ Sending ${file} to Gemini...`, false, sidebarProvider);
	const contents = `File: ${file}\nErrors:\n${errorText}`;

	let attempt = 0;

	while (attempt <= maxRetries) {
		try {
			const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
			const result = await model.generateContent({
				contents: [{ role: "user", parts: [{ text: `Return JSON only:\n${contents}` }] }]
			});

			const responseText = result.response.text();

			let parsed: { updatedCode?: string; explanation?: string; errors?: any[]; } = {};

			try {
				parsed = JSON.parse(responseText);
			} catch {
				const cleaned = responseText.replace(/```json\s*/, "").replace(/```$/, "").trim();
				try { parsed = JSON.parse(cleaned); }
				catch (err) {
					log(`⚠️ Failed to parse JSON for ${file}: ${err}`, false, sidebarProvider);
				}
			}

			if (!parsed) {
				throw new Error(`Gemini returned invalid JSON for ${file}: ${responseText}`);
			}

			if (parsed.errors && parsed.errors.length > 0) {
				log(`⚠️ Gemini reported TypeScript errors for ${file}:\n${JSON.stringify(parsed.errors, null, 2)}`, false, sidebarProvider);
			}

			if (parsed.updatedCode) {
				fs.writeFileSync(file, parsed.updatedCode, "utf8");
				vscode.window.showInformationMessage(`✅ Updated file: ${file}`);
				log(`✅ Updated file: ${file}`, false, sidebarProvider);

				// Save structured errors
				errors.forEach(err => {
					saveErrorToJson({
						...err,
						file,
						fixed: true,
						timestamp: new Date().toISOString()
					});
				});
			} else {
				log(`⚠️ No update for: ${file}`, true, sidebarProvider);
				errors.forEach(err => {
					saveErrorToJson({
						...err,
						file,
						fixed: false,
						timestamp: new Date().toISOString()
					});
				});
			}

			await delay(throttleMs);
			return;

		} catch (err: any) {
			attempt++;
			const waitTime = Math.pow(2, attempt) * 1000;
			const isRateLimit = err.message.toLowerCase().includes("rate limit");

			log(`⚠️ Gemini error for ${file}: ${err.message} (attempt ${attempt}/${maxRetries})`, false, sidebarProvider);

			if (!isRateLimit || attempt > maxRetries) {
				throw err;
			}

			log(`⏳ Rate limit hit. Retrying ${file} after ${waitTime / 1000}s...`, false, sidebarProvider);
			await delay(waitTime);
		}
	}
}
