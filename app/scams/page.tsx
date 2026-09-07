import type { Metadata } from "next";
import Link from "next/link";
import { NEW_ZEALAND_SCAMS } from "@/src/data/scamLibrary.nz";

export const metadata: Metadata = {
	title: "Scams going around in New Zealand · Is This a Scam?",
	description:
		"The scams currently circulating in New Zealand, what each one looks like, and what to do about it — in plain language.",
};

/**
 * Static by design. This page has no input, reads nothing about the reader, and
 * runs no check — so it is worth reading even with no signal and nothing pasted,
 * which is often the state someone is in when a family member first shows them
 * the app.
 */
export default function Scams() {
	return (
		<main className="page">
			<header className="masthead">
				<p className="back">
					<Link href="/">← Check a message</Link>
				</p>
				<h1>Scams going around</h1>
				<p>
					These are the ones being reported in New Zealand now. If something you received
					looks like one of these, you already have your answer.
				</p>
			</header>

			<nav className="contents" aria-label="The scams on this page">
				<ol>
					{NEW_ZEALAND_SCAMS.map((scam) => (
						<li key={scam.slug}>
							<a href={`#${scam.slug}`}>{scam.name}</a>
						</li>
					))}
				</ol>
			</nav>

			{NEW_ZEALAND_SCAMS.map((scam) => (
				<article className="scam" key={scam.slug} id={scam.slug}>
					<h2>{scam.name}</h2>
					<p className="summary">{scam.summary}</p>

					<h3>Why it works</h3>
					<p>{scam.howItWorks}</p>

					<h3>What to do</h3>
					<p className="do">{scam.whatToDo}</p>

					<h3>What it looks like</h3>
					{scam.examples.map((example) => (
						<blockquote key={example.text}>{example.text}</blockquote>
					))}

					<p className="source">
						Reported by{" "}
						<a href={scam.source} rel="noreferrer noopener" target="_blank">
							{hostOf(scam.source)}
						</a>
					</p>
				</article>
			))}

			<footer className="colophon">
				<p>
					Seen one that is not here? Check it on the{" "}
					<Link href="/">front page</Link> — and you can report any scam text in New Zealand
					free by forwarding it to <strong>7726</strong>.
				</p>
			</footer>
		</main>
	);
}

/** The publisher's name, so a reader can see who says so without a long address. */
function hostOf(source: string): string {
	try {
		return new URL(source).hostname.replace(/^www\./, "");
	} catch {
		return source;
	}
}
