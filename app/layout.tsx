import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
	title: "Is This a Scam?",
	description:
		"Paste a suspicious text message or email and find out whether it looks like a scam, in plain language.",
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	// Deliberately not capping the zoom. Pinching to enlarge is how this app's
	// readers actually read, and locking it is the single most common way a
	// mobile page becomes unusable for them.
	maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en-NZ">
			<body>{children}</body>
		</html>
	);
}
