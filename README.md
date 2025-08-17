# AI Code Debugger (ACD)

A **VS Code extension** and **Node.js utility** that automatically detects TypeScript/JavaScript errors, sends them to **Google Gemini AI** for analysis, and logs structured results (including suggested fixes) into a JSON file.

Built for developers who want to speed up debugging and keep an organized log of errors.

---

## ✨ Features
- ⚡ Auto-detects **TypeScript/JavaScript** errors in your project
- 🤖 Sends errors to **Google Gemini AI** for instant suggestions and fixes
- 📝 Logs all error contexts and AI responses in a **structured JSON file**
- 📂 Handles large files with **chunking support** (planned)
- 🔑 Supports `.env` for secure API key management
- 🚀 Works both as a **VS Code extension** and a **CLI/Node utility**

---

## 📦 Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/gemini-debugger.git
cd gemini-debugger
````

### 2. Install dependencies

```bash
npm install
```

### 3. Add your Gemini API key

Create a `.env` file in the root of your project:

```env
GEMINI_API_KEY=your_api_key_here
```

---

## ⚙️ Usage

### CLI Mode

Run the debugger directly:

```bash
node gemini-debugger.js
```

Or add it to your `package.json` scripts for easy execution:

```json
"scripts": {
  "gemini-debug": "node gemini-debugger.js"
}
```

Now you can run:

```bash
npm run gemini-debug
```

---

### VS Code Extension

1. Open this repo in **VS Code**
2. Press **F5** to run the extension in a new Extension Development Host
3. The extension will monitor TypeScript/JavaScript errors and process them automatically

---

## 📂 Output

Errors are logged into `gemini-output.json` in the project root:

```json
[
  {
    "file": "/path/to/file.tsx",
    "error": "TS2300: Duplicate identifier 'React'.",
    "suggestion": "Remove duplicate React imports. Keep only one import statement."
  }
]
```

---

## ⚙️ Extension Settings

This extension contributes the following settings:

* `geminiDebugger.enable`: Enable/disable the extension
* `geminiDebugger.maxErrorsPerRequest`: Limit number of errors sent per request
* `geminiDebugger.outputFile`: Path for the JSON output file

---

## 🚀 Release Notes

### 1.0.0

* Initial release with CLI + VS Code extension support
* Detects TypeScript/JavaScript errors and processes via Gemini AI

### 1.1.0

* Added structured JSON logging
* Skips large files with helpful warnings
* Added `.env` API key support

---

## 🤝 Contributing

Contributions are welcome!

### To get started:

1. Fork the repo
2. Create a new branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push your branch (`git push origin feature/my-feature`)
5. Open a Pull Request 🎉

Please follow [Conventional Commits](https://www.conventionalcommits.org/) where possible.

---

## 🙏 Credits

* **Abreel** – Project concept, development, core implementation and guidance
* Supported by [Design Synchrony](https://www.designsynchrony.com.ng)

---

## 📜 License

MIT License – feel free to use, modify, and distribute with attribution.

---

## 📚 Resources

* [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)
