import type { ReportStatus } from "../domain/types";
import type { ReportStore } from "../reports/store";

const STATUSES: readonly ReportStatus[] = ["pending", "verified", "not-a-scam"];

export interface ReviewDependencies {
	store: ReportStore;
	/**
	 * The shared secret that opens the queue. `null` closes it entirely, which is
	 * the right state for a deployment where no token has been configured — an
	 * unset secret must never mean "no lock".
	 */
	token: string | null;
}

/**
 * The review queue, which holds other people's messages in the raw.
 *
 * Everything here is behind a token, and a missing token closes the door rather
 * than opening it. That default is the whole point: a deployment where someone
 * forgot to set the secret must fail shut, because the failure mode of failing
 * open is publishing strangers' private messages.
 */
export async function handleReview(
	request: Request,
	dependencies: ReviewDependencies,
): Promise<Response> {
	if (!authorised(request, dependencies.token)) {
		return json(404, { error: "Not found." });
	}

	if (request.method === "GET") {
		const status = new URL(request.url).searchParams.get("status");

		if (status !== null && !STATUSES.includes(status as ReportStatus)) {
			return json(400, { error: "Unknown status." });
		}

		return json(200, {
			reports: await dependencies.store.list((status ?? undefined) as ReportStatus | undefined),
		});
	}

	if (request.method === "POST") {
		return decide(request, dependencies.store);
	}

	if (request.method === "DELETE") {
		const id = new URL(request.url).searchParams.get("id");
		if (id === null) return json(400, { error: "Which report?" });

		return json(200, { removed: await dependencies.store.remove(id) });
	}

	return json(405, { error: "Method not allowed." });
}

async function decide(request: Request, store: ReportStore): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json(400, { error: "The request body must be JSON." });
	}

	const { id, status, note } = (body ?? {}) as {
		id?: unknown;
		status?: unknown;
		note?: unknown;
	};

	if (typeof id !== "string") return json(400, { error: "Which report?" });
	if (!STATUSES.includes(status as ReportStatus)) return json(400, { error: "Unknown status." });
	if (note !== undefined && note !== null && typeof note !== "string") {
		return json(400, { error: "A note must be text." });
	}

	const updated = await store.setStatus(id, status as ReportStatus, (note as string) ?? null);

	return updated === null ? json(404, { error: "No such report." }) : json(200, updated);
}

/**
 * Whether this request may see the queue.
 *
 * A token is compared in full, and an unconfigured token refuses everything.
 * The response to a wrong token is 404 rather than 401, so the queue does not
 * announce that it exists to someone guessing at addresses.
 */
function authorised(request: Request, token: string | null): boolean {
	if (token === null || token === "") return false;

	const offered =
		request.headers.get("x-review-token") ?? new URL(request.url).searchParams.get("token");

	return offered === token;
}

function json(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json; charset=utf-8" },
	});
}
