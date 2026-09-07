"use client";

import { useState } from "react";
import type { VerdictLevel } from "@/src/domain/types";

interface Props {
	message: string;
	verdictLevel: VerdictLevel;
}

type State = "offered" | "confirming" | "sending" | "sent" | "failed" | "unavailable";

/**
 * Reporting a Message so others can be warned (ADR 0012).
 *
 * Two taps, never one. The first opens this panel and shows the Checker exactly
 * what will be kept; the second sends it. This is the only place in the app where
 * something they typed leaves and stays, so it asks properly rather than hiding
 * behind a checkbox somebody would tick without reading.
 */
export function ReportPanel({ message, verdictLevel }: Props) {
	const [state, setState] = useState<State>("offered");

	async function send() {
		setState("sending");

		try {
			const response = await fetch("/api/report", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ message, verdictLevel, consent: true }),
			});

			// 503 is not a failure to send — it is the server saying it cannot keep
			// reports at all right now, which the Checker deserves to be told
			// straight rather than being invited to try again forever.
			if (response.ok) setState("sent");
			else setState(response.status === 503 ? "unavailable" : "failed");
		} catch {
			setState("failed");
		}
	}

	if (state === "sent") {
		return (
			<p className="panel" role="status">
				<strong>Thank you</strong>
				Someone will read it. If it turns out to be a scam we have not seen, it will be added
				to the list of scams going around, so the next person recognises it.
			</p>
		);
	}

	if (state === "unavailable") {
		return (
			<p className="panel" role="status">
				<strong>Reports are not being taken just now</strong>
				Nothing was kept, and your answer above is unaffected. You can still report a scam
				text yourself, free, by forwarding it to 7726.
			</p>
		);
	}

	if (state === "offered") {
		return (
			<p className="panel">
				<strong>Help warn other people</strong>
				If you send us this message, we will check it and add it to our list of scams so
				others recognise it.
				<button type="button" className="link" onClick={() => setState("confirming")}>
					Report this message
				</button>
			</p>
		);
	}

	return (
		<div className="panel report-confirm">
			<strong>Before you send it</strong>
			<p>
				This is the one thing the app keeps. Everything else you check is forgotten as soon
				as you get your answer.
			</p>
			<p>
				<strong>Read it over first.</strong> If it has your name, your address, or a family
				member&apos;s name in it, those would be kept too, until someone has read it and
				written up the scam.
			</p>

			<blockquote>{message}</blockquote>

			<p className="hint">We keep nothing about you — not your name, not your phone.</p>

			{state === "failed" && (
				<p className="error" role="alert">
					That did not send. Nothing was kept. You can try again.
				</p>
			)}

			<div className="trusted-actions">
				<button type="button" onClick={send} disabled={state === "sending"}>
					{state === "sending" ? "Sending…" : "Yes, send it"}
				</button>
				<button type="button" className="link" onClick={() => setState("offered")}>
					No, keep it private
				</button>
			</div>
		</div>
	);
}
