// The vocabulary here is the vocabulary in CONTEXT.md. If a name changes in one
// place it changes in both.

/** How alarming a single Signal is, on its own. */
export type Severity = "scam" | "warning" | "unclear";

/**
 * A single piece of evidence produced by the Artifact Check or the Narrative
 * Check. A Checker never sees a Signal — they see the Reason written from it.
 *
 * `reason` lives on the Signal rather than being generated later because of the
 * constraint in ADR 0003: the app may only tell a Checker something it actually
 * found. Keeping the sentence attached to the evidence that produced it makes
 * that constraint structural instead of a convention someone remembers.
 */
export interface Signal {
	/** Stable identifier, e.g. "link-not-owned-by-claimed-org". Used by tests. */
	kind: string;
	severity: Severity;
	/**
	 * The plain-language sentence shown to the Checker. No jargon: "link", "the
	 * message", "the person who sent this" — never "URL", "domain", "phishing".
	 */
	reason: string;
	/**
	 * The Known Organisation this Signal implicates, by name, or `null` where none
	 * is involved. Carried on the Signal so a Check can tell the Checker how to
	 * confirm with that organisation directly (ADR 0009) without re-deriving who
	 * the Message was pretending to be.
	 */
	organisation: string | null;
}

/** A link found in a Message. */
export interface Link {
	/** Exactly the text as it appeared in the Message. */
	raw: string;
	/**
	 * Lowercased hostname, with any leading "www." removed. Comparisons are made
	 * against this, never against `raw`.
	 */
	host: string;
}

/**
 * An organisation on the curated New Zealand list (ADR 0006), recorded with the
 * domains it genuinely owns and the number a Checker should actually ring.
 */
export interface KnownOrganisation {
	/** Display name as a Checker would say it, e.g. "NZ Post". */
	name: string;
	/**
	 * Lowercased words that suggest a Message is claiming to be from this
	 * organisation, e.g. ["anz"]. Matched case-insensitively on word boundaries.
	 */
	mentions: string[];
	/**
	 * Registrable domains this organisation genuinely owns, e.g. ["anz.co.nz"].
	 * A host belongs to the organisation if it equals one of these or is a
	 * subdomain of one — never if it merely contains one. See ADR 0003.
	 */
	domains: string[];
	/**
	 * The real public number, so the app can say what to ring instead. `null`
	 * means it has not yet been verified against the organisation's own site — a
	 * wrong number in this app would send a frightened Checker to a stranger, so
	 * an unverified number is never guessed and never shown.
	 */
	phone: string | null;
	/**
	 * How a Checker can confirm a contact through a channel this organisation
	 * itself controls — for example a bank app that can tell you whether a call
	 * really came from its call centre.
	 *
	 * `null` means no such channel has been confirmed to exist, in which case the
	 * app falls back to advice that invents nothing. Never populated from
	 * anything but the organisation's own published material: telling a
	 * frightened Checker to use a verification feature that does not exist is
	 * worse than telling them nothing.
	 */
	verifiedRoute: string | null;
}

/** A Verdict's level. Same three values a Signal carries, decided across all of them. */
export type VerdictLevel = Severity;

/**
 * The outcome of a Check — everything the app shows a Checker, and nothing it
 * does not. Note what is absent: there is no field meaning "safe", because
 * ADR 0001 gives the app no way to say it.
 */
export interface Verdict {
	level: VerdictLevel;
	/** One of exactly three sentences. Never a number, never a colour alone. */
	headline: string;
	/** The Reasons behind the headline, most alarming first. May be empty. */
	reasons: readonly string[];
	/**
	 * How to confirm with the organisation directly (ADR 0009), or `null` where
	 * no Known Organisation is implicated.
	 */
	howToCheck: string | null;
	/** Shown on every Verdict, whatever the level. */
	disclaimer: string;
	/** Whether handing the Message to a Trusted Person is the main action (ADR 0007). */
	escalationIsPrimary: boolean;
	/**
	 * How to report the Message onward, or `null` where there is nothing to report
	 * — which is every Verdict below "scam". Reporting a message the app is not
	 * sure about wastes the Checker's nerve and the reporting service's time.
	 */
	reportTo: string | null;
	/**
	 * Everything the Checker must never be shown. Nested rather than spread across
	 * the Verdict so that putting the Suspicion Score on screen takes a deliberate
	 * keystroke instead of an absent-minded one.
	 */
	internal: { score: number };
}

/**
 * Where scam messages get reported in a given country, kept as data because it
 * varies by country exactly as the Known Organisation list does (ADR 0006).
 */
export interface ReportingChannel {
	/** Plain instruction for a Checker, naming what to do and what it costs. */
	instruction: string;
}

/**
 * Someone the Checker already relies on, who they can hand a Message to when the
 * app cannot settle it (ADR 0007).
 *
 * Held on the Checker's own device and never sent to the server, so ADR 0005
 * survives this feature intact: their family member's name and number are not
 * ours to keep. The cost is that it must be set up again on each device, which
 * is the right way round for an audience who would be stopped cold by a sign-in
 * screen.
 */
export interface TrustedPerson {
	/** What the Checker calls them. Used to greet them in the message. */
	name: string;
	/** However the Checker wrote it — spaces, dashes and brackets are all fine. */
	phone: string;
}

/** One example message, and what the offline engine is expected to make of it. */
export interface ScamExample {
	text: string;
	/**
	 * What `check` alone should return — no keys, no network, no model. Asserted
	 * by the test suite, so an example that stops being caught fails a build
	 * rather than quietly rotting in the library.
	 */
	expectedOffline: VerdictLevel;
}

/**
 * One scam, described for the person it is aimed at.
 *
 * Data rather than page copy, because it is read twice: once by a Checker
 * browsing what is going around, and once by the test suite proving the engine
 * still catches it. Writing it in two places is how the two drift apart.
 */
export interface ScamPattern {
	slug: string;
	/** What a Checker would call it, not what a security team would. */
	name: string;
	/** One sentence: what lands on their phone. */
	summary: string;
	/** Why it works on people — the part that makes it recognisable next time. */
	howItWorks: string;
	/** What to do, in the imperative, with no conditions attached. */
	whatToDo: string;
	examples: readonly ScamExample[];
	/**
	 * True where the deterministic rules cannot see this one and the Narrative
	 * Check is what catches it. Recorded rather than hidden: it marks exactly
	 * where the app is weakest without a model.
	 */
	needsNarrative: boolean;
	/** Where this was documented, so a reader can check it is not our invention. */
	source: string;
}

/**
 * Where a reported Message has got to.
 *
 * "not-a-scam" rather than "rejected", because the reporter did nothing wrong by
 * sending it — they were unsure, which is exactly when they should ask.
 */
export type ReportStatus = "pending" | "verified" | "not-a-scam";

/**
 * A Message somebody chose to report so that others might be warned (ADR 0012).
 *
 * This is the one thing the app keeps, and only ever because a Checker
 * deliberately asked it to. Running a Check still stores nothing at all.
 */
export interface ScamReport {
	id: string;
	/**
	 * The Message as reported. Kept whole because a reviewer cannot judge what
	 * they cannot read — and deleted once it has been turned into a library
	 * entry or dismissed, because there is no reason to keep it after that.
	 */
	message: string;
	/**
	 * What the app said at the time. Recorded so review can see where the engine
	 * and a real person disagreed, which is the most useful thing in the queue.
	 */
	verdictLevel: VerdictLevel;
	status: ReportStatus;
	/** ISO 8601, in UTC. */
	receivedAt: string;
	reviewedAt: string | null;
	/** The reviewer's own note — never shown to a Checker. */
	note: string | null;
}