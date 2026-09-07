import { describe, expect, it } from "vitest";
import { callerOf, inMemoryRateLimiter } from "./rateLimit";

const at = (times: number[]) => {
	let index = 0;

	return () => times[Math.min(index++, times.length - 1)] ?? 0;
};

describe("inMemoryRateLimiter", () => {
	it("allows callers up to the limit", () => {
		const limiter = inMemoryRateLimiter({ limit: 3, windowMs: 1000, now: () => 0 });

		expect(limiter.allow("a")).toBe(true);
		expect(limiter.allow("a")).toBe(true);
		expect(limiter.allow("a")).toBe(true);
	});

	it("turns the caller away once they pass it", () => {
		const limiter = inMemoryRateLimiter({ limit: 2, windowMs: 1000, now: () => 0 });

		limiter.allow("a");
		limiter.allow("a");

		expect(limiter.allow("a")).toBe(false);
	});

	// One person checking a lot of messages must not stop anybody else checking
	// theirs. That is the whole reason this is keyed per caller.
	it("counts each caller separately", () => {
		const limiter = inMemoryRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });

		expect(limiter.allow("a")).toBe(true);
		expect(limiter.allow("b")).toBe(true);
		expect(limiter.allow("a")).toBe(false);
	});

	// A limit of zero must stop the very first request. The obvious
	// implementation — return true whenever the caller is new — quietly lets one
	// request through every window regardless of the limit.
	it("applies the limit to the first request of a window too", () => {
		const limiter = inMemoryRateLimiter({ limit: 0, windowMs: 1000, now: () => 0 });

		expect(limiter.allow("a")).toBe(false);
	});

	it("lets them back in once the window has passed", () => {
		const limiter = inMemoryRateLimiter({
			limit: 1,
			windowMs: 1000,
			now: at([0, 0, 1001]),
		});

		expect(limiter.allow("a")).toBe(true);
		expect(limiter.allow("a")).toBe(false);
		expect(limiter.allow("a")).toBe(true);
	});

	// Without eviction this map is a slow memory leak on a long-lived server:
	// every address that ever called would be remembered forever.
	it("forgets callers whose window has long expired", () => {
		const limiter = inMemoryRateLimiter({
			limit: 1,
			windowMs: 1000,
			now: at([0, 5000]),
		});

		limiter.allow("first");
		limiter.allow("second");

		expect(limiter.size()).toBe(1);
	});
});

describe("callerOf", () => {
	const withHeaders = (headers: Record<string, string>) =>
		new Request("https://example.test/api/check", { headers });

	it("uses the forwarded address a proxy supplies", () => {
		expect(callerOf(withHeaders({ "x-forwarded-for": "203.0.113.5" }))).toBe("203.0.113.5");
	});

	// A proxy chain lists the original caller first; the rest are the hops. Using
	// the last one would key every request to our own edge and rate-limit the
	// whole world as one caller.
	it("takes the first address from a proxy chain", () => {
		expect(callerOf(withHeaders({ "x-forwarded-for": "203.0.113.5, 70.41.3.18, 10.0.0.1" }))).toBe(
			"203.0.113.5",
		);
	});

	it("falls back to x-real-ip", () => {
		expect(callerOf(withHeaders({ "x-real-ip": "198.51.100.9" }))).toBe("198.51.100.9");
	});

	it("has a name for a caller it cannot identify", () => {
		expect(callerOf(withHeaders({}))).toBe("unidentified");
	});

	it("ignores an empty header rather than keying on blank", () => {
		expect(callerOf(withHeaders({ "x-forwarded-for": "  " }))).toBe("unidentified");
	});
});
