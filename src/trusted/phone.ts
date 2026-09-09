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
	return /^02\d{7,9}$/.test(national(phone));
}

/**
 * The number as it would be written at home in New Zealand: leading zero, no
 * country code.
 *
 * People give their own number in whichever form they last read it — off a
 * business card as `+64`, out of an email signature as `0064`, or the way they
 * say it aloud. These are the same number, and treating them as different ones
 * means the app quietly refuses a mobile that is perfectly real.
 */
function national(phone: string): string {
	const digits = dialable(phone);

	// `00` is how most of the world writes the international prefix that a `+`
	// stands for, and it is common on numbers copied out of email.
	const withoutPrefix = digits.startsWith("+")
		? digits.slice(1)
		: digits.startsWith("00")
			? digits.slice(2)
			: digits;

	// `640` would be a national number beginning 640-something rather than the
	// country code, so it is left alone.
	return withoutPrefix.startsWith("64") && !withoutPrefix.startsWith("640")
		? `0${withoutPrefix.slice(2)}`
		: withoutPrefix;
}

/**
 * What is wrong with a number, in terms of what the person will lose by it.
 *
 * This exists because the number a Checker gives as their own is silently
 * dropped when it is not a New Zealand mobile (see `isNewZealandMobile` above,
 * and `askUrl` in `reply.ts`). Silence is the wrong answer: they typed
 * something, the app appeared to accept it, and the consequence only shows up
 * much later on somebody else's phone, as a button that isn't there. The
 * Checker is never told, and cannot possibly work it out.
 *
 * Note that nothing here refuses anything. A diagnosis is something to say, not
 * a gate — the gate is `isNewZealandMobile`, and it stays exactly as strict as
 * it was, because it is a defence against a crafted link rather than a
 * formatting opinion.
 */
export type PhoneVerdict =
	/** Nothing typed. Both of these fields are optional; this is not an error. */
	| { kind: "empty" }
	/** A New Zealand mobile. Everything works. */
	| { kind: "mobile" }
	/**
	 * The same number, written in a way nothing will accept — almost always a
	 * mobile with its leading zero left off. `suggestion` is what they meant.
	 */
	| { kind: "correctable"; suggestion: string }
	/** A New Zealand landline. No text will ever arrive here. */
	| { kind: "landline" }
	/** A real number, just not a New Zealand one. Texts fine; cannot be replied to in one tap. */
	| { kind: "overseas" }
	/** Not enough digits to be a phone number at all. */
	| { kind: "unusable" };

/**
 * New Zealand landlines: an area code of 03, 04, 06, 07 or 09, then seven
 * digits. Worth naming separately from "not a mobile" because a landline is the
 * one wrong answer where the *message itself* never arrives — a person can put
 * their home phone in expecting a text on it, and nothing will ever come.
 *
 * Source: Telephone numbers in New Zealand, Wikipedia, checked 2026-09-09,
 * against the NZ Telecommunications Forum numbering pages.
 */
function isNewZealandLandline(phone: string): boolean {
	return /^0[34679]\d{7}$/.test(national(phone));
}

/** What to tell someone about the number they just typed. */
export function diagnose(phone: string): PhoneVerdict {
	const digits = dialable(phone).replace(/^\+/, "");

	if (digits === "") return { kind: "empty" };
	if (isNewZealandMobile(phone)) return { kind: "mobile" };
	if (isNewZealandLandline(phone)) return { kind: "landline" };

	// A mobile with the leading zero missed off: the right length, and starting
	// with the 2 that every New Zealand mobile starts with once the 0 is gone.
	// Checked against the mobile rule rather than trusted on shape alone, so
	// this can never suggest a number the gate would then refuse.
	// The suggestion keeps the spacing they typed — `21 555 0100` comes back as
	// `021 555 0100`, not as a ten-digit run. This app is read by people who find
	// a screen hard going, and a number grouped the way they wrote it is one they
	// can check at a glance against the phone in their other hand.
	if (/^2\d{7,9}$/.test(national(phone)) && isNewZealandMobile(`0${digits}`)) {
		return { kind: "correctable", suggestion: `0${phone.trim()}` };
	}

	// Long enough to be somebody's real number in another country. The Checker's
	// own number being overseas costs them the one-tap reply; a Trusted Person's
	// being overseas costs nothing at all, which is why this is not an error.
	if (digits.length >= 7) return { kind: "overseas" };

	return { kind: "unusable" };
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
