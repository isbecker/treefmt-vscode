import { exec, execFile } from "child_process";
import * as fs from "fs";
import { homedir } from "os";
import * as path from "path";
import * as vscode from "vscode";
import { log, outputChannel } from "./extension"; // Import the shared log function

let command: string;
let configPath: string | null = null;

function expandTilde(input: string): string {
	if (input.startsWith("~/")) {
		return path.join(homedir(), input.slice(2));
	}
	return input;
}

function isPathLike(value: string): boolean {
	return (
		value.startsWith(".") ||
		value.includes("/") ||
		(process.platform === "win32" && value.includes("\\")) ||
		path.isAbsolute(value)
	);
}

function getStdinSpecifier(document: vscode.TextDocument): string {
	if (document.uri.scheme !== "untitled") {
		const baseName = path.basename(document.fileName);
		if (baseName) {
			return baseName;
		}
	}

	const inferredExtension = getExtensionForLanguage(document.languageId);
	if (inferredExtension) {
		return inferredExtension;
	}

	return document.languageId;
}

type LanguageContribution = {
	id: string;
	extensions?: string[];
	filenames?: string[];
};

function deriveExtensionFromFilename(filename: string): string | undefined {
	// Match e.g. "pyproject.toml" -> ".toml".
	// Avoid paths; only handle a single filename token.
	const match = /^[^/\\]+\.([A-Za-z0-9][A-Za-z0-9.+-]*)$/.exec(filename);
	if (!match) {
		return undefined;
	}
	return ensureDotPrefix(match[1]);
}

function inferTokenForLanguage(
	languageId: string,
	contributions: LanguageContribution[],
): string | undefined {
	const extensionTokens: string[] = [];
	const filenameTokens: string[] = [];

	for (const language of contributions) {
		if (language.id !== languageId) {
			continue;
		}
		if (language.extensions?.length) {
			for (const ext of language.extensions) {
				if (ext) {
					const normalized = ensureDotPrefix(ext);
					if (normalized && !extensionTokens.includes(normalized)) {
						extensionTokens.push(normalized);
					}
				}
			}
		}
		if (language.filenames?.length) {
			for (const name of language.filenames) {
				if (name) {
					filenameTokens.push(name);
					const derived = deriveExtensionFromFilename(name);
					if (derived && !extensionTokens.includes(derived)) {
						extensionTokens.push(derived);
					}
				}
			}
		}
	}

	// Prefer an actual extension whenever possible (this avoids weird bare tokens like
	// "pyproject toml" being chosen for TOML stdin).
	if (extensionTokens.length) {
		const exact = extensionTokens.find(
			(candidate) => candidate.toLowerCase() === `.${languageId}`.toLowerCase(),
		);
		if (exact) {
			return exact;
		}
		const preferredExtension = pickPreferredExtension(extensionTokens);
		if (preferredExtension) {
			return preferredExtension;
		}
	}

	const bareFilenames = filenameTokens.filter((name) =>
		/^[^./\\]+$/.test(name),
	);
	if (bareFilenames.length) {
		return bareFilenames[0];
	}

	return filenameTokens.length > 0 ? filenameTokens[0] : undefined;
}

function getExtensionForLanguage(languageId: string): string | undefined {
	const contributions: LanguageContribution[] = [];

	for (const extension of vscode.extensions.all) {
		const contributes = extension.packageJSON?.contributes;
		const languages = contributes?.languages as
			| LanguageContribution[]
			| undefined;
		if (!languages) {
			continue;
		}
		contributions.push(...languages);
	}

	return inferTokenForLanguage(languageId, contributions);
}

function ensureDotPrefix(value: string): string {
	if (!value) {
		return value;
	}
	return value.startsWith(".") ? value : `.${value.replace(/^\./, "")}`;
}

function pickPreferredExtension(candidates: string[]): string | undefined {
	if (!candidates.length) {
		return undefined;
	}

	const simple = candidates.find((candidate) =>
		/^\.[A-Za-z0-9]+$/.test(candidate),
	);
	if (simple) {
		return simple;
	}

	const alphanumeric = candidates.find((candidate) =>
		/^\.[A-Za-z0-9][A-Za-z0-9.+-]*$/.test(candidate),
	);
	if (alphanumeric) {
		return alphanumeric;
	}

	return candidates[0];
}

function resolveConfiguredCommand(
	commandSetting: string,
	workspaceRoot?: string,
): string {
	const expanded = expandTilde(commandSetting);
	if (path.isAbsolute(expanded)) {
		return expanded;
	}
	if (isPathLike(expanded)) {
		return path.resolve(workspaceRoot ?? process.cwd(), expanded);
	}
	return expanded;
}

