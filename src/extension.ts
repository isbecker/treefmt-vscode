import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";

async function runTreefmt() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showInformationMessage("No active editor found.");
		return;
	}

	const document = editor.document;
	const filePath = document.fileName;
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders) {
		vscode.window.showInformationMessage("No workspace folder found.");
		return;
	}

	const workspaceRoot = workspaceFolders[0].uri.fsPath;
	const treefmtTomlPath = path.join(workspaceRoot, "treefmt.toml");
	const bundledTreefmtPath = path.join(__dirname, "bin", "treefmt");

	let treefmtCommand = "treefmt";
	if (fs.existsSync(bundledTreefmtPath)) {
		treefmtCommand = bundledTreefmtPath;
	}

	if (!fs.existsSync(treefmtTomlPath)) {
		const create = await vscode.window.showInformationMessage(
			"No treefmt.toml found. Would you like to create one?",
			"Yes",
			"No",
		);

		if (create === "Yes") {
			exec(`${treefmtCommand} --init`, { cwd: workspaceRoot }, (error) => {
				if (error) {
					vscode.window.showErrorMessage(
						`Error running ${treefmtCommand} --init`,
					);
				} else {
					vscode.window.showInformationMessage("Created treefmt.toml");
				}
			});
		} else {
			return;
		}
	}

	exec(treefmtCommand, { cwd: workspaceRoot }, (error, stdout, stderr) => {
		if (error) {
			vscode.window.showErrorMessage(
				`Error running ${treefmtCommand}: ${stderr}`,
			);
			return;
		}
		vscode.window.showInformationMessage("treefmt ran successfully.");
	});
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("extension.runTreefmt", runTreefmt),
	);

	vscode.languages.registerDocumentFormattingEditProvider(
		{ pattern: "**/*" },
		{
			provideDocumentFormattingEdits(
				document: vscode.TextDocument,
			): vscode.TextEdit[] {
				const workspaceFolders = vscode.workspace.workspaceFolders;
				if (!workspaceFolders) {
					return [];
				}

				const workspaceRoot = workspaceFolders[0].uri.fsPath;
				const treefmtTomlPath = path.join(workspaceRoot, "treefmt.toml");
				const bundledTreefmtPath = path.join(__dirname, "bin", "treefmt");

				let treefmtCommand = "treefmt";
				if (fs.existsSync(bundledTreefmtPath)) {
					treefmtCommand = bundledTreefmtPath;
				}

				if (!fs.existsSync(treefmtTomlPath)) {
					return [];
				}

				exec(
					treefmtCommand,
					{ cwd: workspaceRoot },
					(error, stdout, stderr) => {
						if (error) {
							vscode.window.showErrorMessage(
								`Error running ${treefmtCommand}: ${stderr}`,
							);
							return [];
						}
						vscode.window.showInformationMessage("treefmt ran successfully.");
					},
				);

				return [];
			},
		},
	);
}

export function deactivate() {}
