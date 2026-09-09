import { describe, expect, it } from "vitest";
import { NARRATIVE_PATTERNS } from "../engine/narrative";
import { findingsFrom, systemPrompt, tuningFor } from "./anthropic";

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

/*
 * The request shape is a property of the model. A benchmark that names a
 * cheaper model is worthless if the request it sends is refused, and the way
 * that failed was invisible: every call 400d, the harness retried each one, and
 * an hour of "progress" produced nothing at all.
 */
describe("tuningFor", () => {
	it("asks a current model for adaptive thinking and an effort level", () => {
		const tuning = tuningFor("claude-opus-5");

		expect(tuning.thinking).toEqual({ type: "adaptive" });
		expect(tuning.output_config).toHaveProperty("effort", "medium");
	});

	// Haiku 4.5 refuses both: "adaptive thinking is not supported on this model".
	it("gives an older model a fixed budget and no effort", () => {
		const tuning = tuningFor("claude-haiku-4-5");

		expect(tuning.thinking).toEqual({ type: "enabled", budget_tokens: 1024 });
		expect(tuning.output_config).not.toHaveProperty("effort");
	});

	it("keeps the thinking budget inside max_tokens", () => {
		const tuning = tuningFor("claude-haiku-4-5");
		const budget = "budget_tokens" in tuning.thinking ? tuning.thinking.budget_tokens : 0;

		expect(budget).toBeGreaterThanOrEqual(1024);
		expect(budget).toBeLessThan(4000);
	});

	it("always asks for the structured format, whichever model it is", () => {
		for (const model of ["claude-opus-5", "claude-haiku-4-5", "claude-sonnet-5"]) {
			expect(tuningFor(model).output_config, model).toHaveProperty("format");
		}
	});
});
