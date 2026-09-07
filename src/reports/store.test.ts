import { describe, expect, it } from "vitest";
import { inMemoryReportStore } from "./store";

const at = (iso: string) => new Date(iso);

const storeWithClock = (times: string[]) => {
	let index = 0;
	let ids = 0;

	return inMemoryReportStore({
		now: () => at(times[Math.min(index++, times.length - 1)] ?? times[0] ?? "2026-01-01T00:00:00Z"),
		newId: () => `id-${++ids}`,
	});
};

const REPORT = { message: "NZ Post: pay at nzpost-track.top", verdictLevel: "scam" as const };

describe("adding a report", () => {
	it("keeps the message and what the app said about it", async () => {
		const store = inMemoryReportStore();
		const report = await store.add(REPORT);

		expect(report.message).toBe(REPORT.message);
		expect(report.verdictLevel).toBe("scam");
	});

	it("starts every report waiting to be looked at", async () => {
		const report = await inMemoryReportStore().add(REPORT);

		expect(report.status).toBe("pending");
		expect(report.reviewedAt).toBeNull();
	});

	it("stamps when it arrived", async () => {
		const store = storeWithClock(["2026-03-01T09:00:00.000Z"]);

		expect((await store.add(REPORT)).receivedAt).toBe("2026-03-01T09:00:00.000Z");
	});

	it("gives each report its own id", async () => {
		const store = inMemoryReportStore();
		const first = await store.add(REPORT);
		const second = await store.add(REPORT);

		expect(first.id).not.toBe(second.id);
	});
});

describe("reading the queue", () => {
	// A queue is read from the top, and this morning's reports matter more than
	// last month's.
	it("puts the newest first", async () => {
		const store = storeWithClock(["2026-03-01T09:00:00.000Z", "2026-03-02T09:00:00.000Z"]);
		await store.add({ ...REPORT, message: "older" });
		await store.add({ ...REPORT, message: "newer" });

		expect((await store.list()).map((report) => report.message)).toEqual(["newer", "older"]);
	});

	it("can show only what is still waiting", async () => {
		const store = inMemoryReportStore();
		const first = await store.add(REPORT);
		await store.add(REPORT);
		await store.setStatus(first.id, "verified", null);

		expect(await store.list("pending")).toHaveLength(1);
		expect(await store.list("verified")).toHaveLength(1);
		expect(await store.list()).toHaveLength(2);
	});

	it("has an empty queue before anything is reported", async () => {
		expect(await inMemoryReportStore().list()).toEqual([]);
	});
});

describe("reviewing a report", () => {
	it("records the decision, when it was made, and why", async () => {
		const store = storeWithClock(["2026-03-01T09:00:00.000Z", "2026-03-03T11:00:00.000Z"]);
		const report = await store.add(REPORT);
		const reviewed = await store.setStatus(report.id, "verified", "Matches the parcel scam.");

		expect(reviewed?.status).toBe("verified");
		expect(reviewed?.note).toBe("Matches the parcel scam.");
		expect(reviewed?.reviewedAt).toBe("2026-03-03T11:00:00.000Z");
	});

	// The reporter did nothing wrong by asking — being unsure is exactly when
	// they should. The status says the message was fine, not that they were.
	it("can mark a report as not a scam after all", async () => {
		const store = inMemoryReportStore();
		const report = await store.add(REPORT);

		expect((await store.setStatus(report.id, "not-a-scam", null))?.status).toBe("not-a-scam");
	});

	it("clears the review stamp if something is put back in the queue", async () => {
		const store = inMemoryReportStore();
		const report = await store.add(REPORT);
		await store.setStatus(report.id, "verified", "note");

		expect((await store.setStatus(report.id, "pending", null))?.reviewedAt).toBeNull();
	});

	it("says nothing was found for an id that does not exist", async () => {
		expect(await inMemoryReportStore().setStatus("nope", "verified", null)).toBeNull();
	});
});

// ADR 0012: reports do not accumulate. Once a report has become a library entry
// or been dismissed, keeping the original serves nobody — it may hold the
// reporter's name, their bank, or a family member's.
describe("deleting a report", () => {
	it("removes it entirely", async () => {
		const store = inMemoryReportStore();
		const report = await store.add(REPORT);

		expect(await store.remove(report.id)).toBe(true);
		expect(await store.list()).toEqual([]);
	});

	it("reports honestly when there was nothing to delete", async () => {
		expect(await inMemoryReportStore().remove("nope")).toBe(false);
	});
});
