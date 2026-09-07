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

/**
 * Whether this is a New Zealand mobile number.
 *
 * Used on exactly one value: the number a Trusted Person's answer is sent to,
 * which arrives inside a link and so may have been written by whoever sent that
 * link rather than by the Checker. An unchecked number there means a stranger
 * can hand somebody a page whose one large button texts a number of the
 * stranger's choosing — which is how a premium-rate charge and a confirmed-live
 * number are harvested, and is a close cousin of the "reply Y" scam the engine
 * is weakest against.
 *
 * Every New Zealand mobile is 02, one more digit, then six to eight digits.
 * Premium-rate service numbers are 0900 followed by five or six, so insisting on
 * the 02 prefix excludes them entirely rather than by a blocklist that would
 * need maintaining. Source: Telephone numbers in New Zealand, Wikipedia,
 * checked 2026-09-07, against the NZ Telecommunications Forum numbering pages.
 *
 * The Checker's own entry of their Trusted Person's number is deliberately NOT
 * held to this: they typed it on their own device about someone they know, and
 * ADR 0006 keeping the app to New Zealand is not a reason to refuse to help
 * somebody whose daughter lives in Sydney.
 */
export function isNewZealandMobile(phone: string): boolean {
	const digits = dialable(phone);
	const national = digits.startsWith("+64")
		? `0${digits.slice(3)}`
		: digits.startsWith("64") && !digits.startsWith("640")
			? `0${digits.slice(2)}`
			: digits;

	return /^02\d{7,9}$/.test(national);
}

/**
 * Text with the characters that make a screen lie about its own contents
 * removed: control codes, and the bidirectional overrides and zero-width marks
 * that let displayed text differ from the text underneath it.
 *
 * This matters more here than almost anywhere, because the whole page is asking
 * somebody to judge a message character by character — a hostname especially.
 * Newlines survive, because in a forwarded message they are sometimes the tell.
 */
export function withoutInvisibles(text: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: removing them is the point
	return text.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "");
}
