import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The corpus measures the engine only for as long as the engine has never been
 * developed against it.
 *
 * `src/data/scamLibrary.nz.ts` is the cautionary example and says so itself: the
 * engine was built against those examples and the test beside them asserts their
 * verdicts, so it passes them by construction and they measure nothing. This
 * test is what stops `bench/` quietly becoming the same thing — the rule in
 * CONTRIBUTING.md is enforced here rather than left as a convention somebody
 * remembers, because the person who breaks it will be trying to fix a real miss
 * and will have every reason to believe it is fine.
 */
describe("the benchmark corpus is held out", () => {
	it("is imported by nothing the app ships", () => {
		const offenders = sourceFiles(["src", "app"]).filter((file) =>
			/from\s+["'][^"']*bench\//.test(readFileSync(file, "utf8")),
		);

		expect(offenders, "these import the corpus the engine is measured against").toEqual([]);
	});
});

function sourceFiles(roots: readonly string[]): string[] {
	const found: string[] = [];

	for (const root of roots) walk(root, found);

	return found;
}

function walk(directory: string, found: string[]): void {
	for (const entry of readdirSync(directory)) {
		const path = join(directory, entry);

		if (statSync(path).isDirectory()) {
			if (entry !== "node_modules") walk(path, found);
		} else if (/\.tsx?$/.test(entry)) {
			found.push(path);
		}
	}
}
