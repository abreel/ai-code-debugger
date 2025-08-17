# Gemini Debugger

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
```
### 2. Install dependencies
```bash
npm install
```
### 3. Add your Gemini API key
Create a .env file in the root of your project:

```env
GEMINI_API_KEY=your_api_key_here
```

## ⚙️ Usage
#### CLI Mode
Run the debugger directly:

```bash
node gemini-debugger.js
```
Or add it to your package.json scripts for easy execution:

```json
"scripts": {
  "gemini-debug": "node gemini-debugger.js"
}
```


Now you can run:

```bash
npm run gemini-debug
```

## VS Code Extension
Open this repo in VS Code

Press **F5** to run the extension in a new Extension Development Host

The extension will monitor TypeScript/JavaScript errors and process them automatically

### 📂 Output
Errors are logged into gemini-debug.json in the project root:

```json
[
  {
    "file": "/path/to/file.tsx",
    "error": "TS2300: Duplicate identifier 'React'.",
    "suggestion": "Remove duplicate React imports. Keep only one import statement."
  }
]
```

## 🤝 Contributing
Contributions are welcome!


### To get started:

- Fork the repo
- Create a new branch (git checkout -b feature/my-feature)
- Commit your changes (git commit -m 'Add new feature')
- Push your branch (git push origin feature/my-feature)
- Open a Pull Request 🎉

Please follow conventional commit messages where possible.

## 🙏 Credits
Abreel – Project concept, development, core implementation and guidance

Supported by [Design Synchrony](https://www.designsynchrony.com.ng)

## 📜 License
MIT License – feel free to use, modify, and distribute with attribution.
