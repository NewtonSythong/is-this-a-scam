import { describe, expect, it } from "vitest";
import type { KnownOrganisation, Link, Signal } from "../domain/types";
import { check } from "./check";
import { checkAsync } from "./checkAsync";
import { NO_LOOKUPS, type LinkLookups } from "./lookups";

const ANZ: KnownOrganisation = {
	name: "ANZ",
	mentions: ["anz"],
	domains: ["anz.co.nz"],
	phone: "0800 269 296",
	verifiedRoute: null,
};

const ORGS = [ANZ];

const NOTHING_FOUND: LinkLookups = NO_LOOKUPS;

const expandingTo = (host: string): LinkLookups => ({
	...NO_LOOKUPS,
	expand: async (link: Link) => (link.host === "bit.ly" ? { raw: link.raw, host } : null),
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
		...NO_LOOKUPS,
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
	// Async, not sync: a lookup that throws before returning a promise would
	// escape `checkAsync`'s .catch() entirely, and the whole point of these tests
	// is that it does not.
	const down = async () => {
		throw new Error("network down");
	};

	const throwing: LinkLookups = {
		expand: down,
		dangerous: down,
		establishedSince: down,
		destination: down,
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
			...NO_LOOKUPS,
			expand: down,
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

// The case that motivated the whole lookup: an attacker serving a bank's sign-in
// page from a host they compromised. The domain is genuinely old, so registration
// age exempts it from the impersonation rules, and nothing but the page itself
// can say what it is being used for.
describe("checkAsync: a sign-in page for somebody it is not", () => {
	const YEARS_AGO = new Date("2010-01-01");

	const serving = (page: { asksForPassword: boolean; presentsAs: string }): LinkLookups => ({
		...NO_LOOKUPS,
		establishedSince: async () => YEARS_AGO,
		destination: async () => page,
	});

	const MESSAGE = "ANZ: your account needs verifying. Sign in at old-host.example/login";

	it("calls it a scam even though the domain is far too old to accuse", async () => {
		const verdict = await checkAsync(
			MESSAGE,
			ORGS,
			serving({ asksForPassword: true, presentsAs: "ANZ Internet Banking" }),
		);

		expect(verdict.level).toBe("scam");
		expect(verdict.reasons[0]).toContain("asks for your ANZ password");
	});

	// Proof the age exemption is doing its job in this fixture, so the test above
	// is measuring the new rule rather than the absence of the old one.
	it("would have said nothing about that host without the page", async () => {
		const verdict = await checkAsync(MESSAGE, ORGS, {
			...NO_LOOKUPS,
			establishedSince: async () => YEARS_AGO,
		});

		expect(verdict.level).toBe("unclear");
	});

	// Half the web has a password field. On its own it is not evidence of anything,
	// and treating it as such would re-create the false-alarm class the age lookup
	// was built to end.
	it("says nothing about a sign-in page that is not wearing the name", async () => {
		const verdict = await checkAsync(
			MESSAGE,
			ORGS,
			serving({ asksForPassword: true, presentsAs: "Inserve Portal" }),
		);

		expect(verdict.level).toBe("unclear");
	});

	// And the name on its own is not evidence either: a news article about ANZ is
	// not a phishing page.
	it("says nothing about a page that names the bank but asks for nothing", async () => {
		const verdict = await checkAsync(
			MESSAGE,
			ORGS,
			serving({ asksForPassword: false, presentsAs: "ANZ Internet Banking" }),
		);

		expect(verdict.level).toBe("unclear");
	});

	// Word boundaries, the same ones the prose goes through. A shared matcher is
	// the only way these two questions cannot drift apart.
	it("does not read Franzia as the bank", async () => {
		const verdict = await checkAsync(
			MESSAGE,
			ORGS,
			serving({ asksForPassword: true, presentsAs: "Franzia Wine Club" }),
		);

		expect(verdict.level).toBe("unclear");
	});
});

// Loading a page an attacker may control is the one lookup with a cost that is
// not just latency, so what is NOT fetched is part of the design and is asserted
// rather than assumed.
describe("checkAsync: what it declines to go and look at", () => {
	const watching = () => {
		const fetched: string[] = [];
		const lookups: LinkLookups = {
			...NO_LOOKUPS,
			destination: async (link) => {
				fetched.push(link.host);
				return null;
			},
		};
		return { fetched, lookups };
	};

	it("fetches nothing when the Message names no organisation", async () => {
		const { fetched, lookups } = watching();

		await checkAsync("Your parcel is waiting: some-host.example/x", ORGS, lookups);

		expect(fetched).toEqual([]);
	});

	it("fetches nothing when the link is the organisation's own", async () => {
		const { fetched, lookups } = watching();

		await checkAsync("ANZ: sign in at anz.co.nz/login", ORGS, lookups);

		expect(fetched).toEqual([]);
	});

	it("goes and looks when the Message names one and the link is not theirs", async () => {
		const { fetched, lookups } = watching();

		await checkAsync("ANZ: sign in at old-host.example/login", ORGS, lookups);

		expect(fetched).toEqual(["old-host.example"]);
	});
});
