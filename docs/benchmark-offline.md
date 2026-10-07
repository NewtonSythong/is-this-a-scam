# Benchmark — offline engine only

Run 2026-09-22. Corpus: 81 messages, held out from the regression suite.

| Measure | Result | What it means |
| :-- | :-- | :-- |
| **Scams raised, never developed against** | **6/9** (67%) | **The headline. The only scam figure that measures the engine.** |
| Scams raised, since developed against | 1/4 | Proves nothing — the engine was changed while looking at these |
| — of which verbatim | 6/7 | The only items free of model-authorship bias |
| Legitimate left quiet | 62/68 (91%) | Correctly returned `unclear` |
| — hard negatives | 38/44 | Genuine messages wearing a scam's clothes |
| All scams, held out or not | 7/13 (54%) | The flattering number. Do not quote it alone |
| Overall | 69/81 (85%) | |

> **4 of 13 scam messages no longer measure anything.** A held-out
> corpus is a wasting asset: once somebody fixes a miss by studying the message
> that produced it, that message passes by construction. They are listed at the
> end with what was done to them, and the headline above excludes them.

### Scams — 7/13 (54%)

| | id | verdict | provenance |
| :-- | :-- | :-- | :-- |
| pass | `nzpost-signature-verbatim` | scam | verbatim |
| **FAIL** | `nzpost-warehouse-verbatim` *(no longer held out)* | unclear | verbatim |
| **FAIL** | `bnz-rewards-expiry` *(no longer held out)* | unclear | reconstructed |
| **FAIL** | `bank-dispute-payment` *(no longer held out)* | unclear | reconstructed |
| **FAIL** | `customs-duty` | unclear | reconstructed |
| pass | `ird-refund-plausible-domain` | scam | reconstructed |
| **FAIL** | `asb-fraud-team-callback` | unclear | reconstructed |
| **FAIL** | `hi-mum-no-secrecy` | unclear | reconstructed |
| pass | `afterpay-verify-account-verbatim` *(no longer held out)* | scam | verbatim |
| pass | `anz-account-frozen-verbatim` | scam | verbatim |
| pass | `anz-points-expiry-verbatim` | scam | verbatim |
| pass | `anz-points-expiry-short-verbatim` | scam | verbatim |
| pass | `nzpost-redelivery-verbatim` | scam | verbatim |

### Legitimate messages — 62/68 (91%)

