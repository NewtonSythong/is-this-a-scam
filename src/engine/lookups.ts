import type { Link } from "../domain/types";

/**
 * The outside world, as the Check needs it (ADR 0008).
 *
 * Kept as an interface rather than called directly so the whole async layer can
 * be tested without a network, a key, or a stubbed `fetch` — the behaviour that
 * matters here is what the app says when these succeed, when they fail, and when
 * one of each, and none of that should require the internet to verify.
 *
 * Both methods may reject. Callers must assume they will: see `checkAsync`.
 */
export interface LinkLookups {
	/**
	 * Follow a link to where it really goes, server-side, so the Checker's browser
	 * never touches it. Returns the destination, or `null` if there is nothing to
	 * follow or it could not be established.
	 */
	expand(link: Link): Promise<Link | null>;

	/**
	 * Which of these links appear on a public list of known-dangerous sites.
	 * Returns the `raw` text of each flagged link.
	 */
	dangerous(links: readonly Link[]): Promise<readonly string[]>;
}

/** Lookups that find nothing. The offline Check, expressed as an async one. */
export const NO_LOOKUPS: LinkLookups = {
	expand: async () => null,
	dangerous: async () => [],
};
