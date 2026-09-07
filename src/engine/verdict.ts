import type {
	KnownOrganisation,
	ReportingChannel,
	Severity,
	Signal,
	Verdict,
	VerdictLevel,
} from "../domain/types";
import { howToCheckYourself } from "./advice";

/**
 * The three sentences, and the only three (ADR 0001).
 *
 * There is no fourth entry meaning "safe". A Checker who is told something is
 * fine and acts on it has been given nothing back if the app was wrong, whereas
 * a Checker told "we can't tell" has been given a reason to ask someone — which
 * is why the mildest thing this app can say is still a caution.
 */
const HEADLINES: Record<VerdictLevel, string> = {
	scam: "This is a scam. Do not reply, do not tap the link.",
	warning: "This has warning signs. Don't do anything it asks yet.",
	unclear: "We can't tell. Don't act on this until someone you trust has looked.",
};

const DISCLAIMER =
	"This check is done by a computer and can be wrong. If you are unsure, ask someone you trust.";

/**
 * How alarming each Severity is, and what it contributes to the Suspicion Score.
 *
 * The ranking decides the Verdict; the weight only feeds the internal score. They
 * are kept apart deliberately: the Verdict is worst-wins (below), so no amount of
 * accumulated weight can promote a pile of mild Signals into a scam. The score is
 * for tuning and for the developer view, and has no say in what a Checker reads.
 */
const RANK: Record<Severity, number> = { scam: 3, warning: 2, unclear: 1 };
const WEIGHT: Record<Severity, number> = { scam: 100, warning: 40, unclear: 10 };

/**
 * Combines every Signal from both engines into the single Verdict a Checker sees.
 *
 * Worst-wins, never an average (ADR 0003). Averaging would let three mild
 * observations talk down one decisive one, and the decisive one is the whole
 * reason a Checker opened the app.
 *
 * An empty Signal list produces "we can't tell" rather than anything reassuring.
 * That is the case this function exists to get right: the Artifact Check finding
 * nothing means it found nothing, not that there is nothing to find.
 */
export function verdictFrom(
	signals: readonly Signal[],
	organisations: readonly KnownOrganisation[],
	reporting: ReportingChannel | null = null,
): Verdict {
	const worstFirst = [...signals].sort((a, b) => RANK[b.severity] - RANK[a.severity]);
	const level = worstFirst[0]?.severity ?? "unclear";

	return {
		level,
		headline: HEADLINES[level],
		reasons: [...new Set(worstFirst.map((signal) => signal.reason))],
		howToCheck: adviceFor(worstFirst, organisations),
		disclaimer: DISCLAIMER,
		// ADR 0007: when the app cannot settle it, asking a person is not a
		// consolation prize, it is the answer.
		escalationIsPrimary: level === "unclear",
		// Only once the app is certain. See the note on NEW_ZEALAND_REPORTING.
		reportTo: level === "scam" && reporting ? reporting.instruction : null,
		internal: {
			score: signals.reduce((total, signal) => total + WEIGHT[signal.severity], 0),
		},
	};
}

/**
 * Advice for the most alarming implicated organisation.
 *
 * Only one organisation's advice is offered even where several are implicated: a
 * Checker needs one door to walk through, and a list of doors is a decision they
 * are in no state to make.
 */
function adviceFor(
	worstFirst: readonly Signal[],
	organisations: readonly KnownOrganisation[],
): string | null {
	for (const signal of worstFirst) {
		const organisation = organisations.find((candidate) => candidate.name === signal.organisation);
		if (organisation) return howToCheckYourself(organisation);
	}

	return null;
}
