import { beforeEach, describe, expect, it } from "vitest";
import type { ScamReport } from "../domain/types";
import { inMemoryReportStore, type ReportStore } from "../reports/store";
import { handleReview, type ReviewDependencies } from "./handleReview";

const TOKEN = "a-long-shared-secret";

let store: ReportStore;
let deps: ReviewDependencies;

beforeEach(async () => {
	store = inMemoryReportStore();
	deps = { store, token: TOKEN };
	await store.add({ message: "NZ Post: pay at nzpost-track.top", verdictLevel: "scam" });
});

const get = (query = `?token=${TOKEN}`) => new Request(`https://example.test/api/review${query}`);

const post = (body: unknown, token: string | null = TOKEN) =>
	new Request("https://example.test/api/review", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...(token === null ? {} : { "x-review-token": token }),
		},
		body: JSON.stringify(body),
	});

const firstId = async () => (await store.list())[0]?.id ?? "";

// This queue holds other people's messages in the raw. A deployment where
// somebody forgot to set the secret must fail shut, because failing open means
// publishing strangers' private messages.
describe("handleReview: the door", () => {
	it("is shut when no token has been configured", async () => {
		const response = await handleReview(get(), { store, token: null });

		expect(response.status).toBe(404);
	});

	it("is shut when the configured token is empty", async () => {
		expect((await handleReview(get(), { store, token: "" })).status).toBe(404);
	});

	it("is shut to a request carrying no token", async () => {
		expect((await handleReview(get(""), deps)).status).toBe(404);
	});

	it("is shut to a wrong token", async () => {
		expect((await handleReview(get("?token=nearly-right"), deps)).status).toBe(404);
	});

	// 404 rather than 401, so the queue does not announce that it exists to
	// somebody guessing at addresses.
	it("does not admit that it exists", async () => {
		const response = await handleReview(get(""), deps);
		const body = (await response.json()) as { error: string };

		expect(response.status).toBe(404);
		expect(body.error).not.toMatch(/token|auth|forbidden|unauthor/i);
	});

	it("opens to the right token in a header", async () => {
		const response = await handleReview(
			new Request("https://example.test/api/review", { headers: { "x-review-token": TOKEN } }),
			deps,
		);

		expect(response.status).toBe(200);
	});

	it("leaks nothing through a wrong token", async () => {
		const body = await (await handleReview(get("?token=wrong"), deps)).text();

		expect(body).not.toContain("nzpost-track.top");
	});
});

describe("handleReview: reading the queue", () => {
	it("lists the reports", async () => {
		const body = (await (await handleReview(get(), deps)).json()) as { reports: ScamReport[] };

		expect(body.reports).toHaveLength(1);
		expect(body.reports[0]?.message).toContain("nzpost-track.top");
	});

	it("can filter to what is still waiting", async () => {
		await store.setStatus(await firstId(), "verified", null);
		const body = (await (
			await handleReview(get(`?token=${TOKEN}&status=pending`), deps)
		).json()) as { reports: ScamReport[] };

		expect(body.reports).toEqual([]);
	});

	it("refuses a status it does not have", async () => {
		expect((await handleReview(get(`?token=${TOKEN}&status=maybe`), deps)).status).toBe(400);
	});
});

describe("handleReview: deciding", () => {
	it("marks a report verified, with a note", async () => {
		const id = await firstId();
		const response = await handleReview(post({ id, status: "verified", note: "Parcel scam." }), deps);
		const body = (await response.json()) as ScamReport;

		expect(body.status).toBe("verified");
		expect(body.note).toBe("Parcel scam.");
		expect(body.reviewedAt).not.toBeNull();
	});

	it("marks a report as not a scam after all", async () => {
		const response = await handleReview(post({ id: await firstId(), status: "not-a-scam" }), deps);

		expect(((await response.json()) as ScamReport).status).toBe("not-a-scam");
	});

	it("refuses a decision it does not recognise", async () => {
		expect((await handleReview(post({ id: await firstId(), status: "spam" }), deps)).status).toBe(
			400,
		);
	});

	it("says when there is no such report", async () => {
		expect((await handleReview(post({ id: "nope", status: "verified" }), deps)).status).toBe(404);
	});

	it("cannot be decided without the token", async () => {
		const response = await handleReview(post({ id: await firstId(), status: "verified" }, null), deps);

		expect(response.status).toBe(404);
		expect((await store.list())[0]?.status).toBe("pending");
	});
});

// ADR 0012: once a report has become a library entry or been dismissed, keeping
// the original serves nobody.
describe("handleReview: deleting", () => {
	it("removes a report entirely", async () => {
		const id = await firstId();
		const response = await handleReview(
			new Request(`https://example.test/api/review?token=${TOKEN}&id=${id}`, { method: "DELETE" }),
			deps,
		);

		expect(response.status).toBe(200);
		expect(await store.list()).toEqual([]);
	});

	it("cannot delete without the token", async () => {
		const id = await firstId();
		const response = await handleReview(
			new Request(`https://example.test/api/review?id=${id}`, { method: "DELETE" }),
			deps,
		);

		expect(response.status).toBe(404);
		expect(await store.list()).toHaveLength(1);
	});
});
