import type { VerdictLevel } from "../src/domain/types";

/**
 * The held-out benchmark corpus.
 *
 * This is deliberately NOT `src/data/scamLibrary.nz.ts`. That library is the
 * regression suite: the engine was developed against those examples and the test
 * beside it asserts their verdicts, so measuring the engine on them would be
 * measuring it against its own answer key. Every message here is one the engine
 * was not built against, and nothing in this file is imported by `src/`.
 *
 * Two things this corpus is honest about, because a benchmark that hides them is
 * worse than no benchmark at all:
 *
 * 1. **Provenance varies, and it is recorded per item.** New Zealand banks and
 *    agencies overwhelmingly publish *annotated screenshots* of scams rather than
 *    the text, so verbatim examples are scarce. Items are tiered `verbatim`,
 *    `reconstructed` (written from an official description of a specific
 *    documented campaign) or `synthetic` (an ordinary message written to
 *    represent a shape), and results are reported per tier so a reader can
 *    discount the weaker evidence.
 *
 * 2. **The reconstructed and synthetic messages were written by a language
 *    model, and half the system under test is a language model.** Prose I wrote
 *    may be more legible to the Narrative Check than a real scammer's would be.
 *    That biases the scam-side results *upward* and it cannot be corrected for
 *    here — only disclosed, and weighed against the `verbatim` tier, which is
 *    free of it.
 *
 * The legitimate half matters as much as the scam half. An app that cries wolf at
 * a genuine bank text teaches a frightened person to ignore it, and the failure
 * is invisible in a corpus made only of scams. The `hardNegative` items are
 * genuine messages that deliberately wear a scam's clothes — a real courier's
 * shortened link, a real bank asking you to confirm a payment, a real family
 * member asking for money.
 */

export type Provenance = "verbatim" | "reconstructed" | "synthetic";

export interface CorpusItem {
	id: string;
	message: string;
	/**
	 * `scam` — the app should raise something: `scam` or `warning`.
	 * `legitimate` — the app should NOT alarm: `unclear` is the correct answer,
	 * because ADR 0001 gives it no way to say "safe" and `unclear` is its
	 * quietest verdict.
	 */
	kind: "scam" | "legitimate";
	provenance: Provenance;
	/** A genuine message written to look suspicious — the false-alarm test. */
	hardNegative?: boolean;
	/**
	 * Set once the engine has been changed *while looking at this item*, with the
	 * date and what was done.
	 *
	 * A held-out corpus is a wasting asset. The moment somebody fixes a miss by
	 * studying the message that produced it, that message stops measuring the
	 * engine and starts measuring the fix — it will pass by construction, exactly
	 * as every example in `src/data/scamLibrary.nz.ts` does. Pretending otherwise
	 * is how a benchmark becomes a marketing number.
	 *
	 * So the erosion is recorded here rather than remembered, and the report
	 * counts these items separately and says they prove nothing. An item can
	 * never be un-marked. When too many carry this, the corpus needs replacing,
	 * and the flags are what will make that obvious.
	 */
	developedAgainst?: string;
	/** Where the message or the campaign it reconstructs is documented. */
	source: string;
	/** What the offline engine alone is expected to manage, where known. */
	note?: string;
}

/**
 * Scam messages the engine was not developed against.
 *
 * Note what is missing compared with the regression library: none of these
 * announces itself with a `.top` or `.xyz` domain. Every example in
 * `scamLibrary.nz.ts` does, which is exactly the kind of thing a corpus written
 * alongside an engine drifts into.
 */
