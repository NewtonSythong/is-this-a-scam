import { describe, expect, it } from "vitest";
import type { KnownOrganisation, Link, Signal } from "../domain/types";
import { check } from "./check";
import { checkAsync } from "./checkAsync";
import type { LinkLookups } from "./lookups";

const ANZ: KnownOrganisation = {
	name: "ANZ",
	mentions: ["anz"],
	domains: ["anz.co.nz"],
	phone: "0800 269 296",
	verifiedRoute: null,
};

const ORGS = [ANZ];

const NOTHING_FOUND: LinkLookups = {
	expand: async () => null,
	dangerous: async () => [],
};

const expandingTo = (host: string): LinkLookups => ({
	expand: async (link: Link) => (link.host === "bit.ly" ? { raw: link.raw, host } : null),
	dangerous: async () => [],
});

const kinds = (message: string, lookups: LinkLookups) =>
	checkAsync(message, ORGS, lookups).then((verdict) => verdict.reasons);

describe("checkAsync: when the lookups find nothing extra", () => {
	it("gives exactly the answer the offline Check gives", async () => {
		const message = "ANZ: verify at anz-secure.top";

		expect(await checkAsync(message, ORGS, NOTHING_FOUND)).toEqual(check(message, ORGS));
	});
});

describe("checkAsync: following a shortened link to where it really goes", () => {
	// The point of expanding: the destination gets exactly the same scrutiny a
	// link written out in full would have got, through the very same rules.
	it("judges the destination, not the shortener", async () => {
		const verdict = await checkAsync(
			"ANZ: verify at bit.ly/3xYz",
			ORGS,
			expandingTo("anz-secure.top"),
		);

		expect(verdict.level).toBe("scam");
		expect(verdict.reasons).toContain(
			"This message says it is from ANZ, but the link goes to anz-secure.top, " +
				"which is not a real ANZ address.",
		);
	});

	it("tells the Checker what the short link was hiding", async () => {
		const reasons = await kinds("ANZ: verify at bit.ly/3xYz", expandingTo("anz-secure.top"));

		expect(reasons).toContain("The link bit.ly/3xYz is hiding its real address, anz-secure.top.");
	});

	// Once followed, the link is no longer merely opaque, so the "you cannot see
	// where this goes" Reason would now be false and must not appear.
	it("stops saying the destination is unknown once it is known", async () => {
		const reasons = await kinds("Your parcel: bit.ly/3xYz", expandingTo("somewhere-ordinary.com"));

		expect(reasons.join(" ")).not.toContain("You cannot see what it opens");
	});

	it("still cannot vouch for a short link that leads somewhere ordinary", async () => {
		const verdict = await checkAsync(
			"Your parcel: bit.ly/3xYz",
			ORGS,
			expandingTo("somewhere-ordinary.com"),
		);

		expect(verdict.level).toBe("unclear");
	});
});

describe("checkAsync: links on a public danger list", () => {
	const flagging = (raw: string): LinkLookups => ({
		expand: async () => null,
		dangerous: async () => [raw],
	});

	it("calls a known dangerous link a scam", async () => {
		const verdict = await checkAsync(
			"Your parcel: https://ordinary-looking.com/x",
			ORGS,
			flagging("https://ordinary-looking.com/x"),
		);

		expect(verdict.level).toBe("scam");
		expect(verdict.reasons[0]).toBe(
			"The link ordinary-looking.com is on a public list of websites known to be dangerous.",
		);
	});
});

// ADR 0003: the Check must never end in "sorry, try again", because a Checker
// reads that as "it's probably fine". Every failure below still produces a
// complete, usable Verdict.
describe("checkAsync: when the network fails", () => {
	const throwing: LinkLookups = {
		expand: async () => {
			throw new Error("network down");
		},
		dangerous: async () => {
			throw new Error("network down");
		},
	};

	it("falls back to the offline answer rather than failing", async () => {
		const message = "ANZ: verify at anz-secure.top";

		expect(await checkAsync(message, ORGS, throwing)).toEqual(check(message, ORGS));
	});

	it("keeps warning that a short link is opaque when it cannot be followed", async () => {
		const verdict = await checkAsync("Your parcel: bit.ly/3xYz", ORGS, throwing);

		expect(verdict.reasons[0]).toContain("hides where it really goes");
		expect(verdict.level).toBe("unclear");
	});

	it("survives one lookup failing while the other succeeds", async () => {
		const halfBroken: LinkLookups = {
			expand: async () => {
				throw new Error("network down");
			},
			dangerous: async () => ["https://ordinary-looking.com/x"],
		};

		const verdict = await checkAsync(
			"Your parcel: https://ordinary-looking.com/x",
			ORGS,
			halfBroken,
		);

		expect(verdict.level).toBe("scam");
	});

	it("never rejects, whatever the lookups do", async () => {
		await expect(checkAsync("anything at all", ORGS, throwing)).resolves.toBeDefined();
	});
});

describe("checkAsync: the Narrative Check", () => {
	const grandparentScam = "Hi Mum, this is my new number, my old phone broke.";

	const finding: Signal = {
		kind: "new-number-pretext",
		severity: "warning",
		organisation: null,
		reason: "This message says someone close to you has a new number.",
	};

	// The gap the Artifact Check structurally cannot close: no link, no lookalike,
	// no payment method named. This is the whole reason the Narrative Check exists.
	it("catches the scam the deterministic rules cannot see", async () => {
		const offline = await checkAsync(grandparentScam, ORGS, NOTHING_FOUND);
		const withNarrative = await checkAsync(
			grandparentScam,
			ORGS,
			NOTHING_FOUND,
			null,
			async () => [finding],
		);

		expect(offline.level).toBe("unclear");
		expect(withNarrative.level).toBe("warning");
		expect(withNarrative.reasons).toContain(finding.reason);
	});

	it("still lets the artifacts win when they are more alarming", async () => {
		const verdict = await checkAsync(
			"ANZ: verify at anz-secure.top",
			ORGS,
			NOTHING_FOUND,
			null,
			async () => [finding],
		);

		expect(verdict.level).toBe("scam");
		expect(verdict.reasons).toHaveLength(2);
		expect(verdict.reasons[0]).toContain("not a real ANZ address");
	});

	// Same discipline as the lookups: the model failing must not cost the Checker
	// their Verdict.
	it("falls back to the rest of the Check when the model fails", async () => {
		const verdict = await checkAsync(
			"ANZ: verify at anz-secure.top",
			ORGS,
			NOTHING_FOUND,
			null,
			async () => {
				throw new Error("model unavailable");
			},
		);

		expect(verdict).toEqual(check("ANZ: verify at anz-secure.top", ORGS));
	});

	it("never rejects when the model fails on a Message with nothing else in it", async () => {
		const verdict = await checkAsync(grandparentScam, ORGS, NOTHING_FOUND, null, async () => {
			throw new Error("model unavailable");
		});

		expect(verdict.level).toBe("unclear");
		expect(verdict.escalationIsPrimary).toBe(true);
	});
});
