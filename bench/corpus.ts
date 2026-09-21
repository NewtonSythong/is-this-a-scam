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

/**
 * Collected negatives, round 2 — captured 2026-09-22 under a pre-registered rule.
 *
 * The fifteen collected negatives above were chosen by judgement, and that is a
 * weakness F2 cannot argue its way out of: if the collected side was picked for
 * looking scam-like and the written side was not, the contrast measures the
 * chooser. So this round was sampled mechanically instead, against a rule
 * written down before any message was read —
 * `paper/SAMPLING-PROTOCOL.md`. Machine-sent, genuine, self-contained, at most
 * three per sending domain counting what this file already held, working
 * backwards from the most recent message. Nothing was selected or rejected for
 * how alarming it looked, and `hardNegative` below was assessed afterwards.
 *
 * That is why three plainly easy messages are in here. They are not padding;
 * a negative set made only of hard cases is its own cherry-pick, and a
 * false-alarm *rate* has to be measured against the mix that actually arrives.
 *
 * Every message here is redacted shape-preservingly. The unredacted originals
 * are in `corpus-sources-private/inbox-captures-3.md`, outside this repository,
 * along with the tally of what the rule passed over and why.
 */

	{
		id: "orcid-genuine-verify-email",
		message:
			"Your ORCID iD: 0009-0000-0000-0000\nYour ORCID record is https://orcid.org/0009-0000-0000-0000\n\nWelcome to ORCID,\nCongratulations on creating your new ORCID iD! This persistent digital identifier, that you own and control, will distinguish you from every other researcher and reduce your burden when you use it in manuscript and grant submission systems.\n\nVerifying your email address unlocks advanced editing features in your ORCID record. Until then you will only be able to manage your names and email addresses in your ORCID record.\n\nHow do I verify my email address?\nSimply click the button below to sign into your ORCID record and complete verification.\n\nVerify your email address\n\nOr, copy and paste the link below into your browser's address bar:\n\nhttps://orcid.org/verify-email/b31sdC9wV1J0aUh5WFF2WTJFWWxrYjdjbVdONWtZWCtMdFFEcENRNkV3RnZXSzRxeEdKMDd1cFlUVjJrdjRKVg?lang=en\n\nPlease visit our researcher homepage for more information on how to get the most out of your ORCID record.\n\nWarm Regards,\nORCID Support Team\nhttps://support.orcid.org",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from ORCID (DoNotReply@verify.orcid.org), 21 Sep 2026. Captured 2026-09-22. Redacted.",  // pragma: allow (institutional sender)
		note:
			"Almost the complete phishing grammar in one genuine message: 'Congratulations', an account you have just created, a benefit withheld until you act, an instruction to verify, and a hundred-character opaque token in the URL. `afterpay-verify-account-verbatim` in the scam half is the same shape.",
	},
	{
		id: "anz-talent-genuine-job-alert",
		message:
			"New jobs posted from careers.anz.com\n\nYou are receiving this email because you joined the ANZ Banking Group Limited Talent Community on 11/09/2026. You will receive these messages every 7 day(s). Your Job Alert matched the following jobs at careers.anz.com.\n\nJobs\nStrategy & Innovation Manager - Melbourne, AU\nSenior Lead Strategy - Melbourne, AU\nManager, Capital & Provisioning Analytics - Melbourne, AU\nSmall Business Specialist - Melbourne, AU\nSoftware Engineer - Melbourne, AU\nSenior Advisor - NFR Operational Risk and Resilience (Third Party) - Melbourne, AU\nSenior Manager Operations Risk, Group Operations - Melbourne, AU\nProcurement Change and Delivery Lead - Melbourne, AU\nChange Manager-Melbourne or Sydney - Melbourne, AU\nAudit Manager - Technology and Information Security - Melbourne, AU",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from ANZ Talent Community (anzbanking-jobnotification@noreply10.jobs2web.com), 18 Sep 2026. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"A bank's name throughout the body, sent from `noreply10.jobs2web.com` \u2014 a domain with no relationship to the bank in the text. This is the false positive `playstation-genuine-payment-problem` warns about, in its purest form.",
	},
	{
		id: "hirevue-genuine-interview-reminder",
		message:
			"Newton,\n\nThis is a reminder that you have not yet submitted your on-demand interview for the Customer Service Consultant, New Zealand Contact Centre, GB3 opportunity.\n\nSubmit your responses.\n\nIf you need technical assistance, please visit the Help Centre.\n\nMarisa Vella\nANZ\nMarisa.Vella2@anz.com\n\nClick here to unsubscribe",  // pragma: allow (Marisa.Vella2@anz.com is the shape-preserving stand-in for a real recruiter; the original is in corpus-sources-private)
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from ANZ via HireVue (noreply@mail.hirevue-app.com.au), 16 Sep 2026. Captured 2026-09-22. Redacted: the sending recruiter's name and address are stand-ins of the same shape.",  // pragma: allow (institutional sender)
		note:
			"Four lines long, chases an incomplete action, signs off with a named individual at a bank and is sent from an Australian third-party domain. Brevity is usually treated as a scam signal; here it is what a genuine reminder looks like.",
	},
	{
		id: "hirevue-genuine-interview-invite",
		message:
			"Hi Jordan Hale,\n\nThank you for your interest in the Customer Service Consultant, New Zealand Contact Centre, GB3 position at ANZ.\n\nYou are invited to complete a video interview\n\nWhen you begin the interview, you'll have the opportunity to view helpful resources before responding to interview questions.\n\nTake time to read all instructions carefully before responding. Some questions may require you to respond in a specific format, within a set time limit or with limited retakes.\n\nAfter completing and submitting your interview, a notification will be sent to your recruiter at ANZ for review.\n\nGet started\n\nKind regards,\nANZ Recruitment Team\nANZ\n\nNeed help?\n\nHelp Centre\n\nIf the button above isn't working, copy and paste this link in a browser.\n[https://sau.hvue.io/QtBK7X24LmVRfqa_]",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from ANZ via HireVue (noreply@mail.hirevue-app.com.au), 14 Sep 2026. Captured 2026-09-22. Redacted: recipient name and the single-use interview token.",  // pragma: allow (institutional sender)
		note:
			"The companion to `anz-genuine-interview-invite`, sent by the vendor rather than the bank. Same `sau.hvue.io` host, a domain that carries neither organisation's name and reads as a random string.",
	},
	{
		id: "anz-genuine-application-received",
		message:
			"Hi Jordan,\n\nThank you for applying for the Associate Private Banker 122134 role at ANZ. We appreciate the time and effort you have invested in your application.\n\nWe are currently reviewing applications and will be in touch with an update as soon as possible. In the meantime, we encourage you to visit the ANZ Careers site to explore current opportunities. You can also keep your candidate profile up to date and set up job alerts so you're among the first to hear about new roles that match your interests and experience.\n\nAt ANZ, we believe the diverse backgrounds, perspectives and experiences of our people help create a workplace where people and communities can thrive. We are committed to providing an inclusive, respectful and positive recruitment experience for everyone. To learn more, visit Diversity and Inclusion at ANZ.\n\nIf you require accessibility support or adjustments during the recruitment process, we're here to help. This may include support such as an interpreter, wheelchair access, or adjustments to assessments for vision or hearing needs. Please contact us to discuss how we can support you.\n\nANZ is committed to maintaining a recruitment process that is safe, respectful and free from harassment. If at any stage of the recruitment process you experience or witness harassment, discrimination, bullying, or other inappropriate behaviour, please contact us. We take all concerns seriously and will review them appropriately and confidentially.\n\nThank you again for considering ANZ as your next career move. We wish you every success with your application.\n\nKind Regards,\n\nANZ Recruitment Team",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from ANZ PeopleHub (no-reply@talentandculture.anz.com), 15 Sep 2026. Captured 2026-09-22. Redacted.",  // pragma: allow (institutional sender)
		note:
			"Included because the sampling rule reached it, not because it is difficult \u2014 it asks for nothing and threatens nothing. A negative set made only of hard cases is its own kind of cherry-pick, and the easy ones are what a false-alarm *rate* has to be measured against.",
	},
	{
		id: "ird-genuine-login-alert-september",
		message:
			"Hi Jordan Hale,\n\nYour myIR account JordanHale was logged into from a new device or web browser.\n\nTime: 15-Sep-2026 10:25:14\nIP: 203.0.113.47\n\nIf this was you\n\nYou can ignore this message. There is no need to take any action.\n\nIf this was not you\n\nYou will need to reset your password, by selecting Forgot password? on the myIR log in page.\n\nCheck for any unusual log in attempts or activity:\n\nSelect manage my profile\nSelect I want to... tab\nSelect View activity\nIf you are unable to reset your password, see any unusual account activity or have any concerns, please contact us immediately on 0800 227 770.\n\nThanks,\nCustomer Services team\n\nBeware of tax related scams\n\nInland Revenue will never send you an email requesting you to confirm, update or disclose confidential details through an unsecure channel such as email.\n\nYou should always independently verify the source of the email and the web address you are being directed to before taking any action. If you receive a suspicious communication of this nature, do not respond to it or follow any links. Forward it to phishing@ird.govt.nz.\n\nThis email has been sent to this email address as it has been registered with Inland Revenue.\n\nPlease do not reply to this email as this inbox is not monitored.\n\nInland Revenue, 55 Featherston Street, Wellington, New Zealand.",  // pragma: allow (phishing@ird.govt.nz is Inland Revenue's published reporting address, printed in their own genuine boilerplate)
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Inland Revenue (alerts@ironline.ird.govt.nz), 15 Sep 2026. Captured 2026-09-22. Redacted: recipient name, myIR username and IP address.",  // pragma: allow (institutional sender)
		note:
			"A tax agency, an account name quoted back at the reader, an IP address, a password-reset instruction and an urgent 0800 number. It also spends four paragraphs warning about scams, which is itself a phishing technique \u2014 and here it is the genuine article doing it.",
	},
	{
		id: "ird-genuine-login-alert-duplicate",
		message:
			"Hi Jordan Hale,\n\nYour myIR account JordanHale was logged into from a new device or web browser.\n\nTime: 10-Sep-2026 15:37:17\nIP: 198.51.100.212\n\nIf this was you\n\nYou can ignore this message. There is no need to take any action.\n\nIf this was not you\n\nYou will need to reset your password, by selecting Forgot password? on the myIR log in page.\n\nCheck for any unusual log in attempts or activity:\n\nSelect manage my profile\nSelect I want to... tab\nSelect View activity\nIf you are unable to reset your password, see any unusual account activity or have any concerns, please contact us immediately on 0800 227 770.\n\nThanks,\nCustomer Services team\n\nBeware of tax related scams\n\nInland Revenue will never send you an email requesting you to confirm, update or disclose confidential details through an unsecure channel such as email.\n\nPlease do not reply to this email as this inbox is not monitored.\n\nInland Revenue, 55 Featherston Street, Wellington, New Zealand.",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Inland Revenue (alerts@ironline.ird.govt.nz), 10 Sep 2026. Captured 2026-09-22. Redacted: recipient name, myIR username and IP address.",  // pragma: allow (institutional sender)
		note:
			"Kept deliberately alongside the 15 September alert, for the same reason as the NZ Post pair: a real inbox receives the same notification repeatedly with two fields changed, and an invented corpus never does.",
	},
	{
		id: "paypal-genuine-microsoft-receipt",
		message:
			"Receipt for Your Payment to Microsoft New Zealan...\n\nHello, Jordan Hale\n\nYou paid $3.00 NZD to Microsoft New Zealan...\n\nView or Manage Payment\n\nTransaction ID\n04500000PS800000B\n\nTransaction date\n7/09/2026\n\nMerchant\nMicrosoft New Zealan...\n\nInvoice ID\nZ00QXM0TUPB0\n\nDescription Unit price Qty Amount\nMicrosoft 365 Basic $3.00 NZD 1 $3.00 NZD\nSubtotal $3.00 NZD\nTotal $3.00 NZD\nPayment $3.00 NZD\nCharge will appear on your credit card statement as \"PAYPAL *MICROSOFTNE\"\nPaid Microsoft New Zealan... with\nMastercard-0000 $3.00 NZD\nView or Manage Payment\n\nIssues with this transaction?\n\nYou have 180 days from the date of the transaction to open a dispute in the Resolution Center.\n\nPayPal is committed to preventing fraudulent emails. Emails from PayPal will always contain your full name. Learn to identify phishing",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from PayPal (service@intl.paypal.com), 7 Sep 2026. Captured 2026-09-22. Redacted: recipient name, transaction and invoice identifiers, card suffix.",  // pragma: allow (institutional sender)
		note:
			"The merchant name arrives truncated mid-word \u2014 'Microsoft New Zealan...' \u2014 which reads as exactly the sloppiness scam-awareness material tells people to distrust. It is how PayPal's own template renders a long merchant name.",
	},
	{
		id: "paypal-genuine-uber-authorization",
		message:
			"You have authorized a payment to Uber BV\n\nHello, Jordan Hale\n\nYou authorized a payment of $12.19 NZD to Uber BV\n\nView or Manage Transaction\n\nThis purchase will appear as a pending transaction until Uber BV processes your order. To see the full transaction details, log in to your PayPal account. Keep in mind, it may take a few moments for this transaction to appear. Thanks for using PayPal.\n\nTransaction ID\n7J200000K10000000\n\nTransaction date\n19/08/2026\n\nMerchant\nUber BV\n\nInstructions to merchant\nYou haven't entered any instructions.\n\nInvoice ID\n3Du0NFuGfg0iBrVpHumEdVa0\n\nDescription Unit price Qty Amount\n$12.19 NZD 1 $12.19 NZD\nSubtotal $12.19 NZD\nTotal $12.19 NZD\nSent from jordan.hale@example.com\n\nThe amount shown above may not be the final payment amount. If the merchant completes the transaction and the final amount is greater than the above, we'll send you an additional receipt that shows the final payment amount. Otherwise, this will be your final receipt.\n\nFunding Sources Used (Total)\nMastercard-0000 $12.19 NZD\nView or Manage Transaction\n\nIssues with this transaction?\n\nYou have 180 days from the date of the transaction to open a dispute in the Resolution Center.",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from PayPal (service@intl.paypal.com), 19 Aug 2026. Captured 2026-09-22. Redacted: recipient name and address, transaction and invoice identifiers, card suffix.",  // pragma: allow (institutional sender)
		note:
			"Money authorised, an instruction to log in, and a dispute window \u2014 the shape of `bank-dispute-payment`, which sits in the scam half of this corpus. The give-away that it is genuine is not in the text.",
	},
	{
		id: "seek-genuine-profile-strength",
		message:
			"Jordan, your profile is almost there!\n\nYour profile strength\n\nWant to be 3x more visible to employers?\nHi Jordan,\n\nYour profile is strong! Take a moment now to make sure it's up to date. By adding your resume and keeping your profile fresh, you're 3x more likely to be seen by employers actively searching for candidates like you.\n\nA strong profile can help us match you with the right opportunities. Plus, set a minimum salary expectation to help the right role - at the right salary - come to you.\n\nBoost my profile strength\n\nAlready updated your profile today? The profile strength indicated above may not yet reflect your most recent updates.\n\nHere's what's waiting for you:\n\nStay ahead of the curve with the SEEK app.\nFind jobs that match your skills, track applications and get career insights anytime, anywhere.\n\nTake control of your earning potential.\nAdd salary expectations to attract the right roles and ensure opportunities align with your value.\n\nThe team at SEEK\n\nAt SEEK, we're committed to helping you stay safe online in your job search. Learn more.\n\nThis email was sent to you as a registered user of nz.seek.com",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from SEEK (noreply@email.seek.co.nz), 24 Aug 2026. Captured 2026-09-22. Redacted: recipient name.",  // pragma: allow (institutional sender)
		note:
			"Personalised in the subject line, urging the reader towards an incomplete account and a financial field. Employment-platform impersonation is a live NZ pretext, which makes the genuine version of it a fair test.",
	},
	{
		id: "seek-genuine-application-activity",
		message:
			"Hi Jordan,\n\nThere's been recent activity in jobs you applied for on SEEK.\n\nEach employer's recruitment process is different, so you might not always hear from them. Keep track of your applied jobs and discover more below.\nCustomer Service Representative - 28th of September 2026\n\nDatacom\n\nJob no longer advertised\nReally want a job you applied to?\n\nMark up to 3 applied jobs as highly interested each month and we'll let employers know.\n\nShow strong interest\nSimilar jobs you might like\nPayroll Advisors, Education Payroll Limited, Wellington Central, Wellington (Hybrid), $61,816 per year\nCustomer Service Representative, Randstad - Business Support, Wellington Central, Wellington (Hybrid), $60k - $65k p.a.\nContact Centre Representative, Credit Consultants Group NZ Limited, Wellington Central, Wellington, $25 - $28 per hour\n\nNever provide your bank or credit card details when applying for a job. Find out more about protecting yourself online.\nNot seeing all of your applied jobs?\n\nWe can only provide updates on jobs where the employer uses SEEK to manage their applications. These updates are based on job activity last week.\n\nThis email was sent to you as a registered user of nz.seek.com",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from SEEK Applications (noreply@s.seek.co.nz), 1 Sep 2026. Captured 2026-09-22. Redacted: recipient name.",  // pragma: allow (institutional sender)
		note:
			"An ordinary platform digest. Carries its own anti-fraud warning about bank details, which is a phrase a keyword rule could easily read as the subject of the message rather than its footer.",
	},
	{
		id: "seek-genuine-job-closed",
		message:
			"Hi Jordan,\n\nThe Customer Service Representative - 28th of September 2026 job you applied for at Datacom has now expired on SEEK and is no longer taking applications. Rest assured, the employer has your application and you may still hear back from them.\n\nKeep track of your applied jobs and discover more below.\nCustomer Service Representative - 28th of September 2026\n\nDatacom\n\nApplied on 18 Aug\nApplication insights\n\nMore than 100 candidates applied for this job.\nSimilar jobs you might like\nPayroll Advisors, Education Payroll Limited, Wellington Central, Wellington (Hybrid), $61,816 per year\nCustomer Service Representative - Wellington Fixed Term, Bluebridge, Wellington Central, Wellington\nJobseeker and Employment Coordinator / Support Officer, I'm In, Lower Hutt, Wellington, $60,412 - $75,542 per year\n\nNever provide your bank or credit card details when applying for a job. Find out more about protecting yourself online.\n\nThis email was sent to you as a registered user of nz.seek.com",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from SEEK Applications (noreply@s.seek.co.nz), 28 Aug 2026. Captured 2026-09-22. Redacted: recipient name.",  // pragma: allow (institutional sender)
		note:
			"An expiry notice with nothing to click and nothing to lose. The easy end of the collected set, and it belongs here for the same reason as the ANZ acknowledgement.",
	},
	{
		id: "gradconnection-genuine-fujitsu",
		message:
			"Fujitsu is hiring for the 2027 Graduate Program, apply before 1 October 2026!\n\nAre you ready to kickstart your career with a global technology leader? At Fujitsu, we're passionate about creating a world that's more sustainable by building trust in society through innovation. For more than 50 years, we've helped power some of Australia and New Zealand's most critical infrastructure, supporting organisations, communities and industries every day.\n\nOur award winning 2027 Fujitsu Graduate Program is now open for applications until 01 October 2026. We have opportunities across consulting, technology and corporate functions. You don't need a technology degree to apply. We welcome graduates from all disciplines who are curious, adaptable, collaborative and eager to learn.\n\nAs a graduate, you'll be part of a supportive and collaborative community while gaining real-world experience. Throughout our 12-month program, you'll:\n\nWork alongside industry experts on meaningful projects.\nAccess personalised technical and professional development.\nBuild your network through mentoring, coaching and career conversations.\nBe supported by a Graduate Buddy and dedicated mentor.\n\nSpotlight role: Uvance Wayfinders Business Consulting Graduate\n\nAmong the exciting opportunities available this year is the chance to join Fujitsu Oceania's Uvance Wayfinders team, a consulting practice that helps organisations unlock the potential of AI, data and emerging technologies to drive transformational outcomes.\n\nLearn more about the Business Consulting opportunity\n\nSee what a day in the life of a Fujitsu Graduate is like: Watch the video\n\nJoin a graduate program designed to help you learn, grow and make an impact from day one!\n\nApply Now\n\nForgot your password? | Unsubscribe",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from SEEK Grad / GradConnection (mail@gradconnection.com), 17 Sep 2026. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"A dated deadline in the subject line, an opportunity framed as scarce, a call to action, and a 'Forgot your password?' link in the footer \u2014 sent from `gradconnection.com`, which is neither of the two brands named in the message.",
	},
