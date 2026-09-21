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


---

# Part II — the positive side

**Written 2026-09-22, before a single message in the source folder had been
opened, and to be treated the same way as Part I: not changed once reading
began, and any departure recorded below with its reason.**

Everything above governs *negatives*. The scam half of the corpus was built by
judgement, from published bank screenshots and reconstruction, and it is the
scarcer half — 13 items against 68. The obvious fix is a real spam folder. But
a corpus whose scams were picked because they looked like good examples has
exactly the selection weakness F2 exists to expose, and it would be
self-defeating to expose it on the negative side while committing it on the
positive side. Hence a second pre-registration.

## The source

**Inbox B's spam folder.** Inbox B is the author's secondary personal Gmail
account; the letter is mapped to an address only in
`corpus-sources-private/README.md`, outside this public repository. It is a
different account from inbox A, which supplied every collected negative, and it
is used here because its spam folder is far more prolific.

Gmail deletes spam after 30 days, so this sample is necessarily a sample of one
month's arrivals. Say so in the paper; do not describe it as "a spam folder" as
though folders were interchangeable.

## The rule

Walk the spam folder backwards from the most recent message. **Walk it in
order** — do not scan for interesting senders first. Take every message
satisfying all of:

1. **A scam**, by the test in the next section.
2. **Self-contained** — enough text to classify from the body alone. An
   image-only message is skipped and counted.
3. **English** — the detector under test is English-only, so a non-English
   message measures the language gap, not the detector. Skipped and counted.
4. **Distinct campaign** — at most **three** per sending domain, and at most
   **three** per recognisable campaign family (same pretext, same template,
   different throwaway domains). One botnet must not become the finding.
5. **Not already in the corpus** in substance.

## What counts as a scam, decided in advance

A message is a positive if it attempts to obtain **money, credentials, personal
information, or an action of value** from the reader **by deception** — by
impersonating an organisation or person, by inventing a circumstance, or by
misrepresenting what will happen if the reader complies.

Explicitly **not** positives, however unwanted:

- Bulk marketing from a business that is genuinely that business.
- Newsletters, political mail, charity appeals that are what they claim to be.
- Advertising for products of dubious merit that does not lie about who is
  sending it or what the reader is being asked to do.

Gmail's spam classifier is **not** the label. It selects the folder; it does not
decide the item. A message in the spam folder that is merely unwanted is
excluded and counted as such — and that count is itself worth reporting, since
it says what fraction of "spam" a scam corpus drawn this way would misrepresent.

**The unavoidable asymmetry, stated rather than hidden.** A negative could be
qualified from its envelope before the body was read. A positive cannot: deciding
whether a message deceives requires reading it. So the guard here is different
in kind — it is *take every qualifying message in walk order*, never a selection
among them, with every exclusion counted and reasoned. Where authenticity or
intent is genuinely uncertain, the message is **skipped and counted as
uncertain**, never guessed at and never quietly dropped.

## The contamination rule, which matters more here than above

**No message captured under this protocol may be run through the detector, in
any engine, until the capture is closed and committed.** Not to check a hunch,
not to see if it is interesting. A scam half assembled with knowledge of what
the engine catches would make every subsequent recall number meaningless, and
this project has already spent one corpus that way (F3).

For the same reason, `hardNegative`-style difficulty judgements and any note
about *why* a message is interesting are written **after** capture closes.

## Target and stopping condition

Walk until **40** messages qualify, or the folder is exhausted, whichever comes
first. Stated in advance so the sample cannot be stopped at a flattering point.
If the folder is exhausted first, report the number reached and the folder's
total size; a short sample is a finding about the source, not a failure.

## Redaction

As Part I: shape-preserving, unredacted originals to `corpus-sources-private/`,
and `bench/redaction.test.ts` must pass. Scam messages carry live payloads, so
in addition: **every URL is defanged to a structurally identical placeholder on
a reserved domain**, and no phone number, wallet address or reply-to survives in
a form anyone could act on. The shape is the data; the destination is not.

## Amendments, recorded as they were made

**1. Defanging is applied to the payload, not to every string that happens to be
a URL.** Made 2026-09-22, while capturing the first two positives. The rule above
says "every URL is defanged to a structurally identical placeholder on a reserved
domain", and applying that literally would have destroyed the finding in one of
the two messages. The toll phish is sent *through SurveyMonkey's genuine mailing
infrastructure*, so every link a reader can see points at `surveymonkey.com` —
which really is SurveyMonkey. That the visible links are legitimate is the whole
of what makes the item interesting, and rewriting the host would have removed it.

