import type { TrustedPerson } from "../domain/types";
import { isDialable, smsLink } from "./phone";

/**
 * How much of the Message to quote when the SMS is the only copy.
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
 * How much to quote when a link to the answer page goes with it.
 *
 * The link carries its own copy of the Message, so the same text is now in the
 * SMS twice and the two together must still fit. The quote becomes a preview —
 * enough for the Trusted Person to see what this is about in the notification,
 * with the readable copy one tap away. It is deliberately the quote that gives
 * way rather than the link, because the link is the half that can be answered.
 */
const MAX_QUOTED_WITH_LINK = 300;

/**
 * The message a Checker sends to their Trusted Person.
 *
 * It quotes the Message rather than summarising it, because the Trusted Person is
 * being asked to judge the exact words — a summary would hide the very details
 * they are looking at it for. And it is written in the Checker's voice, as a
 * question between two people, rather than as a notification from an app: what
 * makes this work is a person the Checker already trusts, not a system.
 *
 * `link` points at the page where they can answer in one tap (ADR 0013). It is
 * optional, and everything still works without it: the quote alone is a question
 * from a person they know, which is what this was before the page existed and
 * what it falls back to on a phone that will not open the link.
 */
export function askForHelp(
	person: TrustedPerson,
	message: string,
	link: string | null = null,
): string {
	const limit = link === null ? MAX_QUOTED : MAX_QUOTED_WITH_LINK;
	const question =
		`Hi ${person.name.trim()}, I got this message and I'm not sure if it's real. ` +
		`Can you have a look?\n\n"${quoted(message, limit)}"`;

	return link === null ? question : `${question}\n\nRead it and tell me here:\n${link}`;
}

function quoted(message: string, limit: number): string {
	const trimmed = message.trim();

	return trimmed.length <= limit ? trimmed : `${trimmed.slice(0, limit)}… (shortened)`;
}

/**
 * A link the phone opens in its own messaging app, pre-filled.
 *
 * The phone sends it, not us. Nothing about the Trusted Person — not their name,
 * not their number — and nothing about the Message ever reaches the server, which
 * is what lets this feature exist without touching ADR 0005.
 */
export function smsHref(person: TrustedPerson, body: string): string {
	return smsLink(person.phone, body);
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
	return person.name.trim() !== "" && isDialable(person.phone);
}
