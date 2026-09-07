import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ReportStatus, ScamReport, VerdictLevel } from "../domain/types";
import type { NewReport, ReportStore, StoreOptions } from "./store";

/**
 * A store backed by a file, and therefore one that holds an operating-system
 * handle. `close` is part of the concrete type rather than of `ReportStore`,
 * because only a store with a file open has anything to close.
 */
export type FileReportStore = ReportStore & { close(): void };

/**
 * Reports kept in a SQLite file.
 *
 * `node:sqlite` is built into Node, so this adds no dependency and needs no
 * account, no connection string and no service — which matters because the
 * alternative was an in-memory store that quietly lost everything it was given.
 *
 * Durable wherever the filesystem is. That is true on a laptop and on an
 * ordinary server, and false on a serverless host, where each instance has its
 * own disk and instances are discarded — see `instance.ts`, which is where that
 * distinction is decided rather than assumed.
 */
export function sqliteReportStore(
	path: string,
	{ now = () => new Date(), newId = () => crypto.randomUUID() }: StoreOptions = {},
): FileReportStore {
	const database = open(path);
	let closed = false;

	const insert = database.prepare(
		`INSERT INTO reports (id, message, verdict_level, status, received_at, reviewed_at, note)
		 VALUES (?, ?, ?, ?, ?, NULL, NULL)`,
	);
	// Newest first: a queue is read from the top, and this morning's reports
	// matter more than last month's.
	const selectAll = database.prepare(`SELECT * FROM reports ORDER BY received_at DESC`);
	const selectByStatus = database.prepare(
		`SELECT * FROM reports WHERE status = ? ORDER BY received_at DESC`,
	);
	const selectOne = database.prepare(`SELECT * FROM reports WHERE id = ?`);
	const update = database.prepare(
		`UPDATE reports SET status = ?, note = ?, reviewed_at = ? WHERE id = ?`,
	);
	const remove = database.prepare(`DELETE FROM reports WHERE id = ?`);

	return {
		async add({ message, verdictLevel }: NewReport): Promise<ScamReport> {
			const report: ScamReport = {
				id: newId(),
				message,
				verdictLevel,
				status: "pending",
				receivedAt: now().toISOString(),
				reviewedAt: null,
				note: null,
			};

			insert.run(
				report.id,
				report.message,
				report.verdictLevel,
				report.status,
				report.receivedAt,
			);

			return report;
		},

		async list(status?: ReportStatus): Promise<readonly ScamReport[]> {
			const rows = status === undefined ? selectAll.all() : selectByStatus.all(status);

			return rows.map(toReport);
		},

		async setStatus(
			id: string,
			status: ReportStatus,
			note: string | null,
		): Promise<ScamReport | null> {
			// A report put back in the queue loses its review stamp, because it has
			// not been reviewed any more.
			const reviewedAt = status === "pending" ? null : now().toISOString();

			update.run(status, note, reviewedAt, id);

			const row = selectOne.get(id);

			return row === undefined ? null : toReport(row);
		},

		async remove(id: string): Promise<boolean> {
			// ADR 0012: once a report has become a library entry or been dismissed,
			// keeping the original serves nobody.
			return remove.run(id).changes > 0;
		},

		// Idempotent on purpose: a shutdown handler and a cleanup path can both
		// reasonably call this, and closing an already-closed store is not an
		// error the caller should have to guard against.
		close(): void {
			if (closed) return;

			closed = true;
			database.close();
		},
	};
}

function open(path: string): DatabaseSync {
	if (path !== ":memory:") {
		mkdirSync(dirname(path), { recursive: true });
	}

	const database = new DatabaseSync(path);

	// Survives an unclean shutdown, which an app that promises to keep what it is
	// given should do.
	database.exec("PRAGMA journal_mode = WAL");
	database.exec("PRAGMA foreign_keys = ON");
	database.exec(`
		CREATE TABLE IF NOT EXISTS reports (
			id            TEXT PRIMARY KEY,
			message       TEXT NOT NULL,
			verdict_level TEXT NOT NULL,
			status        TEXT NOT NULL,
			received_at   TEXT NOT NULL,
			reviewed_at   TEXT,
			note          TEXT
		)
	`);
	database.exec("CREATE INDEX IF NOT EXISTS reports_by_status ON reports (status)");
	database.exec("CREATE INDEX IF NOT EXISTS reports_by_arrival ON reports (received_at DESC)");

	return database;
}

/** SQLite has no null-prototype objects or booleans; this is the boundary. */
function toReport(row: Record<string, unknown>): ScamReport {
	return {
		id: String(row.id),
		message: String(row.message),
		verdictLevel: String(row.verdict_level) as VerdictLevel,
		status: String(row.status) as ReportStatus,
		receivedAt: String(row.received_at),
		reviewedAt: row.reviewed_at === null ? null : String(row.reviewed_at),
		note: row.note === null ? null : String(row.note),
	};
}
