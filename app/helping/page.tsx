import type { Metadata } from "next";
import Link from "next/link";
import { NEW_ZEALAND_HELP } from "@/src/data/helpChannels.nz";

export const metadata: Metadata = {
	title: "Helping someone who is being targeted · Is This a Scam?",
	description:
		"What to do if a parent, grandparent or friend is getting scam texts — how to be the person they ring, what to say, and what to do first if money has already gone.",
};

/**
 * The page for the other person.
 *
 * Everything else in this app is written for the Checker. This one is written
 * for their adult child or their neighbour — the Trusted Person of ADR 0007,
 * read on their own phone, probably in a hurry, quite possibly after a phone
 * call that has just worried them.
 *
 * The section that earns its place is "What to say", not the list of numbers.
 * Shame is why people do not tell anyone until the money has gone, and the
 * person best placed to remove it is whoever picks up the phone.
 */
export default function Helping() {
	return (
		<main className="page">
			<header className="masthead">
				<p className="back">
					<Link href="/">← Check a message</Link>
				</p>
				<h1>Helping someone who is being targeted</h1>
				<p>
					For the daughter, the son, the neighbour, the friend. If someone you know is getting
					these texts, you are the single most useful thing standing between them and a loss —
					more useful than any app, this one included.
				</p>
			</header>

			<section className="scam">
				<h2>Be the person they ring</h2>
				<p className="summary">
					Nearly everyone who loses money to a text scam does it alone, in a hurry, without
					telling anybody first.
				</p>
				<h3>On their phone, once</h3>
				<p>
					Open this site on their phone, scroll to <strong>Add a trusted person</strong>, and
					put your name and number in. Add their name and number under{" "}
					<strong>About you</strong> as well. It takes a minute and it stays on their phone —
					it is never sent to us.
				</p>
				<p className="do">
					After that, anything they are unsure about reaches you in one tap, and you can answer
					it in two — the message comes to you with buttons on it, so you never have to type a
					reply.
				</p>
			</section>

			<section className="scam">
				<h2>What to say when they ask</h2>
				<p className="summary">
					This is the part that decides whether they ask you again next time.
				</p>
				<h3>Never</h3>
				<p>
					&ldquo;Why did you click that?&rdquo; &ldquo;How did you not see it?&rdquo; Shame is
					the reason people say nothing until the money is gone. Scams are built by people who
					do this full time, against a message designed to be believed on a small screen in a
					hurry. Being taken in by one is not a failure of intelligence.
				</p>
				<h3>Instead</h3>
				<p className="do">
					&ldquo;Good — I&rsquo;m glad you sent it to me. That one&rsquo;s a scam, just delete
					it. Send me anything else you&rsquo;re not sure about, any time, even at 2am.&rdquo;
				</p>
				<p>
					You are trying to make asking cheap. Someone who has been made to feel foolish once
					will handle the next one on their own, and the next one may be the expensive one.
				</p>
			</section>

			<section className="scam">
				<h2>The three habits that stop most of it</h2>
				<p>
					More useful than teaching anyone to spot a fake. Each of these works even when the
					message is a perfect copy.
				</p>
				<h3>1. Never use the contact details in the message</h3>
				<p className="do">
					Not the link, not the phone number, not the &ldquo;click here to dispute&rdquo;. Ring
					the bank on the number on the back of the card. Open the courier&rsquo;s own app. A
					scam has to supply its own way back to itself — that is its one unavoidable weakness.
				</p>
				<h3>2. Nobody legitimate asks for a code</h3>
				<p className="do">
					No bank, no police officer, no government department will ever ask for a one-time
					code, a PIN or a password — by text, by phone, or in person. Anyone who does is trying
					to get into an account.
				</p>
				<h3>3. A deadline is the trick, not the situation</h3>
				<p className="do">
					&ldquo;Within 24 hours.&rdquo; &ldquo;Your account will be closed.&rdquo; &ldquo;Your
					points expire today.&rdquo; The hurry exists to stop them checking. Nothing genuine is
					ever lost by taking an hour to ring somebody.
				</p>
			</section>

			<section className="scam">
				<h2>If money has already gone</h2>
				<p className="summary">Order matters here. The first hours are the ones that recover money.</p>
				<h3>First, before anything else</h3>
				<p className="do">
					Ring their bank, using the number on the back of their own card — not a number from
					any message or call. Say the words &ldquo;I have been scammed&rdquo;. Banks have a
					team for this and they can sometimes stop a payment that has not settled.
				</p>
				<h3>Then</h3>
				{NEW_ZEALAND_HELP.map((channel) => (
					<p key={channel.name} className="panel">
						<strong>
							{channel.purpose} — {channel.name}
							{channel.contact !== null && <> · {channel.contact}</>}
						</strong>
						{channel.detail}
						{channel.url !== null && (
							<>
								{" "}
								<a href={channel.url}>{channel.url.replace(/^https:\/\//, "")}</a>
							</>
						)}
					</p>
				))}
				<p>
					And tell them, plainly, that it was not their fault. New Zealanders lose money to this
					every day, and almost none of them tell anyone.
				</p>
			</section>

			<footer className="colophon">
				<p>
					<Link href="/scams">See the scams going around</Link> — worth ten minutes with them,
					so the shapes are familiar before one arrives.
				</p>
				<p>
					Every number on this page was read on that organisation&rsquo;s own website, and where
					one could not be, it is not printed here. That is the same rule the app follows when
					it tells someone who to ring.
				</p>
			</footer>
		</main>
	);
}
