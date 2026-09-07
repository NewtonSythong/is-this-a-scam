import type { TrustedPerson } from "../domain/types";

/**
 * How much of the Message to quote.
 *
 * An SMS link carrying a forwarded email can run to thousands of characters, and
 * phones silently drop links past a certain length — the Checker taps the button
 * and nothing happens, which is the worst possible failure for someone already
 * unsure whether the app works. A trimmed message that arrives beats a complete
 * one that does not, and the trim is labelled so the Trusted Person knows there
 * is more.
 */
const MAX_QUOTED = 900;

/**
 * The message a Checker sends to their Trusted Person.
 *
 * It quotes the Message rather than summarising it, because the Trusted Person is
 * being asked to judge the exact words — a summary would hide the very details
 * they are looking at it for. And it is written in the Checker's voice, as a
 * question between two people, rather than as a notification from an app: what
 * makes this work is a person the Checker already trusts, not a system.
 */
export function askForHelp(person: TrustedPerson, message: string): string {
	return (
		`Hi ${person.name.trim()}, I got this message and I'm not sure if it's real. ` +
		`Can you have a look?\n\n"${quoted(message)}"`
	);
}

function quoted(message: string): string {
	const trimmed = message.trim();

	return trimmed.length <= MAX_QUOTED
		? trimmed
		: `${trimmed.slice(0, MAX_QUOTED)}… (shortened)`;
}

/**
 * A link the phone opens in its own messaging app, pre-filled.
 *
 * The phone sends it, not us. Nothing about the Trusted Person — not their name,
 * not their number — and nothing about the Message ever reaches the server, which
 * is what lets this feature exist without touching ADR 0005.
 */
export function smsHref(person: TrustedPerson, body: string): string {
	return `sms:${dialable(person.phone)}?body=${encodeURIComponent(body)}`;
}

/**
 * The number with everything but the digits removed, keeping a leading `+`.
 *
 * People write their family's numbers with spaces, dashes and brackets. Phones
 * want none of that in a link.
 */
function dialable(phone: string): string {
	const digits = phone.replace(/[^\d]/g, "");

	return phone.trim().startsWith("+") ? `+${digits}` : digits;
}

/**
 * Whether there is enough here to actually ask anyone.
 *
 * Deliberately permissive about the shape of the number: people write numbers
 * however they like, and refusing a real one because it has brackets in it would
 * be the app declining to help for no reason. It only insists on a name to greet
 * them by and at least one digit to send to.
 */
export function isReachable(person: TrustedPerson): boolean {
	return person.name.trim() !== "" && /\d/.test(person.phone);
}
