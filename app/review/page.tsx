import type { Metadata } from "next";
import { ReviewQueue } from "./ReviewQueue";

export const metadata: Metadata = {
	title: "Review queue",
	// Reported messages contain other people's words. This page must never be
	// indexed, even if the address leaks.
	robots: { index: false, follow: false, nocache: true },
};

/**
 * The reviewer's page.
 *
 * Renders nothing on the server: the token lives in the address bar and every
 * read goes through the API, so this file never has a report in it. That keeps
 * the one place holding strangers' private messages behind a single door rather
 * than two.
 */
export default function Review() {
	return (
		<main className="page">
			<header className="masthead">
				<h1>Review queue</h1>
				<p>
					Messages people chose to report. Verified ones become entries in the scam library;
					everything else is deleted.
				</p>
			</header>

			<ReviewQueue />
		</main>
	);
}