const SCAMS: readonly CorpusItem[] = [
	{
		id: "nzpost-signature-verbatim",
		// Reproduced exactly as NZ Post published it, including the real
		// scam host. Note what makes this hard: `mypost.securebn.homes` does
		// not contain "nzpost" anywhere, so a rule that looks for an
		// organisation's name inside the host has nothing to catch.
		message:
			"NZ Post® We attempted to deliver your NZ Post parcel on 1 December. Unfortunately, we were unable to contact you in person, and as this parcel requires a signature upon collection, delivery could not be completed. Please arrange a new delivery date immediately. Click here to select a new date: https://mypost.securebn.homes/nz",
		kind: "scam",
		provenance: "verbatim",
		source: "https://www.nzpost.co.nz/contact-support/scams-and-fraud",
		note: "Host does not wear the organisation's name — the lookalike-domain rule cannot see this one.",
	},
	{
		id: "nzpost-warehouse-verbatim",
		developedAgainst:
			"2026-09-07: the delivery-blocked-pretext narrative pattern was written after reading this message.",
		// Quoted in press coverage of the campaign. No link in the quoted
		// portion at all, which leaves nothing for the deterministic half.
		message:
			"Your package has arrived at the warehouse and has been suspended for delivery due to a missing home number in the package.",
		kind: "scam",
		provenance: "verbatim",
		source:
			"https://www.nzherald.co.nz/business/companies/banking-finance/nz-post-westpac-warn-of-text-message-phishing-scam-aimed-at-infecting-devices/NHJLKRMZGZHTJEGACUB63F5PYY/",
		note: "No link and no organisation named — only the Narrative Check can reach this.",
	},
	{
		id: "bnz-rewards-expiry",
		developedAgainst:
			"2026-09-07: the benefit-expiry-pretext narrative pattern was written after reading this message.",
		message:
			"BNZ: Your BNZ Rewards points will expire shortly. Reply Y to confirm you wish to keep them.",
		kind: "scam",
		provenance: "reconstructed",
		source: "https://www.bnz.co.nz/about-us/online-security/latest-scams",
		note: "BNZ, April 2026. No link — the payload is the reply, which harvests a live number.",
	},
	{
		id: "bank-dispute-payment",
		developedAgainst:
			"2026-09-07: the unauthorised-payment-pretext narrative pattern was written after reading this message, including the clause separating it from bank-genuine-confirm-payment.",
		message:
			"A payment of $739.00 to WELLINGTON TRADING was authorised on your account. If you did not authorise this, dispute it here: secure-verify-nz.com/dispute",
		kind: "scam",
		provenance: "reconstructed",
		source: "https://netsafe.org.nz/scams/phishing",
		note: "The May 2022 pattern: a fictitious charge, and the 'dispute' link is the hook. No bank is named, so there is no impersonation to spot.",
	},
	{
		id: "customs-duty",
		message:
			"Your international parcel is held by customs pending an unpaid duty of $3.20. Settle within 24 hours or the item will be returned to sender. customs-clearance-nz.com/pay",
		kind: "scam",
		provenance: "reconstructed",
		source: "https://netsafe.org.nz/scams/courier-delivery-scams",
	},
	{
		id: "ird-refund-plausible-domain",
		message:
			"Inland Revenue: our records show you are entitled to a refund of $621.45 for the 2025 tax year. Complete your claim at ird-online.services/refund",
		kind: "scam",
		provenance: "reconstructed",
		source: "https://www.ird.govt.nz/managing-my-tax/scams/signs-of-a-scam",
		note: "IRD state they never put links or refund amounts in messages — both are present here.",
	},
	{
		id: "asb-fraud-team-callback",
		message:
			"This is the ASB fraud team. We have stopped a transaction on your account. Please call us back on 09 887 4412 immediately to secure your funds.",
		kind: "scam",
		provenance: "reconstructed",
		source: "https://www.rnz.co.nz/news/business/577411/asb-warns-of-new-scam-risk-for-businesses",
		note: "The number is the payload. No link at all, and it names a real bank.",
	},
	{
		id: "hi-mum-no-secrecy",
		// Deliberately missing the tells the regression library leans on:
		// no "don't tell", no gift cards, no WhatsApp.
		message:
			"Hey mum, dropped my phone down the loo this morning so I'm on a temporary number. Save this one. Are you free later?",
		kind: "scam",
		provenance: "reconstructed",
		source: "https://netsafe.org.nz/scams/understanding-scams",
		note: "The opening move only — no ask yet. Catching this is what would actually protect someone, and it is the hardest case in the corpus.",
	},
];

