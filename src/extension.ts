import { exec } from "child_process";
import * as fs from "fs";
import { homedir } from "os";
import * as path from "path";
import * as vscode from "vscode";

let ctx: vscode.ExtensionContext;
let command: string;
let configPath: string | null;

async function getWorkspaceRoot() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		vscode.window.showInformationMessage("No workspace folder found.");
		return;
	}

	return workspaceFolders[0].uri.fsPath;
}

async function initTreefmt() {
	const workspaceRoot = await getWorkspaceRoot();
	if (!workspaceRoot) {
		vscode.window.showInformationMessage("No workspace root found.");
		return;
	}

	await readConfig();

	exec(`${command} --init`, { cwd: workspaceRoot }, (error) => {
		if (error) {
			vscode.window.showErrorMessage(`Error running ${command} --init`);
		} else {
			vscode.window.showInformationMessage("Created treefmt.toml");
		}
	});
}

async function runTreefmt() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showInformationMessage("No active editor found.");
		return;
	}
	const workspaceRoot = await getWorkspaceRoot();
	if (!workspaceRoot) {
		vscode.window.showInformationMessage("No workspace root found.");
		return;
	}

	await readConfig();
	if (configPath && !path.isAbsolute(configPath)) {
		configPath = path.join(workspaceRoot, path.normalize(configPath));
	}

	let args = "";
	if (configPath) {
		if (!path.isAbsolute(configPath)) {
			configPath = path.join(workspaceRoot, path.normalize(configPath));
		}
		args = ` --config-file=${configPath}`;
	}
	args += ` --working-dir=${workspaceRoot}`;
	exec(
		`${command} ${args} ${editor.document.fileName}`,
		{ cwd: workspaceRoot },
		async (error, stdout, stderr) => {
			if (error) {
				const create = await vscode.window.showErrorMessage(
					`Error running ${command}: ${stderr}`,
					"OK",
					"Create treefmt.toml",
				);
				if (create === "Create treefmt.toml") {
					initTreefmt();
				}
				return;
			}
		},
	);
}

async function readConfig() {
	const workspaceRoot = await getWorkspaceRoot();
	const config = vscode.workspace.getConfiguration("treefmt");
	const treefmtCommand: string | null = config.get("command") as string | null;
	if (treefmtCommand) {
		command = treefmtCommand;
	} else {
		const ext = process.platform === "win32" ? ".exe" : "";
		command = vscode.Uri.joinPath(
			ctx.extensionUri,
			"bin",
			`treefmt${ext}`,
		).fsPath;
	}
	if (command.startsWith("~/")) {
		command = path.join(homedir(), command.slice("~".length));
	}

	const treefmtTomlPath = config.get<string | null>("config");
	if (treefmtTomlPath) {
		configPath = treefmtTomlPath;
	} else {
		const possibleConfigs = ["treefmt.toml", ".treefmt.toml"];
		configPath = null;
		for (const configFileName of possibleConfigs) {
			const possiblePath = path.join(workspaceRoot ?? "", configFileName);
			if (fs.existsSync(possiblePath)) {
				configPath = possiblePath;
				break;
			}
		}
	}
}

async function getFormattedTextFromTreefmt(): Promise<string | null> {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showInformationMessage("No active editor found.");
		return null;
	}
	const workspaceRoot = await getWorkspaceRoot();
	if (!workspaceRoot) {
		vscode.window.showInformationMessage("No workspace root found.");
		return null;
	}

	await readConfig();
	let args = `--working-dir=${workspaceRoot}`;
	if (configPath) {
		if (!path.isAbsolute(configPath)) {
			configPath = path.join(workspaceRoot, path.normalize(configPath));
		}
		args += ` --config-file=${configPath}`;
	}
	args += ` --stdin ${path.extname(editor.document.fileName)}`;

	const documentText = editor.document.getText();
	return new Promise((resolve, reject) => {
		const childProcess = exec(
			`${command} ${args}`,
			{ cwd: workspaceRoot },
			(error, stdout, stderr) => {
				if (error) {
					vscode.window.showErrorMessage(`Error running ${command}: ${stderr}`);
					reject(stderr);
					return;
				}
				resolve(stdout);
			},
		);

		if (childProcess.stdin) {
			childProcess.stdin.write(documentText);
			childProcess.stdin.end();
		}
	});
}

async function runTreefmtWithStdin() {
	const formattedText = await getFormattedTextFromTreefmt();
	if (formattedText === null) {
		return;
	}

	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const documentText = editor.document.getText();
	const edit = new vscode.WorkspaceEdit();
	const fullRange = new vscode.Range(
		editor.document.positionAt(0),
		editor.document.positionAt(documentText.length),
	);
	edit.replace(editor.document.uri, fullRange, formattedText);
	await vscode.workspace.applyEdit(edit);
}

export function activate(context: vscode.ExtensionContext) {
	ctx = context;

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.runTreefmt", runTreefmt),
		vscode.commands.registerCommand("extension.initTreefmt", initTreefmt),
		vscode.commands.registerCommand(
			"extension.runTreefmtWithStdin",
			runTreefmtWithStdin,
		),
	);

	vscode.languages.registerDocumentFormattingEditProvider(
		{ pattern: "**/*" },
		{
			async provideDocumentFormattingEdits(
				document: vscode.TextDocument,
			): Promise<vscode.TextEdit[]> {
				const formattedText = await getFormattedTextFromTreefmt();
				if (formattedText === null) {
					return [];
				}

				const fullRange = new vscode.Range(
					document.positionAt(0),
					document.positionAt(document.getText().length),
				);
				return [vscode.TextEdit.replace(fullRange, formattedText)];
			},
		},
	);
}

export function deactivate() {}
