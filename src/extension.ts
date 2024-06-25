import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

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
						// Call treefmt --init to create a treefmt.toml file
						exec("treefmt --init", { cwd: rootPath }, (error) => {
							if (error) {
								vscode.window.showErrorMessage("Error running treefmt --init");
							} else {
								vscode.window.showInformationMessage("Created treefmt.toml");
							}
						});
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
