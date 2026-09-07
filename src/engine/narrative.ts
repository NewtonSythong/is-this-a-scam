import type { Severity, Signal } from "../domain/types";

/**
 * One thing a language model may report having seen in a Message.
 *
 * The model does not write the Reason. It picks a pattern from this catalogue
 * and quotes the words that made it pick — and the Reason a Checker reads is the
 * one written here, in advance, by a person.
 *
 * That is ADR 0003's "a Reason may only cite evidence an engine actually
 * produced", made structural. A model free to phrase its own findings is a model
 * free to invent them, to hedge, to lecture, or to frighten someone with prose
 * nobody reviewed. Constraining it to a fixed vocabulary costs some nuance and
 * buys a guarantee about every sentence the app can ever say.
 */
interface NarrativePattern {
	id: string;
	severity: Severity;
	/** Told to the model, so it knows what it is looking for. */
	description: string;
	/** Shown to the Checker, exactly as written. */
	reason: string;
}

export const NARRATIVE_PATTERNS: readonly NarrativePattern[] = [
	{
		id: "new-number-pretext",
		severity: "warning",
		description: "Claims to be a family member or friend writing from a new or borrowed number.",
		reason:
			"This message says someone close to you has a new number. That is how a very common " +
			"scam begins. Ring the person on the number you already have for them.",
	},
	{
		id: "code-request",
		severity: "scam",
		description:
			"Asks for a one-time code, PIN, password, or a code that has just been texted to them.",
		reason:
			"This message asks for a code, PIN or password. Your bank, the police and the " +
			"government never ask for these. Anyone who does is trying to get into your account.",
	},
	{
		id: "secrecy-request",
		severity: "warning",
		description: "Asks the reader to keep the matter secret, or not to tell family or bank staff.",
		reason:
			"This message asks you to keep it to yourself. Real organisations never do that. " +
			"Telling someone you trust is exactly the right thing to do now.",
	},
	{
		id: "authority-threat",
		severity: "warning",
		description:
			"Claims to be police, a court, a bank, or a government body, and threatens arrest, a fine, or account closure.",
		reason:
			"This message threatens you with trouble if you do not act. Real organisations do not " +
			"rush people like this, and they do not threaten you by text.",
	},
	{
		id: "manufactured-urgency",
		severity: "warning",
		description: "Insists the reader must act immediately, today, or within a stated short deadline.",
		reason:
			"This message is trying to rush you. Being hurried is the point — it stops you " +
			"checking. Nothing genuine is ever lost by taking an hour to ask someone.",
	},
	{
		id: "unexpected-money",
		severity: "warning",
		description:
			"Offers money the reader did not expect — a prize, a refund, compensation, or an inheritance.",
		reason:
			"This message offers you money you were not expecting. Refunds and prizes that arrive " +
			"out of the blue are one of the most common ways people are caught.",
	},
	{
		id: "investment-promise",
		severity: "warning",
		description: "Promises high, quick, guaranteed or risk-free returns on money.",
		reason:
			"This message promises a return on your money that is too good to be true. No genuine " +
			"investment is guaranteed.",
	},
	{
		id: "romance-pretext",
		severity: "warning",
		description:
			"A recent or online-only acquaintance expresses affection and moves toward needing money or help.",
		reason:
			"This message is from someone building a close friendship and heading towards asking " +
			"for help with money. That is a long, patient scam, and it is very common.",
	},
];

/**
 * The Narrative Check itself (ADR 0003): the story a Message tells, judged.
 *
 * An interface rather than a direct call, for the same reason `LinkLookups` is
 * one — so `checkAsync` can be tested against every way this can behave,
 * including failing, without a key or a network.
 */
export type NarrativeCheck = (message: string) => Promise<Signal[]>;

/** What a language model reports back: which pattern, and the words that show it. */
export interface NarrativeFinding {
	pattern: string;
	/** Text copied out of the Message itself. Checked, not trusted. */
	quote: string;
}

const BY_ID = new Map(NARRATIVE_PATTERNS.map((pattern) => [pattern.id, pattern]));

/**
 * Turns what a model reported into Signals — discarding anything it cannot back up.
 *
 * Two guards, and both matter. A pattern the catalogue does not contain is
 * dropped, so a model cannot invent a category. And a quote that does not appear
 * in the Message is dropped with it, because a model that cannot point at the
 * words it is describing is describing something that is not there.
 *
 * The quote never reaches the Checker; it exists only so the claim can be
 * checked. That makes hallucination a thing this function detects rather than a
 * thing the Checker has to notice.
 */
export function narrativeSignals(
	message: string,
	findings: readonly NarrativeFinding[],
): Signal[] {
	const haystack = normalise(message);
	const seen = new Set<string>();
	const signals: Signal[] = [];

	for (const finding of findings) {
		const pattern = BY_ID.get(finding.pattern);
		if (!pattern) continue;
		if (seen.has(pattern.id)) continue;

		const quote = normalise(finding.quote);
		if (quote === "" || !haystack.includes(quote)) continue;

		seen.add(pattern.id);
		signals.push({
			kind: pattern.id,
			severity: pattern.severity,
			organisation: null,
			reason: pattern.reason,
		});
	}

	return signals;
}

/**
 * Case and whitespace are not evidence.
 *
 * A model asked to copy words out of a text message will reliably differ on
 * capitalisation and run of spaces, and rejecting a true finding over a double
 * space would make the guard useless. Everything else must match exactly.
 */
function normalise(text: string): string {
	return text.toLowerCase().replace(/\s+/g, " ").trim();
}