async function commandIsExecutable(
	commandPath: string,
	workspaceRoot?: string,
): Promise<boolean> {
	return new Promise((resolve) => {
		let settled = false;
		const finish = (result: boolean) => {
			if (!settled) {
				settled = true;
				cleanup();
				resolve(result);
			}
		};
		const cleanup = () => {
			if (timeoutHandle) {
				clearTimeout(timeoutHandle);
			}
		};
		const child = execFile(
			commandPath,
			["--version"],
			{ cwd: workspaceRoot ?? process.cwd() },
			(error) => {
				finish(!error);
			},
		);
		const timeoutHandle = setTimeout(() => {
			if (!settled) {
				if (child && !child.killed) {
					child.kill();
				}
				finish(false);
			}
		}, 5000);
		child.on("error", () => {
			if (child && !child.killed) {
				child.kill();
			}
			finish(false);
		});
	});
}

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
	execFile(command, ["--init"], { cwd: workspaceRoot }, (error) => {
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

	const args: string[] = [];
	if (configPath) {
		args.push(`--config-file=${configPath}`);
	}
	args.push(`--working-dir=${workspaceRoot}`);

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
	const fullArgs = [...args, fileName];
	log(`Running command: ${command} ${fullArgs.join(" ")}`);

	// Execute treefmt without a shell; legacy mode still modifies file on disk
	execFile(
		command,
		fullArgs,
		{ cwd: workspaceRoot },
		(error, stdout, stderr) => {
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

			log(`Command completed successfully: ${command} ${fullArgs.join(" ")}`);
			vscode.window.setStatusBarMessage("treefmt formatting complete", 3000);
		},
	);
}

export async function readConfig(ctx: vscode.ExtensionContext) {
	const workspaceRoot = await getWorkspaceRoot();
	const config = vscode.workspace.getConfiguration("treefmt");
	const treefmtCommand =
		(config.get<string | null>("command") as string | null | undefined) ?? null;
	const treefmtTomlPath = config.get<string | null>("config") ?? null;

	const resolved = await resolveTreefmtConfig(ctx, workspaceRoot ?? undefined, {
		commandSetting: treefmtCommand,
		configSetting: treefmtTomlPath,
	});
	command = resolved.command;
	configPath = resolved.configPath;
}

async function resolveTreefmtConfig(
	ctx: vscode.ExtensionContext,
	workspaceRoot: string | undefined,
	settings: {
		commandSetting: string | null;
		configSetting: string | null;
	},
): Promise<{ command: string; configPath: string | null }> {
	const { commandSetting, configSetting } = settings;
	let resolvedCommand: string | null = null;
	let resolvedConfigPath: string | null = null;

	if (commandSetting) {
		const candidate = resolveConfiguredCommand(commandSetting, workspaceRoot);
		if (await commandIsExecutable(candidate, workspaceRoot)) {
			resolvedCommand = candidate;
			log(`Using user-specified treefmt command: ${candidate}`);
		} else {
			log(
				`Configured treefmt command not found or not executable: ${candidate}`,
			);
		}
	}

	if (!resolvedCommand) {
		const ext = process.platform === "win32" ? ".exe" : "";
		const commandName = `treefmt${ext}`;
		if (await commandIsExecutable(commandName, workspaceRoot)) {
			resolvedCommand = commandName;
			log(`Using treefmt command from PATH: ${commandName}`);
		}
	}

	if (!resolvedCommand) {
		const ext = process.platform === "win32" ? ".exe" : "";
		resolvedCommand = vscode.Uri.joinPath(
			ctx.extensionUri,
			"bin",
			`treefmt${ext}`,
		).fsPath;
		log(`Using bundled treefmt command: ${resolvedCommand}`);
	}

	if (configSetting) {
		resolvedConfigPath = configSetting;
		log(`Using user-specified config path: ${resolvedConfigPath}`);
	}

	return { command: resolvedCommand, configPath: resolvedConfigPath };
}

function showDiagnostic(document: vscode.TextDocument, message: string) {
	const diagnostic = new vscode.Diagnostic(
		new vscode.Range(0, 0, 0, 1),
		message,
		vscode.DiagnosticSeverity.Warning,
	);
	const collection = vscode.languages.createDiagnosticCollection("treefmt");
	collection.set(document.uri, [diagnostic]);
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
	const args: string[] = [`--working-dir=${workspaceRoot}`];
	if (configPath) {
		if (!path.isAbsolute(configPath)) {
			configPath = path.join(workspaceRoot, path.normalize(configPath));
		}
		args.push(`--config-file=${configPath}`);
	}

	const stdinSpecifier = getStdinSpecifier(editor.document);
	log(`Using stdin token: ${stdinSpecifier}`);
	args.push("--stdin", stdinSpecifier);

	log(`Running stdin command: ${command} ${args.join(" ")}`);

	return new Promise((resolve, reject) => {
		const childProcess = execFile(
			command,
			args,
			{ cwd: workspaceRoot },
			(error, stdout, stderr) => {
				if (error) {
					const isSyntaxError = /error|invalid|parse|syntax/i.test(stderr);
					if (isSyntaxError) {
						outputChannel.appendLine(`[treefmt] Formatter error: ${stderr}`);
						showDiagnostic(editor.document, stderr.split("\n")[0]);
						resolve(text);
						return;
					}
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

	vscode.window.setStatusBarMessage("treefmt formatting complete", 3000);
}

// ------------------------------
// Test-only exports
// ------------------------------
// A single namespace keeps the extension surface area tidy.

export const __test__ = {
	expandTilde,
	isPathLike,
	getStdinSpecifier,
	getConfigState: (): { command: string; configPath: string | null } => ({
		command,
		configPath,
	}),
	ensureDotPrefix,
	pickPreferredExtension,
	resolveConfiguredCommand,
	commandIsExecutable,
	deriveExtensionFromFilename,
	inferTokenForLanguage,
	resolveTreefmtConfig,
} as const;
