import { describe, expect, it } from "vitest";
import { extractLinks, hostBelongsTo } from "./links";

describe("extractLinks", () => {
	it("finds a plain https link", () => {
		expect(extractLinks("Track your parcel at https://nzpost.co.nz/track")).toEqual([
			{ raw: "https://nzpost.co.nz/track", host: "nzpost.co.nz" },
		]);
	});

	// Scam texts very often omit the scheme, because it looks less like a link
	// and more like something you are simply told to go to.
	it("finds a link with no scheme", () => {
		expect(extractLinks("Go to nzpost-delivery.top/track now")).toEqual([
			{ raw: "nzpost-delivery.top/track", host: "nzpost-delivery.top" },
		]);
	});

	it("strips www. from the host but leaves the raw text alone", () => {
		expect(extractLinks("visit WWW.ANZ.CO.NZ today")).toEqual([
			{ raw: "WWW.ANZ.CO.NZ", host: "anz.co.nz" },
		]);
	});

	// A sentence-ending full stop is not part of the address. Getting this wrong
	// turns every link at the end of a sentence into an unknown host.
	it("does not swallow trailing sentence punctuation", () => {
		expect(extractLinks("Confirm at anz-secure.top.")).toEqual([
			{ raw: "anz-secure.top", host: "anz-secure.top" },
		]);
	});

	// An email address contains a dot-separated domain and would otherwise be
	// picked up as a link, producing a Reason about a link that is not there.
	it("does not treat an email address as a link", () => {
		expect(extractLinks("Email us at support@anz.co.nz")).toEqual([]);
	});

	it("finds several links at once", () => {
		expect(extractLinks("either bit.ly/3xYz or https://asb.co.nz/help")).toEqual([
			{ raw: "bit.ly/3xYz", host: "bit.ly" },
			{ raw: "https://asb.co.nz/help", host: "asb.co.nz" },
		]);
	});

	it("finds nothing in a message with no links", () => {
		expect(extractLinks("Hi Mum, this is my new number, my old phone broke.")).toEqual([]);
	});

	// "3.30pm", "$1,250.00" and similar must not read as hosts. The guard is that
	// the last label has to look like a real top-level domain.
	it("ignores numbers that merely contain dots", () => {
		expect(extractLinks("Your payment of $1,250.00 is due at 3.30pm")).toEqual([]);
	});
});

describe("hostBelongsTo", () => {
	it("matches the domain itself", () => {
		expect(hostBelongsTo("anz.co.nz", ["anz.co.nz"])).toBe(true);
	});

	it("matches a subdomain", () => {
		expect(hostBelongsTo("secure.anz.co.nz", ["anz.co.nz"])).toBe(true);
	});

	// This is the case a naive `host.includes(domain)` gets catastrophically
	// wrong: the host ends in .top and is controlled by the attacker, but it
	// contains the real domain as a prefix, so a substring check calls it ANZ.
	it("rejects a host that only contains the domain as a prefix", () => {
		expect(hostBelongsTo("anz.co.nz.secure-login.top", ["anz.co.nz"])).toBe(false);
	});

	// The other direction of the same mistake: a hyphenated lookalike.
	it("rejects a hyphenated lookalike", () => {
		expect(hostBelongsTo("anz-secure.top", ["anz.co.nz"])).toBe(false);
	});

	// A domain boundary is a dot, so "notanz.co.nz" is a different organisation.
	it("rejects a host that merely ends with the domain text", () => {
		expect(hostBelongsTo("notanz.co.nz", ["anz.co.nz"])).toBe(false);
	});

	it("matches any one of several owned domains", () => {
		expect(hostBelongsTo("anz.com", ["anz.co.nz", "anz.com"])).toBe(true);
	});
});
