import type { Link } from "../domain/types";

/**
 * Candidate links in a Message.
 *
 * Scam messages routinely drop the scheme — "go to nzpost-delivery.top" reads
 * as an instruction rather than as a link, which is the point — so the scheme
 * is optional and the host itself has to carry the recognition.
 *
 * The leading lookbehind is what keeps email addresses out: "support@anz.co.nz"
 * would otherwise yield a link to anz.co.nz that nobody was asked to click, and
 * a Reason about a link that does not exist is exactly the invented evidence
 * ADR 0003 forbids.
 *
 * Requiring the final label to be letters-only is what keeps "3.30pm" and
 * "$1,250.00" from reading as hosts.
 */
const LINK_PATTERN = /(?<![@\w.-])(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:\/[^\s]*)?/gi;

/** Punctuation that ends a sentence rather than an address. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

export function extractLinks(message: string): Link[] {
	const links: Link[] = [];

	for (const match of message.matchAll(LINK_PATTERN)) {
		const raw = match[0].replace(TRAILING_PUNCTUATION, "");
		if (raw === "") continue;

		links.push({ raw, host: hostOf(raw) });
	}

	return links;
}

function hostOf(raw: string): string {
	const withoutScheme = raw.replace(/^https?:\/\//i, "");
	const authority = withoutScheme.split("/")[0] ?? "";
	const withoutPort = authority.split(":")[0] ?? "";

	return withoutPort.toLowerCase().replace(/^www\./, "");
}

/**
 * Whether a host genuinely belongs to an organisation that owns `domains`.
 *
 * The boundary is a dot, and that is the entire point of this function. A
 * substring check would accept "anz.co.nz.secure-login.top" — an attacker's
 * domain that merely opens with the real one — which is the single most common
 * shape of a lookalike link and the one a Checker is least able to see.
 */
export function hostBelongsTo(host: string, domains: readonly string[]): boolean {
	return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
