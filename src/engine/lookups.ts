import type { Link } from "../domain/types";
import type { DestinationPage } from "../lookups/destinationPage";

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

	/**
	 * When this link's domain was first registered, or `null` if that cannot be
	 * established. `null` is the honest answer for `.nz` and for every other
	 * registry with no RDAP service, and it must read as "unknown" rather than as
	 * "new" — treating silence as suspicion is the mistake this lookup exists to
	 * undo. See `src/lookups/domainAge.ts`.
	 */
	establishedSince(link: Link): Promise<Date | null>;

	/**
	 * What the page at this link is — whether it asks for a password, and what it
	 * says it is — read server-side without rendering anything. `null` where that
	 * could not be established, which must read as "we did not find out" and never
	 * as "the page is fine".
	 *
	 * This is the one lookup that loads a page an attacker may control. ADR 0008
	 * forbade it until 2026-09-23 and the amendment there records what changed and
	 * what restrains it; `src/lookups/destinationPage.ts` is where those restraints
	 * actually live.
	 */
	destination(link: Link): Promise<DestinationPage | null>;
}

/** Lookups that find nothing. The offline Check, expressed as an async one. */
export const NO_LOOKUPS: LinkLookups = {
	expand: async () => null,
	dangerous: async () => [],
	establishedSince: async () => null,
	destination: async () => null,
};