| | id | verdict | provenance |
| :-- | :-- | :-- | :-- |
| pass | `ird-genuine-assessment` | unclear | reconstructed |
| pass | `nzpost-genuine-tracking` | unclear | reconstructed |
| pass | `nzpost-genuine-shortener` *(hard)* | unclear | reconstructed |
| pass | `bank-genuine-2fa` *(hard)* | unclear | reconstructed |
| pass | `bank-genuine-confirm-payment` *(hard)* | unclear | reconstructed |
| pass | `family-money-request` *(hard)* | unclear | synthetic |
| pass | `appointment-reminder` *(hard)* | unclear | synthetic |
| pass | `ordinary-personal` | unclear | synthetic |
| pass | `courier-genuine-at-the-door` *(hard)* | unclear | synthetic |
| pass | `tradesman-genuine-running-late` *(hard)* | unclear | synthetic |
| pass | `recruiter-genuine-followup` *(hard)* | unclear | synthetic |
| pass | `friend-genuine-after-a-gap` *(hard)* | unclear | synthetic |
| pass | `retail-genuine-refund-receipt` *(hard)* | unclear | synthetic |
| pass | `ird-genuine-login-alert` *(hard)* | unclear | verbatim |
| pass | `google-genuine-signin-alert` *(hard)* | unclear | verbatim |
| **FAIL** | `anz-genuine-job-referral` *(hard)* | scam | verbatim |
| **FAIL** | `anz-genuine-interview-invite` *(hard)* | scam | verbatim |
| pass | `nzblood-genuine-appointment` *(hard)* | unclear | verbatim |
| pass | `smithandsmith-genuine-booking` *(hard)* | unclear | verbatim |
| pass | `nzpost-genuine-collected-verbatim` *(hard)* | unclear | verbatim |
| pass | `nzpost-genuine-delivery-window` *(hard)* | unclear | verbatim |
| pass | `nzpost-genuine-collected-duplicate` *(hard)* | unclear | verbatim |
| pass | `googleplay-genuine-points-expiry` *(hard)* | unclear | verbatim |
| pass | `spotify-genuine-student-reverify` *(hard)* | unclear | verbatim |
| pass | `dyson-genuine-one-time-code` *(hard)* | unclear | verbatim |
| pass | `playstation-genuine-payment-problem` *(hard)* | unclear | verbatim |
| pass | `spotify-genuine-payment-reminder` *(hard)* | unclear | verbatim |
| pass | `paypal-genuine-receipt` *(hard)* | unclear | verbatim |
| pass | `orcid-genuine-verify-email` *(hard)* | unclear | verbatim |
| **FAIL** | `anz-talent-genuine-job-alert` *(hard)* | scam | verbatim |
| **FAIL** | `hirevue-genuine-interview-reminder` *(hard)* | scam | verbatim |
| **FAIL** | `hirevue-genuine-interview-invite` *(hard)* | scam | verbatim |
| pass | `anz-genuine-application-received` | unclear | verbatim |
| pass | `ird-genuine-login-alert-september` *(hard)* | unclear | verbatim |
| pass | `ird-genuine-login-alert-duplicate` *(hard)* | unclear | verbatim |
| pass | `paypal-genuine-microsoft-receipt` *(hard)* | unclear | verbatim |
| pass | `paypal-genuine-uber-authorization` *(hard)* | unclear | verbatim |
| pass | `seek-genuine-profile-strength` *(hard)* | unclear | verbatim |
| pass | `seek-genuine-application-activity` | unclear | verbatim |
| pass | `seek-genuine-job-closed` | unclear | verbatim |
| pass | `gradconnection-genuine-fujitsu` *(hard)* | unclear | verbatim |
| pass | `seek-genuine-salary-guide` *(hard)* | unclear | verbatim |
| pass | `seek-genuine-top-companies` | unclear | verbatim |
| pass | `coronet-peak-genuine-survey` *(hard)* | unclear | verbatim |
| pass | `animates-genuine-feedback-survey` *(hard)* | unclear | verbatim |
| pass | `animates-genuine-welcome` | unclear | verbatim |
| pass | `gazley-genuine-privacy-policy` *(hard)* | unclear | verbatim |
| pass | `zoom-genuine-new-year-offer` | unclear | verbatim |
| pass | `zoom-genuine-cyber-monday` | unclear | verbatim |
| pass | `shoeclinic-genuine-back-to-school` | unclear | verbatim |
| pass | `shoeclinic-genuine-christmas-guide` | unclear | verbatim |
| pass | `shoeclinic-genuine-birkenstock` | unclear | verbatim |
| pass | `perplexity-genuine-spaces-launch` | unclear | verbatim |
| pass | `perplexity-genuine-mobile-app` | unclear | verbatim |
| pass | `perplexity-genuine-discover-daily` | unclear | verbatim |
| pass | `anthropic-genuine-enterprise-launch` | unclear | verbatim |
| pass | `openai-genuine-route-planning` | unclear | verbatim |
| pass | `openai-genuine-translation` | unclear | verbatim |
| pass | `openai-genuine-image-edit` | unclear | verbatim |
| pass | `companion-animals-genuine-newsletter` | unclear | verbatim |
| pass | `gradconnection-genuine-commbank-deadline` *(hard)* | unclear | verbatim |
| pass | `gradconnection-genuine-job-alert` | unclear | verbatim |
| pass | `workable-genuine-datacom-rejection` *(hard)* | unclear | verbatim |
| pass | `workable-genuine-application-copy` *(hard)* | unclear | verbatim |
| pass | `seek-onboarding-genuine-nudge` | unclear | verbatim |
| pass | `google-genuine-security-alert` *(hard)* | unclear | verbatim |
| **FAIL** | `anz-talent-genuine-melbourne-digest` *(hard)* | scam | verbatim |
| pass | `zoom-genuine-black-friday` | unclear | verbatim |

## Failures in detail

**`nzpost-warehouse-verbatim`** — returned `unclear`, wanted `scam` or `warning`

> Your package has arrived at the warehouse and has been suspended for delivery due to a missing home number in the package.

No link and no organisation named — only the Narrative Check can reach this.

**`bnz-rewards-expiry`** — returned `unclear`, wanted `scam` or `warning`

> BNZ: Your BNZ Rewards points will expire shortly. Reply Y to confirm you wish to keep them.

BNZ, April 2026. No link — the payload is the reply, which harvests a live number.

**`bank-dispute-payment`** — returned `unclear`, wanted `scam` or `warning`

> A payment of $739.00 to WELLINGTON TRADING was authorised on your account. If you did not authorise this, dispute it here: secure-verify-nz.com/dispute

The May 2022 pattern: a fictitious charge, and the 'dispute' link is the hook. No bank is named, so there is no impersonation to spot.

**`customs-duty`** — returned `unclear`, wanted `scam` or `warning`

