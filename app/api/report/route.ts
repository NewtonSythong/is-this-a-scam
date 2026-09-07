import { handleReport } from "@/src/api/handleReport";
import { inMemoryRateLimiter } from "@/src/api/rateLimit";
import { reportsFor } from "@/src/reports/instance";

/**
 * Reporting is capped harder than checking. Checking is what a worried person
 * came to do; reporting is a kindness they do afterwards, and nobody has five
 * scams an hour to report honestly.
 */
const RATE_LIMITER = inMemoryRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });

export async function POST(request: Request): Promise<Response> {
	const reports = reportsFor();

	return handleReport(request, {
		store: reports.store,
		rateLimiter: RATE_LIMITER,
		durable: reports.durable,
	});
}
