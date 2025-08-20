import { GoogleGenerativeAI } from "@google/generative-ai";
import * as vscode from "vscode";
import { log } from "./log";

// Notification setting

export function getNotificationSetting(): "auto" | "always" | "never" {
	const config = vscode.workspace.getConfiguration("aiCodeDebugger");
	const setting = config.get<string>("geminiNotifications") || "auto";
	return ["auto", "always", "never"].includes(setting) ? (setting as any) : "auto";
}
// Get Gemini API key
function getGeminiApiKey(): string | undefined {
	const config = vscode.workspace.getConfiguration("aiCodeDebugger");
	return config.get<string>("geminiApiKey") || process.env.GEMINI_API_KEY;
}
// Create AI client
export function createAiClient(): GoogleGenerativeAI | null {
	const geminiApiKey = getGeminiApiKey();
	if (!geminiApiKey) {
		vscode.window.showErrorMessage(
			"❌ Gemini API key not set. Please configure 'aiCodeDebugger.geminiApiKey' in settings."
		);
		log("❌ Gemini API key not set. Stopping execution.", true);
		return null;
	}
	return new GoogleGenerativeAI(geminiApiKey);
}
