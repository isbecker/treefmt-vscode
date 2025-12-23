import * as assert from "assert";
import * as path from "path";
import { __test__ } from "../treefmtUtils";
import type { TestContext } from "./testContext";

export function registerPathAndExtensionHelperTests(_ctx: TestContext): void {
	suite("Utils: path + extension helpers", () => {
		test("expandTilde expands ~/ correctly", () => {
			const expanded = __test__.expandTilde("~/treefmt");
			assert.ok(
				expanded.includes(path.sep),
				"expanded path should contain sep",
			);
			assert.ok(
				expanded.endsWith(`${path.sep}treefmt`),
				"expanded path should end with /treefmt",
			);
		});

		test("expandTilde does not expand non-home prefix", () => {
			assert.strictEqual(
				__test__.expandTilde("~not-home/file"),
				"~not-home/file",
			);
			assert.strictEqual(__test__.expandTilde("/abs/path"), "/abs/path");
		});

		test("isPathLike identifies relative and absolute paths", () => {
			assert.strictEqual(__test__.isPathLike("treefmt"), false);
			assert.strictEqual(__test__.isPathLike("./treefmt"), true);
			assert.strictEqual(__test__.isPathLike("../treefmt"), true);
			assert.strictEqual(__test__.isPathLike("a/b"), true);
			assert.strictEqual(__test__.isPathLike(path.join("a", "b")), true);
			assert.strictEqual(__test__.isPathLike("/tmp"), true);
		});

		test("ensureDotPrefix adds dot when missing", () => {
			assert.strictEqual(__test__.ensureDotPrefix("toml"), ".toml");
			assert.strictEqual(__test__.ensureDotPrefix(".toml"), ".toml");
			assert.strictEqual(__test__.ensureDotPrefix(""), "");
		});

		test("pickPreferredExtension prefers simple alphanumerics", () => {
			assert.strictEqual(
				__test__.pickPreferredExtension([".foo-bar", ".foo"]),
				".foo",
			);
			assert.strictEqual(
				__test__.pickPreferredExtension([".foo+bar", ".foo-bar"]),
				".foo+bar",
			);
		});

		test("deriveExtensionFromFilename extracts extension", () => {
			assert.strictEqual(
				__test__.deriveExtensionFromFilename("pyproject.toml"),
				".toml",
			);
			assert.strictEqual(__test__.deriveExtensionFromFilename("a.b.c"), ".c");
			assert.strictEqual(
				__test__.deriveExtensionFromFilename("Makefile"),
				undefined,
			);
			assert.strictEqual(
				__test__.deriveExtensionFromFilename("dir/file.toml"),
				undefined,
			);
		});
	});
}
