import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryReportStore, type ReportStore } from "../reports/store";
import { handleReport, type ReportDependencies } from "./handleReport";
import { inMemoryRateLimiter } from "./rateLimit";

let store: ReportStore;
let deps: ReportDependencies;

beforeEach(() => {
	store = inMemoryReportStore();
	deps = { store, rateLimiter: null, durable: true };
});

const post = (body: unknown) =>
	new Request("https://example.test/api/report", {
		method: "POST",
		headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.5" },
		body: typeof body === "string" ? body : JSON.stringify(body),
	});

const GOOD = {
	message: "NZ Post: pay the fee at nzpost-track.top",
	verdictLevel: "scam",
	consent: true,
};

describe("handleReport: reporting a scam", () => {
	it("keeps the message and answers with its id", async () => {
		const response = await handleReport(post(GOOD), deps);
		const body = (await response.json()) as { id: string };

		expect(response.status).toBe(201);
		expect(body.id).toBeTruthy();
		expect((await store.list())[0]?.message).toBe(GOOD.message);
	});

	it("puts it in the queue waiting to be looked at", async () => {
		await handleReport(post(GOOD), deps);

		expect((await store.list("pending"))).toHaveLength(1);
	});

	it("records what the app said, so review can see where it disagreed", async () => {
		await handleReport(post({ ...GOOD, verdictLevel: "unclear" }), deps);

		expect((await store.list())[0]?.verdictLevel).toBe("unclear");
	});

	// Nothing about who sent it goes in, so there is nothing about them to give
	// back. The response is the id and nothing else.
	it("returns nothing about the person who reported it", async () => {
		const body = (await (await handleReport(post(GOOD), deps)).json()) as Record<string, unknown>;

		expect(Object.keys(body)).toEqual(["id"]);
	});

	it("stores nothing about the caller", async () => {
		await handleReport(post(GOOD), deps);
		const stored = JSON.stringify((await store.list())[0]);

		expect(stored).not.toContain("203.0.113.5");
	});
});

// The heart of ADR 0012. Keeping someone's message is only acceptable because
// they asked for it to be kept, so the endpoint refuses without that — a client
// that forgets to ask cannot store a message by accident.
describe("handleReport: consent is required by the endpoint, not just the page", () => {
	it("refuses a report with no agreement attached", async () => {
		const { consent: _consent, ...withoutConsent } = GOOD;

		expect((await handleReport(post(withoutConsent), deps)).status).toBe(400);
		expect(await store.list()).toEqual([]);
	});

	it("refuses anything short of a plain yes", async () => {
		for (const consent of [false, "yes", 1, null]) {
			expect((await handleReport(post({ ...GOOD, consent }), deps)).status, String(consent)).toBe(
				400,
			);
		}

		expect(await store.list()).toEqual([]);
	});

	it("says plainly why it refused", async () => {
		const { consent: _consent, ...withoutConsent } = GOOD;
		const body = (await (await handleReport(post(withoutConsent), deps)).json()) as {
			error: string;
		};

		expect(body.error).toMatch(/agreement/i);
	});
});

describe("handleReport: bad requests", () => {
	it("refuses anything but a POST", async () => {
		const response = await handleReport(new Request("https://example.test/api/report"), deps);

		expect(response.status).toBe(405);
	});

	it("refuses a body that is not JSON", async () => {
		expect((await handleReport(post("not json"), deps)).status).toBe(400);
	});

	it("refuses an empty message", async () => {
		expect((await handleReport(post({ ...GOOD, message: "  " }), deps)).status).toBe(400);
	});

	it("refuses a message far longer than any real one", async () => {
		expect(
			(await handleReport(post({ ...GOOD, message: "a".repeat(20_001) }), deps)).status,
		).toBe(400);
	});

	it("refuses a verdict it did not give", async () => {
		for (const verdictLevel of ["safe", "definitely-fine", undefined, 3]) {
			expect(
				(await handleReport(post({ ...GOOD, verdictLevel }), deps)).status,
				String(verdictLevel),
			).toBe(400);
		}
	});
});

describe("handleReport: the cap on reporting", () => {
	it("turns a caller away once they pass it", async () => {
		const limited: ReportDependencies = {
			store,
			rateLimiter: inMemoryRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 }),
			durable: true,
		};

		expect((await handleReport(post(GOOD), limited)).status).toBe(201);
		expect((await handleReport(post(GOOD), limited)).status).toBe(429);
		expect(await store.list()).toHaveLength(1);
	});
});

// The fix for the store that promised to keep reports and did not. Taking
// somebody's message, thanking them for it and losing it is the worst of both
// worlds: they gave up their privacy and nobody was warned.
describe("handleReport: it will not take a report it cannot keep", () => {
	const cannotKeep = (): ReportDependencies => ({ store, rateLimiter: null, durable: false });

	it("refuses rather than accepting and losing it", async () => {
		const response = await handleReport(post(GOOD), cannotKeep());

		expect(response.status).toBe(503);
		expect(await store.list()).toEqual([]);
	});

	it("says plainly that nothing was kept, and that the check still worked", async () => {
		const body = (await (await handleReport(post(GOOD), cannotKeep())).json()) as {
			error: string;
		};

		expect(body.error).toMatch(/nothing was kept/i);
		expect(body.error).toMatch(/check still worked/i);
	});

	// Refused before the body is even read, so a Checker cannot be rate-limited
	// out of an endpoint that was never going to accept their report anyway.
	it("refuses before spending anything on the request", async () => {
		const limiter = inMemoryRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });
		await handleReport(post(GOOD), { store, rateLimiter: limiter, durable: false });

		expect(limiter.size()).toBe(0);
	});
});
