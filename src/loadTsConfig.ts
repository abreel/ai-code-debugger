import * as ts from "typescript";
import * as path from "path";

export function loadTsConfig(rootPath: string): ts.ParsedCommandLine {
  const configPath = ts.findConfigFile(rootPath, ts.sys.fileExists, "tsconfig.json");

  let parsed: ts.ParsedCommandLine;

  if (configPath) {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) throw new Error("Failed to read tsconfig.json");
    parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
  } else {
    parsed = {
      options: {
        noEmit: true,
        strict: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.Node16,
        jsx: ts.JsxEmit.ReactJSX,
        lib: ["ES2022", "dom"],
        moduleResolution: ts.ModuleResolutionKind.Node16
      },
      fileNames: [],
      errors: []
    };
  }

  // 👇 Force TypeScript to resolve libs correctly
  parsed.options.lib = parsed.options.lib ?? ["ES2022"];
  parsed.options.noEmit = true;
  parsed.options.configFilePath = configPath ?? rootPath;

  return parsed;
}
