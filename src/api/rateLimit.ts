/**
 * A cap on how often one caller can run a Check.
 *
 * The Check costs real money — a model call and two lookups — and the endpoint is
 * public, so without a cap a single loop spends the owner's budget until it runs
 * out and the app stops working for the people it was built for.
 *
 * Deliberately small and in-memory: ADR 0005 says nothing is stored, and a rate
 * limiter backed by a database would be the first thing to break that promise.
 * The cost is honesty about what this can and cannot do — see `inMemoryRateLimiter`.
 */
export interface RateLimiter {
	/** Whether this caller may run a Check now. Counts the attempt either way. */
	allow(caller: string): boolean;
	/** How many callers are currently remembered. For tests and diagnostics. */
	size(): number;
}

export interface RateLimitOptions {
	limit: number;
	windowMs: number;
	/** Injectable so the window can be tested without waiting for real time. */
	now?: () => number;
}

/**
 * A fixed window per caller, held in memory.
 *
 * What this is honest about: on a serverless host each instance keeps its own
 * counts, so the real ceiling is this limit multiplied by however many instances
 * are warm, and a restart forgets everything. It is a brake on casual abuse and
 * on a script left running by accident — not a security control. A determined
 * attacker rotating addresses walks straight past it, which is why the deploy
 * also sets a spend cap at the provider: that is the limit that cannot be
 * out-run, because it is enforced where the money is.
 */
export function inMemoryRateLimiter({ limit, windowMs, now = Date.now }: RateLimitOptions): RateLimiter {
	const windows = new Map<string, { count: number; startedAt: number }>();

	return {
		allow(caller: string): boolean {
			const currentTime = now();
			evictExpired(windows, currentTime, windowMs);

			const existing = windows.get(caller);
			const expired = existing !== undefined && currentTime - existing.startedAt >= windowMs;

			// One path, so the limit is applied to the first request of a window
			// exactly as it is to the tenth. An early return of `true` for a fresh
			// window would wave the first one through whatever the limit said.
			const window =
				existing === undefined || expired ? { count: 0, startedAt: currentTime } : existing;

			window.count += 1;
			windows.set(caller, window);

			return window.count <= limit;
		},

		size: () => windows.size,
	};
}

/**
 * Dropping expired windows on every call keeps the map the size of the callers
 * actually active. Without it, every address that ever called would be
 * remembered for the life of the process.
 */
function evictExpired(
	windows: Map<string, { count: number; startedAt: number }>,
	currentTime: number,
	windowMs: number,
): void {
	for (const [caller, window] of windows) {
		if (currentTime - window.startedAt >= windowMs) windows.delete(caller);
	}
}

/**
 * Who is asking, as well as a public endpoint can tell.
 *
 * `x-forwarded-for` lists the original caller first and each proxy after it, so
 * the first entry is the one to key on — taking the last would key every request
 * to our own edge server and rate-limit the entire world as a single caller.
 *
 * An unidentifiable caller shares one bucket rather than being waved through.
 * That is the safer way round: the cost of getting it wrong is a stranger being
 * asked to wait, against a bill that cannot be undone.
 */
export function callerOf(request: Request): string {
	const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
	if (forwarded) return forwarded;

	const real = request.headers.get("x-real-ip")?.trim();
	if (real) return real;

	return "unidentified";
}
