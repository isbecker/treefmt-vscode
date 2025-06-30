import { exec } from "child_process";
import * as fs from "fs";
import { homedir } from "os";
import * as path from "path";
import * as vscode from "vscode";
import { diagnosticCollection, log, outputChannel } from "./extension"; // Import the shared log function

let command: string;
let configPath: string | null = null;

async function getWorkspaceRoot() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		vscode.window.showInformationMessage("No workspace folder found.");
		return;
	}

	return workspaceFolders[0].uri.fsPath;
}

export async function initTreefmt(ctx: vscode.ExtensionContext) {
	const workspaceRoot = await getWorkspaceRoot();
	if (!workspaceRoot) {
		vscode.window.showInformationMessage("No workspace root found.");
		return;
	}

	await readConfig(ctx);
	log(`Using treefmt command: ${command}`);

	log(`Running: ${command} --init in ${workspaceRoot}`);
	exec(`${command} --init`, { cwd: workspaceRoot }, (error) => {
		if (error) {
			log(`Error running ${command} --init: ${error.message}`);
			vscode.window.showErrorMessage(`Error running ${command} --init`);
		} else {
			vscode.window.showInformationMessage("Created treefmt.toml");
		}
	});
}

export async function runTreefmtOnFile(
	ctx: vscode.ExtensionContext,
): Promise<void> {
	log("Running legacy treefmt on file (no buffer modification)");
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

	await readConfig(ctx);

	if (configPath && !path.isAbsolute(configPath)) {
		configPath = path.join(workspaceRoot, path.normalize(configPath));
	}

	let args = "";
	if (configPath) {
		args = ` --config-file=${configPath}`;
	}
	args += ` --working-dir=${workspaceRoot}`;

	// For legacy mode, we need to ensure the file is saved first
	if (editor.document.isDirty) {
		log(`Saving document before formatting: ${editor.document.fileName}`);
		try {
			// Save the document first
			await editor.document.save();
		} catch (err) {
			log(`Error saving document: ${err}`);
			vscode.window.showErrorMessage(`Error saving document: ${err}`);
			return;
		}
	}

	const fileName = editor.document.fileName;
	log(`Formatting file: ${fileName}`);
	const fullCommand = `${command} ${args} ${fileName}`;
	log(`Running command: ${fullCommand}`);

	// Execute treefmt but don't try to replace any text in the editor
	// This is for legacy mode only - treefmt will modify the file on disk
	exec(fullCommand, { cwd: workspaceRoot }, (error, stdout, stderr) => {
		if (error) {
			const isSyntaxError = /error|invalid|parse|syntax/i.test(stderr);
			if (isSyntaxError) {
				outputChannel.appendLine(`[treefmt] Formatter error: ${stderr}`);
				showDiagnostic(editor.document, stderr.split("\n")[0]);
				return;
			}
			log(`Error running ${command}: ${stderr}`);
			vscode.window
				.showErrorMessage(
					`Error running ${command}: ${stderr}`,
					"OK",
					"Create treefmt.toml",
				)
				.then((selection) => {
					if (selection === "Create treefmt.toml") {
						initTreefmt(ctx);
					}
				});
			return;
		}

		log(`Command completed successfully: ${fullCommand}`);

		// Show a notification that formatting succeeded
		vscode.window.setStatusBarMessage("Treefmt formatting complete", 3000);
	});
}

export async function readConfig(ctx: vscode.ExtensionContext) {
	const workspaceRoot = await getWorkspaceRoot();
	const config = vscode.workspace.getConfiguration("treefmt");
	const treefmtCommand: string | null = config.get("command") as string | null;
	if (treefmtCommand) {
		command = treefmtCommand;
		log(`Using user-specified treefmt command: ${command}`);
	} else {
		const ext = process.platform === "win32" ? ".exe" : "";
		command = vscode.Uri.joinPath(
			ctx.extensionUri,
			"bin",
			`treefmt${ext}`,
		).fsPath;
		log(`Using bundled treefmt command: ${command}`);
	}
	if (command.startsWith("~/")) {
		command = path.join(homedir(), command.slice("~".length));
	}

	const treefmtTomlPath = config.get<string | null>("config");
	if (treefmtTomlPath) {
		configPath = treefmtTomlPath;
		log(`Using user-specified config path: ${configPath}`);
	} else {
		const possibleConfigs = ["treefmt.toml", ".treefmt.toml"];
		configPath = null;
		for (const configFileName of possibleConfigs) {
			const possiblePath = path.join(workspaceRoot ?? "", configFileName);
			if (fs.existsSync(possiblePath)) {
				configPath = possiblePath;
				log(`Found config file: ${configPath}`);
				break;
			}
		}
	}
}

function showDiagnostic(document: vscode.TextDocument, message: string) {
	const diagnostic = new vscode.Diagnostic(
		new vscode.Range(0, 0, 0, 1),
		message,
		vscode.DiagnosticSeverity.Warning,
	);
	diagnosticCollection.set(document.uri, [diagnostic]);
}

export async function getFormattedTextFromTreefmt(
	ctx: vscode.ExtensionContext,
	text: string,
): Promise<string> {
	log("Running treefmt with stdin");
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showInformationMessage("No active editor found.");
		return text;
	}
	const workspaceRoot = await getWorkspaceRoot();
	if (!workspaceRoot) {
		vscode.window.showInformationMessage("No workspace root found.");
		return text;
	}

	await readConfig(ctx);
	let args = `--working-dir=${workspaceRoot}`;
	if (configPath) {
		if (!path.isAbsolute(configPath)) {
			configPath = path.join(workspaceRoot, path.normalize(configPath));
		}
		args += ` --config-file=${configPath}`;
	}

	const fileExtension = path.extname(editor.document.fileName);
	args += ` --stdin ${fileExtension}`;

	const fullCommand = `${command} ${args}`;
	log(`Running stdin command: ${fullCommand}`);

	return new Promise((resolve, reject) => {
		const childProcess = exec(
			fullCommand,
			{ cwd: workspaceRoot },
			(error, stdout, stderr) => {
				if (error) {
					// If treefmt returns a known formatting error, show it in output channel and as a diagnostic
					const isSyntaxError = /error|invalid|parse|syntax/i.test(stderr);
					if (isSyntaxError) {
						outputChannel.appendLine(`[treefmt] Formatter error: ${stderr}`);
						showDiagnostic(editor.document, stderr.split("\n")[0]);
						resolve(text); // Return original text
						return;
					}
					// Unexpected error: show popup
					log(`Error running stdin command: ${stderr}`);
					vscode.window.showErrorMessage(`Error running ${command}: ${stderr}`);
					reject(stderr);
					return;
				}
				resolve(stdout);
			},
		);

		if (childProcess.stdin) {
			childProcess.stdin.write(text);
			childProcess.stdin.end();
		} else {
			log("ERROR: No stdin available on child process");
			reject("No stdin available on child process");
		}
	});
}

export async function runTreefmtWithStdin(ctx: vscode.ExtensionContext) {
	log("Executing runTreefmtWithStdin command");
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const documentText = editor.document.getText();
	const formattedText = await getFormattedTextFromTreefmt(ctx, documentText);
	if (formattedText === null) {
		return;
	}

	const edit = new vscode.WorkspaceEdit();
	const fullRange = new vscode.Range(
		editor.document.positionAt(0),
		editor.document.positionAt(documentText.length),
	);
	edit.replace(editor.document.uri, fullRange, formattedText);

	await vscode.workspace.applyEdit(edit);
}
