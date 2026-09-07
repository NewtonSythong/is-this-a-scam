import { describe, expect, it } from "vitest";
import { NARRATIVE_PATTERNS } from "../engine/narrative";
import { findingsFrom, systemPrompt } from "./anthropic";

describe("systemPrompt", () => {
	// Generated from the catalogue, so a pattern cannot be added in one place and
	// forgotten in the other.
	it("describes every pattern in the catalogue", () => {
		const prompt = systemPrompt();

		for (const pattern of NARRATIVE_PATTERNS) {
			expect(prompt, pattern.id).toContain(pattern.id);
			expect(prompt, pattern.id).toContain(pattern.description);
		}
	});

	// The quote is what the hallucination guard checks, so the instruction to copy
	// rather than paraphrase has to survive any future edit to this prompt.
	it("insists the quote is copied, not paraphrased", () => {
		expect(systemPrompt()).toMatch(/copied exactly and never paraphrased/);
	});

	// A model that feels obliged to find something will find something. Saying so
	// explicitly is the difference between an empty answer and an invented one.
	it("tells the model that finding nothing is a correct answer", () => {
		expect(systemPrompt()).toMatch(/empty list is a useful and correct answer/);
	});

	it("never asks the model to write advice", () => {
		expect(systemPrompt()).toMatch(/Do not write advice or explanation/);
	});
});

describe("findingsFrom", () => {
	it("reads a well-formed answer", () => {
		expect(
			findingsFrom({ findings: [{ pattern: "new-number-pretext", quote: "my new number" }] }),
		).toEqual([{ pattern: "new-number-pretext", quote: "my new number" }]);
	});

	it("reads an empty answer as nothing found", () => {
		expect(findingsFrom({ findings: [] })).toEqual([]);
	});

	// `parsed_output` is null when the response did not validate against the
	// schema. That must read as "found nothing", never as a crash.
	it("treats an unparsed response as nothing found", () => {
		expect(findingsFrom(null)).toEqual([]);
		expect(findingsFrom(undefined)).toEqual([]);
	});

	it("treats a malformed answer as nothing found", () => {
		expect(findingsFrom({})).toEqual([]);
		expect(findingsFrom({ findings: "lots" })).toEqual([]);
		expect(findingsFrom({ findings: [{ pattern: "new-number-pretext" }] })).toEqual([]);
		expect(findingsFrom("a string")).toEqual([]);
	});

	// The schema constrains `pattern` to the catalogue's ids, so this should never
	// arrive — but the app must not depend on that for its safety.
	it("refuses a pattern outside the catalogue even though the schema forbids one", () => {
		expect(findingsFrom({ findings: [{ pattern: "made-up", quote: "x" }] })).toEqual([]);
	});
});
