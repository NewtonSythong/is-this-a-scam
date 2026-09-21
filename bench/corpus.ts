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

/**
 * `verbatim` — the words are the sender's own, reproduced from the message or
 * from a published screenshot of it.
 *
 * A verbatim item MAY carry shape-preserving redaction: where a genuine message
 * captured from a real inbox contained a person's name, account number, IP
 * address or similar, it is replaced by a stand-in of the same shape and length.
 * Blanking the field outright would change what is being measured, since a
 * message with a name in it does not behave like one without. Every redacted
 * item says so, and the unredacted originals are kept outside this repository —
 * see the block above the 2026-09-21 additions.
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
	{
		id: "afterpay-verify-account-verbatim",
		// A real phishing email out of a New Zealander's junk folder, pasted
		// exactly as it arrived. Sent from "Afterpay <lahresour@mailtoinserve.nl>"
		// through what looks like an abused Dutch ticketing system, which is why
		// the footer is in Dutch and the body is not.
		message:
			"Confirm your Account\n\nAfterpay\n\nDear customer,\n\nWe have noticed that there is certain information in your account details that seems inaccurate or unverified. You should verify your information so that you can use our service smoothly.\n\nPlease check the details of your account to ensure they comply with the new rules. This will help us maintain accurate records and ensure greater security for your account.\n\nClick the button below.\n\nUpdate Now\n\n© 2026 Afterpay\n\nBekijk je ticket online in ons klantportaal: https://lahresour.inportal.nl/tickets/1",
		kind: "scam",
		provenance: "verbatim",
		developedAgainst:
			"2026-09-07: this is the message that exposed both gaps. The verify-account-pretext narrative pattern was written after reading it, and Afterpay was added to the Known Organisation list because of it.",
		source: "Reported by a user from their own junk mail, 2026-09-07",
		note: "The app rated this 'unclear' with no reasons at all. It is the most common phishing pretext there is, and it slipped through because it is calm: no threat, no deadline, no money mentioned. A catalogue built around alarm had nothing to say about politeness.",
	},
	// ── Added 2026-09-07, transcribed from published screenshots ──────────
	//
	// New Zealand organisations publish annotated *images* of scam texts, not
	// the text, which is why this corpus began with only two verbatim items and
	// why the Smishtank researchers had to build an OCR pipeline to get any. The
	// four below were read off those screenshots by eye, so the words are the
	// scammer's but the transcription is ours — whitespace especially is
	// approximate, and the source line names the image so anyone can re-check it.
	//
	// None of them was seen before the three narrative patterns of 2026-09-07
	// were written, so all four are properly held out and are the only current
	// test of whether those patterns generalise.
	{
		id: "anz-account-frozen-verbatim",
		message:
			"From ANZ : Your account is being checked for suspected fraudulent funds, your account will be frozen immediately, please click the link below to complete the verification: www.anznzz.com",
		kind: "scam",
		provenance: "verbatim",
		source:
			"Screenshot published by ANZ at https://www.anz.co.nz/banking-with-anz/banking-safely/recognise-scams-fraud/latest-scams/july-2024-anz-phishing-text/ — transcribed 2026-09-07",
		note: "Names ANZ and links to anznzz.com, which ANZ does not own. The Artifact Check should reach this one without the model.",
	},
	{
		id: "anz-points-expiry-verbatim",
		message:
			"ANZ Points\nThis is to notify you that 12,076 Rewards Points will expire at 9 March 2026 unless redeemed prior to this date.\n\nDiscover a wide selection of rewards, including Apple, Gift card and more, available for redemption before your points expire.\n\nhttps://anz-points.click/nz\n\nPlease reply with ‘Y’, then close and reopen the SMS to activate the link. If the link remains inactive, copy and paste it directly into Safari.",
		kind: "scam",
		provenance: "verbatim",
		source:
			"Screenshot published by ANZ at https://www.anz.co.nz/banking-with-anz/banking-safely/recognise-scams-fraud/latest-scams/march-2026-anz-fake-reward-scams/ — transcribed 2026-09-07",
		note: "The real version of bnz-rewards-expiry, which benefit-expiry-pretext was written from. Sent from a +44 number, and the closing paragraph coaches the reader past their own phone's link protection.",
	},
	{
		id: "anz-points-expiry-short-verbatim",
		message:
			"ANZ: Your 12,805 rewards points will expire at 12:00AM on 28/10/2025. Please redeem at https://anz-pointscheck.click/au immediately",
		kind: "scam",
		provenance: "verbatim",
		source:
			"Screenshot published by ANZ at https://www.anz.co.nz/banking-with-anz/banking-safely/recognise-scams-fraud/latest-scams/march-2026-anz-fake-reward-scams/ — transcribed 2026-09-07",
		note: "The same campaign compressed into one line. Worth having both: length is one of the few things a real corpus varies that an invented one does not.",
	},
	{
		id: "nzpost-redelivery-verbatim",
		message:
			"NZPOST - attempted delivery, please update your information online at: https://www.help-nzpost.life to arrange redelivery.",
		kind: "scam",
		provenance: "verbatim",
		source:
			"Screenshot published by NZ Post at https://www.nzpost.co.nz/contact-support/scams-and-fraud — transcribed 2026-09-07",
		note: "The real version of nzpost-warehouse-verbatim's shape, which delivery-blocked-pretext was written from. The domain contains 'nzpost' but is not nzpost.co.nz.",
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
	// Added 2026-09-09 with `wrong-number-opener`. That pattern fires on a
	// message from somebody who does not seem to know who they are writing to,
	// which is a shape ordinary life produces constantly — a courier at the gate,
	// a tradesman running late. Both of these must stay quiet, and neither was
	// used to write the pattern.
	//
	// A genuinely misdirected text — a real stranger writing "sorry, wrong
	// number" — is deliberately NOT here, and its absence is a judgement rather
	// than an oversight. The pattern is meant to fire on that message. It cannot
	// be told apart from the scam opener by its words, only by what follows, and
	// the advice given either way is the same: do not reply. Scoring it as a
	// false alarm would measure this pattern against a standard its own design
	// rejects, so the honest thing is to say so here rather than to quietly
	// exclude it.
	{
		id: "courier-genuine-at-the-door",
		message:
			"Hi, is that John? It's Ryan from the depot, I've got a parcel for number 14 and there's no answer at the door. Should I leave it round the side?",
		kind: "legitimate",
		provenance: "synthetic",
		hardNegative: true,
		source: "n/a — an ordinary message, written as a false-alarm probe for wrong-number-opener",
		note: "Asks whether the reader is somebody, from a stranger, with no link and no organisation to check — the wrong-number shape exactly. It is genuine because it names a real delivery in progress.",
	},
	{
		id: "tradesman-genuine-running-late",
		message:
			"Morning, is this Margaret? Dave here from Watertight Plumbing, running about 20 minutes behind for the 10 o'clock. Sorry about that.",
		kind: "legitimate",
		provenance: "synthetic",
		hardNegative: true,
		source: "n/a — an ordinary message, written as a false-alarm probe for wrong-number-opener",
		note: "A stranger to the reader's phone, opening by checking who they are. Genuine because the sender identifies themselves and refers to an appointment that exists.",
	},
	// Added 2026-09-18, BEFORE the run that scores the three catalogue changes of
	// that date — `job-or-earnings-offer`, `false-familiarity`, and the widening
	// of `unexpected-money` to cover a reward offered for completing a small
	// task. The order matters: a negative added after seeing which ones were hit
	// is not a test, it is a description of the result.
	//
	// Each of the three is the nearest genuine message to the pattern it guards,
	// and none of them was used to write it.
	{
		id: "recruiter-genuine-followup",
		message:
			"Hi Newton, it's Priya from Kōrero Recruitment — following up on your application for the graduate analyst role. Are you free for a quick call Thursday afternoon?",
		kind: "legitimate",
		provenance: "synthetic",
		hardNegative: true,
		source: "n/a — an ordinary message, written as a false-alarm probe for job-or-earnings-offer",
		note: "An unexpected text about work, which is the whole shape of the pattern. Genuine because the sender is named and refers to an application the reader actually made — a false alarm here would warn somebody off their own job hunt.",
	},
	{
		id: "friend-genuine-after-a-gap",
		message:
			"Hey stranger! It's been far too long, I keep meaning to message. Are you still up for that coffee we talked about?",
		kind: "legitimate",
		provenance: "synthetic",
		hardNegative: true,
		source: "n/a — an ordinary message, written as a false-alarm probe for false-familiarity",
		note:
			"Warm, unsigned, and leaning on a shared history the message never names. This is the " +
			"only false alarm this project has ever recorded, and it is why there is no " +
			"`false-familiarity` pattern in the catalogue. That pattern was written on 2026-09-18 " +
			"for the wrong-number misses that open with claimed intimacy — 'Honey I hope you don't " +
			"forget our promise', 'Hi baby, here are the photos' — it fired on six of them, and it " +
			"fired on this message too. It was withdrawn rather than narrowed, because narrowing a " +
			"pattern while looking at the message that caught it is how the corpus above was spent. " +
			"Keep this item. If somebody writes that pattern again, this is the message that has to " +
			"stay quiet, and it has to stay quiet on a version nobody tuned against it.",
	},
	{
		id: "retail-genuine-refund-receipt",
		message:
			"Briscoes: your refund of $24.50 for order 88210 has been processed and should appear on your card within 3 working days.",
		kind: "legitimate",
		provenance: "synthetic",
		hardNegative: true,
		source: "n/a — an ordinary message, written as a false-alarm probe for unexpected-money",
		note: "Money arriving unannounced, which `unexpected-money` fires on. Genuine because it is a receipt for a return the reader made, asks nothing and offers nothing — the exclusion clause added to that pattern on 2026-09-18 exists for this message.",
	},
	// ── Added 2026-09-21: the first genuine messages in this corpus that a New
	// Zealander actually received ────────────────────────────────────────────
	//
	// Everything above this line in the legitimate half was written by us. That is
	// the limitation `docs/jev-spike.md` names seven times: every false-alarm claim
	// this project makes rested on thirteen messages of our own invention, and
	// prose we wrote to look awkward is not the same thing as prose that is awkward
	// because the world is.
	//
	// These fifteen were captured from two real Gmail accounts on 2026-09-21. Each
	// one arrived unsolicited in a New Zealander's mailbox and each one is genuine.
	//
	// **They are redacted, and that is why `verbatim` needed its definition widened
	// above.** This repository is public. Names, account numbers, donor and
	// transaction IDs, IP addresses, number plates, phone numbers and email
	// addresses have been replaced with stable stand-ins of the same shape and
	// length. Nothing else was altered — the grammatical errors are the senders'
	// own. The unredacted originals are kept outside this repository, at
	// `Projects/corpus-sources-private/`, so any item here can be checked against
	// what actually arrived.
	//
	// Long legal footers are dropped, because nobody pastes a legal footer into a
	// scam checker. Subject line and body are kept.
	//
	// None of these was read before any pattern in the catalogue was written, and
	// all fifteen were added BEFORE the run that scores them. That order is the
	// whole point: a negative chosen after seeing which ones were hit describes a
	// result instead of testing one.
	{
		id: "ird-genuine-login-alert",
		message:
			"Hi Jordan Hale,\n\nYour myIR account JordanHale was logged into from a new device or web browser.\n\nTime: 15-Sep-2026 10:25:14\nIP: 203.0.113.47\n\nIf this was you\n\nYou can ignore this message. There is no need to take any action.\n\nIf this was not you\n\nYou will need to reset your password, by selecting Forgot password? on the myIR log in page.\n\nIf you are unable to reset your password, see any unusual account activity or have any concerns, please contact us immediately on 0800 227 770.\n\nThanks,\nCustomer Services team",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Inland Revenue (alerts@ironline.ird.govt.nz), 15 Sep 2026. Captured 2026-09-21. Redacted.", // pragma: allow (institutional sender)
		note:
			"The single most valuable negative in this corpus. A real government agency, an unexpected security alert, a login from a new device, an IP address, a password-reset instruction and a phone number to ring — which is the exact inventory of `asb-fraud-team-callback`, a scam. Note also that the sender is `ironline.ird.govt.nz`, a subdomain rather than the bare `ird.govt.nz` that IRD's own guidance teaches people to look for.",
	},
	{
		id: "google-genuine-signin-alert",
		message:
			"New sign-in to your account\njordan.hale@example.com\nWe noticed a new sign-in to your Google Account. If this was you, you don't need to do anything. If not, we'll help you secure your account.\nCheck activity",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Google (no-reply@accounts.google.com), 16 Sep 2026. Captured 2026-09-21. Redacted.", // pragma: allow (institutional sender)
		note: "The shortest form of the account-security alarm. Almost every credential-phishing campaign in existence imitates this message, which makes the genuine one a hard negative by construction.",
	},
	{
		id: "anz-genuine-job-referral",
		message:
			"Hi Jordan,\n\nYou've been referred by an ANZ employee as someone who would be a great fit for the following role:\n\nJob title: Associate Private Banker\n\nRequisition number: 118742\n\nWe'd love for you to apply so we can hear more about your skills, experience and what you are looking for. You can read more about it, and apply, using the link below:\n\nPlease use this email address when logging in, to make sure their referral is acknowledge. You have an existing profile in our system - use \"Forget Password\" if you need to. You will receive a confirmation email once you have successfully submitted your application.\n\nhttps://careers.anz.com/job-invite/118742/?locale=en%5fGB&utm_campaign=rcmemployeereferral&utm_source=rcmemployeereferral",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from ANZ PeopleHub (no-reply@talentandculture.anz.com), 14 Sep 2026. Captured 2026-09-21. Redacted.", // pragma: allow (institutional sender)
		note:
			"An unsolicited message from a bank, offering an opportunity, instructing the reader to log in, and containing a grammatical error — 'to make sure their referral is acknowledge'. Poor grammar in a message from a bank is the tell every scam-awareness page in New Zealand teaches, and here it is genuine. This is the hardest negative for `job-or-earnings-offer` and `verify-account-pretext` at once.",
	},
	{
		id: "anz-genuine-interview-invite",
		message:
			"Hi Jordan,\n\nCongratulations! You have been selected to progress for the Customer Service Consultant, New Zealand Contact Centre, 114508 position, which will involve completing a short digital interview.\n\nWe ask that you complete your digital interview within the next 72 hours. We recommend that you complete the entire digital interview in one sitting. Please let us know should you require any additional time or have any special requirements.\n\nTo begin the digital Interview click here https://sau.hvue.io/XXXXXXXXXXXXXXXX to begin!\n\nThank you again for your interest!\n\nKind Regards,\n\nANZ Recruitment Team",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from ANZ PeopleHub (no-reply@talentandculture.anz.com), 14 Sep 2026. Captured 2026-09-21. Redacted.", // pragma: allow (institutional sender)
		note:
			"'Congratulations! You have been selected', a 72-hour deadline, and a link to an unfamiliar third-party domain (`sau.hvue.io`) that carries neither the bank's name nor a word of English. Every deterministic signal this app has says scam. It is a real interview invitation from a real bank.",
	},
	{
		id: "nzblood-genuine-appointment",
		message:
			"Kia ora Jordan,\n\nDonor ID: 3180000\n\nThanks for being a lifesaver and making an appointment to donate plasma. We really appreciate the time you're taking out of your day to help save lives. Confirmation of your appointment is below.\n\nAppointment Details\n\nDate and Time:\n\n20/11/2025 09:40 AM\n\nLocation: Dunedin Donor Centre\n\nAddress: Dunedin Donor Centre, 170 Crawford Street, Dunedin\n\nDonation Type: Plasma\n\nBlood Type: O Positive\n\nCan't make your appointment?\n\nIf you're no longer able to make your appointment and need to reschedule or cancel it we understand. You can change things online through our NZ Blood Donor App or by visiting nzblood.co.nz. Alternatively you can call us on 0800 448 325.",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from New Zealand Blood Service (info@nzblood.co.nz), 17 Nov 2025. Captured 2026-09-21. Redacted.", // pragma: allow (institutional sender)
		note:
			"Our own `appointment-reminder` is a one-line invention. This is what a real New Zealand appointment confirmation looks like: a te reo greeting, an ID number, a date, an address, an 0800 number and a warm tone. The length alone is something an invented corpus never produces.",
	},
	{
		id: "smithandsmith-genuine-booking",
		message:
			"Kia ora Jordan\n\nGreat news! Your booking is confirmed for 20/06/2022 8:45 a.m. at our Smith&Smith branch at 114 Cumberland Street, Dunedin Central. We expect your vehicle will be ready for you to drive away by 10:45 AM. Please let us know if you are unable to pick up your vehicle at that time as we only have limited parking onsite.\n\nDuring your service, our technician will complete a vehicle glass safety check, which includes inspecting your wiper blades to ensure that they are in good working condition. If they need replacing, we have a great range at competitive prices with free installation\n\nYour Information\n\nJordan Hale\n\n021 000 0000\n\njordan.hale@example.com\n\nSubaru Outback\n\nABC123\n\nNeed to update any details or contact us before your appointment date?\n\nEither login online by clicking here and use the email address you supplied above as well as this booking number 00900000 or call us on 0800 80 90 80.\n\nNgā mihi\n\nYour Customer Service team\nSmith&Smith",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Smith&Smith (contactus@smithandsmith.co.nz), 9 Jun 2022. Captured 2026-09-21. Redacted.", // pragma: allow (institutional sender)
		note:
			"'Great news!', an upsell, an instruction to log in, and the reader's own personal details quoted back at them — a technique scams use to manufacture credibility. Genuine, and thoroughly New Zealand.",
	},
	{
		id: "nzpost-genuine-collected-verbatim",
		message:
			"We've collected your Naked Glass parcel\n\nGood news!\n\nWe've collected your parcel from Naked Glass. We expect to deliver it to you by 28 June 2023. If you live rurally, this may take a little longer (add 2-3 days).\n\nTRACKING NUMBER\n\n4579070025137501WLG001JN\n\nSTATUS\n\nCollected from Sender\n\nTrack my parcel\nAdd delivery instructions\n\nAny questions? Please contact our Customer Care Centre.",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from NZ Post (noreply.notifications@nzpost.co.nz), 27 Jun 2023. Captured 2026-09-21.", // pragma: allow (institutional sender)
		note:
			"The genuine counterpart to four scams in this corpus. `nzpost-genuine-tracking` above is our reconstruction of this shape from NZ Post's own description; this is the article itself, and it is notably longer and chattier than we guessed.",
	},
	{
		id: "nzpost-genuine-delivery-window",
		message:
			"We expect to deliver your parcel from Chemist Warehouse today\n\nGood news!\n\nWe expect to deliver your parcel from Chemist Warehouse between 11:45am - 2:45pm today.\n\nTRACKING NUMBER\n\n00494210334300158492\n\nSTATUS\n\nWith courier for delivery\n\nYou can keep an eye on its progress using our online tracking tool.\n\nTrack my parcel\nAdd delivery instructions\n\nAny questions? Please contact our Customer Care Centre.",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from NZ Post (noreply.notifications@nzpost.co.nz), 20 Dec 2022. Captured 2026-09-21.", // pragma: allow (institutional sender)
		note: "A same-day time window is a soft deadline, and the parcel is from a pharmacy — a purchase a scam would be glad to imitate.",
	},
	{
		id: "nzpost-genuine-collected-duplicate",
		message:
			"We've collected your parcel from Chemist Warehouse\n\nGood news!\n\nWe've collected your parcel from Chemist Warehouse. We expect to deliver it to you by 19 December 2022. If you live rurally, this may take a little longer (add 2-3 days).\n\nTRACKING NUMBER\n\n00494210334300158492\n\nSTATUS\n\nCollected from Sender\n\nTrack my parcel\nAdd delivery instructions\n\nAny questions? Please contact our Customer Care Centre.",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from NZ Post (noreply.notifications@nzpost.co.nz), 15 Dec 2022. Captured 2026-09-21.", // pragma: allow (institutional sender)
		note:
			"Deliberately kept despite being a near-duplicate of the item above, carrying the same tracking number at an earlier stage. Real inboxes contain the same event reported twice; invented corpora never do, and a model thrown by the repetition should be caught by it.",
	},
	{
		id: "googleplay-genuine-points-expiry",
		message:
			"Your Play Points expire in 34 days\n\nWant to keep your points?\n\nYou have Google Play Points that will expire in 34 days. To keep your points, earn or use at least one point before August 19, 2025.\n\nVisit Play Points",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Google Play (googleplay-noreply@google.com), 17 Jul 2025. Captured 2026-09-21.", // pragma: allow (institutional sender)
		note:
			"The genuine twin of `anz-points-expiry-verbatim` and `bnz-rewards-expiry`, both scams here. Loyalty points, a countdown, a named deadline and a call to action. `benefit-expiry-pretext` fired on 73 of 145 messages in the Jev run, and this is the message that should say whether that pattern describes a pretext or merely describes a marketing email.",
	},
	{
		id: "spotify-genuine-student-reverify",
		message:
			"Action required: Don't lose your Spotify Premium student discount\n\nReverify to keep your student discount.\n\nWe just want to let your know that your Premium Student discount period expires on 2025-04-14.\n\nTo keep your student discount for another year, you need to reverify that you're enrolled in an accredited college or university.\n\nREVERIFY NOW\n\nIf you don't reverify or if you've had a student discount for the maximum number of 4 years, your account will automatically switch to a Spotify Premium Individual subscription after your expiration date. You'll then be charged $18.99 a month until you cancel.",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Spotify (no-reply@legal.spotify.com), 16 Mar 2025. Captured 2026-09-21.", // pragma: allow (institutional sender)
		note:
			"'Action required', a loss framed as a deadline, an instruction to reverify, and a charge that begins if the reader does nothing. It also carries the sender's own grammatical error, 'let your know'. This item probes `benefit-expiry-pretext` and `verify-account-pretext` together.",
	},
	{
		id: "dyson-genuine-one-time-code",
		message:
			"Your code: 768543 – Log in to your MyDyson App\n\nYour code: 768543\n\nLog in to the MyDyson App using this code.\n\nIt will soon expire, so please use now.\n\nIf you didn't attempt to log in to your MyDyson App, we recommend ignoring this email and changing your password through the app.",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Dyson New Zealand Limited (no-reply@cp.dyson.com), 13 May 2026. Captured 2026-09-21.", // pragma: allow (institutional sender)
		note:
			"`bank-genuine-2fa` above is our invention of this shape. This is the real thing from a New Zealand registered company, and it is harder than ours: it carries an urgency line, 'so please use now', that we did not think to write.",
	},
	{
		id: "playstation-genuine-payment-problem",
		message:
			"There's been a problem processing your PlayStation Plus Essential recurring payment\n\nPlease Update Your Payment Details\n\nPlayStation ID: PlayerOne1234\n\nWe've had some trouble processing payment for your ongoing PlayStation Plus Essential subscription.\n\nDon't worry, we'll try again over the next few days, but in the meantime you may want to review the payment details on your account.\n\nIf we are unable to process your payment, your subscription will end and your account will lose access to its PlayStation Plus Essential benefits.\n\nUpdate Payment Details",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from PlayStation (sony@txn-email03.playstation.com), 6 Sep 2026. Captured 2026-09-21. Redacted.", // pragma: allow (institutional sender)
		note:
			"A payment failure, a threatened loss of access and a button marked 'Update Payment Details' — sent from `txn-email03.playstation.com`, which is not `playstation.com`. A rule that flags a host wearing the organisation's name without being its domain would flag the genuine article here.",
	},
	{
		id: "spotify-genuine-payment-reminder",
		message:
			"Reminder: update your payment details\n\nWe still can't process your payment.\n\nWe encountered an issue with your payment method for this upcoming month. Your Spotify Premium will be discontinued going forward if we don't have a working payment method for your account. This could be because:\n\nThere's a problem with your bank or account; or\nYour payment card expired\n\nKindly update your payment information to avoid any service interruptions. We'll try your payment again over the next few days.\n\nUPDATE DETAILS",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Spotify (no-reply@spotify.com), 18 Jul 2025. Captured 2026-09-21.", // pragma: allow (institutional sender)
		note:
			"'Kindly update your payment information to avoid any service interruptions' is, almost word for word, the sentence scam-awareness material uses as its worked example of phishing prose. It is genuine. If the app cannot stay quiet on this one, the false-alarm problem is larger than thirteen invented messages could ever have shown.",
	},
	{
		id: "paypal-genuine-receipt",
		message:
			"Receipt for Your Payment to Spotify AB\n\nHello, Jordan Hale\n\nYou paid $20.99 NZD to Spotify AB\n\nView or Manage Payment\n\nTransaction ID\n15F00000JX0000000\n\nTransaction date\n13/09/2026\n\nMerchant\nSpotify AB\nsupport@spotify.com\n\nInvoice ID\nP46X0000X0\n\nTotal $20.99 NZD\n\nCharge will appear on your credit card statement as \"PAYPAL *SPOTIFY*P46X000\"\n\nPaid Spotify AB with\nMastercard-0000 $20.99 NZD\n\nIssues with this transaction?\n\nYou have 180 days from the date of the transaction to open a dispute in the Resolution Center.\n\nPayPal is committed to preventing fraudulent emails. Emails from PayPal will always contain your full name. Learn to identify phishing", // pragma: allow (Spotify's own merchant support address, quoted inside the genuine receipt)
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from PayPal (service@intl.paypal.com), 13 Sep 2026. Captured 2026-09-21. Redacted.", // pragma: allow (institutional sender)
		note:
			"Money leaving an account, a transaction the reader may not remember authorising, and an invitation to dispute it — which is `bank-dispute-payment`'s entire shape, a scam in this corpus. The fake-receipt phishing genre imitates this message closely enough that PayPal spends a paragraph of the genuine one explaining how to tell them apart.",
	},
];

export const CORPUS: readonly CorpusItem[] = [...SCAMS, ...LEGITIMATE];

/** Did the app do the right thing by this message? */
export function isCorrect(item: CorpusItem, level: VerdictLevel): boolean {
	return item.kind === "scam" ? level !== "unclear" : level === "unclear";
}
