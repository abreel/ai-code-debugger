// tsconfigLoader.ts
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import ts from "typescript";

export function getWorkspaceTsConfig(): string | null {
	if (!vscode.workspace.workspaceFolders) return null;
	const root = vscode.workspace.workspaceFolders[0].uri.fsPath;
	const tsconfigPath = path.join(root, "tsconfig.json");
	return fs.existsSync(tsconfigPath) ? tsconfigPath : null;
}

export function createProgramFromWorkspace(): ts.Program {
	const tsconfigPath = getWorkspaceTsConfig();
	if (!tsconfigPath) {
		throw new Error("No workspace tsconfig.json found");
	}

	const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
	if (configFile.error) {
		throw new Error(ts.formatDiagnosticsWithColorAndContext([configFile.error], {
			getCurrentDirectory: ts.sys.getCurrentDirectory,
			getCanonicalFileName: f => f,
			getNewLine: () => ts.sys.newLine,
		}));
	}

	const parsedConfig = ts.parseJsonConfigFileContent(
		configFile.config,
		ts.sys,
		path.dirname(tsconfigPath)
	);

	return ts.createProgram({
		rootNames: parsedConfig.fileNames,
		options: parsedConfig.options,
	});
}

export function createProgramFromTsConfig(tsconfigPath: string): ts.Program {
	const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(
		tsconfigPath,
		{},
		{
			...ts.sys,
			onUnRecoverableConfigFileDiagnostic: diag => {
				console.error(ts.formatDiagnostic(diag, {
					getCurrentDirectory: ts.sys.getCurrentDirectory,
					getCanonicalFileName: f => f,
					getNewLine: () => ts.sys.newLine,
				}));
			},
		}
	);

	if (!parsedCommandLine) {
		throw new Error("Failed to parse tsconfig.json");
	}

	return ts.createProgram({
		rootNames: parsedCommandLine.fileNames,
		options: parsedCommandLine.options,
		projectReferences: parsedCommandLine.projectReferences,
	});
}
