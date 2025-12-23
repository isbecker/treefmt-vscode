import * as assert from "assert";
import { execFile } from "child_process";
import * as fs from "fs";

import type { TestContext } from "./testContext";

export function registerEnvironmentTests(ctx: TestContext): void {
	suite("Environment", () => {
		test("Treefmt is available (bundled or PATH)", async () => {
			if (fs.existsSync(ctx.treefmtPath)) {
				assert.ok(true, "bundled treefmt exists in ./bin");
				return;
			}

			const ext = process.platform === "win32" ? ".exe" : "";
			const commandName = `treefmt${ext}`;

			const ok = await new Promise<boolean>((resolve) => {
				execFile(commandName, ["--version"], (error) => {
					resolve(!error);
				});
			});
			assert.strictEqual(ok, true, "treefmt should be available on PATH");
		});
	});
}
