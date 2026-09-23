import { LINK_SHORTENERS } from "../data/linkReputation";
import type { KnownOrganisation, Link, ReportingChannel, Signal, Verdict } from "../domain/types";
import { claimsToBeFrom, proseOf, signalsForLinks } from "./artifactCheck";
import { extractLinks, hostBelongsTo } from "./links";
import type { LinkLookups } from "./lookups";
import type { NarrativeCheck } from "./narrative";
import { paymentRailSignals } from "./paymentRails";
import { verdictFrom } from "./verdict";

/**
 * A Check with the outside world consulted (ADR 0008).
 *
 * Everything the offline Check does, plus following shortened links to their real
 * destination and asking a public danger list about every link — then judging the
 * result through exactly the same rules, because a destination discovered by
 * following a redirect deserves no less scrutiny than one written out in full.
 *
 * The Narrative Check joins the same Signal list, and `verdictFrom` combines it
 * the same worst-wins way (ADR 0003). It is optional because the app must remain
 * useful without it — and because it is the one part of a Check that costs money
 * per use.
 *
 * This function does not reject. Ever. A Checker who is shown "sorry, something
 * went wrong" reads it as "it's probably fine", so every lookup failure degrades
 * to the offline answer instead of surfacing — which is only safe because the
 * offline answer is a complete one (ADR 0003).
 */
export async function checkAsync(
	message: string,
	organisations: readonly KnownOrganisation[],
	lookups: LinkLookups,
	reporting: ReportingChannel | null = null,
	narrative: NarrativeCheck | null = null,
): Promise<Verdict> {
	const links = extractLinks(message);
	const prose = proseOf(message, links);

	// Run together: the Narrative Check is the slow one, and a Checker waiting on
	// a spinner is a Checker deciding to just tap the link.
	const [resolved, dangerous, narrativeSignals] = await Promise.all([
		resolveAll(links, lookups),
		orEmpty(lookups.dangerous(links)),
		narrative === null ? [] : orNoSignals(narrative(message)),
	]);

	// Asked only of where links really go, after any redirect, because that is
	// the host the impersonation rules will judge.
	const effective = resolved.map((resolution) => resolution.effective);

	// Independent questions about the same hosts, so they wait together.
	const [established, harvesting] = await Promise.all([
		establishedHosts(effective, lookups),
		harvestingHosts(effective, prose, organisations, lookups),
	]);

	return verdictFrom(
		[
			...signalsForLinks(effective, prose, organisations, established, harvesting),
			...resolved.flatMap(hiddenDestinationSignal),
			...links.filter((link) => dangerous.includes(link.raw)).map(knownDangerousSignal),
			...paymentRailSignals(message),
			...narrativeSignals,
		],
		organisations,
		reporting,
	);
}

/**
 * How long a domain must have been registered before this app will stop calling
 * a link to it impersonation.
 *
 * Two years, and the number is deliberately far larger than it needs to be. The
 * industry convention for a *newly* registered domain is thirty days, and a
 * phishing host is usually days old; the genuine vendor domains that our own
 * rules libelled are 1,088, 7,463 and 11,067 days old. Anywhere between those
 * two populations would separate them, so the threshold is put where being
 * wrong is hardest rather than where the margin is largest — what is being
 * suppressed is an accusation of forgery, and it should take real counter-
 * evidence to suppress it, not a hair's breadth.
 *
 * It is not tuned and must not be. Nudging it while looking at the six messages
 * that caught us would retire them as evidence, which is the corpus-spending
 * error this project exists to name.
 */
const ESTABLISHED_AFTER_DAYS = 730;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The hosts old enough that the impersonation rules should stay quiet.
 *
 * Every failure mode here resolves to "not established", which leaves the rules
 * exactly as they behaved before this lookup existed: an unreachable registry, a
 * `.nz` domain with no RDAP service, a timeout and a rate limit all produce the
 * same answer as a brand-new domain. That asymmetry is on purpose. The cost of
 * wrongly staying quiet is a scam shown as `unclear`; the cost of wrongly
 * suppressing is nothing at all, because the failure simply restores today's
 * behaviour.
 */
async function establishedHosts(
	links: readonly Link[],
	lookups: LinkLookups,
): Promise<ReadonlySet<string>> {
	const cutoff = Date.now() - ESTABLISHED_AFTER_DAYS * DAY_MS;

	const ages = await Promise.all(
		links.map(async (link) => {
			const since = await orNull(lookups.establishedSince(link));
			return since !== null && since.getTime() <= cutoff ? link.host : null;
		}),
	);

	return new Set(ages.filter((host): host is string => host !== null));
}

