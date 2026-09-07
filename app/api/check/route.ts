import { type CheckDependencies, handleCheck } from "@/src/api/handleCheck";
import { inMemoryRateLimiter } from "@/src/api/rateLimit";
import { NEW_ZEALAND_ORGANISATIONS } from "@/src/data/knownOrganisations.nz";
import { NEW_ZEALAND_REPORTING } from "@/src/data/reporting.nz";
import { NO_LOOKUPS } from "@/src/engine/lookups";
import type { NarrativeCheck } from "@/src/engine/narrative";
import { liveLookups } from "@/src/lookups/live";
import { anthropicNarrativeCheck } from "@/src/narrative/anthropic";

/**
 * Held at module scope so the counts survive between requests on a warm
 * instance. A limiter created per request would count to one forever.
 */
const RATE_LIMITER = inMemoryRateLimiter({
	// Generous for a real person — someone checking their messages does a handful,
	// not twenty — and tight enough that a script left running does not empty the
	// budget before anyone notices.
	limit: Number(process.env.CHECKS_PER_WINDOW ?? 20),
	windowMs: 10 * 60 * 1000,
});

/**
 * The only endpoint. Everything the Android app and the web demo do goes through
 * here, which is what keeps the keys off both clients (ADR 0002).
 */
export async function POST(request: Request): Promise<Response> {
	return handleCheck(request, dependencies());
}

/**
 * What this deployment can actually do, given the keys it has.
 *
 * A missing key degrades the Check rather than breaking it: with no Safe Browsing
 * key there are no lookups, with no Anthropic key there is no Narrative Check,
 * and with neither the endpoint still returns a complete Verdict from the offline
 * rules. That is the same discipline as ADR 0003's failure handling, applied to
 * configuration — it means the app can be deployed and demonstrated before either
 * account exists.
 */
function dependencies(): CheckDependencies {
	const safeBrowsingKey = process.env.SAFE_BROWSING_API_KEY;
	const anthropicKey = process.env.ANTHROPIC_API_KEY;

	return {
		organisations: NEW_ZEALAND_ORGANISATIONS,
		reporting: NEW_ZEALAND_REPORTING,
		lookups: safeBrowsingKey ? liveLookups(safeBrowsingKey) : NO_LOOKUPS,
		narrative: anthropicKey ? narrativeCheck() : null,
		// Never in production: the Suspicion Score must not be one query parameter
		// away from a Checker's screen (ADR 0001).
		allowDebug: process.env.NODE_ENV !== "production",
		rateLimiter: RATE_LIMITER,
	};
}

function narrativeCheck(): NarrativeCheck {
	return anthropicNarrativeCheck();
}
