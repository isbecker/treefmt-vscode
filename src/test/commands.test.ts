import * as assert from "assert";
import * as vscode from "vscode";
import {
	readConfig,
	runTreefmtOnFile,
	runTreefmtWithStdin,
} from "../treefmtUtils";
import type { TestContext } from "./testContext";

export function registerCommandTests(ctx: TestContext): void {
	suite("Commands", () => {
		setup(async () => {
			await readConfig(ctx.mockExtensionContext);
		});

		test("Run treefmt with stdin", async () => {
			const document = await vscode.workspace.openTextDocument({
				content: "const a =  1;\n",
				language: "typescript",
			});
			await vscode.window.showTextDocument(document);
			await runTreefmtWithStdin(ctx.mockExtensionContext);
			assert.ok(true, "runTreefmtWithStdin should complete without error");
		});

		test("Run treefmt with onsave", async () => {
			const document = await vscode.workspace.openTextDocument({
				content: "const a =  1;\n",
				language: "typescript",
			});
			await vscode.window.showTextDocument(document);
			await runTreefmtOnFile(ctx.mockExtensionContext);
			assert.ok(true, "runTreefmtOnFile should complete without error");
		});
	});
}
