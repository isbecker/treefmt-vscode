import * as vscode from "vscode";
import {
	getFormattedTextFromTreefmt,
	initTreefmt,
	runTreefmtOnFile,
	runTreefmtWithStdin,
} from "./treefmtUtils";

let ctx: vscode.ExtensionContext;
let useStdin: boolean = true;
let debugMode: boolean = false;

// Create output channel for logging
export const outputChannel = vscode.window.createOutputChannel("Treefmt");

export function log(message: string, forceShow: boolean = false): void {
	if (debugMode || forceShow) {
		console.log(`[Treefmt] ${message}`);
		outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
	}
}

export function activate(context: vscode.ExtensionContext) {
	ctx = context;

	// Read the initial settings
	const config = vscode.workspace.getConfiguration("treefmt");
	useStdin = config.get<boolean>("useStdin") ?? true;
	debugMode = config.get<boolean>("debug") ?? false;

	if (debugMode) {
		log("Activating Treefmt extension");
		log(`Initial useStdin setting: ${useStdin}`);
	}

	// Update settings when configuration changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration("treefmt.useStdin")) {
				const config = vscode.workspace.getConfiguration("treefmt");
				useStdin = config.get<boolean>("useStdin") ?? true;
				log(`Configuration changed: useStdin = ${useStdin}`);
			}

			if (e.affectsConfiguration("treefmt.debug")) {
				const config = vscode.workspace.getConfiguration("treefmt");
				debugMode = config.get<boolean>("debug") ?? false;
				log(`Debug mode ${debugMode ? "enabled" : "disabled"}`, true);
			}
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.runTreefmt", () => {
			// This explicit command should always run treefmt in legacy mode
			return runTreefmtOnFile(ctx);
		}),
		vscode.commands.registerCommand("extension.initTreefmt", () =>
			initTreefmt(ctx),
		),
		vscode.commands.registerCommand("extension.runTreefmtWithStdin", () =>
			runTreefmtWithStdin(ctx),
		),
	);

	// Only register the document formatting providers when using stdin mode
	// This prevents VS Code from trying to use our formatter during auto-save when in legacy mode
	if (useStdin) {
		registerFormatProviders(context);
	}

	// Re-register or unregister the formatting providers when settings change
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration("treefmt.useStdin")) {
				const config = vscode.workspace.getConfiguration("treefmt");
				const newUseStdin = config.get<boolean>("useStdin") ?? true;

				if (newUseStdin && !useStdin) {
					// Switching from legacy to stdin mode, register providers
					log("Registering document formatting providers for stdin mode");
					registerFormatProviders(context);
				} else if (!newUseStdin && useStdin) {
					// Switching from stdin to legacy mode, unregister providers
					log("Unregistering document formatting providers for legacy mode");
					// Note: We can't easily unregister providers once registered
					// But we'll make sure they don't do anything in legacy mode
				}

				useStdin = newUseStdin;
			}
		}),
	);

	if (debugMode) {
		log("Treefmt extension activated successfully");
	}
}

function registerFormatProviders(context: vscode.ExtensionContext) {
	// Register document formatting provider using pattern matching
	// This is how it was done originally and seems to work better for language detection
	context.subscriptions.push(
		vscode.languages.registerDocumentFormattingEditProvider(
			{ pattern: "**/*" }, // Match all files
			{
				async provideDocumentFormattingEdits(
					document: vscode.TextDocument,
				): Promise<vscode.TextEdit[]> {
					log(`Document formatting requested for: ${document.fileName}`);

					if (!useStdin) {
						log("Using legacy mode - formatting file on disk");
						// In legacy mode, run treefmt on the file directly
						await runTreefmtOnFile(ctx);
						return [];
					}

					// Stdin mode - get formatted text and apply as edit
					const formattedText = await getFormattedTextFromTreefmt(
						ctx,
						document.getText(),
					);
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
		),
	);

	// Register document range formatting provider
	context.subscriptions.push(
		vscode.languages.registerDocumentRangeFormattingEditProvider(
			{ pattern: "**/*" }, // Match all files
			{
				async provideDocumentRangeFormattingEdits(
					document: vscode.TextDocument,
					range: vscode.Range,
				): Promise<vscode.TextEdit[]> {
					log(`Range formatting requested for: ${document.fileName}`);

					if (!useStdin) {
						log("Using legacy mode - formatting file on disk");
						// In legacy mode, run treefmt on the file directly
						// Note: This will format the entire file, not just the range
						await runTreefmtOnFile(ctx);
						return [];
					}

					// Stdin mode - get formatted text and apply as edit
					const formattedText = await getFormattedTextFromTreefmt(
						ctx,
						document.getText(range),
					);
					if (formattedText === null) {
						return [];
					}

					return [vscode.TextEdit.replace(range, formattedText)];
				},
			},
		),
	);
}

export function deactivate() {
	if (debugMode) {
		log("Treefmt extension deactivated");
	}
}
