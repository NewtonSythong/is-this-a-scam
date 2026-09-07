import Link from "next/link";
import { CheckForm } from "./CheckForm";

export default function Home() {
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
					This is the web version of an Android app built for people in New Zealand who are being
					targeted by scam texts. On a phone, the app adds <strong>Is this a scam?</strong> to the
					menu that appears when you highlight a message, so there is nothing to copy or paste.
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
