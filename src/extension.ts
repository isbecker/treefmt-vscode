import { exec } from "child_process";
import * as fs from "fs";
import { homedir } from "os";
import * as path from "path";
import * as vscode from "vscode";

let ctx: vscode.ExtensionContext;
let command: string;
let configPath: string;

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

	if (!fs.existsSync(configPath)) {
		const create = await vscode.window.showInformationMessage(
			"No treefmt.toml found. Would you like to create one?",
			"Yes",
			"No",
		);

		if (create === "Yes") {
			initTreefmt();
		}

		// Early return to prevent running treefmt with a config file that isn't configured
		// treefmt --init makes a treefmt.toml file but it doesn't have any rules in it
		return;
	}

	exec(
		`${command} --config-file=${configPath}`,
		{ cwd: workspaceRoot },
		(error, stdout, stderr) => {
			if (error) {
				vscode.window.showErrorMessage(`Error running ${command}: ${stderr}`);
				return;
			}
			vscode.window.showInformationMessage("treefmt ran successfully.");
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
		command = homedir() + command.slice("~".length);
	}

	const treefmtTomlPath: string | null = config.get("config") as string | null;
	if (treefmtTomlPath) {
		configPath = treefmtTomlPath;
	} else {
		configPath = path.join(workspaceRoot ?? "", ".treefmt.toml");
		if (!fs.existsSync(configPath)) {
			configPath = path.join(workspaceRoot ?? "", "treefmt.toml");
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	ctx = context;

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.runTreefmt", runTreefmt),
		vscode.commands.registerCommand("extension.initTreefmt", initTreefmt),
	);

	vscode.languages.registerDocumentFormattingEditProvider(
		{ pattern: "**/*" },
		{
			async provideDocumentFormattingEdits(
				document: vscode.TextDocument,
			): Promise<vscode.TextEdit[]> {
				await runTreefmt();

				return [];
			},
		},
	);
}

export function deactivate() {}
