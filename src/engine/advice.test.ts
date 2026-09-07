import { describe, expect, it } from "vitest";
import type { KnownOrganisation } from "../domain/types";
import { howToCheckYourself } from "./advice";

const withVerifiedRoute: KnownOrganisation = {
	name: "Example Bank",
	mentions: ["example bank"],
	domains: ["examplebank.co.nz"],
	phone: "0800 000 000",
	verifiedRoute: "Open the Example Bank app and use Check a Call.",
};

const phoneOnly: KnownOrganisation = {
	name: "Example Courier",
	mentions: ["example courier"],
	domains: ["examplecourier.co.nz"],
	phone: "0800 111 111",
	verifiedRoute: null,
};

const nothingConfirmed: KnownOrganisation = {
	name: "Example Agency",
	mentions: ["example agency"],
	domains: ["exampleagency.govt.nz"],
	phone: null,
	verifiedRoute: null,
};

describe("howToCheckYourself", () => {
	// The organisation's own channel is the strongest answer available: it is the
	// only one that can confirm a contact was genuine, rather than merely giving
	// the Checker somewhere safe to ask.
	it("prefers the organisation's own way of confirming", () => {
		expect(howToCheckYourself(withVerifiedRoute)).toBe(
			"To check for yourself: open the Example Bank app and use Check a Call. " +
				"Do not use any phone number or link in this message.",
		);
	});

	it("falls back to the real phone number when there is no such channel", () => {
		expect(howToCheckYourself(phoneOnly)).toBe(
			"To check for yourself: ring Example Courier on 0800 111 111, which is their real number. " +
				"Do not use any phone number or link in this message.",
		);
	});

	// With neither confirmed, the app still has something true to say — and it
	// says it without inventing a number, which is the one thing it must never do.
	it("invents nothing when neither has been confirmed", () => {
		expect(howToCheckYourself(nothingConfirmed)).toBe(
			"To check for yourself: contact Example Agency using a phone number you already have, " +
				"from a letter, a bill, or their app. Do not use any phone number or link in this message.",
		);
	});

	// The sentence exists to break the loop where a scam supplies its own proof.
	it("always tells the Checker not to use anything in the message", () => {
		for (const organisation of [withVerifiedRoute, phoneOnly, nothingConfirmed]) {
			expect(howToCheckYourself(organisation)).toContain(
				"Do not use any phone number or link in this message.",
			);
		}
	});

	it("uses no jargon", () => {
		for (const organisation of [withVerifiedRoute, phoneOnly, nothingConfirmed]) {
			expect(howToCheckYourself(organisation)).not.toMatch(/url|domain|phishing|verify|authenticate/i);
		}
	});
});
