import { lookup } from "node:dns/promises";
import type { Link } from "../domain/types";
import { asUrl, type Fetch } from "./live";

/**
 * What the page at the other end of a link actually is (ADR 0008, amended
 * 2026-09-23).
 *
 * WHY THIS EXISTS. Registration age answered the false alarms and broke exactly
 * one thing, and the one it broke is the argument for this file.
 * `afterpay-verify-account-verbatim` links to `lahresour.inportal.nl` — a
 * genuine Dutch ticketing host, registered in 2020, that an attacker
 * compromised and served an Afterpay login form from. The domain really is old
 * and it really was hosting an attack, so no threshold recovers it. Age can say
 * where a page lives; only the page can say what it is for.
 *
 * This is SmishX's HTML-content step (Wang et al., SOUPS 2025 — see
 * `docs/method-alternatives.md`), minus their screenshot and vision model. What
 * it extracts is deliberately two facts and no more: whether the page asks for a
 * password, and what the page says it is. That pair is the whole claim the rule
 * above it makes — "this is a sign-in page for somebody it is not" — and
 * anything else fetched would be evidence nobody is going to use.
 *
 * WHAT KEEPS THIS SAFE, since ADR 0008 forbade it for two weeks and the reasons
 * were good ones:
 *
 *   - It runs on the server. The Checker's browser, IP and cookies never touch
 *     the address, which was already true of the redirect follower.
 *   - It is `fetch`, not a browser. No script runs, no subresource is loaded, no
 *     page is rendered anywhere.
 *   - Only `text/html` is read, and only the first `maxBytes` of it. A link to a
 *     500MB file costs one truncated read.
 *   - Every hop is resolved first and refused if it points anywhere inside the
 *     host network. A Check is a stranger's text arriving at our server, so
 *     "fetch that URL" is a request to make our server a confused deputy.
 *   - Nothing fetched is ever returned to the Checker. Two facts' worth of
 *     conclusion leaves this file; the attacker's bytes do not.
 */

/** The two facts a page is read for. Never the page itself. */
export interface DestinationPage {
	/** The page has a password field: it wants credentials, not a click. */
	asksForPassword: boolean;
	/** What the page presents itself as — its title and any site name it declares. */
	presentsAs: string;
}

/** Injectable so the address guard can be tested without a network or a DNS server. */
export type Resolve = (host: string) => Promise<readonly string[]>;

const HEADERS = {
	accept: "text/html",
	"user-agent": "is-this-a-scam/0.1 (+https://github.com/NewtonSythong/is-this-a-scam)",
};

