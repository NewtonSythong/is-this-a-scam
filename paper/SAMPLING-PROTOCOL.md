# Sampling protocol for the collected negatives

**Written 2026-09-22, before the second capture round began, and deliberately
not changed once messages had been read.** The first fifteen collected negatives
(captured 2026-09-21) were selected by judgement, and that is a weakness the
paper cannot argue its way out of: a corpus whose negatives were chosen because
they looked scam-like measures the chooser as much as the detector. F2's claim
is about *provenance*, so the selection rule on the collected side has to be
stated in advance and be independent of how alarming any message looks.

This file is the pre-registration. If the rule below is broken, the exception is
recorded here with its reason rather than quietly applied.

## The rule

Sample from **inbox A** — the author's primary personal Gmail account, the one
used for job applications, banking, government and retail. Mailboxes are
referred to by letter throughout the paper and mapped to real addresses only in
`corpus-sources-private/README.md`, outside this repository: this repository is
public, and an address published beside a description of what arrives in it is
a target. Work backwards from the most recent message, and take every message
that satisfies all of:

1. **Machine-sent** — an automated transactional or notification email from an
   organisation. Determined by the sender being a no-reply / service / donotreply
   style address or a bulk-mail subdomain, before the body is read.
2. **Genuine** — the reader is confident it is what it claims to be. Anything
   whose authenticity is uncertain is skipped, not guessed at, and the skip is
   counted.
3. **Self-contained** — the body carries enough text to classify on its own. A
   message that is only a subject line and an image is skipped and counted.
4. **Distinct sender** — at most **three** messages per sending organisation, so
   no single high-volume sender dominates the sample.

**Nothing is selected or rejected for looking scam-like.** `hardNegative` is
assessed *after* capture, per item, and never used as a selection criterion.

## Exclusions, decided in advance

- **Personal correspondence between humans.** Out of scope for this corpus and
  disproportionate to redact.
- **Anything containing an irreducible secret** — a live one-time code still in
  its validity window, an account number that redaction cannot shape-preserve
  without destroying what is being measured, a password reset link.
- **Job-application mail naming a third party.** The first round already carries
  one ANZ recruitment email, which is enough of that genre; more would both skew
  the sample and name real recruiters.
- **Messages already in the corpus.**

## What gets counted

Every message the rule visits is tallied into one of: **captured**, **skipped —
not machine-sent**, **skipped — authenticity uncertain**, **skipped — too thin**,
**skipped — sender cap reached**, **skipped — excluded category**. The tallies
go in `docs/` alongside the results, because a sample is only interpretable next
to what it passed over.

## Target and stopping condition

Stop at **50–60 collected negatives in total** (15 already held), or when the
inbox is exhausted, whichever comes first. The target comes from the power
requirement in `paper/PLAN.md` §2: at n = 15 the F2 contrast rests on a single
Fisher test at p = 0.031, which is one message away from the boundary.

## Redaction

Shape-preserving, as `bench/corpus.ts` already documents: a real name becomes a
stand-in name of similar length, a phone number becomes a phone number, an
account identifier keeps its length and character classes. Blanking a field
changes what is measured, because a message with a name in it does not behave
like one without. The unredacted originals stay in `corpus-sources-private/`,
outside this repository.

---

## Amendments, recorded as they were made

Pre-registration is worth nothing if the rule is edited quietly once it starts
returning inconvenient results. Both changes below were made during the first
capture round of 2026-09-22 and are recorded here in full.

**1. "Distinct sender" is counted per sending domain, not per organisation.**
Written as "organisation", which turned out to need a judgement call on every
message: mail *about* ANZ arrives from `talentandculture.anz.com`,
`noreply10.jobs2web.com`, `mail.hirevue-app.com.au` and
`productsdc66pr.successfactors.com`, all genuinely different companies operating
their own infrastructure. Counting by sending domain is mechanical and cannot be
argued with. It is also the more interesting axis, because a genuine message
arriving from a domain that is not the brand's is precisely the case the
detector finds hard.

**2. The blanket exclusion of job-application mail was dropped.** It was written
for two reasons — that more of it would skew the sample, and that it would name
real recruiters. The domain cap handles the first and shape-preserving
redaction handles the second, so the exclusion was doing no work its
replacements do not do better. Dropping it also removed a large, genuinely
representative slice of this particular inbox.

