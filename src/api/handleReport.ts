import type { VerdictLevel } from "../domain/types";
import type { ReportStore } from "../reports/store";
import { callerOf, type RateLimiter } from "./rateLimit";

const MAX_MESSAGE_LENGTH = 20_000;
const LEVELS: readonly VerdictLevel[] = ["scam", "warning", "unclear"];

export interface ReportDependencies {
	store: ReportStore;
	rateLimiter: RateLimiter | null;
	/**
	 * Whether the store can actually be trusted to keep what it is given.
	 *
	 * When it cannot, the endpoint refuses rather than accepting a report and
	 * losing it. Taking someone's message, thanking them for it, and dropping it
	 * is the worst of both worlds: they gave up their privacy and nobody was
	 * warned.
	 */
	durable: boolean;
}

/**
 * Reporting a Message so that others might be warned (ADR 0012).
 *
 * The one place in this app where something a Checker typed is kept. Everything
 * about this endpoint is built around that being a deliberate act rather than a
 * side effect: it is a separate endpoint from the Check, it refuses a request
 * that does not carry explicit consent, and it stores nothing about who sent it.
 */
export async function handleReport(
	request: Request,
	dependencies: ReportDependencies,
): Promise<Response> {
	if (request.method !== "POST") {
		return problem(405, "Send the report with POST.");
	}

	if (!dependencies.durable) {
		return problem(
			503,
			"We cannot take reports at the moment, so nothing was kept. Your check still worked.",
		);
	}

	if (dependencies.rateLimiter?.allow(callerOf(request)) === false) {
		return problem(429, "That is a lot of reports in a short time. Please wait a few minutes.");
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return problem(400, "The request body must be JSON.");
	}

	const { message, verdictLevel, consent } = (body ?? {}) as {
		message?: unknown;
		verdictLevel?: unknown;
		consent?: unknown;
	};

	// The consent flag is required by the endpoint, not just asked for by the
	// page. A client that forgets to ask the Checker cannot store their message
	// by accident, and any future client has to confront the question.
	if (consent !== true) {
		return problem(400, "A report needs the sender's agreement to keep the message.");
	}

	if (typeof message !== "string" || message.trim() === "") {
		return problem(400, "There is no message to report.");
	}
	if (message.length > MAX_MESSAGE_LENGTH) {
		return problem(400, "That message is too long to report.");
	}
	if (!LEVELS.includes(verdictLevel as VerdictLevel)) {
		return problem(400, "A report needs the verdict the app gave.");
	}

	const report = await dependencies.store.add({
		message,
		verdictLevel: verdictLevel as VerdictLevel,
	});

	// Only the id comes back. Nothing about the caller went in, so there is
	// nothing about them to return.
	return json(201, { id: report.id });
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
