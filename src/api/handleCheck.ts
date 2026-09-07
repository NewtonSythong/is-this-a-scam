import type { KnownOrganisation, ReportingChannel, Verdict } from "../domain/types";
import { checkAsync } from "../engine/checkAsync";
import type { LinkLookups } from "../engine/lookups";
import type { NarrativeCheck } from "../engine/narrative";
import { callerOf, type RateLimiter } from "./rateLimit";

/**
 * Longer than any text message and longer than almost any email worth checking.
 *
 * A bound rather than a judgement: it caps what a single Check can cost in model
 * tokens and lookups, and nothing a Checker actually pastes comes near it.
 */
const MAX_MESSAGE_LENGTH = 20_000;

export interface CheckDependencies {
	organisations: readonly KnownOrganisation[];
	reporting: ReportingChannel | null;
	lookups: LinkLookups;
	/** `null` runs the Check without the Narrative half — see `checkAsync`. */
	narrative: NarrativeCheck | null;
	/**
	 * Whether `?debug=1` may return the Suspicion Score. Off in production, so the
	 * developer view of ADR 0001 exists without the number ever being one query
	 * parameter away from a Checker's screen.
	 */
	allowDebug: boolean;
	/**
	 * A cap on how often one caller may run a Check. `null` runs uncapped, which
	 * is right for tests and for a local machine, and wrong for anything public.
	 */
	rateLimiter: RateLimiter | null;
}

/**
 * The API, as a plain function of a Request.
 *
 * Written against the web `Request`/`Response` types rather than a framework's,
 * so the whole endpoint — status codes, validation, what is and is not returned —
 * is testable without a server, and so the Next.js route is four lines of wiring
 * that cannot hide behaviour.
 *
 * Nothing here logs the Message. ADR 0005 promises a Checker that nothing is
 * kept, and a log line is keeping it. Errors are reported without the text that
 * caused them for the same reason.
 */
export async function handleCheck(
	request: Request,
	dependencies: CheckDependencies,
): Promise<Response> {
	if (request.method !== "POST") {
		return problem(405, "Send the message with POST.");
	}

	// Before reading the body, so a flood costs nothing but a header read.
	if (dependencies.rateLimiter?.allow(callerOf(request)) === false) {
		return problem(
			429,
			"That is a lot of checks in a short time. Please wait a few minutes and try again.",
		);
	}

	const message = await messageFrom(request);
	if (typeof message !== "string") return message;

	const verdict = await checkAsync(
		message,
		dependencies.organisations,
		dependencies.lookups,
		dependencies.reporting,
		dependencies.narrative,
	);

	return json(200, present(verdict, wantsDebug(request) && dependencies.allowDebug));
}

/** The Message, or the Response explaining why there isn't one. */
async function messageFrom(request: Request): Promise<string | Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return problem(400, "The request body must be JSON.");
	}

	const message = (body as { message?: unknown } | null)?.message;

	if (typeof message !== "string") {
		return problem(400, "Send a 'message' field containing the text to check.");
	}
	if (message.trim() === "") {
		return problem(400, "There is no message to check.");
	}
	if (message.length > MAX_MESSAGE_LENGTH) {
		return problem(400, "That message is too long to check.");
	}

	return message;
}

/**
 * The Verdict as the clients receive it.
 *
 * `internal` is stripped unless the developer view is both requested and allowed.
 * The Verdict carries it nested precisely so removing it here is one deletion
 * rather than a field-by-field rebuild that a later addition could slip past.
 */
function present(verdict: Verdict, includeScore: boolean): unknown {
	if (includeScore) return verdict;

	const { internal: _internal, ...visible } = verdict;

	return visible;
}

function wantsDebug(request: Request): boolean {
	return new URL(request.url).searchParams.get("debug") === "1";
}

function json(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json; charset=utf-8" },
	});
}

function problem(status: number, error: string): Response {
	return json(status, { error });
}