**This is a loosening made after the run began, which is the thing
pre-registration exists to prevent, so weigh it accordingly.** Two facts argue
it is not outcome-driven: the change is orthogonal to how alarming any message
looks, and it was applied before any message was scored by the detector. One
narrower exclusion was kept and is now stated on its own terms: a named
recruiter's own correspondence routed through an applicant-tracking system,
carrying a two-way reply protocol in the body, fails rule 1 because it is not
machine-sent in substance.

**3. A message identical to one already captured, apart from a trivial
substitution, is skipped as a duplicate template.** Made during the second
capture round of 2026-09-22. Bulk senders re-send one template with a word or a
date changed — four Zoom offers differing only in the deadline they name, two
Coronet Peak surveys differing in "recently" versus "today". Taking all of them
would let a single template occupy several of the fifty-odd slots in the
collected set and weight the false-alarm rate towards whichever sender mails most
often.

The threshold is deliberately narrow: a message is a duplicate only when its body
is the same but for a word, a date or a number. A send whose opening paragraph is
genuinely rewritten is a different message and is taken —
`zoom-genuine-black-friday` is in the corpus for exactly that reason, next to two
of its own near-copies that are not.

Weigh this as a **tightening** made after the run began, and note two things
about it. It is orthogonal to how alarming a message looks; and it cost the round
a hard negative rather than saving it one, since the Coronet Peak survey it
excluded is the most scam-shaped genuine message either round has turned up.
There is an argument on the other side — duplicate templates really do arrive
twice, and a false-alarm *rate* should reflect the mail that actually lands — and
it is recorded here rather than resolved, because a reader may weigh it
differently.


## Round 1 result — 2026-09-22

Swept the 50 most recent `category:updates` conversations. **Thirteen captured**,
taking the collected negatives from 15 to **28**. Skips, with counts, are listed
at the foot of `corpus-sources-private/inbox-captures-3.md`.

The sweep is **not finished**: `category:updates` is one Gmail stratum, and the
target of 50–60 needs roughly 25 more from the Primary, Promotions and Forums
categories and from older mail. That the sample so far is dominated by
job-search and payments traffic is a property of this inbox in September 2026,
and it must be stated in the paper rather than corrected for by hand-picking
variety — hand-picking variety is the same failure as hand-picking difficulty.

## Round 2 result — 2026-09-22

**Twenty-seven captured**, taking the collected negatives from 28 to **55** and
the corpus from 54 items to 81. That is inside the pre-registered stopping band
of 50–60, so **the collection is complete** and the next round of this work is
measurement, not more sampling.

Round 1 swept `category:updates`. This round swept the strata that left: all 50
conversations Gmail's Promotions category holds, then the 50 most recent in the
Primary inbox, then Forums — which holds nothing in this account and is recorded
as an empty stratum rather than left unmentioned. A hundred conversations
visited, 27 captured, 73 skipped, every one accounted for by reason and count at
the foot of `corpus-sources-private/inbox-captures-4.md`.

The per-domain cap of three did most of the work: 53 of the 73 skips were domains
already full, because round 1 had filled SEEK, Inland Revenue, NZ Post, PayPal
and ANZ PeopleHub. That is why this round is so much retail marketing where the
last was so much job-search and payments traffic. It is the rule behaving as
designed, and neither shape is a correction of the other — both are properties of
this inbox, and both belong in the paper's description of where the negatives
came from rather than being balanced out by hand.

**One procedural fault, recorded because pre-registration is worthless if only
the clean parts are written down.** The Primary stratum was first worked by
scanning the sender column for domains the corpus did not already hold, rather
than walking it in order and testing every message. Eleven conversations were
passed over with no reason recorded. The stratum was then re-walked properly,
those eleven were visited, and two of them qualified and were captured —
`google-genuine-security-alert` and `anz-talent-genuine-melbourne-digest`. The
within-domain ordering was checked afterwards and is unaffected: in every domain
the messages held are still the most recent qualifying ones. The fault is in this
file rather than only in the private notes because it is the kind of shortcut
that, left unrecorded, turns a mechanical sample back into a chosen one.

Two skip counts are zero and are worth reading as findings rather than as blanks.
Nothing in a hundred conversations was of uncertain authenticity, and nothing was
too thin to classify. An inbox that clean is not a neutral place to draw genuine
mail from, and the paper should say so.