/**
 * The hosts caught serving a sign-in page for somebody they are not.
 *
 * Two facts have to line up before this says anything: the page asks for a
 * password, and the page presents itself as the organisation the Message claimed
 * to be from. Either alone is ordinary — half the web has a password field, and
 * any page may mention a bank — and it is the conjunction that is the evidence.
 * The page's own words are put through `claimsToBeFrom`, the same word-boundary
 * matcher the Message's prose goes through, so "ANZ Internet Banking" matches and
 * "Franzia" does not.
 *
 * WHICH LINKS GET FETCHED, which is a cost and an exposure question before it is
 * an accuracy one. Only links in a Message that names a Known Organisation, and
 * only those not belonging to any Known Organisation's own domains — that is the
 * same precondition the impersonation rule has, so nothing is loaded that could
 * not change the answer. A Message with no claimed organisation fetches nothing
 * at all, which is most of them.
 *
 * Every failure resolves to "not harvesting", exactly as the age lookup resolves
 * to "not established": a refused address, a timeout, a dead host and a page with
 * no password field all leave the verdict where it was without this lookup.
 */
async function harvestingHosts(
	links: readonly Link[],
	prose: string,
	organisations: readonly KnownOrganisation[],
	lookups: LinkLookups,
): Promise<ReadonlySet<string>> {
	const claimed = organisations.find((organisation) => claimsToBeFrom(prose, organisation));
	if (claimed === undefined) return new Set();

	const worthFetching = links.filter(
		(link) =>
			!organisations.some((organisation) => hostBelongsTo(link.host, organisation.domains)),
	);

	const caught = await Promise.all(
		worthFetching.map(async (link) => {
			const page = await orNull(lookups.destination(link));

			return page !== null && page.asksForPassword && claimsToBeFrom(page.presentsAs, claimed)
				? link.host
				: null;
		}),
	);

	return new Set(caught.filter((host): host is string => host !== null));
}

/**
 * A link, and what it turned out to be.
 *
 * `effective` is the link the rules are run against: the destination where one
 * was found, and the original otherwise. That substitution is the whole trick —
 * it means no rule needs to know that redirects exist.
 */
interface Resolution {
	original: Link;
	effective: Link;
	followed: boolean;
}

async function resolveAll(
	links: readonly Link[],
	lookups: LinkLookups,
): Promise<readonly Resolution[]> {
	return Promise.all(links.map((link) => resolve(link, lookups)));
}

async function resolve(link: Link, lookups: LinkLookups): Promise<Resolution> {
	// Only shorteners are followed. Following every link would multiply the
	// requests, the latency and the cost for the sake of the rare case, and a
	// Checker staring at a spinner is a Checker deciding to just tap the link.
	if (!LINK_SHORTENERS.has(link.host)) {
		return { original: link, effective: link, followed: false };
	}

	const destination = await orNull(lookups.expand(link));
	if (destination === null) {
		return { original: link, effective: link, followed: false };
	}

	// The destination's host, but still shown to the Checker as the text they can
	// see on their own screen.
	return {
		original: link,
		effective: { raw: link.raw, host: destination.host },
		followed: true,
	};
}

/**
 * What a shortened link was concealing.
 *
 * Raised as "unclear" rather than "warning": a short link that resolves to an
 * ordinary site is not itself suspicious. Whatever the destination deserves comes
 * from the ordinary rules judging that destination, which is exactly as it should
 * be. The sentence is written to stand on its own, since Reasons are ordered by
 * severity and this one may be read before or after the destination's.
 */
function hiddenDestinationSignal(resolution: Resolution): Signal[] {
	if (!resolution.followed) return [];

	return [
		{
			kind: "hidden-destination",
			severity: "unclear",
			organisation: null,
			reason: `The link ${resolution.original.raw} is hiding its real address, ${resolution.effective.host}.`,
		},
	];
}

function knownDangerousSignal(link: Link): Signal {
	return {
		kind: "known-dangerous-link",
		severity: "scam",
		organisation: null,
		reason: `The link ${link.host} is on a public list of websites known to be dangerous.`,
	};
}

/**
 * A failed lookup is a lookup that found nothing.
 *
 * Deliberately silent: there is no Reason saying "we could not check this", and
 * no Verdict level meaning "checked less thoroughly than usual". The app's
 * weakest statement is already "we can't tell", so a degraded Check lands
 * somewhere honest without needing to announce itself — and announcing it would
 * only invite a frightened Checker to discount the warning they did get.
 */
async function orNull<T>(promise: Promise<T | null>): Promise<T | null> {
	return promise.catch(() => null);
}

async function orEmpty(promise: Promise<readonly string[]>): Promise<readonly string[]> {
	return promise.catch(() => []);
}

async function orNoSignals(promise: Promise<readonly Signal[]>): Promise<readonly Signal[]> {
	return promise.catch(() => []);
}
