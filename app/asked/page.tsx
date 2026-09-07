import type { Metadata } from "next";
import { AnswerPanel } from "./AnswerPanel";

export const metadata: Metadata = {
	title: "Can you have a look? · Is This a Scam?",
	description: "Someone has asked you whether a message they were sent is real.",
	// Every one of these addresses carries somebody's message in its fragment.
	// None of them should ever be crawled, saved, or turned into a search result.
	robots: { index: false, follow: false },
};

export default function Asked() {
	return (
		<main className="page">
			<AnswerPanel />
		</main>
	);
}
