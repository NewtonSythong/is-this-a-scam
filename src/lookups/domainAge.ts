import type { Link } from "../domain/types";
import type { Fetch } from "./live";

/**
 * How long a link's domain has been registered, from the registries themselves
 * over RDAP (ADR 0008's "the outside world", third lookup).
 *
 * WHY THIS EXISTS. The Artifact Check's strongest rule says: the Message claims
 * to be from a Known Organisation, the link does not belong to that
 * organisation's domains, therefore this is impersonation. It is the only route
 * to a `scam` verdict, and it is the source of every false alarm this project
 * has ever measured — `careers.anz.com`, `jobs2web.com`, `sau.hvue.io`. All
 * three are genuine. The rule was reading the *absence of an entry in a
 * hand-written list* as evidence of forgery, and a hand-written list can never
 * be complete: real institutions send through HireVue, jobs2web, SendGrid and a
 * dozen other vendors whose domains carry nobody's brand.
 *
 * An allowlist's silence is not evidence. Registration age is. Measured
 * 2026-09-22 against the exact hosts behind our false alarms:
 *
 *     anz.com                    1996-06-04   11,067 days
 *     jobs2web.com               2006-04-17    7,463 days
 *     hvue.io                    2023-09-29    1,088 days
 *     secure-verify-nz.com       does not exist
 *     customs-clearance-nz.com   does not exist
 *
 * Nobody registers a domain and waits three years to impersonate a bank with it.
 *
 * This is the WHOIS component of SmishX (Wang et al., SOUPS 2025), which is
 * where the idea comes from — see `docs/method-alternatives.md`. It is written
 * from that published method rather than from our own failures on purpose: a
 * rule derived from the six messages that caught us would pass them by
 * construction and measure nothing.
 *
 * WHAT IT CANNOT DO. `.nz` has no RDAP service in IANA's bootstrap at all, so
 * every New Zealand domain returns `null` here. That is survivable only because
 * the Known Organisation list already covers the NZ institutions that matter and
 * scam infrastructure is overwhelmingly gTLD, but it is a real hole and it is
 * the reason this returns `null` rather than "new" when it cannot find out.
 */

const BOOTSTRAP = "https://data.iana.org/rdap/dns.json";

/**
 * TLDs whose registry serves RDAP but which IANA's bootstrap does not list.
 * Checked 2026-09-22; `.io` answers on Identity Digital's endpoint.
 */
const UNLISTED: Readonly<Record<string, string>> = {
	io: "https://rdap.identitydigital.services/rdap/",
};

/** Registries reject anonymous clients; they are entitled to know who is asking. */
const HEADERS = {
	accept: "application/rdap+json",
	"user-agent": "is-this-a-scam/0.1 (+https://github.com/NewtonSythong/is-this-a-scam)",
};

interface RdapDomain {
	events?: { eventAction?: string; eventDate?: string }[];
}

/**
 * Fetched once per process and kept. IANA publishes it as a single file that
 * changes a few times a month, so re-fetching it per Check would be the whole
 * cost of this lookup for none of the benefit.
 */
let bootstrap: Promise<Map<string, string>> | null = null;

function registryIndex(fetchImpl: Fetch, timeoutMs: number): Promise<Map<string, string>> {
	bootstrap ??= (async () => {
		const response = await fetchImpl(BOOTSTRAP, { signal: AbortSignal.timeout(timeoutMs) });
		if (!response.ok) throw new Error(`RDAP bootstrap returned ${response.status}`);

		const body = (await response.json()) as { services: [string[], string[]][] };
		const index = new Map(Object.entries(UNLISTED));

		for (const [tlds, urls] of body.services) {
			const base = urls[0];
			if (base === undefined) continue;
			for (const tld of tlds) if (!index.has(tld)) index.set(tld, base);
		}

		return index;
	})();

	return bootstrap;
}

/** Forget the cached bootstrap. Exists so tests do not leak one into the next. */
export function resetRegistryIndex(): void {
	bootstrap = null;
}

/**
 * The registrable part of a host, as candidates rather than an answer.
 *
 * ponytail: two guesses instead of the Public Suffix List. `careers.anz.com` is
 * `anz.com` and `sau.hvue.io` is `hvue.io`, but `careers.anz.com.au` is three
 * labels, and a registry answers 404 for a name it does not hold. So ask for two
 * labels, and ask for three only if that misses. Pull in `tldts` if a
 * multi-level suffix ever turns out to matter more than one extra request.
 */
function candidates(host: string): string[] {
	const labels = host.split(".");
	if (labels.length <= 2) return [host];

	return [labels.slice(-2).join("."), labels.slice(-3).join(".")];
}

export function rdapDomainAge(fetchImpl: Fetch = fetch, timeoutMs = 4000) {
	return async function establishedSince(link: Link): Promise<Date | null> {
		const tld = link.host.split(".").pop();
		if (tld === undefined) return null;

		const base = (await registryIndex(fetchImpl, timeoutMs)).get(tld);
		if (base === undefined) return null;

		for (const domain of candidates(link.host)) {
			const response = await fetchImpl(
				`${base.replace(/\/$/, "")}/domain/${encodeURIComponent(domain)}`,
				{ headers: HEADERS, signal: AbortSignal.timeout(timeoutMs) },
			);

			// A 404 is a real answer — the registry does not hold this name — but it
			// is not one this lookup reports, because "no such domain" is a claim the
			// Artifact Check has no Reason written for. Keep looking, then give up.
			if (response.status === 404) continue;
			if (!response.ok) throw new Error(`RDAP returned ${response.status} for ${domain}`);

			const body = (await response.json()) as RdapDomain;
			const registered = (body.events ?? []).find(
				(event) => event.eventAction === "registration",
			)?.eventDate;
			if (registered === undefined) return null;

			const date = new Date(registered);
			return Number.isNaN(date.getTime()) ? null : date;
		}

		return null;
	};
}