/**
 * Collected negatives, round 3 — captured 2026-09-22, same pre-registered rule.
 *
 * Numbering trap, because three files count differently and all three are right
 * about their own sequence. This comment counts capture rounds into the corpus
 * (15 by judgement, then 13, now 27), so these are round 3.
 * `paper/SAMPLING-PROTOCOL.md` counts only the rounds run *under* the rule, so
 * it calls them round 2. The private capture files are numbered by file, so they
 * are in `corpus-sources-private/inbox-captures-4.md`. Same 27 messages.
 *
 * The previous round swept `category:updates`. This one swept the strata that
 * left: Gmail's Promotions category, then the Primary inbox, then Forums — which
 * holds nothing in this account, and is recorded as an empty stratum rather than
 * left unmentioned. The per-domain cap of three did most of the work: SEEK,
 * Inland Revenue, NZ Post, PayPal and ANZ PeopleHub were already at it, which is
 * why this round reads so differently from the last. That is the rule behaving
 * as intended, not a change of taste.
 *
 * One amendment was made during this round and is recorded in the protocol: a
 * message identical to one already captured apart from a trivial substitution —
 * a single word, a date — is skipped as a duplicate template rather than taken.
 * It is a tightening, and it cost this round one hard negative — a second
 * Coronet Peak survey differing from the captured one by a single word.
 *
 * Every message here is redacted shape-preservingly. The unredacted originals
 * and the full skip tally are in that private capture file, outside this
 * repository.
 */

	{
		id: "seek-genuine-salary-guide",
		message:
			"What could you be earning as a Workshop Facilitator?\n\nHi Jordan,\n\nAre you earning enough in your current role? Explore SEEK's salary guide to find out and get the information you need before you apply.\n\nWhat could I be earning?\nDiscover what you could be earning in your current role\n\nFilter salaries by state, and by annual or hourly salaries\n\nExplore average annual salaries, including the lowest and highest ranges\n\nScroll to explore salaries for similar roles\n\nNot the role you're looking for? Make sure your profile is up to date so we can send you the most relevant insights and job recommendations.\n\nHere's what's waiting for you:\n\nStay ahead of the curve with the SEEK app.\nFind jobs that match your skills, track applications and get career insights anytime, anywhere.\n\nTake control of your earning potential.\nAdd salary expectations to attract the right roles and ensure opportunities align with your value.\n\nThe team at SEEK\n\nAt SEEK, we're committed to helping you stay safe online in your job search. Learn more.\n\nThis email was sent to you as a registered user of nz.seek.com",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from SEEK (noreply@email.seek.co.nz), 21 Sep 2026. Captured 2026-09-22. Redacted: recipient name.",  // pragma: allow (institutional sender)
		note:
			"Names the reader's actual job title in the subject line and opens on whether they are being paid enough — personalisation plus a money hook, which is the opening move of the employment-scam genre this corpus already holds on the scam side.",
	},
	{
		id: "seek-genuine-top-companies",
		message:
			"Better culture? Better pay? The top companies looking to hire new talent.\n\nHi Jordan,\n\nExplore the top companies looking to hire and gain insights into their cultures, values, perks, and salaries to understand what the right fit is for you.\n\nPlus, explore authentic employee reviews to understand what it's really like to work there, or share your own experience to help fellow professionals make informed career moves.\n\nExplore top companies\n\nThe team at SEEK\n\nAt SEEK, we're committed to helping you stay safe online in your job search. Learn more.\n\nProfile Privacy Contact Us Update Preferences Unsubscribe\nThis email was sent to you as a registered user of nz.seek.com\n\nSEEK Limited Level 10, 2 Commerce Street Auckland, 1010, New Zealand",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from SEEK (noreply@email.seek.co.nz), 27 Aug 2026. Captured 2026-09-22. Redacted: recipient name.",  // pragma: allow (institutional sender)
		note:
			"The quiet end of the same sender. It is here because the rule took it, and because a false-alarm rate measured only on a sender's alarming messages is not a rate.",
	},
	{
		id: "coronet-peak-genuine-survey",
		message:
			"Kia ora Jordan\n\nThanks for skiing or riding with us at Coronet Peak recently! We'd love to hear about your experience and how we can continue improving what we do! Please take a few minutes to share your feedback with us by clicking on the button below.\n\nTake Survey Now\n\nAs an expression of our thanks, if you complete our survey within the next 2 days you'll go our draw to win a 3 Peak Season Pass for 2027!\n\nOnly two questions in this survey are linked back to your individual customer profile: we record your 'overall satisfaction' and 'likelihood to recommend' to help understand your unique experience and how we can better serve you in the future. The rest of the survey is entirely confidential, unless you give permission for us to contact you by responding 'yes' to a question you'll find later in the survey.\n\nIf for any reason you need to stop the survey part way through, simply close the browser window and continue later by clicking on the button above again.\n\nThanks for your help, and our very best wishes for the rest of the season!\n\nNga mihi\nMartin Hale\nSki Area Manager - Coronet Peak\nNZSki Ltd\n\nT: 0800 697 547 (NZ)\n\nNZSki Privacy Policy\nTo unsubscribe from this survey, please click here.\n\nPowered by get smart",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Coronet Peak (coronet-peak@gssurvey.co), 12 Jul 2026. Captured 2026-09-22. Redacted: recipient name and the signing manager's name.",  // pragma: allow (institutional sender)
		note:
			"A prize draw, a two-day window and a single call-to-action link, sent to a New Zealand skier from `gssurvey.co` — a .co domain belonging to neither the ski field nor its parent company. Every structural feature of a prize-draw phish, and entirely genuine.",
	},
	{
		id: "animates-genuine-feedback-survey",
		message:
			"Hi Jordan,\nWe'd love you to share your feedback about your recent experience at Animates Porirua.\n\nYour opinion will go a long way to making us better, so please take a few minutes to fill out our survey, starting with the question below:\n\nBased on your recent experience at Animates Porirua how likely would you be to recommend us to other pet parents?\n\nPlease answer on a scale of 0 to 10, where 0 means you are not at all likely to recommend and 10 means you are extremely likely to recommend.\nExtremely unlikely Extremely likely\n0 1 2 3 4 5 6 7 8 9 10\n\nUnsubscribe\n\nThis email has been sent by Watermelon Research on behalf of Animates. Survey Ref: WM05. Watermelon Research, Suite 101, 59 Marlborough Street, Surry Hills, NSW 2010, Australia.\n\nThis message has been sent to Jordan at jordanwhitcombe@example.com. These details are included to help provide assurance that this is a genuine email from Animates.\n\nAnimates Support Office, 2 Robert Street, Ellerslie, Auckland 1051, New Zealand\n\nAnimates is a registered trademark of Animates NZ Holdings Pty Ltd ABN 86 607 613 552",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Animates (Feedback@survey.animates.co.nz), 14 May 2026. Captured 2026-09-22. Redacted: recipient name and email address.",  // pragma: allow (institutional sender)
		note:
			"Names the reader's local branch, quotes their own email address back at them, is sent by a third party nobody has heard of, and then asserts in so many words that it is genuine. Claiming to be genuine is a scam tell, and here it is in a message that is.",
	},
	{
		id: "animates-genuine-welcome",
		message:
			"Hi Jordan,\n\nWelcome to Animates! We're so excited to have you join the pack. We believe life is better with pets. Whether you're after expert pet care or every day essentials, we're here to support you and your pet every step of the way.\n\nShop now\n\nDog Cat Fish Small Pet Bird Reptile\n\nKeep up with us on socials\n#AnimatesNZ\n\nEmail sent 8 May 2026.\n\nYou have received this email because you are subscribed to Animates.\nUnsubscribe from future emails here at any time.\nAnimates HQ, 2 Robert Street, Ellerslie, Auckland 1051.",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from Animates (animates@mail.animates.co.nz), 8 May 2026. Captured 2026-09-22. Redacted: recipient name.",  // pragma: allow (institutional sender)
		note:
			"A loyalty-signup welcome with nothing urgent in it and nothing to lose. It sits in the corpus beside the same brand's survey mail, which arrives from a different subdomain and reads far worse.",
	},
	{
		id: "gazley-genuine-privacy-policy",
		message:
			"Is this email displaying correctly? If not click here to view this email online\n\nHi,\n\nThanks for your inquiry with Gazley Motor Group.\n\nYour privacy is important to us.\n\nPlease find below a link to our full Privacy Policy.\n\nhttps://gazley.com/privacy-policy/\n\nKind Regards,\n\nSam Harding\nSales Executive\nPh: 0800 668 668\nM: 021 000 0000\nsam.harding@gazley.com\nhttp://www.gazley.com/\n\nClick to Reply\n\nVist Us:\n38 Kent Terrace\nTe Aro\n\nPhone: 0800 668 668\n021 000 0000\n\n2022 Gazley. All rights reserved http://www.gazley.com/\n\nTo ensure you are kept up to date with the latest communication from Gazley please add us to your address book.\n\nIf you have problems opting out from the below link, please reply to this email with the subject line Unsubscribe If you no longer want to receive our monthly specials. Click Here",  // pragma: allow (sam.harding@gazley.com is the shape-preserving stand-in for a real salesperson; the original is in corpus-sources-private)
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Gazley Motor Group (info@gazley.com), 10 Mar 2026. Captured 2026-09-22. Redacted: the sales executive's name, mobile number and email address are stand-ins of the same shape.",  // pragma: allow (institutional sender)
		note:
			"An automated bulk send wearing an individual salesperson's signature, with a mobile number in it, a typo in the body, and a copyright line four years stale. It arrives after a car enquiry the reader may not remember making, which is the pretext half of the genre exactly.",
	},
	{
		id: "zoom-genuine-new-year-offer",
		message:
			"Start the New Year with AI-powered productivity that transforms how you work\n\nMake 2026 your most productive year yet with Zoom Workplace, our AI-first work platform that brings everything together in one place. Say goodbye to juggling multiple tools and hello to focusing on what truly matters to you.\n\nFor a limited time, lock in 20% off your next three months of Zoom Workplace Pro before January 31st.\nRedeem offer\n\nRing in the New Year with Pro and be the first to experience cutting-edge features beyond Meetings, including:\n\nAI Companion* - Get more done in and out of meetings\nWhiteboard - Collaborate complex ideas on a digital canvas\nDocs - Turn conversations into collaborative docs instantly\nMail and Calendar - Integrate email and scheduling tools in one app\nTasks - Conquer your to-do lists with automated task management\nClips Plus - Record and send short videos\nZoom Hub - Organize all your Zoom assets all in one place\nCustom Avatars - Use a lifelike AI version of yourself to scale and personalize video creation\nMeetings - Host meetings across any device up to 30 hours\nCloud Storage - Never miss an important detail with 10GB of Cloud Storage\n\nRedeem offer",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from Zoom (teamzoom@e.zoom.us), 16 Jan 2026. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"A discount with a deadline and a single redeem link. Ordinary software marketing, and structurally not far from an account-upgrade lure.",
	},
	{
		id: "zoom-genuine-cyber-monday",
		message:
			"Cyber Monday savings end\n\nReshape how you work with AI and productivity tools\nWith Zoom Workplace, our AI work platform everything is in one place - so you spend less time juggling tools and focus on what matters most to you.\n\nFor a limited time, lock in 30% off your next three months of Zoom Workplace Pro. Offer ends tonight.\nRedeem offer\n\nWith Pro, experience the latest features beyond Meetings first hand including:\n\nAI Companion* - Get more done in and out of meetings\nWhiteboard - Collaborate complex ideas on a digital canvas\nDocs - Turn conversations into collaborative docs instantly\nMail and Calendar - Integrate email and scheduling tools in one app\nTasks - Conquer your to-do lists with automated task management\nClips Plus - Record and send short videos\nZoom Hub - Organize all your Zoom assets all in one place\nCustom Avatars - Personalize videos with an AI version of yourself",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from Zoom (teamzoom@e.zoom.us), 6 Dec 2025. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"'Offer ends tonight' over the same template as the item above. The pair is here to show that genuine senders manufacture urgency on a schedule, which is the feature a deadline heuristic keys on.",
	},
	{
		id: "shoeclinic-genuine-back-to-school",
		message:
			"We'll donate $10 to your given school when you purchase school shoes in-store!\n\nHello jordan,\n\nGet Back to School sorted for 2026!\n\nYour kids spend a lot of time at school, so getting school shoes that fit correctly are essential for comfort and foot health.\n\nShoe Clinic are your fitting experts, so come into store and the team will make sure the fit is correct for the upcoming school year.\n\nWe also donate $10 to your child's school with every school footwear purchased in-store. Simply give a staff member the name of your school and they will note it down*.\n\n*Offer valid with in-store purchases only, not available online.\n\nMens Womens Kids\n\nAscent Contest Senior (D) RRP $200\nAscent Apex (B) Senior RRP $180\nAscent Apex Youth (C) RRP $160\nAscent Apex (D) Senior RRP $180\nAscent Apex Youth (D) RRP $160\nBirkenstock Milano Birko-Flor Black RRP $220\nASICS 550TR Kids RRP $150 Senior RRP $260\n\nPlease note: Models may vary between stores.",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from Shoe Clinic (marketing@shoeclinic.co.nz), 12 Jan 2026. Captured 2026-09-22. Redacted: recipient name, preserving the sender's lower-case rendering of it.",  // pragma: allow (institutional sender)
		note:
			"Retail marketing addressed to a reader with no children, in lower case, offering a donation for an in-store visit. The lower-case name is kept because a mail-merge that does not capitalise is exactly the artefact a reader is taught to treat as a tell.",
	},
	{
		id: "shoeclinic-genuine-christmas-guide",
		message:
			"Hello jordan,\n\nWith the Christmas season now in full swing the entire team at Shoe Clinic would like to take a moment to thank you for all your support throughout 2025!\n\nWe invite you to check out this years Christmas Gift Guide for any last minute gift ideas.\n\nShop our range of Footwear, Accessories and Gift Vouchers both in-store and online.\n\nASICS - SHOP ASICS\nNEW BALANCE - SHOP NEW BALANCE\nBROOKS - SHOP BROOKS\nMIZUNO - SHOP MIZUNO\n\nPadded performance socks for any exercise activity for your ultimate comfort - SHOP THORLO\n\nLight-weight moisture wicking performance socks for any exercise activity to help prevent blistering - SHOP DRYMAX\n\nSHOP BIRKENSTOCK\nARCHIES - SHOP ARCHIES\nOofos - SHOP OOFOS\n\nGive the gift of choice this Christmas and get a Shoe Clinic Gift Voucher!\nSHOP GIFT VOUCHERS\n\nShoe Clinic Goal Chaser $39.90\nHelping you achieve your running and exercise goals.\nSHOP GOAL CHASER",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from Shoe Clinic (marketing@shoeclinic.co.nz), 12 Dec 2025. Captured 2026-09-22. Redacted: recipient name.",  // pragma: allow (institutional sender)
		note:
			"A seasonal gift guide that is mostly brand names and links. Nearly all link text and very little prose, which is the shape that gives a text-only classifier the least to work with.",
	},
	{
		id: "shoeclinic-genuine-birkenstock",
		message:
			"Hello jordan,\n\nThis Christmas season all new Birkenstocks have just arrived in store and there's a great range of new and classic styles to choose from!\n\nBirkenstock styles/models vary from store to store so pop into your local Shoe Clinic to get fitted and check out their current range!\n\nArizona\nHabana Oiled Leather $279.90\nCognac Oiled Leather $279.90\nTobacco Oiled Leather $279.90\nMocca Birkibuc $239.90\nNew Beige Birko-flor $219.90\nStone Coin Birko-flor $219.90\nPoporn EVA $119.90\nWhite EVA $119.90\nKhaki EVA $119.90\n\nMayari\nBlack Oiled Leather $279.90\nTobacco Oiled Leather $279.90\nSandcastle Birko-for $219.90\n\nGizeh\nTobacco Oiled Leather $279.90\nMocca Birkibuc $239.90\nBlack Birko-Flor $219.90\n\nBoston\nHabana Oiled Leather $349.90\nFaded Khaki Suede $369.90\nBlack Oiled Leather $349.90\n\nPlease note: Models may vary between stores.",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from Shoe Clinic (marketing@shoeclinic.co.nz), 8 Dec 2025. Captured 2026-09-22. Redacted: recipient name.",  // pragma: allow (institutional sender)
		note:
			"Two sentences of prose and then a price list, including two spelling errors the sender never fixed. A message that is almost entirely money amounts, which is the false-alarm probe a payment-oriented rule most deserves.",
	},
	{
		id: "perplexity-genuine-spaces-launch",
		message:
			"Introducing: Spaces\n\nWe're excited to unveil Spaces — an intuitive way to organize your Threads and, for Pro subscribers, search your documents and files (images, PDFs, spreadsheets, and more).\n\nHere's what you need to know:\n\nCollections are now Spaces: All your existing Collections are still here. You can now access Spaces directly from the left panel on web.\n\nOrganize your threads. Planning a trip, preparing for an exam, or researching a specific topic? You can now group your Threads into a Space to keep your knowledge organized.\n\n[Pro subscribers only] Store and search your documents and files. Pro users can upload files type (images, PDFs, spreadsheets) to a Space. We'll consider these files in addition to internet search when answering a question. These files are stored in the Space and you can return to search through them whenever — no need to re-upload previous files.\n\nStart creating",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from Perplexity (team@mail.perplexity.ai), 19 Oct 2024. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"A product announcement signed with a first name in the From line — 'Eliot at Perplexity' — which is a genuine company using the false-familiarity opener this corpus tests on the scam side.",
	},
	{
		id: "perplexity-genuine-mobile-app",
		message:
			"Your search for information just got easier\n\nThe Perplexity mobile app puts all the world's knowledge right in your pocket.\n\nLooking for last minute restaurant recommendations? Need a quick fact to settle a debate? With our mobile app, the answers you need are always in reach, no matter where your curiosity leads you.\n\nInstall our free app and start exploring today.\n\nStay curious,\n\nThe Perplexity Team\n\nYou are receiving this email because you opted-in to receive updates from Perplexity\nPerplexity, 115 Sansome St, Suite 900\nUnsubscribe",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from Perplexity (team@mail.perplexity.ai), 28 Sep 2024. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"An app-install prompt, which is the action a malware-delivery message wants and therefore an action worth being able to see without alarming at.",
	},
	{
		id: "perplexity-genuine-discover-daily",
		message:
			"As we wrap up our onboarding series, we want to introduce you to a feature that keeps you informed and inspired.\n\nPerplexity Discover\n\nEvery day, our team finds the most fascinating headlines in science, AI, and technology and transforms them into engaging content crafted by Perplexity.\n\nDiscover is your gateway to staying on top of the latest trends and innovations. Check it out on our website or in our mobile app.\n\nDiscover Daily\n\nPrefer to listen? We've partnered with ElevenLabs to create a first-of-its-kind AI-generated podcast: Discover Daily. In just a few minutes, you can catch up on the most important tech headlines. It's the perfect companion for your morning commute.\n\nWe're always eager to hear your thoughts and feedback. Let us know what you think of Discover.\n\nStay curious,\n\nEliot from Perplexity\n\nP.S. Want to get started with Perplexity? Check out our guide.",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from Perplexity (team@mail.perplexity.ai), 24 Sep 2024. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"Signed with a bare first name and closing with a P.S., both of which are hand-written registers appearing in a bulk send. The third and last message the domain cap allowed from this sender.",
	},
	{
		id: "anthropic-genuine-enterprise-launch",
		message:
			"Claude for Enterprise\nContact Sales\n\nToday, we're launching the Claude Enterprise plan to help orgs securely collaborate with Claude using internal knowledge. It offers a 500K context window, increased capacity, and a GitHub integration to work on codebases with Claude. Enterprise security features include SSO, role-based permissions, and admin tools. To get started, contact our sales team.\n\nEnterprise-grade control\nWith the Enterprise plan, you get critical security and admin controls, including:\nSingle sign-on (SSO) and domain capture: Securely manage user access and centralize provisioning control.\nRole-based access with fine-grained permissioning: Designate a primary owner for your workspace to enhance security and information management.\nAudit logs: Trace system activities for security and compliance monitoring. Audit logs will be available in the coming weeks.\nSystem for Cross-domain Identity Management (SCIM) support for user management.",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from Anthropic (support+news@mail.anthropic.com), 7 Sep 2024. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"Dense security vocabulary — SSO, audit logs, permissions, domain capture — in a genuine product announcement. A keyword rule built around security language has to stay quiet here.",
	},
	{
		id: "openai-genuine-route-planning",
		message:
			"Know what's ahead\n\nShare your travel route and timing, then get a simple plan and pre-drive checks.\n\nStart planning\n\nChatGPT can turn a route and departure time into a simple plan for your drive, with things to double-check like road conditions, weather, and parking.\n\nWas this email useful?\nUseful Not useful\n\nOpenAI\n1455 3rd Street\nSan Francisco, CA 94158\nUnsubscribe\nPrivacy · Terms",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from ChatGPT (noreply@email.openai.com), 10 Sep 2026. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"Barely a hundred words around a single button. Near the floor of what the self-contained rule admits, and kept for that reason: a short message gives a narrative check almost nothing to reason over.",
	},
	{
		id: "openai-genuine-translation",
		message:
			"Help your message land\n\nShare your wording and audience, then get a localized translation of any phrase.\n\nStart translating\n\nAsk ChatGPT to adapt your draft for the place and tone you have in mind. ChatGPT can keep the meaning while making the wording sound natural to the people reading it.\n\nWas this email useful?\nUseful Not useful\n\nOpenAI\n1455 3rd Street\nSan Francisco, CA 94158\nUnsubscribe\nPrivacy · Terms",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from ChatGPT (noreply@email.openai.com), 5 Sep 2026. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"Same template as the item above with different copy, which is why the duplicate-template rule did not exclude it. Three of these were taken because the domain cap allowed three, not because they are interesting.",
	},
	{
		id: "openai-genuine-image-edit",
		message:
			"Make the next edit clearer\n\nShare an image you'd like to edit, then get a cleaner request with what to keep and change.\n\nStart editing\n\nAsk ChatGPT to turn feedback on an image into specific editing prompt. It can help organize what feels wrong, what should stay, and how to say it clearly for the next pass.\n\nWas this email useful?\nUseful Not useful\n\nOpenAI\n1455 3rd Street\nSan Francisco, CA 94158\nUnsubscribe\nPrivacy · Terms",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from ChatGPT (noreply@email.openai.com), 29 Aug 2026. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"The third and last from this domain. It carries a grammatical slip — 'specific editing prompt' — in a message from a company whose product is language, which is a reminder that sloppy writing is not evidence of anything.",
	},
	{
		id: "companion-animals-genuine-newsletter",
		message:
			"Hi Jordan,\n\nThere's plenty happening across CANZ as we head towards spring, with opportunities to get involved, new resources to explore and some wonderful people to celebrate.\n\nIn this edition, you can have your say in new research into catios, catch up on the latest videos in our Safe Dogs and Safe Communities series, learn more about our Election Manifesto, and meet the inspiring recipients of this year's Te Tohu Maimoa awards.\n\nSurvey for cat owners - catios\n\nWe want to hear from cat guardians about catios!\n\nA catio (short for cat patio) is an enclosed outdoor space designed for cats. We're conducting a survey to better understand why cat owners choose to install (or not install) a catio, what factors influence these decisions, and - for those who have one - how cats use them once installed.\n\nWhether you have a catio, have considered getting one, or just want to share your thoughts, we would love to hear from you.",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from Companion Animals New Zealand (welfare@companionanimals.nz), 7 Sep 2026. Captured 2026-09-22. Redacted: recipient name.",  // pragma: allow (institutional sender)
		note:
			"A charity newsletter with a survey invitation in it. The easy end of the set, and a useful counterweight to the two survey requests in this round that do look alarming.",
	},
	{
		id: "gradconnection-genuine-commbank-deadline",
		message:
			"Last chance to apply for CommBank's Summer Intern & Graduate Program\n\nHi there,\n\nThinking about applying for CommBank's Summer Intern Program or Graduate Program?\n\nNow's the time to apply. Applications close on 8 September at 11:55pm (Sydney/Melbourne time).\n\nWhether you're interested in technology, data, product, banking or business, you'll have the opportunity to work on meaningful projects, build valuable skills and gain hands-on experience from day one.\n\nOpportunities are available across a range of pathways, including:\n\nBanking Products\nTechnology and AI\nBanking Relationship Management\nRegional and Agribusiness Banking\nRisk Management\nFinance Accounting | Procurement\nMarketing and Corporate Affairs\n\nDon't miss your chance to launch your career at one of Australia's leading organisations.\n\nApplications close 8 September at 11:55pm.\n\nApply Now\n\nForgot your password? | Unsubscribe",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from SEEK Grad / GradConnection (mail@gradconnection.com), 7 Sep 2026. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"A named bank, a deadline stated twice to the minute, 'Last chance', 'Don't miss your chance', and a 'Forgot your password?' link — from a domain that is neither the bank's nor the job board's. The same shape as the Fujitsu item, from the same sender, six days earlier.",
	},
	{
		id: "gradconnection-genuine-job-alert",
		message:
			"We've found Jobs that match your preferences\n\nView and edit your alert preferences here\n\n2026/27 EY Vacationer Program – Computer Science\nEY\nCanberra and 4 other locations\nClosing: 03:59 PM, 17th Sep 2026\n\n2026/27 EY Vacationer Program – Data Analytics\nEY\nCanberra and 4 other locations\nClosing: 03:59 PM, 17th Sep 2026\n\nWork Ready Virtual Experience Program\nSEEK Grad\nCanberra and 5 other locations\nClosing: 12:59 PM, 17th Sep 2026\n\nStrategy Academy Lab - Melbourne\nBoston Consulting Group (BCG)\nMelbourne\nClosing: 01:59 PM, 18th Sep 2026\n\nCapgemini Graduate Program AUNZ, March 2027: General Application\nCapgemini\nCanberra and 5 other locations\n$70,000 - $80,000\nClosing: 10:59 AM, 1st Mar 2027\n\nView more jobs on SEEK Grad website\n\nForgot your password?\n\nUnsubscribe\n\nAlert Preference\n\nCareer Advice\n\nYou're receiving this email as you've subscribed to job alerts.",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from SEEK Grad / GradConnection (mail@gradconnection.com), 15 Sep 2026. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"A job-alert digest naming four real employers and a salary band, with closing times given to the minute. The third and last from this domain.",
	},
	{
		id: "workable-genuine-datacom-rejection",
		message:
			"Hi Jordan\n\nThank you for your interest in the Customer Service Representative - 28th of September 2026 role here at Datacom. We really appreciate the time and energy you've put into your application. Sadly, although this is not the response you were hoping for, we will not be proceeding further with your application.\n\nWith that in mind, please know your application was carefully considered by our team here at Datacom. On this occasion, out of the applications received, we are proceeding with those who more closely align to the role requirements.\n\nWe encourage that you keep an eye on any other positions within Datacom that you may be interested in. These can be found on our website https://datacom.com/ under the Career tab.\n\nOnce again, thank you for applying for this position and we wish you success in your job search.\n\nKind Regards,\n\nTalent Acquisition | Datacom",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Datacom Recruitment (noreply@candidates.workablemail.com), 18 Aug 2026. Captured 2026-09-22. Redacted: recipient name.",  // pragma: allow (institutional sender)
		note:
			"A rejection from a named New Zealand employer, delivered from `workablemail.com` — an applicant-tracking vendor whose name appears nowhere in the body. Brand in the text, stranger on the envelope, which is the mismatch a domain check is built to catch.",
	},
	{
		id: "workable-genuine-application-copy",
		message:
			"Your application for the Customer Service Representative - 28th of September 2026 job was submitted successfully.\n\nHere's a copy of your application data for safekeeping.\n\nPersonal information\n\nName Jordan Whitcombe\n\nEmail jordanwhitcombe@example.com\n\nProfile\n\nEducation\n\nn/a - 2025 Bachelor of Science (Software Engineering) Massey University\nn/a - 2025 Bachelor of Science Massey University\n\nExperience\n\n2023 - 2026 Workshop Facilitator at Tech Access Aotearoa (about 3 years)\n\nResume resume20260818-15-4883lv.pdf\n\nDetails\n\nAnswers\n\nHow many weeks' notice are you required to give your current employer?\n\n0\n\nWhat are your salary expectations? (Numerical figure only)\n\n52,000\n\nHave you previously worked at Datacom?\nNo\n\nWithdraw this application\nPowered by Workable",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Workable (noreply@candidates.workablemail.com), 18 Aug 2026. Captured 2026-09-22. Redacted: recipient name, email address, university, employer and salary expectation, each replaced by a stand-in of the same shape.",  // pragma: allow (institutional sender)
		note:
			"Reads back the reader's name, email, degrees, employment history and salary expectation in one block. A message that recites what it knows about you is the classic extortion and account-compromise opener, and this one is a routine acknowledgement.",
	},
	{
		id: "seek-onboarding-genuine-nudge",
		message:
			"Hi Jordan,\n\nYou're on the right track with SEEK! Don't forget to complete these recommended actions to keep up your job seeking progress.\nDownload the SEEK app\n\nDiscover personalised job matches, apply on-the-go, and track applications - all from your phone with the SEEK app.\n\nDiscover our career advice content\n\nExplore expert career insights and actionable advice to help you land better jobs, grow your skills, and advance faster in your chosen field.\n\nCheck out career advice\nWhy did I receive this?\n\nYou received this email based on your activity on SEEK in the past 7 days.\n\nWas this email useful?\nYes No\n\nUnsubscribe Privacy Contact us\nThis email was sent to you as a registered user of nz.seek.com\n\nSEEK Limited, 60 Cremorne St, Cremorne VIC 3121 Australia",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from SEEK Onboarding (noreply@s.seek.co.nz), 23 Aug 2026. Captured 2026-09-22. Redacted: recipient name.",  // pragma: allow (institutional sender)
		note:
			"An engagement nudge that says outright it was triggered by the reader's activity in the last seven days — surveillance stated plainly, by a sender entitled to it. The third and last from this domain.",
	},
	{
		id: "google-genuine-security-alert",
		message:
			"New sign-in to your account\njordanwhitcombe@example.com\n\nWe noticed a new sign-in to your Google Account. If this was you, you don't need to do anything. If not, we'll help you secure your account.\n\nCheck activity\n\nYou can also see security activity at\nhttps://myaccount.google.com/notifications\n\nYou received this email to let you know about important changes to your Google Account and services.\n\n2026 Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from Google (no-reply@accounts.google.com), 22 Sep 2026. Captured 2026-09-22. Redacted: recipient email address.",  // pragma: allow (institutional sender)
		note:
			"The single most imitated genuine message there is: a sign-in alert naming the reader's own address, with a button to check activity. The corpus already holds a 16 Sep sibling of it, and both are here because the domain cap allowed them, not because security alerts were sought out.",
	},
	{
		id: "anz-talent-genuine-melbourne-digest",
		message:
			"You are receiving this email because you joined the ANZ Banking Group Limited Talent Community on 11/09/2026. You will receive these messages every 7 day(s). Your Job Alert matched the following jobs at careers.anz.com.\n\nJobs\nAssociate Private Banker - Melbourne, AU\nDirector/Executive Director, Funds - Financial Institutions Group (Melbourne/Sydney) - Melbourne, AU\nManager - Thematic Reviews (Operational Risk) - Melbourne, AU\nEmployee Relations Specialist, AUS - Sydney, Melbourne or Brisbane, AU\nSenior Manager, Op Risk - Wealth Solutions & Portfolio Management - Melbourne, AU\nAssociate, Operational Risk - Procurement, Property, Transformation & GCC - Melbourne, AU\nSenior Associate, NFR Governance and Reporting - Melbourne, AU\nSenior Manager, Op Risk - Products & Deposits - Melbourne, AU\nSenior Associate, Operational Risk (Corporate Centre) - Melbourne, AU\nLead Engineer - Melbourne, AU",
		kind: "legitimate",
		provenance: "verbatim",
		hardNegative: true,
		source: "Received from ANZ Talent Community (anzbanking-jobnotification@noreply10.jobs2web.com), 11 Sep 2026. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"A bank's name in every line of the body, and a sending domain — `jobs2web.com` — that is not the bank's. The second of three this domain is allowed; the first is `anz-talent-genuine-job-alert`, a week later.",
	},
	{
		id: "zoom-genuine-black-friday",
		message:
			"Black Friday savings end\n\nReshape how you work with AI and productivity tools\nWith Zoom Workplace, our AI work platform, everything is in one place - so you spend less time juggling tools and more time focusing on what matters.\n\nFor a limited time, lock in 30% off your next three months of Zoom Workplace Pro before November 28th.\nRedeem offer\n\nWith Pro, experience the latest features beyond Meetings first hand including:\n\nAI Companion* - Get more done in and out of meetings\nWhiteboard - Collaborate complex ideas on a digital canvas\nDocs - Turn conversations into collaborative docs instantly\nMail and Calendar - Integrate email and scheduling tools in one app\nTasks - Conquer your to-do lists with automated task management\nClips Plus - Record and send short videos\nZoom Hub - Organize all your Zoom assets all in one place\nCustom Avatars - Personalize videos with an AI version of yourself\nMeetings - Host meetings across any device up to 30 hours",
		kind: "legitimate",
		provenance: "verbatim",
		source: "Received from Zoom (teamzoom@e.zoom.us), 29 Nov 2025. Captured 2026-09-22.",  // pragma: allow (institutional sender)
		note:
			"The third and last from this domain, and the reason the duplicate-template amendment needed a threshold rather than a feeling: four other sends of this template were skipped as trivial restatements, and this one was taken because its opening paragraph is genuinely rewritten.",
	},
];

export const CORPUS: readonly CorpusItem[] = [...SCAMS, ...LEGITIMATE];

/** Did the app do the right thing by this message? */
export function isCorrect(item: CorpusItem, level: VerdictLevel): boolean {
	return item.kind === "scam" ? level !== "unclear" : level === "unclear";
}
