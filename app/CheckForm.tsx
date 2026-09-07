"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import type { TrustedPerson, Verdict } from "@/src/domain/types";
import { askForHelp, smsHref } from "@/src/trusted/askForHelp";
import {
	browserStore,
	forgetTrustedPerson,
	loadTrustedPerson,
	saveTrustedPerson,
} from "@/src/trusted/storage";
import { ReportPanel } from "./ReportPanel";
import { TrustedPersonPanel } from "./TrustedPersonPanel";

/** The Verdict as the API sends it: the Suspicion Score is stripped server-side. */
type PublicVerdict = Omit<Verdict, "internal">;

/**
 * Real shapes, so the page can be tried without anyone having to invent a scam.
 * Each one demonstrates a different half of the engine.
 */
const EXAMPLES = [
	"ANZ: unusual activity on your card. Verify your account now at anz-secure.top",
	"NZ Post: your parcel is being held. Pay the $1.50 fee at nzpost-track.top",
	"Hi Mum, this is my new number, my old phone broke. Can you buy a $200 gift card?",
	"ANZ: your statement is ready at https://anz.co.nz/statements",
];

export function CheckForm() {
	const [message, setMessage] = useState("");
	const [verdict, setVerdict] = useState<PublicVerdict | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [checking, setChecking] = useState(false);
	const [trusted, setTrusted] = useState<TrustedPerson | null>(null);
	const [saveFailed, setSaveFailed] = useState(false);
	const answer = useRef<HTMLDivElement>(null);

	// Read after mount, not during render: the server has no localStorage, and
	// reading it during render would make the first paint disagree with the
	// second.
	useEffect(() => {
		setTrusted(loadTrustedPerson(browserStore()));
	}, []);

	function rememberTrusted(person: TrustedPerson) {
		setTrusted(person);
		setSaveFailed(!saveTrustedPerson(browserStore(), person));
	}

	function forgetTrusted() {
		forgetTrustedPerson(browserStore());
		setTrusted(null);
		setSaveFailed(false);
	}

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		if (message.trim() === "" || checking) return;

		setChecking(true);
		setError(null);
		setVerdict(null);

		try {
			const response = await fetch("/api/check", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ message }),
			});
			const body = await response.json();

			if (!response.ok) {
				setError(body.error ?? "Something went wrong. Please try again.");
			} else {
				setVerdict(body as PublicVerdict);
				// Move focus to the answer so a screen reader announces it and a
				// magnified screen is scrolled to the part that matters.
				requestAnimationFrame(() => answer.current?.focus());
			}
		} catch {
			setError("Could not reach the checker. Please check your connection and try again.");
		} finally {
			setChecking(false);
		}
	}

	return (
		<>
			<form onSubmit={onSubmit}>
				<label htmlFor="message">Paste the message here</label>
				<p className="hint">
					Hold your finger on the message, tap <strong>Copy</strong>, then tap the box below and
					tap <strong>Paste</strong>.
				</p>
				<textarea
					id="message"
					value={message}
					onChange={(event) => setMessage(event.target.value)}
					placeholder="Paste the text message or email here"
					spellCheck={false}
				/>
				<button type="submit" disabled={checking || message.trim() === ""}>
					{checking ? "Checking…" : "Check this message"}
				</button>
			</form>

			{error !== null && (
				<p className="error" role="alert">
					{error}
				</p>
			)}

			{verdict !== null && (
				<div
					className={`verdict ${verdict.level}`}
					ref={answer}
					tabIndex={-1}
					role="status"
					aria-live="polite"
				>
					<h2>{verdict.headline}</h2>

					{verdict.reasons.length > 0 && (
						<ul className="reasons">
							{verdict.reasons.map((reason) => (
								<li key={reason}>{reason}</li>
							))}
						</ul>
					)}

					{trusted !== null ? (
						<p className="panel">
							<strong>Ask {trusted.name}</strong>
							{verdict.escalationIsPrimary
								? "This is the one to do. Send it to them and see what they say \u2014 there is no hurry."
								: `Send it to ${trusted.name} as well, if you would like a second opinion.`}
							<a
								className={verdict.escalationIsPrimary ? "ask primary" : "ask"}
								href={smsHref(trusted, askForHelp(trusted, message))}
							>
								Send this to {trusted.name}
							</a>
						</p>
					) : (
						verdict.escalationIsPrimary && (
							<p className="panel">
								<strong>Ask someone you trust</strong>
								Send this message to a family member or friend and ask them whether it is
								real. There is no hurry, and no harm in asking.
							</p>
						)
					)}

					{verdict.howToCheck !== null && (
						<p className="panel">
							<strong>How to check for yourself</strong>
							{verdict.howToCheck}
						</p>
					)}

					{verdict.reportTo !== null && (
						<p className="panel">
							<strong>Reporting it</strong>
							{verdict.reportTo}
						</p>
					)}

					{verdict.level !== "unclear" && (
						<ReportPanel message={message} verdictLevel={verdict.level} />
					)}

					<p className="disclaimer">{verdict.disclaimer}</p>
				</div>
			)}

			<TrustedPersonPanel
				person={trusted}
				onSave={rememberTrusted}
				onForget={forgetTrusted}
				saveFailed={saveFailed}
			/>

			<section className="examples">
				<h3>Or try one of these</h3>
				{EXAMPLES.map((example) => (
					<button
						key={example}
						type="button"
						onClick={() => {
							setMessage(example);
							setVerdict(null);
							setError(null);
						}}
					>
						{example}
					</button>
				))}
			</section>
		</>
	);
}
