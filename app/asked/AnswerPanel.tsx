"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Answer, Ask } from "@/src/domain/types";
import { sourceUrl } from "@/src/meta/source";
import { parseAsk, replyHref, replyText, whatTheAppSaid } from "@/src/trusted/reply";

/** What each button says, in the order they are offered. */
const CHOICES: { answer: Answer; label: string; className: string }[] = [
	{ answer: "scam", label: "It's a scam", className: "scam" },
	{ answer: "genuine", label: "It looks genuine to me", className: "genuine" },
	{ answer: "unsure", label: "I'm not sure either", className: "unsure" },
];

/**
 * The page a Trusted Person lands on when they tap the link in the text they
 * were sent (ADR 0013).
 *
 * It reads everything it shows out of the URL fragment, which means the whole
 * page works with no account, no install and no request to us carrying anybody's
 * message. It also means the read happens after mount: `location` does not exist
 * while this is being rendered on the server.
 */
export function AnswerPanel() {
	const [ask, setAsk] = useState<Ask | null>(null);
	const [ready, setReady] = useState(false);
	const [answer, setAnswer] = useState<Answer | null>(null);
	const [note, setNote] = useState("");
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		function read() {
			setAsk(parseAsk(window.location.hash));
			setReady(true);
			// Everything downstream belongs to the message that was there a moment
			// ago, and must go with it.
			setAnswer(null);
			setNote("");
			setCopied(false);
		}

		read();
		// A second link, tapped while this page is still open, changes only the
		// fragment — which no browser treats as a navigation, so nothing here
		// would otherwise re-run. Without this the Trusted Person would be looking
		// at the previous message, and could send an answer about it under the new
		// one's name.
		window.addEventListener("hashchange", read);

		return () => window.removeEventListener("hashchange", read);
	}, []);

	if (!ready) return <p className="hint">Opening…</p>;

	if (ask === null) {
		return (
			<section className="panel">
				<strong>There is nothing here to look at</strong>
				This page shows a message somebody has asked you about. It only works from the link
				they sent you — if you typed the address in, or if the text message arrived in two
				halves, there is nothing for it to show. Ask them to send it again.
				<p className="back">
					<Link href="/">Check a message yourself</Link>
				</p>
			</section>
		);
	}

	const asker = ask.from ?? "Someone you know";
	const reply = answer === null ? "" : replyText(answer, note, ask.from);
	const href = answer === null ? null : replyHref(ask.back, reply);

	async function copy() {
		try {
			await navigator.clipboard.writeText(reply);
			setCopied(true);
		} catch {
			// Some browsers refuse without a secure context or a permission. The
			// text is on screen and selectable, so there is still a way through.
			setCopied(false);
		}
	}

	return (
		<>
			<header className="masthead">
				<h1>{ask.to === null ? "Can you have a look?" : `${ask.to}, can you have a look?`}</h1>
				<p>
					{asker} was sent this message and is not sure whether it is real. Read it, then tell
					them what you think.
				</p>
			</header>

			{/* Anybody can build a link to this page, so anybody can choose what it
			    says — including who it claims is asking. Saying so plainly is the
			    defence: a page that quietly presents a stranger's text as a friend's
			    question is lending this domain's credibility to whoever sent it. */}
			<p className="provenance">
				Everything on this page came out of the link you tapped, including who it says is
				asking. We did not write any of it and cannot tell you who sent it. If you were not
				expecting this{ask.from === null ? "" : ` from ${ask.from}`}, treat it as you would any
				other message you did not expect.
			</p>

			<section className="asked">
				<h2>The message they were sent</h2>
				{/* Rendered as plain text on purpose: nothing in here is clickable, so a
				    live scam link cannot be tapped by accident on this screen. */}
				<blockquote>{ask.message}</blockquote>
				<p className="hint">
					Nothing above is a link you can tap, and it is safer that way. Do not open anything
					in it to find out whether it is real.
				</p>
				{whatTheAppSaid(ask.level) !== null && (
					<p className="what-app-said">{whatTheAppSaid(ask.level)}</p>
				)}
			</section>

			{answer === null ? (
				<section className="answer">
					<h2>What do you think?</h2>
					<label htmlFor="note">Anything you want to add (you can leave this empty)</label>
					<textarea
						id="note"
						value={note}
						onChange={(event) => setNote(event.target.value)}
						placeholder="I got the same one last week — just delete it."
						rows={3}
					/>
					{CHOICES.map((choice) => (
						<button
							key={choice.answer}
							type="button"
							className={`choice ${choice.className}`}
							onClick={() => setAnswer(choice.answer)}
						>
							{choice.label}
						</button>
					))}
				</section>
			) : (
				<section className="answer">
					<h2>Send this back{ask.from === null ? "" : ` to ${ask.from}`}</h2>
					<blockquote className="reply">{reply}</blockquote>

					{href !== null ? (
						<>
							<a className="ask primary" href={href}>
								Send it{ask.from === null ? "" : ` to ${ask.from}`}
							</a>
							{/* The number is on screen because the link chose it, not you. If it
							    is not the number you were expecting, that is worth seeing before
							    your phone texts it. */}
							<p className="hint destination">
								This opens a text message to <strong>{ask.back}</strong>. Nothing is sent
								until you send it.
							</p>
						</>
					) : (
						<>
							<p>
								They did not leave a number here, so send this as a reply to the text they
								sent you.
							</p>
							<button type="button" onClick={copy}>
								{copied ? "Copied — now paste it into your reply" : "Copy these words"}
							</button>
						</>
					)}

					<button
						type="button"
						className="link"
						onClick={() => {
							setAnswer(null);
							setCopied(false);
						}}
					>
						Change my answer
					</button>
				</section>
			)}

			<footer className="colophon">
				<p>
					Nothing on this page was sent to us. The message came to you inside the link itself,
					which is the part of a web address a browser never passes on — so we have no copy of
					it, and no record that you opened this.
				</p>
				<p>
					<Link href="/">What this is</Link> — a scam checker for people in New Zealand. It
					never says a message is safe, only that it found something wrong or could not tell.
					{sourceUrl() !== null && (
						<>
							{" "}
							<a href={sourceUrl() ?? ""}>Its source is public</a>, so anyone can check how
							it decides.
						</>
					)}
				</p>
			</footer>
		</>
	);
}
