import type { Link } from "../domain/types";
import type { LinkLookups } from "../engine/lookups";

/** Injectable so both lookups can be tested without a network. */
export type Fetch = typeof globalThis.fetch;

/** A link's text as a URL. Scam messages routinely omit the scheme. */
export function asUrl(link: Link): string {
	return /^https?:\/\//i.test(link.raw) ? link.raw : `https://${link.raw}`;
}

const THREAT_TYPES = [
	"MALWARE",
	"SOCIAL_ENGINEERING",
	"UNWANTED_SOFTWARE",
	"POTENTIALLY_HARMFUL_APPLICATION",
];

/**
 * Google Safe Browsing, as the `dangerous` half of the lookups (ADR 0008).
 *
 * Free for non-commercial use, which this is. It is the one part of a Check that
 * can point at an authority outside this project — the difference between "our
 * rules think this looks off" and "this address is on a published list of
 * dangerous sites", which is worth a great deal to a Checker who is being told
 * their own judgement is wrong.
 *
 * Throws on any non-OK response rather than returning "nothing found", because a
 * quota error must not be indistinguishable from a clean result. `checkAsync`
 * turns the throw into a silent, honest degradation.
 */
export function googleSafeBrowsing(apiKey: string, fetchImpl: Fetch = fetch) {
	return async function dangerous(links: readonly Link[]): Promise<readonly string[]> {
		if (links.length === 0) return [];

		const byUrl = new Map(links.map((link) => [asUrl(link), link.raw]));

		const response = await fetchImpl(
			`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(apiKey)}`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					client: { clientId: "is-this-a-scam", clientVersion: "0.0.1" },
					threatInfo: {
						threatTypes: THREAT_TYPES,
						platformTypes: ["ANY_PLATFORM"],
						threatEntryTypes: ["URL"],
						threatEntries: [...byUrl.keys()].map((url) => ({ url })),
					},
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Safe Browsing returned ${response.status}`);
		}

		// A clean lookup returns an empty object rather than an empty list.
		const body = (await response.json()) as { matches?: { threat?: { url?: string } }[] };

		return (body.matches ?? [])
			.map((match) => byUrl.get(match.threat?.url ?? ""))
			.filter((raw): raw is string => raw !== undefined);
	};
}

/**
 * Follows a shortened link to where it really goes (ADR 0008).
 *
 * Two deliberate restraints. It issues HEAD and never reads a response body, so
 * the destination page is never rendered or parsed — ADR 0008 rules out loading
 * attacker infrastructure on a Checker's behalf, and following the redirect chain
 * is as far as this goes. And it runs on the server, so the Checker's own browser
 * and IP never touch the address at all.
 *
 * Returns `null` when nothing was learned — no redirect, a chain that never
 * settles, or a hop that cannot be parsed. `null` means the Checker keeps the
 * honest "this link hides where it goes" warning.
 */
export function redirectFollower(fetchImpl: Fetch = fetch, maxHops = 5, timeoutMs = 4000) {
	return async function expand(link: Link): Promise<Link | null> {
		let current = asUrl(link);

		for (let hop = 0; hop < maxHops; hop++) {
			const response = await fetchImpl(current, {
				method: "HEAD",
				redirect: "manual",
				signal: AbortSignal.timeout(timeoutMs),
			});

			const location = response.headers.get("location");
			if (location === null) break;

			// Relative redirects are legal and common; resolve against the hop we
			// are standing on rather than assuming an absolute URL.
			current = new URL(location, current).toString();
		}

		const host = hostOf(current);

		// Landing back where we started tells the Checker nothing they did not
		// already know, so it is not worth a Reason.
		return host === null || host === link.host ? null : { raw: link.raw, host };
	};
}

function hostOf(url: string): string | null {
	try {
		return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
	} catch {
		return null;
	}
}

/** Both lookups, wired to the real internet. */
export function liveLookups(apiKey: string, fetchImpl: Fetch = fetch): LinkLookups {
	return {
		expand: redirectFollower(fetchImpl),
		dangerous: googleSafeBrowsing(apiKey, fetchImpl),
	};
}
