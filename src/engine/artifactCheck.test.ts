import { describe, expect, it } from "vitest";
import type { KnownOrganisation } from "../domain/types";
import { artifactCheck } from "./artifactCheck";

// Fixtures, deliberately not the real New Zealand list: these tests describe the
// behaviour of the rule, and should not start failing the day a real
// organisation registers another domain.
const ANZ: KnownOrganisation = {
	name: "ANZ",
	mentions: ["anz"],
	domains: ["anz.co.nz"],
	phone: null,
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

const kinds = (message: string) => artifactCheck(message, ORGS).map((signal) => signal.kind);

describe("artifactCheck: a link that the claimed organisation does not own", () => {
	it("flags a lookalike link when the message claims to be from the organisation", () => {
		const signals = artifactCheck("ANZ: unusual activity. Verify at anz-secure.top", ORGS);

		expect(signals).toHaveLength(1);
		expect(signals[0]?.kind).toBe("link-not-owned-by-claimed-org");
		expect(signals[0]?.severity).toBe("scam");
	});

	it("says which organisation and which link, in words with no jargon", () => {
		const [signal] = artifactCheck("ANZ: verify at anz-secure.top", ORGS);

		expect(signal?.reason).toBe(
			"This message says it is from ANZ, but the link goes to anz-secure.top, which is not a real ANZ address.",
		);
		expect(signal?.reason).not.toMatch(/url|domain|phishing|malicious/i);
	});

	it("stays quiet when the link really does belong to the organisation", () => {
		expect(kinds("ANZ: your statement is ready at https://anz.co.nz/statements")).toEqual([]);
	});

	it("accepts a subdomain of a domain the organisation owns", () => {
		expect(kinds("ANZ: log in at secure.anz.co.nz")).toEqual([]);
	});

	// The attacker's host opens with the real address and ends somewhere else.
	// This is the case a Checker cannot see and the whole rule exists for.
	it("flags a host that only opens with the real address", () => {
		expect(kinds("ANZ: verify at anz.co.nz.secure-login.top")).toEqual([
			"link-not-owned-by-claimed-org",
		]);
	});

	it("matches an organisation named with a space", () => {
		expect(kinds("NZ Post: your parcel is held. Pay at nzpost-track.top")).toEqual([
			"link-not-owned-by-claimed-org",
		]);
	});

	it("is not fooled by the organisation's name inside a longer word", () => {
		expect(kinds("Franz sent you a photo, see it at some-gallery.com")).toEqual([]);
	});

	it("stays quiet when no organisation is claimed at all", () => {
		expect(kinds("Your parcel is waiting at random-courier.com")).toEqual([]);
	});

	// The organisation's name appearing only *inside* the link is not the message
	// claiming to be from them, and the Reason this rule writes ("this message
	// says it is from ANZ") would be untrue. The lookalike rule below covers the
	// host itself, which is why the outcome here is that Signal and not this one.
	it("does not treat the organisation's name inside the link as a claim", () => {
		expect(kinds("Your parcel is waiting at anz-secure.top")).toEqual(["lookalike-link"]);
	});

	it("stays quiet when an organisation is named but there is no link", () => {
		expect(kinds("ANZ: your statement is ready. Log in through your usual app.")).toEqual([]);
	});

	// No link, no lookalike domain, no urgency keyword — the Artifact Check has
	// nothing to say about this one, and that is correct. It is the Narrative
	// Check's job (ADR 0003), and this test pins down the division of labour.
	it("has nothing to say about a pure impersonation with no artifacts", () => {
		expect(kinds("Hi Mum, this is my new number, my old phone broke.")).toEqual([]);
	});

	it("reports one signal per offending link", () => {
		expect(kinds("ANZ: verify at anz-secure.top or anz-verify.xyz")).toEqual([
			"link-not-owned-by-claimed-org",
			"link-not-owned-by-claimed-org",
		]);
	});
});

describe("artifactCheck: a link that wears an organisation's name without claiming it", () => {
	// The gap left by the rule above: nothing in the prose claims to be NZ Post,
	// so no Reason may say it does — but the host is still wearing their name.
	it("flags a host built out of an organisation's name", () => {
		const signals = artifactCheck("Your parcel is waiting at nzpost-track.top", ORGS);

		expect(signals).toHaveLength(1);
		expect(signals[0]?.kind).toBe("lookalike-link");
		expect(signals[0]?.severity).toBe("scam");
	});

	it("names the organisation being imitated, without claiming the message did", () => {
		const [signal] = artifactCheck("Your parcel is waiting at nzpost-track.top", ORGS);

		expect(signal?.reason).toBe(
			"The link nzpost-track.top is made to look like NZ Post, but it is not a real NZ Post address.",
		);
		expect(signal?.reason).not.toMatch(/url|domain|phishing|malicious/i);
	});

	it("leaves a genuine link alone", () => {
		expect(kinds("Your parcel is waiting at https://nzpost.co.nz/track")).toEqual([]);
	});

	// "franzia" contains "anz". Splitting the host on dots and hyphens and
	// matching whole pieces is what keeps an ordinary word from reading as a bank.
	it("does not read an organisation's name out of the middle of a word", () => {
		expect(kinds("Your wine order from franzia.com is on its way")).toEqual([]);
	});

	it("says nothing about a host that imitates nobody", () => {
		expect(kinds("Your parcel is waiting at random-courier.com")).toEqual([]);
	});

	// One link, one wrong. A Checker should be told once, in the most alarming
	// terms that apply, not handed two overlapping sentences about one link.
	it("reports the claim rule only, when both rules would fire on one link", () => {
		expect(kinds("ANZ: unusual activity. Verify at anz-secure.top")).toEqual([
			"link-not-owned-by-claimed-org",
		]);
	});
});

describe("artifactCheck: links that hide where they go, or use a throwaway ending", () => {
	it("flags a shortened link", () => {
		const signals = artifactCheck("Your parcel is waiting at bit.ly/3xYz", ORGS);

		expect(signals).toHaveLength(1);
		expect(signals[0]?.kind).toBe("shortened-link");
		// Unclear, not scam: plenty of honest messages use these. What it costs the
		// Checker is sight of where they are going, and that is what it says.
		expect(signals[0]?.severity).toBe("unclear");
	});

	it("explains that a shortened link hides its destination", () => {
		const [signal] = artifactCheck("Your parcel is waiting at bit.ly/3xYz", ORGS);

		expect(signal?.reason).toBe(
			"The link bit.ly/3xYz hides where it really goes. You cannot see what it opens " +
				"until you have already opened it.",
		);
	});

	it("flags a throwaway address ending", () => {
		const signals = artifactCheck("Your parcel is waiting at random-courier.top", ORGS);

		expect(signals).toHaveLength(1);
		expect(signals[0]?.kind).toBe("throwaway-ending");
		expect(signals[0]?.severity).toBe("warning");
	});

	it("leaves an ordinary New Zealand address alone", () => {
		expect(kinds("Your parcel is waiting at https://somecourier.co.nz/track")).toEqual([]);
	});

	// nzpost-track.top is both a lookalike and a throwaway ending. The Checker
	// hears the more alarming of the two, once.
	it("says one thing per link, choosing the most alarming", () => {
		expect(kinds("Your parcel is waiting at nzpost-track.top")).toEqual(["lookalike-link"]);
	});
});

describe("artifactCheck: a Message with no links at all", () => {
	// The rule that made the early return wrong: the most dangerous messages of
	// all carry no link, because the payment is arranged in conversation.
	it("still notices a payment request", () => {
		expect(kinds("Hi Mum, my phone broke. Can you buy a $200 gift card?")).toEqual([
			"gift-card-request",
		]);
	});

	it("reports what is in the links before what is in the words", () => {
		expect(kinds("ANZ: verify at anz-secure.top then buy a gift card")).toEqual([
			"link-not-owned-by-claimed-org",
			"gift-card-request",
		]);
	});
});
