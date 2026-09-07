import type { Answer, Ask, VerdictLevel } from "../domain/types";
import { isDialable, smsLink } from "./phone";

/**
 * The Trusted Person's side of the escalation: reading what they were sent, and
 * answering it in one tap.
 *
 * Everything here runs on their device from a link. There is no account, no
 * server call and nothing to install — a person who has been asked for help by
 * someone frightened should not first be asked to sign up.
 */

/**
 * How much Message the link carries.
 *
 * The whole link travels inside an SMS, so every character here is a character
 * of somebody's text message, and phones silently drop links past a certain
 * length. Six hundred characters holds any scam text and the first screen of a
 * forwarded email, which is enough to judge one by. The Checker's own quote in
 * the same SMS is trimmed harder still (see `askForHelp`), because between the
 * two of them the link is the copy that will actually be read.
 */
const MAX_CARRIED = 600;

/** How much the Trusted Person may add in their own words. */
const MAX_NOTE = 300;

/** Fragment keys. Single letters because each one costs SMS characters. */
const KEY = { message: "m", from: "f", to: "t", back: "b", level: "l" } as const;

/**
 * The link the Trusted Person taps.
 *
 * Note the `#`. Everything about the Message and both people sits in the
 * fragment, which browsers do not send to the server — so this link can be
 * opened without a single byte of it reaching us or appearing in a log. A query
 * string would have been simpler and would have quietly written every checked
 * message into the host's access log. See ADR 0013.
 */
export function askUrl(origin: string, ask: Ask): string {
	const params = new URLSearchParams();

	params.set(KEY.message, clamp(ask.message, MAX_CARRIED));
	if (ask.from !== null && ask.from.trim() !== "") params.set(KEY.from, ask.from.trim());
	if (ask.to !== null && ask.to.trim() !== "") params.set(KEY.to, ask.to.trim());
	if (ask.back !== null && isDialable(ask.back)) params.set(KEY.back, ask.back.trim());
	if (ask.level !== null) params.set(KEY.level, ask.level);

	return `${origin.replace(/\/+$/, "")}/asked#${params.toString()}`;
}

/**
 * What the link was carrying, or `null` if it was not carrying anything usable.
 *
 * Defensive throughout, for the same reason the Trusted Person's own storage is:
 * this string arrives from an SMS, and an SMS can be forwarded, truncated by a
 * carrier, or pasted back together by hand from two halves. A mangled link must
 * read as no link — a page saying "we could not read that" is recoverable, and a
 * page built from half a Message is worse than no page at all.
 */
export function parseAsk(hash: string): Ask | null {
	let params: URLSearchParams;
	try {
		params = new URLSearchParams(hash.replace(/^#/, ""));
	} catch {
		return null;
	}

	const message = params.get(KEY.message);
	if (message === null || message.trim() === "") return null;

	return {
		message,
		from: nonEmpty(params.get(KEY.from)),
		to: nonEmpty(params.get(KEY.to)),
		back: nonEmpty(params.get(KEY.back)),
		level: asLevel(params.get(KEY.level)),
	};
}

/**
 * The sentence the Trusted Person sends back, before anything they add.
 *
 * Written for them rather than by them because the hard part of helping is not
 * the opinion, it is the wording — "it's a scam" is easy to say and easy to say
 * incompletely, and the Checker needs to be told what *not* to do as much as
 * what happened. Each of the three carries the action with it, in the imperative,
 * with no conditions attached.
 *
 * The "genuine" answer still refuses to end there. A Trusted Person is a person
 * and can be wrong, and the cost of being wrong in that direction is somebody's
 * savings — so even a clear all-clear carries the one check that costs nothing.
 */
export function replyText(answer: Answer, note: string, from: string | null): string {
	const named = from !== null && from.trim() !== "";
	// The three answers are written to follow a greeting, so without one they
	// have to start the message themselves.
	const opening = named ? `Hi ${from?.trim()}, ${ANSWERS[answer]}` : capitalised(ANSWERS[answer]);
	const added = clamp(note, MAX_NOTE).trim();

	return `${opening}${added === "" ? "" : `\n\n${added}`}`;
}

const ANSWERS: Record<Answer, string> = {
	scam: "that one's a scam. Don't reply to it, don't tap anything in it, and don't ring any number it gives you. You can just delete it.",
	genuine:
		"I think that one's genuine. If it ever asks for money, a password or a code, ring them on a number you already have — not one from the message — before you do anything.",
	unsure:
		"I'm not sure about that one either. Don't reply to it or tap anything in it for now, and let's have a look at it together.",
};

/**
 * The answer as a link the Trusted Person's phone opens, or `null` when the
 * Checker never gave a number to answer on.
 *
 * `null` is not a failure: the Trusted Person is holding a text from the Checker,
 * so they can always reply in the thread it arrived in. The page offers them the
 * words to send instead of the tap.
 */
export function replyHref(back: string | null, text: string): string | null {
	if (back === null || !isDialable(back)) return null;

	return smsLink(back, text);
}

/**
 * What the app itself concluded, in a sentence for the Trusted Person.
 *
 * Shown so they know what has already been tried, and shown honestly: the most
 * common reason a Message reaches them at all is the third one, and hiding that
 * would invite them to assume the app agreed with whatever they decide.
 */
export function whatTheAppSaid(level: VerdictLevel | null): string | null {
	if (level === null) return null;

	return {
		scam: "The checker said this is a scam. They are asking you to confirm it.",
		warning: "The checker found warning signs in this, but could not be certain.",
		unclear: "The checker could not tell either way. That is why they are asking you.",
	}[level];
}

function capitalised(sentence: string): string {
	return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function nonEmpty(value: string | null): string | null {
	if (value === null) return null;

	return value.trim() === "" ? null : value;
}

function asLevel(value: string | null): VerdictLevel | null {
	return value === "scam" || value === "warning" || value === "unclear" ? value : null;
}

function clamp(text: string, limit: number): string {
	const trimmed = text.trim();

	return trimmed.length <= limit ? trimmed : `${trimmed.slice(0, limit)}… (shortened)`;
}
