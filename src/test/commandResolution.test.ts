import * as assert from "assert";
import * as path from "path";
import { __test__ } from "../treefmtUtils";
import type { TestContext } from "./testContext";

export function registerCommandResolutionTests(ctx: TestContext): void {
	suite("Utils: command resolution", () => {
		test("resolveConfiguredCommand resolves relative paths against workspaceRoot", () => {
			const resolved = __test__.resolveConfiguredCommand(
				"./bin/treefmt",
				ctx.workspaceRoot,
			);
			assert.strictEqual(
				resolved,
				path.resolve(ctx.workspaceRoot, "./bin/treefmt"),
			);

			const unchanged = __test__.resolveConfiguredCommand(
				"treefmt",
				ctx.workspaceRoot,
			);
			assert.strictEqual(unchanged, "treefmt");
		});

		test("resolveConfiguredCommand expands ~ before resolving", () => {
			const resolved = __test__.resolveConfiguredCommand(
				"~/bin/treefmt",
				ctx.workspaceRoot,
			);
			assert.ok(
				resolved.endsWith(`${path.sep}bin${path.sep}treefmt`),
				"resolved path should end with /bin/treefmt",
			);
			assert.ok(path.isAbsolute(resolved), "resolved path should be absolute");
		});

		test("commandIsExecutable returns true for node binary", async () => {
			const ok = await __test__.commandIsExecutable(
				process.execPath,
				ctx.workspaceRoot,
			);
			assert.strictEqual(ok, true);
		});

		test("commandIsExecutable returns false for missing binary", async () => {
			const ok = await __test__.commandIsExecutable(
				"definitely-not-a-real-command-xyz",
			);
			assert.strictEqual(ok, false);
		});

		test("resolveTreefmtConfig uses user-specified command when executable", async () => {
			const resolved = await __test__.resolveTreefmtConfig(
				ctx.mockExtensionContext,
				ctx.workspaceRoot,
				{ commandSetting: process.execPath, configSetting: null },
			);
			assert.strictEqual(resolved.command, process.execPath);
		});

		test("resolveTreefmtConfig ignores user command when not executable", async () => {
			const bogus = "./definitely-not-a-real-treefmt-binary";
			const resolved = await __test__.resolveTreefmtConfig(
				ctx.mockExtensionContext,
				ctx.workspaceRoot,
				{ commandSetting: bogus, configSetting: null },
			);
			assert.notStrictEqual(resolved.command, bogus);
			assert.ok(
				resolved.command.length > 0,
				"should still resolve some command",
			);
		});

		test("resolveTreefmtConfig keeps config path setting", async () => {
			const resolved = await __test__.resolveTreefmtConfig(
				ctx.mockExtensionContext,
				ctx.workspaceRoot,
				{ commandSetting: process.execPath, configSetting: "treefmt.toml" },
			);
			assert.strictEqual(resolved.configPath, "treefmt.toml");
		});
	});
}