> Your international parcel is held by customs pending an unpaid duty of $3.20. Settle within 24 hours or the item will be returned to sender. customs-clearance-nz.com/pay


**`asb-fraud-team-callback`** — returned `unclear`, wanted `scam` or `warning`

> This is the ASB fraud team. We have stopped a transaction on your account. Please call us back on 09 887 4412 immediately to secure your funds.

The number is the payload. No link at all, and it names a real bank.

**`hi-mum-no-secrecy`** — returned `unclear`, wanted `scam` or `warning`

> Hey mum, dropped my phone down the loo this morning so I'm on a temporary number. Save this one. Are you free later?

The opening move only — no ask yet. Catching this is what would actually protect someone, and it is the hardest case in the corpus.

**`anz-genuine-job-referral`** — returned `scam`, wanted `unclear`

> Hi Jordan,

You've been referred by an ANZ employee as someone who would be a great fit for the following role:

Job title: Associate Private Banker

Requisition number: 118742

We'd love for you to apply so we can hear more about your skills, experience and what you are looking for. You can read more about it, and apply, using the link below:

Please use this email address when logging in, to make sure their referral is acknowledge. You have an existing profile in our system - use "Forget Password" if you need to. You will receive a confirmation email once you have successfully submitted your application.

https://careers.anz.com/job-invite/118742/?locale=en%5fGB&utm_campaign=rcmemployeereferral&utm_source=rcmemployeereferral

An unsolicited message from a bank, offering an opportunity, instructing the reader to log in, and containing a grammatical error — 'to make sure their referral is acknowledge'. Poor grammar in a message from a bank is the tell every scam-awareness page in New Zealand teaches, and here it is genuine. This is the hardest negative for `job-or-earnings-offer` and `verify-account-pretext` at once.

Reasons given:
- This message says it is from ANZ, but the link goes to careers.anz.com, which is not a real ANZ address.

**`anz-genuine-interview-invite`** — returned `scam`, wanted `unclear`

> Hi Jordan,

Congratulations! You have been selected to progress for the Customer Service Consultant, New Zealand Contact Centre, 114508 position, which will involve completing a short digital interview.

We ask that you complete your digital interview within the next 72 hours. We recommend that you complete the entire digital interview in one sitting. Please let us know should you require any additional time or have any special requirements.

To begin the digital Interview click here https://sau.hvue.io/XXXXXXXXXXXXXXXX to begin!

Thank you again for your interest!

Kind Regards,

ANZ Recruitment Team

'Congratulations! You have been selected', a 72-hour deadline, and a link to an unfamiliar third-party domain (`sau.hvue.io`) that carries neither the bank's name nor a word of English. Every deterministic signal this app has says scam. It is a real interview invitation from a real bank.

Reasons given:
- This message says it is from ANZ, but the link goes to sau.hvue.io, which is not a real ANZ address.

**`anz-talent-genuine-job-alert`** — returned `scam`, wanted `unclear`

> New jobs posted from careers.anz.com

You are receiving this email because you joined the ANZ Banking Group Limited Talent Community on 11/09/2026. You will receive these messages every 7 day(s). Your Job Alert matched the following jobs at careers.anz.com.

Jobs
Strategy & Innovation Manager - Melbourne, AU
Senior Lead Strategy - Melbourne, AU
Manager, Capital & Provisioning Analytics - Melbourne, AU
Small Business Specialist - Melbourne, AU
Software Engineer - Melbourne, AU
Senior Advisor - NFR Operational Risk and Resilience (Third Party) - Melbourne, AU
Senior Manager Operations Risk, Group Operations - Melbourne, AU
Procurement Change and Delivery Lead - Melbourne, AU
Change Manager-Melbourne or Sydney - Melbourne, AU
Audit Manager - Technology and Information Security - Melbourne, AU

A bank's name throughout the body, sent from `noreply10.jobs2web.com` — a domain with no relationship to the bank in the text. This is the false positive `playstation-genuine-payment-problem` warns about, in its purest form.

Reasons given:
- This message says it is from ANZ, but the link goes to careers.anz.com, which is not a real ANZ address.

**`hirevue-genuine-interview-reminder`** — returned `scam`, wanted `unclear`

> Newton,

This is a reminder that you have not yet submitted your on-demand interview for the Customer Service Consultant, New Zealand Contact Centre, GB3 opportunity.

Submit your responses.

If you need technical assistance, please visit the Help Centre.

Marisa Vella
ANZ
Marisa.Vella2@anz.com <!-- pragma: allow (redacted stand-in; originals in corpus-sources-private) -->

Click here to unsubscribe

