import { describe, expect, it } from "vitest";
import { NARRATIVE_PATTERNS, narrativeSignals } from "./narrative";

const MESSAGE = "Hi Mum, this is my new number, my old phone broke. Don't tell Dad.";

const kinds = (findings: { pattern: string; quote: string }[]) =>
	narrativeSignals(MESSAGE, findings).map((signal) => signal.kind);

describe("narrativeSignals: what the model is allowed to say", () => {
	it("raises a Signal when the model points at real words", () => {
		expect(kinds([{ pattern: "new-number-pretext", quote: "this is my new number" }])).toEqual([
			"new-number-pretext",
		]);
	});

	// The Reason is the one written in the catalogue, never anything the model
	// composed. This is ADR 0003 enforced rather than requested.
	it("uses the Reason written by a person, not by the model", () => {
		const [signal] = narrativeSignals(MESSAGE, [
			{ pattern: "new-number-pretext", quote: "my new number" },
		]);

		expect(signal?.reason).toBe(
			"This message says someone close to you has a new number. That is how a very common " +
				"scam begins. Ring the person on the number you already have for them.",
		);
	});

	it("forgives differences in capitals and spacing", () => {
		expect(kinds([{ pattern: "new-number-pretext", quote: "THIS  IS   my New Number" }])).toEqual([
			"new-number-pretext",
		]);
	});

	it("reports several patterns from one Message", () => {
		expect(
			kinds([
				{ pattern: "new-number-pretext", quote: "my new number" },
				{ pattern: "secrecy-request", quote: "Don't tell Dad" },
			]),
		).toEqual(["new-number-pretext", "secrecy-request"]);
	});

	it("says a pattern once however often the model reports it", () => {
		expect(
			kinds([
				{ pattern: "new-number-pretext", quote: "my new number" },
				{ pattern: "new-number-pretext", quote: "my old phone broke" },
			]),
		).toEqual(["new-number-pretext"]);
	});
});

describe("narrativeSignals: what the model is not allowed to say", () => {
	// The hallucination guard. A model that cannot point at the words it is
	// describing is describing something that is not in the Message.
	it("throws away a finding whose quote is not in the Message", () => {
		expect(
			kinds([{ pattern: "code-request", quote: "send me the code from your bank" }]),
		).toEqual([]);
	});

	it("throws away a pattern that is not in the catalogue", () => {
		expect(kinds([{ pattern: "vibes-are-off", quote: "Hi Mum" }])).toEqual([]);
	});

	it("throws away an empty quote", () => {
		expect(kinds([{ pattern: "new-number-pretext", quote: "" }])).toEqual([]);
		expect(kinds([{ pattern: "new-number-pretext", quote: "   " }])).toEqual([]);
	});

	// A model that gets one finding wrong has not forfeited the others.
	it("keeps the findings it can back up and drops the ones it cannot", () => {
		expect(
			kinds([
				{ pattern: "code-request", quote: "never appeared anywhere" },
				{ pattern: "secrecy-request", quote: "Don't tell Dad" },
			]),
		).toEqual(["secrecy-request"]);
	});

	it("says nothing when the model reports nothing", () => {
		expect(kinds([])).toEqual([]);
	});
});

describe("the pattern catalogue", () => {
	it("gives every pattern a distinct id", () => {
		const ids = NARRATIVE_PATTERNS.map((pattern) => pattern.id);

		expect(new Set(ids).size).toBe(ids.length);
	});

	// The same rule the Artifact Check's Reasons live under. These sentences are
	// read by someone frightened, and every one of them is fixed text, so there is
	// no excuse for jargon slipping in.
	it("writes every Reason without jargon", () => {
		for (const pattern of NARRATIVE_PATTERNS) {
			expect(pattern.reason, pattern.id).not.toMatch(
				/url|domain|phishing|malicious|credential|two-factor|otp|social engineering/i,
			);
		}
	});

	it("tells the Checker something to do, not just something to fear", () => {
		for (const pattern of NARRATIVE_PATTERNS) {
			expect(pattern.reason.length, pattern.id).toBeGreaterThan(40);
		}
	});
});