const PASSWORD_FIELD = /<input\b[^>]*\btype\s*=\s*["']?password\b/i;
const TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const SITE_NAME =
	/<meta\b[^>]*\b(?:property|name)\s*=\s*["'](?:og:site_name|og:title|application-name)["'][^>]*\bcontent\s*=\s*["']([^"']*)["']/gi;

/**
 * Address ranges a public website is never legitimately at.
 *
 * The cloud metadata service at 169.254.169.254 is the one that matters most —
 * it hands out credentials to anything on the host that asks — but the whole
 * private space is refused, because a Check that can probe the inside of our own
 * network on a stranger's instruction is a port scanner with a friendly name.
 */
function isPublicAddress(address: string): boolean {
	if (address.includes(":")) {
		const ip = address.toLowerCase();
		// IPv4 wearing an IPv6 coat: ::ffff:127.0.0.1 is still loopback.
		const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
		if (mapped?.[1] !== undefined) return isPublicAddress(mapped[1]);

		if (ip === "::" || ip === "::1") return false;
		// Unique-local fc00::/7 and link-local fe80::/10.
		return !/^(f[cd]|fe[89ab])/.test(ip);
	}

	const octets = address.split(".").map(Number);
	if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return false;
	const [a = 0, b = 0] = octets;

	if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
	if (a === 169 && b === 254) return false;
	if (a === 172 && b >= 16 && b <= 31) return false;
	if (a === 192 && (b === 168 || b === 0)) return false;
	if (a === 100 && b >= 64 && b <= 127) return false;
	if (a === 198 && (b === 18 || b === 19)) return false;

	return true;
}

/**
 * Whether this URL may be fetched at all.
 *
 * ponytail: resolves the name and checks the answers, which leaves a rebinding
 * window between this lookup and `fetch`'s own. Closing it properly means
 * pinning the resolved address into a custom agent; do that if this ever runs
 * somewhere with anything worth reaching on the local network.
 */
async function mayFetch(url: URL, resolve: Resolve): Promise<boolean> {
	if (url.protocol !== "https:" && url.protocol !== "http:") return false;

	try {
		const addresses = await resolve(url.hostname);
		return addresses.length > 0 && addresses.every(isPublicAddress);
	} catch {
		return false;
	}
}

export async function defaultResolve(host: string): Promise<readonly string[]> {
	return (await lookup(host, { all: true })).map((entry) => entry.address);
}

/**
 * Reads what the page says about itself.
 *
 * ponytail: regex over HTML, which a crafted page can defeat — a password field
 * built by script, or a title assembled at runtime, is invisible here. Reach for
 * a real parser or SmishX's headless browser only if a measured miss says so;
 * the evidence a parser would add is small next to the evidence a *renderer*
 * would, and rendering is the line this amendment deliberately does not cross.
 */
export function readPage(html: string): DestinationPage {
	const title = TITLE.exec(html)?.[1] ?? "";
	const names = [...html.matchAll(SITE_NAME)].map((match) => match[1] ?? "");

	return {
		asksForPassword: PASSWORD_FIELD.test(html),
		presentsAs: [title, ...names].join(" ").replace(/\s+/g, " ").trim(),
	};
}

/**
 * Fetches a link's destination and reads those two facts off it.
 *
 * Returns `null` for everything that is not a readable HTML page — a refused
 * address, a non-HTML response, a timeout, a redirect chain that never settles.
 * `null` means the rule above simply does not fire, which is the same answer the
 * app gave before this lookup existed.
 */
export function destinationPage(
	fetchImpl: Fetch = fetch,
	resolve: Resolve = defaultResolve,
	{ maxHops = 5, timeoutMs = 6000, maxBytes = 256_000 } = {},
) {
	return async function destination(link: Link): Promise<DestinationPage | null> {
		let current: URL;
		try {
			current = new URL(asUrl(link));
		} catch {
			return null;
		}

		for (let hop = 0; hop <= maxHops; hop++) {
			if (!(await mayFetch(current, resolve))) return null;

			const response = await fetchImpl(current.toString(), {
				method: "GET",
				headers: HEADERS,
				redirect: "manual",
				signal: AbortSignal.timeout(timeoutMs),
			});

			const location = response.headers.get("location");
			if (location !== null && response.status >= 300 && response.status < 400) {
				// The body of a redirect is not the page; drop it and take the next hop.
				await discard(response);
				try {
					current = new URL(location, current);
				} catch {
					return null;
				}
				continue;
			}

			if (!response.ok) {
				await discard(response);
				return null;
			}

			if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("text/html")) {
				await discard(response);
				return null;
			}

			return readPage(await readCapped(response, maxBytes));
		}

		return null;
	};
}

/** The first `maxBytes` of the body, and not one byte more. */
async function readCapped(response: Response, maxBytes: number): Promise<string> {
	const reader = response.body?.getReader();
	if (reader === undefined) return "";

	const decoder = new TextDecoder();
	let html = "";
	let read = 0;

	try {
		while (read < maxBytes) {
			const { done, value } = await reader.read();
			if (done) break;

			// Sliced rather than appended whole: a chunk is whatever the far end
			// chose to send, so accepting one entire chunk past the cap would put
			// the size of the read back in the hands of the page being read.
			const take = value.subarray(0, maxBytes - read);
			read += take.length;
			html += decoder.decode(take, { stream: true });
		}
	} finally {
		await reader.cancel().catch(() => {});
	}

	return html;
}

async function discard(response: Response): Promise<void> {
	await response.body?.cancel().catch(() => {});
}