Four lines long, chases an incomplete action, signs off with a named individual at a bank and is sent from an Australian third-party domain. Brevity is usually treated as a scam signal; here it is what a genuine reminder looks like.

Reasons given:
- This message says it is from ANZ, but the link goes to marisa.vella, which is not a real ANZ address.

**`hirevue-genuine-interview-invite`** — returned `scam`, wanted `unclear`

> Hi Jordan Hale,

Thank you for your interest in the Customer Service Consultant, New Zealand Contact Centre, GB3 position at ANZ.

You are invited to complete a video interview

When you begin the interview, you'll have the opportunity to view helpful resources before responding to interview questions.

Take time to read all instructions carefully before responding. Some questions may require you to respond in a specific format, within a set time limit or with limited retakes.

After completing and submitting your interview, a notification will be sent to your recruiter at ANZ for review.

Get started

Kind regards,
ANZ Recruitment Team
ANZ

Need help?

Help Centre

If the button above isn't working, copy and paste this link in a browser.
[https://sau.hvue.io/QtBK7X24LmVRfqa_]

The companion to `anz-genuine-interview-invite`, sent by the vendor rather than the bank. Same `sau.hvue.io` host, a domain that carries neither organisation's name and reads as a random string.

Reasons given:
- This message says it is from ANZ, but the link goes to sau.hvue.io, which is not a real ANZ address.

**`anz-talent-genuine-melbourne-digest`** — returned `scam`, wanted `unclear`

> You are receiving this email because you joined the ANZ Banking Group Limited Talent Community on 11/09/2026. You will receive these messages every 7 day(s). Your Job Alert matched the following jobs at careers.anz.com.

Jobs
Associate Private Banker - Melbourne, AU
Director/Executive Director, Funds - Financial Institutions Group (Melbourne/Sydney) - Melbourne, AU
Manager - Thematic Reviews (Operational Risk) - Melbourne, AU
Employee Relations Specialist, AUS - Sydney, Melbourne or Brisbane, AU
Senior Manager, Op Risk - Wealth Solutions & Portfolio Management - Melbourne, AU
Associate, Operational Risk - Procurement, Property, Transformation & GCC - Melbourne, AU
Senior Associate, NFR Governance and Reporting - Melbourne, AU
Senior Manager, Op Risk - Products & Deposits - Melbourne, AU
Senior Associate, Operational Risk (Corporate Centre) - Melbourne, AU
Lead Engineer - Melbourne, AU

A bank's name in every line of the body, and a sending domain — `jobs2web.com` — that is not the bank's. The second of three this domain is allowed; the first is `anz-talent-genuine-job-alert`, a week later.

Reasons given:
- This message says it is from ANZ, but the link goes to careers.anz.com, which is not a real ANZ address.

## Items that no longer measure anything

**`nzpost-warehouse-verbatim`** — 2026-09-07: the delivery-blocked-pretext narrative pattern was written after reading this message.

**`bnz-rewards-expiry`** — 2026-09-07: the benefit-expiry-pretext narrative pattern was written after reading this message.

**`bank-dispute-payment`** — 2026-09-07: the unauthorised-payment-pretext narrative pattern was written after reading this message, including the clause separating it from bank-genuine-confirm-payment.

**`afterpay-verify-account-verbatim`** — 2026-09-07: this is the message that exposed both gaps. The verify-account-pretext narrative pattern was written after reading it, and Afterpay was added to the Known Organisation list because of it.


---

## Re-run over 86 items — 2026-09-22, free, recorded rather than overwritten

The run above was made over the corpus as it stood at **81 items**, before the
two captured scams and the three blind-written negatives were added. It is left
standing because it is what the paper's earlier reading rests on. The same
command over the current **86** items (`npm run bench`, no `--write`) gives:

| Measure | 81 items | 86 items |
| :-- | :-- | :-- |
| Scams raised, never developed against | 6/9 (67%) | **6/11 (55%)** |
| Legitimate left quiet | 62/68 (91%) | **65/71 (92%)** |
| Overall | 69/81 (85%) | **72/86 (84%)** |

**The false-alarm side is the part that matters for F2, and it did not move:**
the same six alarms, all six still `verbatim`, none written. The written arm is
now 16 rather than 13, because the three blind negatives are all quiet here —
including `power-company-genuine-overdue-notice`, which trips the *narrative*
engine on `manufactured-urgency`. So the blind batch is not simply harder mail;
it is mail that catches a narrative detector and not a deterministic one.

**0/16 written against 6/55 collected, one-sided Fisher p = 0.202** (it was
0.265 at 13 written). Direction only, as before. The six are still not to be
fixed.
