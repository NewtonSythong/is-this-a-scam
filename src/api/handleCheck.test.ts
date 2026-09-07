import { describe, expect, it } from "vitest";
import type { KnownOrganisation, Verdict } from "../domain/types";
import { NO_LOOKUPS } from "../engine/lookups";
import { type CheckDependencies, handleCheck } from "./handleCheck";
import { inMemoryRateLimiter } from "./rateLimit";

const ANZ: KnownOrganisation = {
	name: "ANZ",
	mentions: ["anz"],
	domains: ["anz.co.nz"],
	phone: "0800 269 296",
	verifiedRoute: null,
};

const DEPS: CheckDependencies = {
	organisations: [ANZ],
	reporting: { instruction: "Forward it to 7726." },
	lookups: NO_LOOKUPS,
	narrative: null,
	allowDebug: false,
	rateLimiter: null,
};

const post = (body: unknown, url = "https://example.test/api/check") =>
	new Request(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: typeof body === "string" ? body : JSON.stringify(body),
	});

const checkOf = async (message: string, deps: CheckDependencies = DEPS) => {
	const response = await handleCheck(post({ message }), deps);

	return (await response.json()) as Verdict;
};

describe("handleCheck: a Message checked over HTTP", () => {
	it("returns the Verdict for a scam", async () => {
		const verdict = await checkOf("ANZ: unusual activity. Verify at anz-secure.top");

		expect(verdict.level).toBe("scam");
		expect(verdict.headline).toBe("This is a scam. Do not reply, do not tap the link.");
		expect(verdict.reasons[0]).toContain("not a real ANZ address");
		expect(verdict.howToCheck).toContain("0800 269 296");
		expect(verdict.reportTo).toBe("Forward it to 7726.");
	});

	it("declines to vouch for a message it finds nothing wrong with", async () => {
		expect((await checkOf("Hi Mum, this is my new number.")).level).toBe("unclear");
	});

	it("answers with JSON", async () => {
		const response = await handleCheck(post({ message: "hello" }), DEPS);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("application/json");
	});
});

// ADR 0001: the Suspicion Score is for tuning and tests, not for a Checker. The
// clients are the last place it could leak from, so the API does not send it.
describe("handleCheck: the Suspicion Score does not leave the server", () => {
	it("omits the score from an ordinary response", async () => {
		const body = (await checkOf("ANZ: verify at anz-secure.top")) as Verdict & {
			internal?: unknown;
		};

		expect(body.internal).toBeUndefined();
		expect(Object.keys(body)).not.toContain("internal");
	});

	it("includes it for the developer view when that is switched on", async () => {
		const response = await handleCheck(
			post({ message: "ANZ: verify at anz-secure.top" }, "https://example.test/api/check?debug=1"),
			{ ...DEPS, allowDebug: true },
		);
		const body = (await response.json()) as Verdict;

		expect(body.internal.score).toBeGreaterThan(0);
	});

	it("ignores the request for it when the developer view is switched off", async () => {
		const response = await handleCheck(
			post({ message: "ANZ: verify at anz-secure.top" }, "https://example.test/api/check?debug=1"),
			DEPS,
		);
		const body = (await response.json()) as Verdict & { internal?: unknown };

		expect(body.internal).toBeUndefined();
	});
});

describe("handleCheck: bad requests", () => {
	it("refuses anything but a POST", async () => {
		const response = await handleCheck(new Request("https://example.test/api/check"), DEPS);

		expect(response.status).toBe(405);
	});

	it("refuses a body that is not JSON", async () => {
		expect((await handleCheck(post("not json at all"), DEPS)).status).toBe(400);
	});

	it("refuses a body with no message", async () => {
		expect((await handleCheck(post({}), DEPS)).status).toBe(400);
		expect((await handleCheck(post({ message: 42 }), DEPS)).status).toBe(400);
	});

	// An empty box is a Checker who has not pasted anything yet, not an error the
	// app should treat as a Verdict.
	it("refuses an empty or blank message", async () => {
		expect((await handleCheck(post({ message: "" }), DEPS)).status).toBe(400);
		expect((await handleCheck(post({ message: "   \n  " }), DEPS)).status).toBe(400);
	});

	// A bound on what one Check can cost, in both model tokens and lookups.
	it("refuses a message far longer than any real one", async () => {
		expect((await handleCheck(post({ message: "a".repeat(20_001) }), DEPS)).status).toBe(400);
	});

	it("accepts a long but plausible email", async () => {
		expect((await handleCheck(post({ message: "a".repeat(19_000) }), DEPS)).status).toBe(200);
	});

	it("explains a refusal in words rather than a bare status", async () => {
		const response = await handleCheck(post({ message: "" }), DEPS);
		const body = (await response.json()) as { error?: string };

		expect(body.error).toBeTruthy();
	});
});

describe("handleCheck: the cap on how often one caller may check", () => {
	const limited = (limit: number): CheckDependencies => ({
		...DEPS,
		rateLimiter: inMemoryRateLimiter({ limit, windowMs: 60_000, now: () => 0 }),
	});

	const fromAddress = (address: string) =>
		new Request("https://example.test/api/check", {
			method: "POST",
			headers: { "content-type": "application/json", "x-forwarded-for": address },
			body: JSON.stringify({ message: "hello" }),
		});

	it("turns a caller away once they pass the limit", async () => {
		const deps = limited(2);

		expect((await handleCheck(fromAddress("1.1.1.1"), deps)).status).toBe(200);
		expect((await handleCheck(fromAddress("1.1.1.1"), deps)).status).toBe(200);
		expect((await handleCheck(fromAddress("1.1.1.1"), deps)).status).toBe(429);
	});

	it("does not let one caller use up everybody else's checks", async () => {
		const deps = limited(1);

		await handleCheck(fromAddress("1.1.1.1"), deps);

		expect((await handleCheck(fromAddress("2.2.2.2"), deps)).status).toBe(200);
	});

	// The person reading this is frightened and not technical. "429" means
	// nothing to them; "wait a few minutes" does.
	it("explains the wait in words", async () => {
		const deps = limited(0);
		const response = await handleCheck(fromAddress("1.1.1.1"), deps);
		const body = (await response.json()) as { error: string };

		expect(body.error).toMatch(/wait a few minutes/i);
		expect(body.error).not.toMatch(/rate limit|429|quota|throttl/i);
	});

	it("runs uncapped when no limiter is given", async () => {
		for (let attempt = 0; attempt < 5; attempt++) {
			expect((await handleCheck(fromAddress("1.1.1.1"), DEPS)).status).toBe(200);
		}
	});
});
