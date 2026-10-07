import { LINK_SHORTENERS } from "../data/linkReputation";
import type { KnownOrganisation, Link, ReportingChannel, Signal, Verdict } from "../domain/types";
import { proseOf, signalsForLinks } from "./artifactCheck";
import { extractLinks } from "./links";
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

	return verdictFrom(
		[
			...signalsForLinks(
				resolved.map((resolution) => resolution.effective),
				prose,
				organisations,
			),
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
