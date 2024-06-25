import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

const treefmtTemplate = `
# treefmt.toml
# This file configures treefmt, a universal formatter that runs multiple code formatters
# based on the file type. Each formatter has its own section and specifies the command
# to run, options, and the file types (globs) it should format.

# Define a formatter for JavaScript files using Prettier
[formatter.prettier]
# The command to run the formatter. Ensure prettier is installed and accessible in your PATH.
command = "prettier --write"
# Options to pass to the formatter command. Prettier options can be specified here.
options = []
# File patterns to include. These can be glob patterns to match specific file types.
includes = ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"]

# Define a formatter for Python files using Black
[formatter.black]
# The command to run the formatter. Ensure black is installed and accessible in your PATH.
command = "black"
# Options to pass to the formatter command. Black options can be specified here.
options = []
# File patterns to include. These can be glob patterns to match specific file types.
includes = ["**/*.py"]

# Define a formatter for Markdown files using Prettier
[formatter.prettier-markdown]
# The command to run the formatter. Ensure prettier is installed and accessible in your PATH.
command = "prettier --write"
# Options to pass to the formatter command. Prettier options can be specified here.
options = []
# File patterns to include. These can be glob patterns to match specific file types.
includes = ["**/*.md"]

# Define a formatter for HTML files using Prettier
[formatter.prettier-html]
# The command to run the formatter. Ensure prettier is installed and accessible in your PATH.
command = "prettier --write"
# Options to pass to the formatter command. Prettier options can be specified here.
options = []
# File patterns to include. These can be glob patterns to match specific file types.
includes = ["**/*.html"]

# Define a formatter for CSS files using Prettier
[formatter.prettier-css]
# The command to run the formatter. Ensure prettier is installed and accessible in your PATH.
command = "prettier --write"
# Options to pass to the formatter command. Prettier options can be specified here.
options = []
# File patterns to include. These can be glob patterns to match specific file types.
includes = ["**/*.css", "**/*.scss", "**/*.sass"]

# Define a formatter for JSON files using Prettier
[formatter.prettier-json]
# The command to run the formatter. Ensure prettier is installed and accessible in your PATH.
command = "prettier --write"
# Options to pass to the formatter command. Prettier options can be specified here.
options = []
# File patterns to include. These can be glob patterns to match specific file types.
includes = ["**/*.json"]

# Define a formatter for YAML files using Prettier
[formatter.prettier-yaml]
# The command to run the formatter. Ensure prettier is installed and accessible in your PATH.
command = "prettier --write"
# Options to pass to the formatter command. Prettier options can be specified here.
options = []
# File patterns to include. These can be glob patterns to match specific file types.
includes = ["**/*.yaml", "**/*.yml"]

# Add more formatters as needed, following the same structure
# [formatter.<name>]
# command = "<formatter-command>"
# options = ["<formatter-option-1>", "<formatter-option-2>"]
# includes = ["<glob-pattern-1>", "<glob-pattern-2>"]
`;

export function activate(context: vscode.ExtensionContext) {
	const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

	if (rootPath) {
		const treefmtConfigPath = path.join(rootPath, "treefmt.toml");
		if (!fs.existsSync(treefmtConfigPath)) {
			vscode.window
				.showInformationMessage(
					"No treefmt.toml found. Do you want to create one?",
					"Yes",
					"No",
				)
				.then((selection) => {
					if (selection === "Yes") {
						fs.writeFileSync(treefmtConfigPath, treefmtTemplate.trim());
						vscode.window.showInformationMessage("Created treefmt.toml");
					}
				});
		} else {
			vscode.window.showInformationMessage("treefmt.toml found");
		}
	}

	const runTreefmt = (document: vscode.TextDocument) => {
		if (rootPath) {
			return new Promise<vscode.TextEdit[]>((resolve, reject) => {
				exec("treefmt", { cwd: rootPath }, (error, stdout, stderr) => {
					if (error) {
						vscode.window.showErrorMessage(`Error running treefmt: ${stderr}`);
						reject([]);
						return;
					}
					vscode.window.showInformationMessage(`treefmt output: ${stdout}`);
					// Since treefmt writes directly to the files, reload the document
					document.save().then(() => {
						resolve([]);
					});
				});
			});
		}
		return Promise.resolve([]);
	};

	let disposable = vscode.commands.registerCommand(
		"extension.runTreefmt",
		() => {
			if (vscode.window.activeTextEditor) {
				runTreefmt(vscode.window.activeTextEditor.document);
			}
		},
	);

	context.subscriptions.push(disposable);

	// Register formatting provider for all files
	vscode.languages.registerDocumentFormattingEditProvider(
		{ language: "*", scheme: "file" },
		{
			provideDocumentFormattingEdits(
				document: vscode.TextDocument,
			): Thenable<vscode.TextEdit[]> {
				return runTreefmt(document);
			},
		},
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
