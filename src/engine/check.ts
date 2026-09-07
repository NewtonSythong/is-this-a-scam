import type { KnownOrganisation, ReportingChannel, Verdict } from "../domain/types";
import { artifactCheck } from "./artifactCheck";
import { verdictFrom } from "./verdict";

/**
 * One Check: a Message in, a Verdict out.
 *
 * This is the whole offline half of the product, and the seam the three Entry
 * Points (ADR 0004) and the web demo all sit on top of. It is pure and
 * synchronous — no network, no keys, no clock — which is what makes the
 * behaviour a Checker actually experiences testable in full.
 *
 * The Narrative Check (ADR 0003) and the lookups in ADR 0008 are both
 * asynchronous and will wrap this rather than live inside it: their Signals join
 * the same list, and `verdictFrom` combines them the same worst-wins way. When
 * they fail or time out, what remains is exactly this function's answer — which
 * is why it has to be a complete answer on its own.
 */
export function check(
	message: string,
	organisations: readonly KnownOrganisation[],
	reporting: ReportingChannel | null = null,
): Verdict {
	return verdictFrom(artifactCheck(message, organisations), organisations, reporting);
}
