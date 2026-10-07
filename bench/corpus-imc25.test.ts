import { describe, expect, it } from "vitest";

import { loadCorpus, splitOf } from "./corpus-imc25";

/**
 * The split is the instrument.
 *
 * `test` is the only half whose score means anything, and that is true only for
 * as long as the same 146 messages stay in it. These assertions exist because
 * the loading and splitting moved out of `bench/narrative-imc25.ts` so a second
 * runner could share it, and a refactor that silently shifted membership by one
 * row would invalidate every figure this project has published without
 * producing a single error.
 */
describe("the IMC25 corpus split", () => {
	const all = loadCorpus();
	const dev = splitOf(all, "dev");
	const test = splitOf(all, "test");

	it("is the whole corpus, cut exactly in half", () => {
		expect(all).toHaveLength(292);
		expect(dev).toHaveLength(146);
		expect(test).toHaveLength(146);
	});

	it("puts every message in exactly one half", () => {
		const ids = new Set(dev.map((i) => i.id));
		expect(test.some((i) => ids.has(i.id))).toBe(false);
		expect(new Set([...dev, ...test].map((i) => i.id)).size).toBe(292);
	});

	it("takes alternating rows, so the halves are the ones already measured", () => {
		expect(dev[0]?.id).toBe(all[0]?.id);
		expect(test[0]?.id).toBe(all[1]?.id);
		expect(dev[1]?.id).toBe(all[2]?.id);
	});

	it("splits each scam type evenly, which is what makes the strata comparable", () => {
		const count = (items: readonly { scamType: string }[]) => {
			const m = new Map<string, number>();
			for (const i of items) m.set(i.scamType, (m.get(i.scamType) ?? 0) + 1);
			return m;
		};
		const inDev = count(dev);
		for (const [type, n] of count(test)) expect(inDev.get(type), type).toBe(n);
	});

	it("carries the message text, not an empty column", () => {
		expect(all.every((i) => i.message.trim() !== "")).toBe(true);
	});
});
