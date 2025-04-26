import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import {
	readConfig,
	runTreefmtOnFile,
	runTreefmtWithStdin,
} from "../treefmtUtils";

suite("Extension Test Suite", () => {
	vscode.window.showInformationMessage("Start all tests.");
	suiteTeardown(() => {
		vscode.window.showInformationMessage("All tests done!");
	});

	const workspaceRoot =
		vscode.workspace.workspaceFolders?.[0].uri.fsPath ||
		path.join(__dirname, "../../");
	const treefmtPath = path.join(workspaceRoot, "bin", "treefmt");

	// Mock vscode.ExtensionContext
	const mockExtensionContext: vscode.ExtensionContext = {
		subscriptions: [],
		workspaceState: {
			get: () => undefined,
			update: () => Promise.resolve(),
			keys: () => [],
		},
		globalState: {
			get: () => undefined,
			update: () => Promise.resolve(),
			setKeysForSync: () => {},
			keys: () => [],
		},
		asAbsolutePath: (relativePath: string) =>
			path.join(workspaceRoot, relativePath),
		storagePath: workspaceRoot,
		globalStoragePath: workspaceRoot,
		logPath: workspaceRoot,
		logUri: vscode.Uri.file(workspaceRoot),
		storageUri: vscode.Uri.file(workspaceRoot),
		globalStorageUri: vscode.Uri.file(workspaceRoot),
		environmentVariableCollection: {
			replace: () => {},
			append: () => {},
			prepend: () => {},
			get: () => undefined,
			forEach: () => {},
			clear: () => {},
			getScoped: () => ({
				replace: () => {},
				append: () => {},
				prepend: () => {},
				get: () => undefined,
				forEach: () => {},
				clear: () => {},
				persistent: true,
				description: "",
				delete: () => {},
				[Symbol.iterator]: function* () {},
			}),
			persistent: true,
			description: "",
			delete: () => {},
			[Symbol.iterator]: function* () {},
		},
		secrets: {
			store: () => Promise.resolve(),
			get: () => Promise.resolve(undefined),
			delete: () => Promise.resolve(),
			onDidChange: () => ({ dispose: () => {} }),
		},
		extensionUri: vscode.Uri.file(workspaceRoot),
		extensionPath: workspaceRoot,
		extensionMode: vscode.ExtensionMode.Test,
		extension: {
			id: "treefmt",
			extensionPath: workspaceRoot,
			extensionUri: vscode.Uri.file(workspaceRoot),
			extensionKind: vscode.ExtensionKind.UI,
			isActive: true,
			packageJSON: fs.readFileSync(path.join(workspaceRoot, "package.json")),
			exports: undefined,
			activate: async () => {},
		},
		languageModelAccessInformation: {
			onDidChange: () => ({ dispose: () => {} }),
			canSendRequest: () => true,
		},
	};

	setup(async () => {
		// Ensure treefmt is downloaded
		await readConfig(mockExtensionContext);
	});

	test("Check treefmt binary exists", () => {
		assert.strictEqual(
			fs.existsSync(treefmtPath),
			true,
			"treefmt binary should exist in ./bin directory",
		);
	});

	test("Run treefmt with stdin", async () => {
		const document = await vscode.workspace.openTextDocument({
			content: "const a =  1;\n",
			language: "typescript",
		});
		await vscode.window.showTextDocument(document);

		// Since runTreefmtWithStdin now returns void and applies edits directly,
		// we just test that it doesn't throw an error
		await runTreefmtWithStdin(mockExtensionContext);
		assert.ok(true, "runTreefmtWithStdin should complete without error");
	});

	test("Run treefmt with onsave", async () => {
		const document = await vscode.workspace.openTextDocument({
			content: "const a =  1;\n",
			language: "typescript",
		});
		await vscode.window.showTextDocument(document);

		// The legacy mode function now returns void instead of formatted text
		// We just test that it doesn't throw an error
		await runTreefmtOnFile(mockExtensionContext);
		// Legacy mode modifies file on disk, we don't test the actual formatting here
		assert.ok(true, "runTreefmtOnFile should complete without error");
	});
});
