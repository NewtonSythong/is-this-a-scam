import { inMemoryReportStore } from "./store";
import type { ReportStore } from "./store";
import { sqliteReportStore } from "./sqliteStore";

/**
 * The store this deployment uses, and whether it can be trusted to keep things.
 *
 * `durable` is the important half. The previous version returned a store that
 * silently lost every report between requests, which for a feature whose whole
 * promise is "tell us and we will warn others" is worse than not offering it at
 * all. Now the app knows when it cannot keep a report, and refuses to take one
 * rather than accepting it and dropping it — see `handleReport`.
 */
export interface Reports {
	store: ReportStore;
	durable: boolean;
}

let reports: Reports | null = null;

export function reportsFor(): Reports {
	reports ??= choose();

	return reports;
}

/**
 * On a serverless host, every instance has its own disk and instances are
 * discarded without warning — so a SQLite file there is not storage, it is a
 * cache that looks like storage. `VERCEL` is set by the platform itself, so this
 * detects the real situation rather than trusting configuration to be right.
 *
 * A hosted database is still the answer for that deployment; when one is chosen
 * it becomes another branch here and another adapter behind `ReportStore`, and
 * nothing above this file changes. Until then, the app is honest about it.
 */
function choose(): Reports {
	const serverless = process.env.VERCEL === "1";

	if (serverless) {
		return { store: inMemoryReportStore(), durable: false };
	}

	return {
		store: sqliteReportStore(process.env.REPORTS_DB_PATH ?? "./data/reports.db"),
		durable: true,
	};
}
