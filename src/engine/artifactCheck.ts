import { HIGH_ABUSE_ENDINGS, LINK_SHORTENERS } from "../data/linkReputation";
import type { KnownOrganisation, Link, Signal } from "../domain/types";
import { extractLinks, hostBelongsTo } from "./links";
import { paymentRailSignals } from "./paymentRails";

/**
 * The deterministic half of a Check (ADR 0003). Examines the things in a Message
 * that can be looked up and verified, and says nothing about the story it tells
 * — that belongs to the Narrative Check.
 *
 * Returns the Signals it found, links first and then the words. An empty result
 * is a real answer, not a failure: "Hi Mum, this is my new number" contains no
 * artifact to examine, and inventing one would be the fabricated evidence
 * ADR 0003 rules out.
 *
 * Pure and offline. Everything here runs without a network call, which is what
 * lets the whole rule set be tested without mocks.
 */
export function artifactCheck(
	message: string,
	organisations: readonly KnownOrganisation[],
): Signal[] {
	const links = extractLinks(message);

	// Mentions are looked for in the prose only. An organisation's name inside
	// the link itself is not the Message claiming to be from them — see the note
	// on `claimsToBeFrom`.
	const prose = proseOnly(message, links);

	return [...signalsForLinks(links, prose, organisations), ...paymentRailSignals(message)];
}

/**
 * The link half of the Artifact Check, over links supplied rather than extracted.
 *
 * Exported for the async layer (ADR 0008): once a shortened link has been
 * followed to where it really goes, the destination deserves exactly the same
 * scrutiny as a link written out in full, and running it through this same
 * function is what guarantees it gets it.
 */
export function signalsForLinks(
	links: readonly Link[],
	prose: string,
	organisations: readonly KnownOrganisation[],
): Signal[] {
	return links.flatMap((link) => worstSignalFor(link, prose, organisations));
}

/** The Message with its links removed. See `claimsToBeFrom` for why this matters. */
export function proseOf(message: string, links: readonly Link[]): string {
	return proseOnly(message, links);
}

/**
 * At most one Signal per link, the most alarming that applies.
 *
 * A single link can be a lookalike *and* use a throwaway ending, and a Checker
 * reading two overlapping sentences about one link has been given more to
 * process at the exact moment they are least able to. So the rules are ordered
 * by how much they establish, and the first that fires wins.
 */
function worstSignalFor(
	link: Link,
	prose: string,
	organisations: readonly KnownOrganisation[],
): Signal[] {
	// A link that genuinely belongs to a Known Organisation ends the matter,
	// whatever else might be said about it.
	if (organisations.some((organisation) => hostBelongsTo(link.host, organisation.domains))) {
		return [];
	}

	const claimed = organisations.find((organisation) => claimsToBeFrom(prose, organisation));
	if (claimed) return [linkNotOwnedByClaimedOrg(claimed, link)];

	const imitated = organisations.find((organisation) => imitates(link.host, organisation));
	if (imitated) return [lookalikeLink(imitated, link)];

	if (LINK_SHORTENERS.has(link.host)) return [shortenedLink(link)];
	if (hasThrowawayEnding(link.host)) return [throwawayEnding(link)];

	return [];
}

function linkNotOwnedByClaimedOrg(organisation: KnownOrganisation, link: Link): Signal {
	return {
		kind: "link-not-owned-by-claimed-org",
		severity: "scam",
		organisation: organisation.name,
		// Deliberately plain: "link", not "URL"; "not a real ANZ address", not
		// "domain mismatch" or "phishing". The Checker has to be able to act on
		// this sentence without knowing how any of it works.
		reason:
			`This message says it is from ${organisation.name}, but the link goes to ` +
			`${link.host}, which is not a real ${organisation.name} address.`,
	};
}

function lookalikeLink(organisation: KnownOrganisation, link: Link): Signal {
	return {
		kind: "lookalike-link",
		severity: "scam",
		organisation: organisation.name,
		// Careful wording: the Message never claimed to be from this organisation,
		// so the Reason says the *link* was made to look like them. Saying the
		// message claimed it would be evidence the app did not find.
		reason:
			`The link ${link.host} is made to look like ${organisation.name}, ` +
			`but it is not a real ${organisation.name} address.`,
	};
}

function shortenedLink(link: Link): Signal {
	return {
		kind: "shortened-link",
		severity: "unclear",
		organisation: null,
		// The raw text rather than the host, because "bit.ly" alone tells the
		// Checker nothing they can match against what is on their screen.
		reason:
			`The link ${link.raw} hides where it really goes. You cannot see what it opens ` +
			`until you have already opened it.`,
	};
}

function throwawayEnding(link: Link): Signal {
	return {
		kind: "throwaway-ending",
		severity: "warning",
		organisation: null,
		reason:
			`The link ${link.host} ends in .${endingOf(link.host)}. Endings like that are cheap ` +
			`to buy and are used far more by scams than by real businesses.`,
	};
}

/**
 * Whether the prose claims to be from this organisation.
 *
 * Word boundaries matter in both directions: "Franz" must not read as ANZ, and
 * "NZ Post" must match across the space. The check runs on prose with the links
 * removed because a lookalike host such as anz-secure.top contains the name
 * itself — treating that as a claim would make this rule's Reason ("this message
 * says it is from ANZ") untrue, which is what the separate lookalike rule exists
 * to cover.
 */
function claimsToBeFrom(prose: string, organisation: KnownOrganisation): boolean {
	return organisation.mentions.some((mention) =>
		new RegExp(`\\b${escapeRegExp(mention)}\\b`, "i").test(prose),
	);
}

/**
 * Whether a host is wearing an organisation's name.
 *
 * The host is cut into whole pieces on dots and hyphens and each piece is
 * compared entire, rather than searched for the name as a substring. That is
 * what separates "anz-secure.top" from "franzia.com": the first has a piece that
 * *is* "anz", the second merely contains those letters. A substring test here
 * would put a bank's name on an ordinary wine shop.
 *
 * Mentions are compared with their spaces and punctuation removed, so the
 * mention "NZ Post" matches the host piece "nzpost" — which is how these hosts
 * are actually written.
 */
function imitates(host: string, organisation: KnownOrganisation): boolean {
	const pieces = new Set(host.split(/[.-]/));

	return organisation.mentions.some((mention) => pieces.has(squash(mention)));
}

function hasThrowawayEnding(host: string): boolean {
	return HIGH_ABUSE_ENDINGS.includes(endingOf(host));
}

function endingOf(host: string): string {
	return host.slice(host.lastIndexOf(".") + 1);
}

function squash(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function proseOnly(message: string, links: readonly Link[]): string {
	return links.reduce((text, link) => text.split(link.raw).join(" "), message);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