So the rule as applied is: a host is defanged when it is the attacker's, and kept
when it is a real organisation's and is itself the data. What is always removed
is the part a reader could act on or be identified by — the footer tracking
tokens here are replaced with stand-ins of identical length and identical escape
structure, because the token identifies the recipient while its shape does not.

The same reading explains why the older scam items keep live lookalike domains
like `anznzz.com`: there, the domain *is* the measurement. Two properties the
engine can see — whether a host is a brand lookalike, and whether its ending is
on the high-abuse list — must survive defanging or the item stops measuring
anything. Neither captured message tripped either property, so nothing was lost
in this round; a future capture whose payload host is a lookalike will force this
choice properly, and it should be made in the open rather than by reflex.

## Part II, round 1 — 2026-09-22: the folder is thin, and that is the result

Walked inbox B's spam folder in full. **It holds 16 conversations**, not the
prolific source it was expected to be, and the composition is the finding:

| | Count | |
| :-- | :-- | :-- |
| Marketing from one genuine sender | **11** | A language-learning app the reader actually signed up to, re-sending four templates. Not scams by the test above, and duplicates of each other besides. |
| Qualifying scams | **3** | A loyalty-scheme "account maintenance" deadline pretext; a road-toll notification; an Afterpay "confirm your account" carried under an unrelated Dutch subject line. |
| Uncertain, skipped and counted | **1** | An IPTV subscription advert sent from a hijacked university account. It misrepresents its sender but makes no false claim about what it is selling, which the rule does not cleanly resolve. Recorded, not guessed at. |
| Excluded — non-scam bulk | **1** | |

Target was 40. The folder yields **3**, and would have yielded 3 however long
the walk continued, because there is nothing else in it.

**Read this as a fact about spam folders, not a failed capture.** A personal
spam folder is mostly ordinary marketing that a classifier disliked, with a
handful of real attacks in it; Gmail's 30-day deletion means it is also only
ever a one-month window. Anyone planning to build a scam corpus from "my junk
mail" should know that a month of one account bought three usable items.

It also sharpens the asymmetry the paper is about. Collected *negatives* were
abundant — 55 without difficulty. Collected *positives* from the same kind of
source are scarce, which is precisely why scam corpora get written rather than
gathered, and why the provenance question matters more on the positive side
than anyone has measured.

The walk, with senders and dates, is in
`corpus-sources-private/inbox-captures-5.md`. What happened when the three bodies
were actually opened is the next section, and it changed the number.

## Part II, capture — 2026-09-22: three qualified on sight, two survived reading

The walk above was conducted from the list view: subject, sender and snippet
only, per the contamination rule. Opening the three bodies in order to capture
them settled a question the list view could not, and it cost the round an item.

**Item 11 — the Inserve/Afterpay message — is not merely comparable to
`afterpay-verify-account-verbatim`. It is that message.** Same sender, same body
word for word, same Dutch ticketing footer. The corpus item recorded as reported
from a user's junk mail on 2026-09-07 is this 28 August arrival, reached by a
different route. Rule 5 excludes it as already held.

That exclusion is worth more than the item was. `afterpay-verify-account-verbatim`
carries a `developedAgainst` flag: the engine was changed while somebody was
looking at it, and the corpus file says in terms that such an item proves
nothing. Capturing it again under a fresh id would have re-entered a known
contaminated message as though it were freshly held out, and every recall figure
that touched it would have been wrong in a way no downstream check could catch.
A rule written to stop double-counting turned out to be the thing standing
between this corpus and a silently inflated number.

**The round therefore yields two collected positives, not three**:
`flybuys-security-setting-verbatim` and `linkt-toll-notification-verbatim`, both
now in `bench/corpus.ts` with shape-preserving redaction, and neither run through
the detector before the capture was committed. The corpus stands at 83 items.

Two against a target of forty. Set beside 55 collected negatives gathered in two
afternoons, that ratio is the Part II result, and it argues the paper's case
better than forty captures would have: scam corpora are written rather than
gathered because gathering them from one person's mail does not work. The next
round of this work is measurement, not more sampling.
