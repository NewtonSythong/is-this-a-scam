import { describe, expect, it } from "vitest";
import type { KnownOrganisation } from "../domain/types";
import { check } from "./check";

const ANZ: KnownOrganisation = {
	name: "ANZ",
	mentions: ["anz"],
	domains: ["anz.co.nz"],
	phone: "0800 123 456",
	verifiedRoute: null,
};

const NZ_POST: KnownOrganisation = {
	name: "NZ Post",
	mentions: ["nz post", "nzpost"],
	domains: ["nzpost.co.nz"],
	phone: null,
	verifiedRoute: null,
};

const ORGS = [ANZ, NZ_POST];

describe("check: a whole Message in, a whole Verdict out", () => {
	it("settles a bank impersonation with a lookalike link", () => {
		const verdict = check("ANZ: unusual activity on your card. Verify at anz-secure.top", ORGS);

		expect(verdict.level).toBe("scam");
		expect(verdict.headline).toBe("This is a scam. Do not reply, do not tap the link.");
		expect(verdict.reasons).toEqual([
			"This message says it is from ANZ, but the link goes to anz-secure.top, " +
				"which is not a real ANZ address.",
		]);
		expect(verdict.howToCheck).toContain("ring ANZ on 0800 123 456");
	});

	// The case the whole product exists for, and the one that would tempt a
	// classifier into saying "nothing found, looks fine". There is no link, no
	// lookalike, no payment method named — and the answer must still not reassure.
	it("does not reassure about a pure impersonation it cannot see into", () => {
		const verdict = check("Hi Mum, this is my new number, my old phone broke.", ORGS);

		expect(verdict.level).toBe("unclear");
		expect(verdict.reasons).toEqual([]);
		expect(verdict.escalationIsPrimary).toBe(true);
		expect(verdict.headline).not.toMatch(/\bsafe\b|\bfine\b/i);
	});

	// A genuine bank message. The Artifact Check finds nothing wrong with it, and
	// the app still declines to vouch for it — this is ADR 0001 at its most
	// uncomfortable, and it is deliberate.
	it("declines to vouch even for a message that looks entirely genuine", () => {
		const verdict = check("ANZ: your statement is ready at https://anz.co.nz/statements", ORGS);

		expect(verdict.level).toBe("unclear");
		expect(verdict.headline).toBe(
			"We can't tell. Don't act on this until someone you trust has looked.",
		);
	});

	it("escalates the grandparent scam once a payment method is named", () => {
		const verdict = check(
			"Hi Nana, my phone broke. Can you buy a $200 gift card and send me the code?",
			ORGS,
		);

		expect(verdict.level).toBe("warning");
		expect(verdict.reasons).toEqual([
			"This message asks you to pay with a gift card. Real businesses and government " +
				"departments never ask to be paid that way.",
		]);
	});

	it("reports a courier lookalike and points at the right organisation", () => {
		const verdict = check("Your parcel is held. Pay the fee at nzpost-track.top", ORGS);

		expect(verdict.level).toBe("scam");
		expect(verdict.reasons[0]).toContain("made to look like NZ Post");
		// NZ Post has no confirmed number in this fixture, so the advice must fall
		// back to something true rather than inventing one.
		expect(verdict.howToCheck).toContain("using a phone number you already have");
	});

	it("gathers several Reasons and leads with the worst", () => {
		const verdict = check("ANZ: verify at anz-secure.top and buy a gift card", ORGS);

		expect(verdict.level).toBe("scam");
		expect(verdict.reasons).toHaveLength(2);
		expect(verdict.reasons[0]).toContain("not a real ANZ address");
		expect(verdict.reasons[1]).toContain("gift card");
	});

	it("treats an empty message as something it cannot tell", () => {
		expect(check("", ORGS).level).toBe("unclear");
	});
});
