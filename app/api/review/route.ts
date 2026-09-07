import { handleReview } from "@/src/api/handleReview";
import { reportsFor } from "@/src/reports/instance";

/**
 * The review queue. Behind `REVIEW_TOKEN` — and with no token configured it
 * refuses everything, because a deployment where someone forgot to set the
 * secret must fail shut rather than publish strangers' messages.
 */
function dependencies() {
	return { store: reportsFor().store, token: process.env.REVIEW_TOKEN ?? null };
}

export async function GET(request: Request): Promise<Response> {
	return handleReview(request, dependencies());
}

export async function POST(request: Request): Promise<Response> {
	return handleReview(request, dependencies());
}

export async function DELETE(request: Request): Promise<Response> {
	return handleReview(request, dependencies());
}
