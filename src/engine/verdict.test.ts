import { describe, expect, it } from "vitest";
import type { KnownOrganisation, Signal } from "../domain/types";
import { verdictFrom } from "./verdict";

const ANZ: KnownOrganisation = {
	name: "ANZ",
	mentions: ["anz"],
	domains: ["anz.co.nz"],
	phone: "0800 123 456",
	verifiedRoute: null,
};

const signal = (
	severity: Signal["severity"],
	reason: string,
	organisation: string | null = null,
): Signal => ({
	kind: `test-${severity}`,
	severity,
	reason,
	organisation,
});

describe("verdictFrom: the three outcomes", () => {
	// The heart of ADR 0001. Finding nothing is not the same as finding nothing
	// wrong, and this is the test that stops a future rule-set change from
	// quietly turning silence into reassurance.
	it("returns 'we can't tell' when there are no Signals at all", () => {
		const verdict = verdictFrom([], [ANZ]);

		expect(verdict.level).toBe("unclear");
		expect(verdict.headline).toBe(
			"We can't tell. Don't act on this until someone you trust has looked.",
		);
	});

	it("never says anything is safe", () => {
		const everyPossible = [
			verdictFrom([], []),
			verdictFrom([signal("unclear", "a")], []),
			verdictFrom([signal("warning", "a")], []),
			verdictFrom([signal("scam", "a")], []),
		];

		for (const verdict of everyPossible) {
			expect(verdict.headline).not.toMatch(/\bsafe\b|\bfine\b|\bgenuine\b|\blegitimate\b/i);
		}
	});

	it("calls it a scam when any Signal says scam", () => {
		const verdict = verdictFrom([signal("scam", "a")], []);

		expect(verdict.level).toBe("scam");
		expect(verdict.headline).toBe("This is a scam. Do not reply, do not tap the link.");
	});

	it("warns when the worst Signal is a warning", () => {
		const verdict = verdictFrom([signal("warning", "a")], []);

		expect(verdict.level).toBe("warning");
		expect(verdict.headline).toBe("This has warning signs. Don't do anything it asks yet.");
	});

	// ADR 0003, applied to the whole Signal set rather than just the two engines:
	// the most alarming wins outright. Averaging would let a pile of mild Signals
	// talk down a single decisive one.
	it("takes the most alarming Signal, never an average", () => {
		const verdict = verdictFrom(
			[signal("unclear", "a"), signal("warning", "b"), signal("scam", "c")],
			[],
		);

		expect(verdict.level).toBe("scam");
	});

	it("puts the most alarming Reason first", () => {
		const verdict = verdictFrom(
			[signal("unclear", "mild"), signal("scam", "severe"), signal("warning", "middling")],
			[],
		);

		expect(verdict.reasons).toEqual(["severe", "middling", "mild"]);
	});

	it("does not repeat a Reason it has already given", () => {
		const verdict = verdictFrom([signal("warning", "same"), signal("warning", "same")], []);

		expect(verdict.reasons).toEqual(["same"]);
	});
});

describe("verdictFrom: what the Checker is told to do next", () => {
	// ADR 0007. When the app cannot settle it, handing the Message to a person is
	// the answer, not an apology.
	it("makes asking someone the main action when it cannot tell", () => {
		expect(verdictFrom([], []).escalationIsPrimary).toBe(true);
	});

	it("does not make asking someone the main action once it is sure", () => {
		expect(verdictFrom([signal("scam", "a")], []).escalationIsPrimary).toBe(false);
	});

	// ADR 0009. A scam supplies its own proof, so the Checker is always pointed
	// at a channel the Message had no hand in choosing.
	it("says how to check with the organisation the Signals implicate", () => {
		const verdict = verdictFrom([signal("scam", "a", "ANZ")], [ANZ]);

		expect(verdict.howToCheck).toBe(
			"To check for yourself: ring ANZ on 0800 123 456, which is their real number. " +
				"Do not use any phone number or link in this message.",
		);
	});

	it("offers no such advice when no organisation is implicated", () => {
		expect(verdictFrom([signal("scam", "a")], [ANZ]).howToCheck).toBeNull();
	});

	it("always carries the disclaimer that the check can be wrong", () => {
		for (const verdict of [verdictFrom([], []), verdictFrom([signal("scam", "a")], [])]) {
			expect(verdict.disclaimer).toBe(
				"This check is done by a computer and can be wrong. If you are unsure, ask someone you trust.",
			);
		}
	});
});

describe("verdictFrom: the Suspicion Score stays inside", () => {
	// ADR 0001 keeps a number for tuning and tests, and keeps it away from the
	// Checker. Nesting it under `internal` is what makes rendering it by accident
	// take a deliberate keystroke.
	it("keeps the score off the top level of the Verdict", () => {
		expect(Object.keys(verdictFrom([signal("scam", "a")], []))).not.toContain("score");
	});

	it("scores a worse Signal set higher", () => {
		const mild = verdictFrom([signal("unclear", "a")], []).internal.score;
		const bad = verdictFrom([signal("scam", "a")], []).internal.score;

		expect(bad).toBeGreaterThan(mild);
	});

	it("scores nothing as nothing", () => {
		expect(verdictFrom([], []).internal.score).toBe(0);
	});
});