/**
 * Messages that must NOT raise an alarm.
 *
 * `unclear` is the pass mark. Anything louder is a false alarm, and a false alarm
 * on a genuine message is not a harmless over-caution: it is how a person learns
 * the app is not worth listening to.
 */
const LEGITIMATE: readonly CorpusItem[] = [
	{
		id: "ird-genuine-assessment",
		// Matches IRD's own description of a genuine message: no link, no
		// amount, tells you to log in yourself.
		message:
			"Inland Revenue: your income tax assessment for the year ending 31 March 2026 is ready. Log in to myIR to see it.",
		kind: "legitimate",
		provenance: "reconstructed",
		source: "https://www.ird.govt.nz/managing-my-tax/scams/signs-of-a-scam",
	},
	{
		id: "nzpost-genuine-tracking",
		message:
			"Your parcel NZ7719284003 is out for delivery today. Track it at https://www.nzpost.co.nz/tracking",
		kind: "legitimate",
		provenance: "reconstructed",
		source: "https://www.nzpost.co.nz/contact-support/scams-and-fraud",
	},
	{
		id: "nzpost-genuine-shortener",
		// NZ Post's own page says a genuine link "will always link to
		// 'nzpost.co.nz' or 'http://nzp.st/'". A shortener is a textbook
		// scam signal, and here it is genuine.
		message: "Your NZ Post parcel is ready for collection. Details: http://nzp.st/k29fjr",
		kind: "legitimate",
		provenance: "reconstructed",
		hardNegative: true,
		source: "https://www.nzpost.co.nz/contact-support/scams-and-fraud",
		note: "A genuine shortened link. If shorteners alone raise a warning, this is a false alarm on real courier mail.",
	},
	{
		id: "bank-genuine-2fa",
		message: "Your ASB Netcode is 483920. ASB will never ask you for this code.",
		kind: "legitimate",
		provenance: "reconstructed",
		hardNegative: true,
		source: "https://www.asb.co.nz/banking-with-asb/security-alerts.html",
		note: "Names a bank and carries a code. Nothing is being asked of the reader.",
	},
	{
		id: "bank-genuine-confirm-payment",
		// The awkward one. Banks really do send these, and the shape —
		// a bank, an amount, a reply — is the BNZ Rewards scam's shape too.
		message:
			"ASB: Did you make a payment of $250.00 to a new payee at 2:14pm? Reply YES if this was you, or NO if it was not.",
		kind: "legitimate",
		provenance: "reconstructed",
		hardNegative: true,
		source: "https://www.asb.co.nz/banking-with-asb/security-alerts.html",
		note: "Genuine bank fraud checks look almost exactly like the reply-Y scam. If these cannot be separated, that is worth knowing and saying.",
	},
	{
		id: "family-money-request",
		// A real family member asking for money, with none of the scam's
		// scaffolding: no new number, no secrecy, no urgency.
		message: "Hi Mum, could you flick me $50 for the power bill? I'll pay you back on Friday.",
		kind: "legitimate",
		provenance: "synthetic",
		hardNegative: true,
		note: "A false alarm here does real damage — it teaches someone to distrust their own child.",
		source: "n/a — an ordinary message, included as a false-alarm probe",
	},
	{
		id: "appointment-reminder",
		message:
			"Reminder: you have an appointment at Wellington Medical Centre tomorrow at 10:30am. Call 04 385 9999 to reschedule.",
		kind: "legitimate",
		provenance: "synthetic",
		hardNegative: true,
		source: "n/a — an ordinary message, included as a false-alarm probe",
		note: "Carries a phone number and a deadline, both of which scams also carry.",
	},
	{
		id: "ordinary-personal",
		message: "Hi love, running about 10 minutes late, see you at the cafe.",
		kind: "legitimate",
		provenance: "synthetic",
		source: "n/a — an ordinary message, included as a false-alarm probe",
	},
];

export const CORPUS: readonly CorpusItem[] = [...SCAMS, ...LEGITIMATE];

/** Did the app do the right thing by this message? */
export function isCorrect(item: CorpusItem, level: VerdictLevel): boolean {
	return item.kind === "scam" ? level !== "unclear" : level === "unclear";
}
