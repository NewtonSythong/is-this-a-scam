/**
 * Turning a number a person typed into one a phone will dial.
 *
 * Shared by both halves of the escalation: the Checker's phone opening a message
 * to their Trusted Person, and the Trusted Person's phone opening the answer
 * back. Both take a number somebody typed by hand, and neither may care how it
 * was written.
 */

/**
 * The number with everything but the digits removed, keeping a leading `+`.
 *
 * People write their family's numbers with spaces, dashes and brackets. Phones
 * want none of that in a link.
 */
export function dialable(phone: string): string {
	const digits = phone.replace(/[^\d]/g, "");

	return phone.trim().startsWith("+") ? `+${digits}` : digits;
}

/** Whether there is a number here at all. Deliberately permissive about shape. */
export function isDialable(phone: string): boolean {
	return /\d/.test(phone);
}

/**
 * A link the phone opens in its own messaging app, pre-filled.
 *
 * The phone sends it, not us — nothing about the recipient and nothing about the
 * message ever reaches the server, which is what lets the whole escalation exist
 * without touching ADR 0005.
 */
export function smsLink(phone: string, body: string): string {
	return `sms:${dialable(phone)}?body=${encodeURIComponent(body)}`;
}
