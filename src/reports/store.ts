import type { ReportStatus, ScamReport, VerdictLevel } from "../domain/types";

/** What arrives from a Checker choosing to report something. */
export interface NewReport {
	message: string;
	verdictLevel: VerdictLevel;
}

/**
 * Somewhere to keep reported Messages until they are reviewed.
 *
 * An interface, like every other outside thing this project touches, so the
 * whole report and review flow can be tested without a database — and so the
 * backing store can be chosen later without any of the logic above it changing.
 */
export interface ReportStore {
	add(report: NewReport): Promise<ScamReport>;
	list(status?: ReportStatus): Promise<readonly ScamReport[]>;
	setStatus(id: string, status: ReportStatus, note: string | null): Promise<ScamReport | null>;
	/**
	 * Deletes a report outright.
	 *
	 * Not an afterthought: once a report has become a library entry or been
	 * dismissed, keeping the original — which may hold the reporter's name, their
	 * bank, or a family member's — serves nobody. This is how ADR 0012's promise
	 * that reports do not accumulate is actually kept.
	 */
	remove(id: string): Promise<boolean>;
}

export interface StoreOptions {
	now?: () => Date;
	newId?: () => string;
}

/**
 * A store that lives only as long as the process.
 *
 * Right for tests, and honest for local development. On a serverless host it
 * would silently lose every report between requests, which is why the deployed
 * app must be given a real one.
 */
export function inMemoryReportStore({
	now = () => new Date(),
	newId = () => crypto.randomUUID(),
}: StoreOptions = {}): ReportStore {
	const reports = new Map<string, ScamReport>();

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

			reports.set(report.id, report);

			return report;
		},

		async list(status?: ReportStatus): Promise<readonly ScamReport[]> {
			const all = [...reports.values()];

			// Newest first: a queue is read from the top, and what came in this
			// morning matters more than what came in last month.
			return all
				.filter((report) => status === undefined || report.status === status)
				.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
		},

		async setStatus(
			id: string,
			status: ReportStatus,
			note: string | null,
		): Promise<ScamReport | null> {
			const report = reports.get(id);
			if (report === undefined) return null;

			const updated: ScamReport = {
				...report,
				status,
				note,
				reviewedAt: status === "pending" ? null : now().toISOString(),
			};

			reports.set(id, updated);

			return updated;
		},

		async remove(id: string): Promise<boolean> {
			return reports.delete(id);
		},
	};
}
