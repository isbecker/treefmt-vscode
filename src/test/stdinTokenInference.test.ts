import * as assert from "assert";
import * as fs from "fs";
import { tmpdir } from "os";
import * as path from "path";
import * as vscode from "vscode";
import { __test__ } from "../treefmtUtils";
import type { TestContext } from "./testContext";

export function registerStdinTokenInferenceTests(_ctx: TestContext): void {
	suite("Utils: stdin token inference", () => {
		test("Infer TOML stdin token prefers .toml over bare filenames", () => {
			const token = __test__.inferTokenForLanguage("toml", [
				{ id: "toml", filenames: ["pyproject toml", "pyproject.toml"] },
			]);
			assert.strictEqual(token, ".toml");
		});

		test("Infer token derives extension from filename when needed", () => {
			const token = __test__.inferTokenForLanguage("toml", [
				{ id: "toml", filenames: ["pyproject.toml"] },
			]);
			assert.strictEqual(token, ".toml");
		});

		test("Infer token prefers extensions over odd bare filename tokens", () => {
			const token = __test__.inferTokenForLanguage("toml", [
				{ id: "toml", filenames: ["pyproject toml"] },
				{ id: "toml", extensions: [".toml"] },
			]);
			assert.strictEqual(token, ".toml");
		});

		test("Infer token prefers simple extension when multiple", () => {
			const token = __test__.inferTokenForLanguage("foo", [
				{ id: "foo", extensions: [".foo-bar", ".foo"] },
			]);
			assert.strictEqual(token, ".foo");
		});

		test("Infer Make stdin token can use bare filename", () => {
			const token = __test__.inferTokenForLanguage("make", [
				{ id: "make", filenames: ["Makefile"] },
			]);
			assert.strictEqual(token, "Makefile");
		});

		test("getStdinSpecifier for unsaved TOML prefers .toml", () => {
			// Don't depend on a TOML language extension being installed in the test VS Code.
			// We only need the fields used by getStdinSpecifier().
			const fakeTomlDoc = {
				uri: vscode.Uri.parse("untitled:Untitled-1"),
				fileName: "Untitled-1",
				languageId: "toml",
			} as unknown as vscode.TextDocument;

			const token = __test__.getStdinSpecifier(fakeTomlDoc);
			assert.ok(
				token === ".toml" || token === "toml",
				`expected '.toml' or 'toml', got '${token}'`,
			);
		});

		test("getStdinSpecifier for saved file uses basename", async () => {
			const tmpBase = fs.mkdtempSync(path.join(tmpdir(), "treefmt-vscode-"));
			const filePath = path.join(tmpBase, "stdin-specifier.toml");
			try {
				fs.writeFileSync(filePath, "a = 1\n");
				const document = await vscode.workspace.openTextDocument(
					vscode.Uri.file(filePath),
				);
				await vscode.window.showTextDocument(document);
				const token = __test__.getStdinSpecifier(document);
				assert.strictEqual(token, "stdin-specifier.toml");
			} finally {
				try {
					fs.rmSync(tmpBase, { recursive: true, force: true });
				} catch {
					// ignore cleanup errors
				}
			}
		});
	});
}
