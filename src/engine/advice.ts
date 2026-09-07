import type { KnownOrganisation } from "../domain/types";

const NEVER_FROM_THE_MESSAGE = "Do not use any phone number or link in this message.";

/**
 * What a Checker should do to confirm a contact for themselves.
 *
 * A scam supplies its own proof: the number to ring and the link to click both
 * lead back to the person running it, so a Checker who "checks" using anything
 * in the message is checking with the scammer. Every branch below therefore ends
 * with the same sentence, and the whole point of the advice is to send the
 * Checker down a channel the message had no hand in choosing.
 *
 * The branches are ordered by how much they can actually establish. An
 * organisation's own channel can confirm whether a contact was genuine; a real
 * phone number only gives the Checker somewhere safe to ask; and where neither
 * has been confirmed, the advice still has to be true, so it points at a number
 * the Checker already possesses rather than inventing one.
 */
export function howToCheckYourself(organisation: KnownOrganisation): string {
	return `To check for yourself: ${route(organisation)} ${NEVER_FROM_THE_MESSAGE}`;
}

function route(organisation: KnownOrganisation): string {
	if (organisation.verifiedRoute !== null) {
		return uncapitalise(organisation.verifiedRoute);
	}

	if (organisation.phone !== null) {
		return `ring ${organisation.name} on ${organisation.phone}, which is their real number.`;
	}

	return (
		`contact ${organisation.name} using a phone number you already have, ` +
		`from a letter, a bill, or their app.`
	);
}

function uncapitalise(sentence: string): string {
	return sentence.charAt(0).toLowerCase() + sentence.slice(1);
}
