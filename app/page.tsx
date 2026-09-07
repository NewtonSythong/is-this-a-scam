import Link from "next/link";
import { sourceUrl } from "@/src/meta/source";
import { CheckForm } from "./CheckForm";

export default function Home() {
	const source = sourceUrl();

	return (
		<main className="page">
			<header className="masthead">
				<h1>Is this a scam?</h1>
				<p>
					Paste a text message or email you are not sure about. It is not saved — unless you
					choose to report it, so others can be warned.
				</p>
			</header>

			<CheckForm />

			<footer className="colophon">
				<p>
					<Link href="/scams">See the scams going around in New Zealand</Link> — what each one
					looks like, and what to do about it.
				</p>
				<p>
					<Link href="/helping">Helping someone who is being targeted</Link> — for the daughter,
					the son, the neighbour: how to be the person they ring, and what to say when they do.
				</p>
				<p>
					This is the web version of an Android app built for people in New Zealand who are being
					targeted by scam texts. On a phone, the app adds <strong>Is this a scam?</strong> to the
					menu that appears when you highlight a message, so there is nothing to copy or paste.
				</p>
				{/* The AGPL's section 13: an app people only reach over a network has to
				    offer them its source, and this is the offer. It is also the only
				    thing that makes the measured numbers on this page checkable by
				    anyone but us. */}
				<p>
					This app is free software, licensed under the{" "}
					<a href="https://www.gnu.org/licenses/agpl-3.0.html">GNU AGPL, version 3</a>.{" "}
					{source === null ? (
						"You are entitled to its source."
					) : (
						<>
							<a href={source}>Read the source</a>, check how it decides, or tell us where it
							is wrong.
						</>
					)}
				</p>
				<p>
					It never tells you a message is safe — only that it found something wrong, or that it
					could not tell. Checking a message keeps nothing: no account, no history, nothing
					written down. The only exception is a message you deliberately choose to report, which
					is kept until someone has read it.
				</p>
			</footer>
		</main>
	);
}
