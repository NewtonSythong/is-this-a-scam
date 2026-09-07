"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReportStatus, ScamReport } from "@/src/domain/types";

/**
 * The queue, driven entirely from the browser.
 *
 * The token comes from the address bar and is sent as a header on every call, so
 * it never ends up in a server-rendered page. Everything shown here is somebody
 * else's message, which is why nothing is cached and nothing is prefetched.
 */
export function ReviewQueue() {
	const [token, setToken] = useState("");
	const [reports, setReports] = useState<ScamReport[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState<string | null>(null);

	useEffect(() => {
		setToken(new URLSearchParams(window.location.search).get("token") ?? "");
	}, []);

	const load = useCallback(async () => {
		if (token === "") return;
		setError(null);

		try {
			const response = await fetch("/api/review", { headers: { "x-review-token": token } });

			if (!response.ok) {
				setError("That token was not accepted.");
				setReports(null);
				return;
			}

			setReports(((await response.json()) as { reports: ScamReport[] }).reports);
		} catch {
			setError("Could not reach the queue.");
		}
	}, [token]);

	useEffect(() => {
		void load();
	}, [load]);

	async function decide(id: string, status: ReportStatus) {
		setBusy(id);
		const note = status === "verified" ? window.prompt("Note (optional):") : null;

		await fetch("/api/review", {
			method: "POST",
			headers: { "content-type": "application/json", "x-review-token": token },
			body: JSON.stringify({ id, status, note }),
		});

		setBusy(null);
		await load();
	}

	async function remove(id: string) {
		if (!window.confirm("Delete this report permanently?")) return;

		setBusy(id);
		await fetch(`/api/review?id=${encodeURIComponent(id)}`, {
			method: "DELETE",
			headers: { "x-review-token": token },
		});
		setBusy(null);
		await load();
	}

	if (token === "") {
		return (
			<p className="panel">
				<strong>No token</strong>
				Open this page with <code>?token=…</code> in the address, matching{" "}
				<code>REVIEW_TOKEN</code> on the server.
			</p>
		);
	}

	if (error !== null) {
		return (
			<p className="error" role="alert">
				{error}
			</p>
		);
	}

	if (reports === null) return <p className="panel">Loading…</p>;

	if (reports.length === 0) {
		return (
			<p className="panel">
				<strong>Nothing waiting</strong>
				No reports have come in, or they have all been dealt with.
			</p>
		);
	}

	return (
		<>
			{reports.map((report) => (
				<article className="scam" key={report.id}>
					<h2>
						{report.status === "pending" ? "Waiting" : report.status} ·{" "}
						<span className="source">app said {report.verdictLevel}</span>
					</h2>

					<blockquote>{report.message}</blockquote>

					<p className="source">
						Received {new Date(report.receivedAt).toLocaleString("en-NZ")}
						{report.note !== null && ` · ${report.note}`}
					</p>

					<div className="trusted-actions">
						<button
							type="button"
							className="link"
							disabled={busy === report.id}
							onClick={() => decide(report.id, "verified")}
						>
							It is a scam
						</button>
						<button
							type="button"
							className="link"
							disabled={busy === report.id}
							onClick={() => decide(report.id, "not-a-scam")}
						>
							Not a scam
						</button>
						<button
							type="button"
							className="link"
							disabled={busy === report.id}
							onClick={() => remove(report.id)}
						>
							Delete
						</button>
					</div>
				</article>
			))}
		</>
	);
}
