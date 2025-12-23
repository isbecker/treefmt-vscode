import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export type TestContext = {
	workspaceRoot: string;
	treefmtPath: string;
	mockExtensionContext: vscode.ExtensionContext;
};

export function createTestContext(): TestContext {
	const workspaceRoot =
		vscode.workspace.workspaceFolders?.[0].uri.fsPath ||
		path.join(__dirname, "../../");

	const treefmtPath = path.join(
		workspaceRoot,
		"bin",
		process.platform === "win32" ? "treefmt.exe" : "treefmt",
	);

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
			keys: () => Promise.resolve([]),
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

	return { workspaceRoot, treefmtPath, mockExtensionContext };
}
