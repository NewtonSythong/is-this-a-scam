import type { Signal } from "../domain/types";

interface PaymentRail {
	kind: string;
	/**
	 * Phrases that name the payment method itself. Deliberately whole phrases —
	 * "gift card", never "card" — because "your card ending 4471" and "signed the
	 * card from all of us" are ordinary English, and a rule that fires on those
	 * teaches a Checker to stop reading the warnings.
	 */
	phrases: readonly RegExp[];
	reason: string;
}

const RAILS: readonly PaymentRail[] = [
	{
		kind: "gift-card-request",
		phrases: [
			/\bgift cards?\b/i,
			/\bitunes cards?\b/i,
			/\bgoogle play cards?\b/i,
			/\bsteam cards?\b/i,
			/\bprepaid cards?\b/i,
		],
		reason:
			"This message asks you to pay with a gift card. Real businesses and government " +
			"departments never ask to be paid that way.",
	},
	{
		kind: "untraceable-payment-request",
		phrases: [/\bbitcoin\b/i, /\bcrypto(currency)?\b/i, /\bwestern union\b/i, /\bmoneygram\b/i],
		reason:
			"This message asks you to send money in a way that cannot be undone. Once it is " +
			"sent, no bank can get it back for you.",
	},
];

/**
 * Signals raised by how a Message asks to be paid.
 *
 * This is the half of the Artifact Check that has nothing to do with links, and
 * it exists because the most dangerous messages often carry no link at all — the
 * payment gets arranged in conversation, which is precisely what makes it work.
 *
 * Every rail raises a warning rather than calling something a scam outright. Any
 * one of these phrases can appear innocently, and it is the Verdict that weighs
 * Signals together (ADR 0003); a single rule should not be able to condemn a
 * message on its own.
 */
export function paymentRailSignals(message: string): Signal[] {
	return RAILS.filter((rail) => rail.phrases.some((phrase) => phrase.test(message))).map(
		(rail) => ({
			kind: rail.kind,
			severity: "warning",
			organisation: null,
			reason: rail.reason,
		}),
	);
}
