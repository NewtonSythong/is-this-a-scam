import { describe, expect, it } from "vitest";
import type { Link } from "../domain/types";
import { googleSafeBrowsing, redirectFollower } from "./live";

const link = (raw: string, host: string): Link => ({ raw, host });

const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("googleSafeBrowsing", () => {
	it("asks about nothing when there are no links", async () => {
		let called = false;
		const dangerous = googleSafeBrowsing("key", async () => {
			called = true;
			return jsonResponse({});
		});

		expect(await dangerous([])).toEqual([]);
		expect(called).toBe(false);
	});

	// Scam messages usually write links without a scheme, and the API needs one.
	it("sends links as full addresses even when the message omitted the scheme", async () => {
		let sent: unknown;
		const dangerous = googleSafeBrowsing("key", async (_url, init) => {
			sent = JSON.parse(String(init?.body));
			return jsonResponse({});
		});

		await dangerous([link("nzpost-track.top/x", "nzpost-track.top")]);

		expect(sent).toMatchObject({
			threatInfo: { threatEntries: [{ url: "https://nzpost-track.top/x" }] },
		});
	});

	// A clean lookup comes back as an empty object, not an empty list.
	it("reads an empty response as nothing found", async () => {
		const dangerous = googleSafeBrowsing("key", async () => jsonResponse({}));

		expect(await dangerous([link("https://ok.example/x", "ok.example")])).toEqual([]);
	});

	it("maps a match back to the link exactly as the message wrote it", async () => {
		const dangerous = googleSafeBrowsing("key", async () =>
			jsonResponse({ matches: [{ threat: { url: "https://bad.example/x" } }] }),
		);

		expect(await dangerous([link("https://bad.example/x", "bad.example")])).toEqual([
			"https://bad.example/x",
		]);
	});

	// The critical failure case: a quota error must never be mistaken for a clean
	// result. Throwing is what lets checkAsync degrade honestly instead of
	// silently reporting that a dangerous link is fine.
	it("throws rather than reporting a quota failure as clean", async () => {
		const dangerous = googleSafeBrowsing("key", async () => jsonResponse({}, 429));

		await expect(dangerous([link("https://x.example/", "x.example")])).rejects.toThrow(/429/);
	});
});

describe("redirectFollower", () => {
	const redirectingTo = (location: string) =>
		new Response(null, { status: 301, headers: { location } });

	it("follows a redirect to its destination", async () => {
		const expand = redirectFollower(async (url) =>
			String(url) === "https://bit.ly/3xYz"
				? redirectingTo("https://anz-secure.top/login")
				: new Response(null, { status: 200 }),
		);

		expect(await expand(link("bit.ly/3xYz", "bit.ly"))).toEqual({
			raw: "bit.ly/3xYz",
			host: "anz-secure.top",
		});
	});

	it("follows a chain of several hops", async () => {
		const chain: Record<string, string> = {
			"https://bit.ly/a": "https://t.co/b",
			"https://t.co/b": "https://final.example/c",
		};
		const expand = redirectFollower(async (url) => {
			const next = chain[String(url)];
			return next ? redirectingTo(next) : new Response(null, { status: 200 });
		});

		expect((await expand(link("bit.ly/a", "bit.ly")))?.host).toBe("final.example");
	});

	it("resolves a relative redirect against the hop it is standing on", async () => {
		const expand = redirectFollower(async (url) =>
			String(url) === "https://bit.ly/a"
				? redirectingTo("/elsewhere")
				: new Response(null, { status: 200 }),
		);

		// A relative hop stays on bit.ly, which teaches the Checker nothing.
		expect(await expand(link("bit.ly/a", "bit.ly"))).toBeNull();
	});

	it("learns nothing from a link that does not redirect", async () => {
		const expand = redirectFollower(async () => new Response(null, { status: 200 }));

		expect(await expand(link("bit.ly/a", "bit.ly"))).toBeNull();
	});

	// A redirect loop must not hang the Check. After the cap it reports whatever
	// host it reached, and if that is still the shortener, nothing was learned.
	it("gives up on a chain that never settles", async () => {
		const expand = redirectFollower(
			async () => redirectingTo("https://bit.ly/loop"),
			3,
		);

		expect(await expand(link("bit.ly/a", "bit.ly"))).toBeNull();
	});

	it("never reads the destination's page body", async () => {
		const methods: string[] = [];
		const expand = redirectFollower(async (_url, init) => {
			methods.push(String(init?.method));
			return new Response(null, { status: 200 });
		});

		await expand(link("bit.ly/a", "bit.ly"));

		expect(methods).toEqual(["HEAD"]);
	});
});
