import { afterEach, describe, expect, it } from "vitest";
import { rdapDomainAge, resetRegistryIndex } from "./domainAge";

afterEach(resetRegistryIndex);

const BOOTSTRAP = {
	services: [
		[["com"], ["https://rdap.verisign.com/com/v1/"]],
		[["au"], ["https://rdap.cctld.au/rdap/"]],
	],
};

/**
 * A fake registry. `held` maps a domain name to its registration date; anything
 * else answers 404, exactly as a real registry does for a name it does not hold.
 */
function registry(held: Record<string, string>) {
	const asked: string[] = [];

	const fetchImpl = (async (url: string | URL) => {
		const href = url.toString();

		if (href.includes("data.iana.org")) {
			return new Response(JSON.stringify(BOOTSTRAP), { status: 200 });
		}

		const domain = decodeURIComponent(href.slice(href.lastIndexOf("/domain/") + 8));
		asked.push(domain);

		const registration = held[domain];
		if (registration === undefined) return new Response("", { status: 404 });

		return new Response(
			JSON.stringify({ events: [{ eventAction: "registration", eventDate: registration }] }),
			{ status: 200 },
		);
	}) as unknown as typeof fetch;

	return { fetchImpl, asked };
}

describe("rdapDomainAge", () => {
	it("reports when the registrable domain behind a subdomain was registered", async () => {
		// The case the whole lookup exists for: a genuine ANZ careers host that
		// the Known Organisation list does not carry, and never will.
		const { fetchImpl } = registry({ "anz.com": "1996-06-04T00:00:00Z" });

		const since = await rdapDomainAge(fetchImpl)({ raw: "careers.anz.com", host: "careers.anz.com" });

		expect(since?.getUTCFullYear()).toBe(1996);
	});

	it("falls back to three labels when two are not held, for suffixes like com.au", async () => {
		const { fetchImpl, asked } = registry({ "anz.com.au": "1995-04-13T00:00:00Z" });

		const since = await rdapDomainAge(fetchImpl)({
			raw: "careers.anz.com.au",
			host: "careers.anz.com.au",
		});

		expect(asked).toEqual(["com.au", "anz.com.au"]);
		expect(since?.getUTCFullYear()).toBe(1995);
	});

	it("returns null for a name no registry holds, rather than guessing", async () => {
		const { fetchImpl } = registry({});

		const since = await rdapDomainAge(fetchImpl)({
			raw: "secure-verify-nz.com",
			host: "secure-verify-nz.com",
		});

		expect(since).toBeNull();
	});

	it("returns null for a TLD with no RDAP service at all, which is every .nz", async () => {
		const { fetchImpl, asked } = registry({});

		const since = await rdapDomainAge(fetchImpl)({ raw: "anz.co.nz", host: "anz.co.nz" });

		expect(since).toBeNull();
		// Nothing was asked of anybody: there is no registry to ask.
		expect(asked).toEqual([]);
	});

	it("throws rather than reporting 'unknown' when a registry errors", async () => {
		// A rate limit must not be indistinguishable from a young domain here —
		// checkAsync is the layer that decides to degrade, and it can only do that
		// honestly if this one refuses to guess. Same rule as googleSafeBrowsing.
		const fetchImpl = (async (url: string | URL) =>
			url.toString().includes("data.iana.org")
				? new Response(JSON.stringify(BOOTSTRAP), { status: 200 })
				: new Response("", { status: 429 })) as unknown as typeof fetch;

		await expect(
			rdapDomainAge(fetchImpl)({ raw: "anz.com", host: "anz.com" }),
		).rejects.toThrow("429");
	});
});
