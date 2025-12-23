import * as vscode from "vscode";
import { registerCommandResolutionTests } from "./commandResolution.test";
import { registerCommandTests } from "./commands.test";
import { registerPathAndExtensionHelperTests } from "./pathAndExtensionHelpers.test";
import { registerStdinTokenInferenceTests } from "./stdinTokenInference.test";
import { createTestContext } from "./testContext";

suite("Extension Test Suite", () => {
	vscode.window.showInformationMessage("Start all tests.");
	suiteTeardown(() => {
		vscode.window.showInformationMessage("All tests done!");
	});

	const ctx = createTestContext();
	registerCommandTests(ctx);
	registerStdinTokenInferenceTests(ctx);
	registerPathAndExtensionHelperTests(ctx);
	registerCommandResolutionTests(ctx);
});
