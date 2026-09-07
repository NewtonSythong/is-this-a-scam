import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { type FileReportStore, sqliteReportStore } from "./sqliteStore";

const directory = mkdtempSync(join(tmpdir(), "is-this-a-scam-"));
const opened: FileReportStore[] = [];

afterAll(() => {
	// Windows will not delete a file that is still open, so every store this
	// suite created has to let go of its handle before the folder can go.
	for (const store of opened) store.close();
	rmSync(directory, { recursive: true, force: true });
});

/** Every store the tests open, tracked so `afterAll` can close it. */
const storeAt = (path: string, options?: Parameters<typeof sqliteReportStore>[1]) => {
	const store = sqliteReportStore(path, options);
	opened.push(store);

	return store;
};

const REPORT = { message: "NZ Post: pay at nzpost-track.top", verdictLevel: "scam" as const };

const freshFile = (name: string) => join(directory, `${name}.db`);

describe("sqliteReportStore behaves like the store it replaces", () => {
	it("keeps the message and what the app said", async () => {
		const store = storeAt(freshFile("basics"));
		const report = await store.add(REPORT);

		expect(report.message).toBe(REPORT.message);
		expect(report.verdictLevel).toBe("scam");
		expect(report.status).toBe("pending");
		expect(report.reviewedAt).toBeNull();
	});

	it("puts the newest first", async () => {
		let clock = 0;
		const store = storeAt(freshFile("ordering"), {
			now: () => new Date(1_700_000_000_000 + clock++ * 86_400_000),
		});
		await store.add({ ...REPORT, message: "older" });
		await store.add({ ...REPORT, message: "newer" });

		expect((await store.list()).map((report) => report.message)).toEqual(["newer", "older"]);
	});

	it("can show only what is still waiting", async () => {
		const store = storeAt(freshFile("filtering"));
		const first = await store.add(REPORT);
		await store.add(REPORT);
		await store.setStatus(first.id, "verified", null);

		expect(await store.list("pending")).toHaveLength(1);
		expect(await store.list("verified")).toHaveLength(1);
		expect(await store.list()).toHaveLength(2);
	});

	it("records the decision, the note, and when it was made", async () => {
		const store = storeAt(freshFile("deciding"));
		const report = await store.add(REPORT);
		const reviewed = await store.setStatus(report.id, "verified", "Matches the parcel scam.");

		expect(reviewed?.status).toBe("verified");
		expect(reviewed?.note).toBe("Matches the parcel scam.");
		expect(reviewed?.reviewedAt).not.toBeNull();
	});

	it("clears the review stamp if something goes back in the queue", async () => {
		const store = storeAt(freshFile("requeue"));
		const report = await store.add(REPORT);
		await store.setStatus(report.id, "verified", "note");

		expect((await store.setStatus(report.id, "pending", null))?.reviewedAt).toBeNull();
	});

	it("says nothing was found for an id that does not exist", async () => {
		const store = storeAt(freshFile("missing"));

		expect(await store.setStatus("nope", "verified", null)).toBeNull();
		expect(await store.remove("nope")).toBe(false);
	});

	it("deletes a report entirely", async () => {
		const store = storeAt(freshFile("deleting"));
		const report = await store.add(REPORT);

		expect(await store.remove(report.id)).toBe(true);
		expect(await store.list()).toEqual([]);
	});
});

// The whole reason this store exists. The in-memory one passed every test above
// and still lost everything the moment the process ended.
describe("it actually keeps what it is given", () => {
	it("still has the report after the store is closed and reopened", async () => {
		const path = freshFile("persistence");

		const first = storeAt(path);
		const written = await first.add(REPORT);
		await first.setStatus(written.id, "verified", "Checked and confirmed.");
		// Closed, not merely dropped: this is the test proving the data is on disk
		// and not still sitting in this process.
		first.close();

		const reopened = storeAt(path);
		const [read] = await reopened.list();

		expect(read?.id).toBe(written.id);
		expect(read?.message).toBe(REPORT.message);
		expect(read?.status).toBe("verified");
		expect(read?.note).toBe("Checked and confirmed.");
	});

	it("survives a message full of quotes, newlines and semicolons", async () => {
		const path = freshFile("escaping");
		const nasty = `Hi Mum'; DROP TABLE reports; --\n"quoted" & <tagged>`;

		const writer = storeAt(path);
		await writer.add({ ...REPORT, message: nasty });
		writer.close();

		const [read] = await storeAt(path).list();

		expect(read?.message).toBe(nasty);
	});

	it("starts empty on a file that does not exist yet", async () => {
		expect(await storeAt(freshFile("brand-new")).list()).toEqual([]);
	});

	it("can be closed twice without complaint", () => {
		const store = storeAt(freshFile("double-close"));

		store.close();

		expect(() => store.close()).not.toThrow();
	});

	it("creates the folder it was pointed at", async () => {
		const nested = join(directory, "made", "up", "path", "reports.db");

		await expect(storeAt(nested).add(REPORT)).resolves.toBeDefined();
	});
});
