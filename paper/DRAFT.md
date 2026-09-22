# Written Negatives Make Detectors Look Quiet

**False-alarm rates depend on where the negatives came from — and on what their
author knew about the detector. A provenance-controlled measurement on a
deployed LLM fraud detector.**

Newton Sythong, independent researcher, Wellington, New Zealand.

---

<!--
READ THIS BEFORE EDITING — notes for whoever picks the draft up next.

  Status: first full draft, written 2026-09-22 against PLAN.md §8 item 6.
  Target length: 5–8 pages of body text. This is roughly 5,600 words, which is
  6–7 pages in the IEEE two-column template.

  Format: Markdown on purpose. PLAN.md §9 settles this — pandoc is installed and
  IEEEtran.cls is already present, so the venue's template is applied at build
  time rather than typed into the source. Nothing here depends on a venue.
    pandoc DRAFT.md -o draft.pdf          (quick read)
    pandoc DRAFT.md -t latex -o body.tex  (then wrap in the venue's class file)

  Every number in this draft is reproducible from the public repository:
    npm run bench:f2        free   — the F2 table, both Fisher tests, the MDE
    npm run bench           free   — the deterministic baseline over all 86 items
    npm run bench:narrative $1.31  — the LLM run the cache above was built from

  TITLE IS AN OPEN DECISION. The one above is the registered title from
  PLAN.md §7, written when provenance was believed to be the mechanism. The
  blind-authorship run (§5) says the mechanism is the author's knowledge of the
  detector, not writtenness, and PLAN.md §2 says that finding should lead. A
  title matching the paper as written would be closer to "Your Negatives Are
  Quiet Because You Wrote Them Knowing What the Detector Looks For". Left
  unchanged here because the abstract already leads with the mechanism, and a
  title change is Newton's call rather than the draft's.

  AUTHOR LINE. Named, because SaTML was abandoned (PLAN.md §8 preamble) and the
  remaining venues — arXiv, CSET, eCrime — do not require double-blind at
  submission. If a double-blind venue comes back into scope, strip the line
  above and mirror the repository anonymously (PLAN.md §6).

  WHAT IS DELIBERATELY NOT HERE:
  - F1 (recall-only corpora reward crying wolf) is cited as motivation and never
    claimed. Axelsson and Arp et al. own it. PLAN.md §2 is explicit about this.
  - F3 (a held-out corpus is a wasting asset) is a methods note in §3.5, not a
    finding section. It is not novel as a concept.
  - No fixes for any of the alarms reported here. Narrowing a pattern while
    looking at the message that caught it retires that message as evidence,
    which is the corpus-spending error the paper exists to name.
-->

## Abstract

A detector's false-alarm rate is usually measured against negatives that someone
built. We show that how those negatives were obtained moves the measured rate
enough to change what the number means, and that the mechanism is not the one we
expected.

We measure a deployed consumer scam-checking application whose evaluation history
is public and dated. Its benchmark's legitimate half contains 55 messages
captured from two real inboxes under a pre-registered sampling rule, and 16
messages we wrote ourselves. Model, prompt, catalogue and task are held fixed;
only the provenance of the negative varies. The detector alarms at **12 of the 55
collected messages (21.8%, 95% CI [12.9, 34.4])** and at **1 of the 16 written
ones (6.3%, [1.1, 28.3])**, flagging genuine Spotify and PlayStation billing
mail, a Google Play points expiry, an ORCID address verification, a SEEK profile
nudge and four Zoom marketing offers.

Before the collection, the written negatives reported that rate as **zero**.
Asking why produced the paper's main result. Each of the first 13 was composed
beside the detection pattern it was written to probe. We commissioned three more
from an author given the corpus and the sampling protocol and denied all sight of
the detector, its pattern names and every prior result, with the batch size fixed
before the messages existed. **One of the three alarmed** — a genuine utility
disconnection notice, on the same urgency pattern that fires on the marketing
mail. The written/collected gap appears to track what the author knew about the
system under test rather than whether the text was written.

We report the significance honestly: Fisher's exact gives **p = 0.146 one-sided**
at 1/16 against 12/55, and 16 *quiet* written negatives would have given 0.034,
so a single alarm is the whole difference. We did not write a seventeenth. The
direction reproduces in a second system with no model in it — a deterministic
baseline over the same corpus alarms at 6 of 55 collected messages and 0 of 16
written ones — and the cause is named and predicts the blind result, but the test
is underpowered because writing hard negatives is slow. We close with two
requirements for evaluating this class of system, and one thing not to do.

## 1. Introduction

A scam detector that alarms at a genuine bank message does a specific, measurable
harm: it teaches a frightened person that the warning is noise. That failure is
invisible in a benchmark made only of scams, and scam-only corpora are the norm
in this literature. The point is old and it is owned — Axelsson showed in 1999
that under realistic base rates the false-alarm rate, not the detection rate, is
what limits an intrusion detector [1], and Arp et al. found sampling bias,
inappropriate performance measures and base-rate neglect as named, counted
pitfalls across 30 top-tier security papers [2]. We cite that argument as our
motivation and claim none of it.

What follows from it is a practical question nobody appears to have measured.
Once you accept that you need negatives, you have to get them from somewhere, and
there are two ways: collect them, or write them. Writing is cheap, safe and
completely under your control, so a great deal of evaluation data is written —
including, until recently, most of ours. This paper asks what that choice costs.

We hold the model, the prompt, the pattern catalogue and the task fixed, vary
only where the negative came from, and test the difference. Our contributions:

1. **A provenance-controlled false-alarm measurement.** On a deployed detector,
   21.8% [12.9, 34.4] on 55 collected negatives against 6.3% [1.1, 28.3] on 16
   written ones (§4). Before the collection, the written negatives reported the
   rate as zero.
2. **A mechanism, tested blind and against our own hypothesis.** Negatives
   written by an author who cannot see the detector behave like collected ones.
   One of three blind-written messages alarmed; none of the thirteen written
   beside the patterns ever had (§5).
3. **The same asymmetry in a system with no model in it.** A deterministic
   engine of regular expressions and a known-organisation list, over the same
   corpus, false-alarms on 6 of 55 collected messages and 0 of 16 written ones
   (§6). Whatever produces the gap, it is not language-model behaviour.
4. **An honest account of the power cost, and a stopping decision.** The blind
   run cost us significance, and we report the weaker number and explain why we
   stopped writing negatives rather than continuing until the arithmetic cleared
   (§7).
5. **A secondary result**: a detection rule written as one paragraph of English
   is read incompatibly by two models, so a prompt-based rule catalogue does not
   port to a cheaper model unchanged (§8).

Every number is reproducible from a public repository, and the contemporaneous
methodology log — dated, and never rewritten — records each superseded reading
beside the one that overtook it, including the two p-values this work lost along
the way.

## 2. The system under test

**Is This a Scam?** is a live, free, account-less web application that takes a
text message or email and tells the reader whether it is a scam, in language that
assumes no knowledge of how scams work. It was built for older and less digitally
confident people in New Zealand. It is public and open source under AGPL-3.0.

Three properties of its design matter for what we measure.

**It has no way to say "safe".** There are exactly three answers — *this is a
scam*, *this has warning signs*, and *we can't tell* — because a false
reassurance costs someone their savings and a false warning costs them a phone
call. The quietest answer available is *we can't tell*, and for a legitimate
message that is the correct one. A "false alarm" throughout this paper means the
system said more than that about a genuine message.

**Two engines run, and the more alarming verdict wins.** A deterministic engine
owns what can be looked up: lookalike domains, redirect chains, payment rails, a
known-organisation list, Safe Browsing. A language model owns the story being
told — impersonation, urgency, secrecy, the "Hi Mum, this is my new number"
pretext. Neither can talk the other down. This gives us two independent detectors
over one corpus, which §6 uses.

**The model cannot write its own sentences.** The Narrative Check gives the model
a fixed catalogue of 14 pattern descriptions, each one or two sentences of
English, and asks which are present; the model must quote the words that made it
pick, and a quote not found in the message is discarded in code. The sentence the
reader eventually sees was written in advance by a person. So a Narrative Check
result is a set of pattern identifiers, which is what makes the failures in §4
legible: we can say not only that it alarmed but which paragraph of English
caused it.

Measurements in §4, §5 and §7 are of the Narrative Check alone, on
`claude-opus-5`, and an *alarm* means it returned at least one pattern. §6
measures the deterministic engine alone. We report them separately rather than
reporting the application's combined verdict, because a combined number cannot
attribute a false alarm to a mechanism.

## 3. The corpus

86 messages: 15 scams and 71 legitimate, of which 47 are hard negatives — genuine
messages wearing a scam's clothes. None of it is imported by the application, and
nothing in it is the regression suite the engine was developed against.

### 3.1 Provenance is recorded per item, and it is the independent variable

Every item is tiered `verbatim` (the sender's own words, reproduced from the
message or from a published screenshot), `reconstructed` (written from an
official description of a specific documented campaign) or `synthetic` (an
ordinary message written to represent a shape). The tier was recorded when each
item was added, for reporting reasons that predate this paper, which is why it is
available as a clean independent variable now.

Throughout, **collected** means `verbatim` and **written** means `reconstructed`
or `synthetic`. The split is provenance, not difficulty: several of the written
negatives were written specifically to be hard, and 47 of the 71 legitimate items
across both arms are marked as hard negatives.

### 3.2 The collected negatives, and the rule that selected them

55 genuine messages captured from two mailboxes belonging to the author. The
first 15 were selected by judgement, which is a weakness we cannot argue our way
out of: a corpus whose negatives were chosen because they looked scam-like
measures the chooser. The remaining 40 were captured under a rule written down
before the capture began and not changed once messages had been read.

The rule sweeps a mailbox backwards from the most recent message and takes every
message that is **machine-sent** (an automated transactional or notification mail,
judged by the sender address before the body is read), **genuine** (anything of
uncertain authenticity is skipped, not guessed at), **self-contained** (enough
text to classify without the images), and within a cap of **three messages per
sending organisation**. Nothing is selected or rejected for looking scam-like;
hard-negative status is assessed after capture and never used as a selection
criterion. Every message the rule visited was tallied as captured, or as a skip
with its reason.

Two capture rounds swept 150 conversations across Gmail's Updates, Promotions,
Primary and Forums strata — Forums is recorded as an empty stratum rather than
left unmentioned — and captured 40. The per-domain cap did most of the
rejecting: 53 of the 73 skips in the second round were domains already full.

Three things about that sample belong in the paper rather than being corrected by
hand. The first round is dominated by job-search and payments traffic and the
second by retail marketing, because the cap filled the high-volume senders early;
both shapes are properties of this inbox in September 2026, and hand-picking for
variety is the same failure as hand-picking for difficulty. Second, two skip
counts came back zero — nothing in 100 conversations was of uncertain
authenticity and nothing was too thin to classify — which says this is an
unusually clean inbox to draw genuine mail from. Third, one procedural fault: the
Primary stratum was first worked by scanning the sender column rather than
walking it in order, passing over eleven conversations with no reason recorded.
It was re-walked properly, the eleven were visited, and two qualified and were
captured. We record it because pre-registration is worthless if only the clean
parts are written down.

### 3.3 The written negatives, in two batches that differ in one respect

Sixteen messages, and the difference between the batches is the paper's main
result.

**Thirteen written to 2026-09-18**, over the application's development, each one
composed beside the detection pattern it was meant to probe: a courier at the
door, a tradesman running late, a bank's own two-factor code, a family member
asking for money, a retail refund receipt. They were written to be hard, and they
are hard in the ordinary sense. They were also, necessarily, written by someone
who knew exactly what the detector was looking for.

**Three written on 2026-09-22**, under a condition none of the thirteen met. The
author was given the corpus file and the sampling protocol as the standard to
match, and was barred from the application source, the paper's plan, its
abstract, the analysis script and the git log. It could not name a single
detection pattern, let alone know which ones had fired. **The batch size was
fixed at three before the messages existed**, and pre-registered, because
fourteen was the number that would have cleared p < 0.05 and stopping at fourteen
would have been a stopping rule chosen for its p-value. Whatever the three
returned was going to be reported.

### 3.4 Redaction, and the guard that enforces it

Collected messages carry shape-preserving redaction: a real name becomes a
stand-in name of similar length, a phone number becomes a phone number, an
account identifier keeps its length and character classes. Blanking a field
outright would change what is measured, because a message with a name in it does
not behave like one without. Unredacted originals are kept outside the public
repository. A test in the repository fails the build if a consumer email address,
a real IP address or a personal mobile number reaches a corpus message.

Third parties appear only as *senders* — Google, Inland Revenue, ANZ, Spotify,
Dyson. That is ordinary transactional mail about the author and not about anyone
else, and the sending institution is not redacted, because which institutions get
false-alarmed on is the finding.

### 3.5 A note on corpus erosion, which shaped how this corpus is read

A held-out corpus is a wasting asset, and this one has been consumed twice. An
earlier version of it was held out, its misses were read in order to write three
new patterns, and it then reported 16/16 — passing by construction. The
partition intended to rescue it ("items never developed against") became
meaningless at the same moment, because that set was now exactly the set already
passing.

The mitigation that worked was not a rule but a refusal in code: a `dev`/`test`
split whose harness will not print the text of a missed `test` message, only its
id, because a rule addressed to a person who is mid-debugging and wants to know
*why* is not a guard. The split also produced a caution worth carrying: the two
halves differ by 5 points on one model and 7 on another purely by accident of the
cut, permanently, so dev scores and test scores are not comparable, and reading
one against the other would have manufactured a six-point improvement before
anything changed.

This is why none of the false alarms in this paper have been fixed. Narrowing a
pattern while looking at the message that caught it retires that message as
evidence. The alarms in §4, §5 and §6 are left standing.

## 4. False alarms by provenance

One run of the Narrative Check on `claude-opus-5` over all 86 items, every call
answered, $1.31. The model's half saw something in 14 of the 15 scams. It
false-alarmed on 13 of the 71 legitimate messages, and the split is this:

| Negative | False alarms | 95% CI (Wilson) |
| :-- | :-- | :-- |
| Written by us | **1 / 16** = 6.3% | [1.1, 28.3] |
| Collected from a real inbox | **12 / 55** = 21.8% | [12.9, 34.4] |

Fisher's exact test, one-sided, gives **p = 0.1458** (two-sided 0.2718). §7 is
about that number, and about why we are not going to improve it.

The twelve collected alarms fall into five patterns, and naming them is the point
of a catalogue the model cannot write itself:

- **`manufactured-urgency`** on five pieces of ordinary marketing — four Zoom
  seasonal offers and a graduate-programme application deadline. Its description
  reads, in full: *"Insists the reader must act immediately, today, or within a
  stated short deadline."* A discount that ends on Monday and a scam that ends on
  Monday are the same sentence.
- **`verify-account-pretext`**, alone or with `benefit-expiry-pretext`, on
  genuine Spotify, PlayStation and Google Play billing mail, on an ORCID
  address-verification message and on a SEEK profile nudge. The last two are not
  billing at all, which widens the reading: the pattern is not failing to
  separate a phisher from Spotify, it fires on being asked to click through to
  your own account.
- **`job-or-earnings-offer`** on a real ANZ recruitment referral.
- **`unexpected-money`** on a ski-field customer survey.

The earlier, smaller version of this corpus supported a tidier story — three
patterns, one of them obviously too broad — and it was wrong in an instructive
way. There was never one bad pattern. There was one pattern bad enough to hide
the others.

**What the written negatives reported before any of this existed.** The thirteen
measured zero false alarms, for as long as they were the whole negative half.
During part of that period one pattern, `wrong-number-opener`, shipped for nine
days measuring 0/10 while alarming on *"Hey stranger! It's been far too long"* —
an ordinary English greeting between friends. Four probe variants isolated it to
the literal token *stranger*, and it survived the sender signing their name,
which the pattern's own text says excludes it. The zero was a property of the
corpus, not the engine. A written false-alarm corpus measures only the shapes
somebody thought to write down, and recall corpora have no equivalent problem:
the 292 collected smishing messages we use in §8 came from people who were
actually targeted, so they contain shapes nobody here would have invented.

## 5. The blind-authorship run

The obvious reading of §4 is that writtenness is the mechanism. We tested it, and
it is not — or at least, it is not the part doing the work.

Of the three negatives written blind, **one alarmed**:
`power-company-genuine-overdue-notice`, a genuine utility disconnection notice
with a real debt, a real deadline and the company's own domain, on
`manufactured-urgency` — precisely the pattern that fires on four Zoom offers and
a graduate-programme deadline in the collected half.

| Written negatives, by what the author knew | False alarms |
| :-- | :-- |
| Written beside the pattern they guard (to 2026-09-18) | 0 / 13 |
| Written blind, no sight of the detector (2026-09-22) | **1 / 3** |
| Collected, nobody wrote them | 12 / 55 |

**n = 3 carries no statistical weight, and that has to be said in the same breath
as the result.** What it carries is a mechanism. Each of the thirteen was
composed beside the pattern it was written to probe, which is the one position
from which a negative gets steered clear of the trap — not dishonestly, just
inevitably. You cannot write a message to test an urgency detector without
knowing what that detector reads as urgent. Remove the knowledge and the first
written negative behaves like a collected one.

We think this is the better finding, and it is the one a reader should take away.
"Do not write your negatives" is advice a reviewer can argue with, and which
plenty of respectable work ignores for good reasons. "Your negatives are quiet
because the person who wrote them knew what your detector looks for" names a
cause, predicts the blind result before it was run, and is testable by anyone
with a detector and a stranger.

## 6. The same asymmetry, with no model in the system at all

The application's deterministic engine is regular expressions, a
known-organisation list and a set of lookups. Run over the same 86 items for
nothing, it leaves 65 of the 71 legitimate messages quiet. **All six false alarms
are collected messages. Not one is written** — 6/55 collected against 0/16
written, one-sided Fisher **p = 0.202**.

This matters out of proportion to its size. Whatever produces the provenance gap
cannot be an artefact of language-model behaviour, because there is no language
model in this arm. Real inboxes simply contain shapes nobody thought to write
down. Here the mechanism is fully legible: all six are one brand-impersonation
check misfiring on `careers.anz.com` (a genuine ANZ subdomain), on `sau.hvue.io`
(HireVue, ANZ's genuine interview vendor), and in one case on an email address
whose local part was read as a domain.

Two honest notes. **There is no significance here**: at 16 written negatives the
test cannot resolve a gap this size, and this arm should be read as a consistent
direction in an independent system, never as a second significant result. And all
three blind-written negatives are quiet in this arm, including the utility notice
that trips the model — so the blind batch is not simply harder mail, it is mail
that catches a *narrative* detector.

## 7. What this cost, and why we stopped

We report this sequence in full, because the shape of it is itself a result.

An earlier version of the contrast, on a 28-item negative set, gave 0/13 written
against 5/15 collected, **p = 0.031** one-sided. A single test at 0.031 carrying
an entire claim is a thin place to stand, so we grew the collected arm from 15 to
55 under the pre-registered rule. The effect got *larger* — the collected rate
held at 21.8% with nearly four times the data, and the written arm stayed at a
clean zero with forty more chances to fail — and **the p-value went up, to
0.060**.

That is not a paradox. Fisher's floor is set by the smaller arm. With the written
negatives held at 13 and every alarm landing on the collected side, 0.060 was
already the *smallest p obtainable at n_written = 13*, however the data had
fallen. Collecting more real messages could not rescue the test, and in fact
pushed it up, by moving mass into the arm that was never the constraint. The
written arm had been the constraint all along, and a whole collection round went
into the other one. Anyone planning this measurement should compute the floor
first; ours is eight lines of arithmetic and now runs as an assertion inside the
analysis script.

That is what motivated the blind batch of §5 — and the batch that was supposed to
buy significance spent it instead. At 1/16 against 12/55 the one-sided p is
**0.1458**. Sixteen *quiet* written negatives would have given **0.0343**. One
message is the entire difference between a significant result and this one.

**We stopped there, and the stopping is a deliberate methodological claim.** We
now know the table. We know that two more quiet written negatives would restore
significance, and we know how to write quiet ones, because writing thirteen of
them is what produced the zero in the first place. Writing a seventeenth negative
in that state of knowledge would be a stopping rule chosen for its p-value, by an
author who has now seen which patterns fire — the exact fault this paper exists to
name, committed in the paper that names it. The treadmill is visible from here,
and we are getting off it.

So the honest position, stated three ways because a reader deserves all three:
the direction is strong and reproduces in two independent systems; the cause is
named, mechanistically explained, and predicted the blind result; and **the test
is underpowered and does not clear 0.05.** The limiting factor is that writing
good hard negatives is slow, and the first one written under clean-room
conditions promptly alarmed.

## 8. Prompt-rule catalogues do not port across models

A secondary result, on the same catalogue.

`benefit-expiry-pretext` is one paragraph of English describing a specific
pretext: a reward or entitlement about to lapse. `claude-opus-5` reads it
narrowly. Put verbatim — the same fourteen descriptions, unchanged, no re-tuning
— to a cheap typed-decision model (TypeSafe's "System One", reached through
Vercel's gateway; it returns typed probabilities rather than text), the same
paragraph is read as "something is being offered or is expiring". It fires on
**73 of 145** scam messages, and on genuine institutional mail.

That model scored **83.4%** recall (121/145) on held-out real smishing at a 0.5
cut-off, against the shipping engine's 59.9–61.0% on the same corpus family:
twenty-one points, at a twentieth of a cent per hundred messages. Put to the 28
genuine messages then in the corpus, it alarmed at **21 of 28**. The 83.4% was
not detection. It was a model firing often enough to blanket a corpus in which
every item was a scam.

The practical consequence is that a prompt-based rule catalogue cannot be moved
to a cheaper model and assumed to mean the same thing. Natural language is the
entire detection logic in systems of this kind, and the same words are a
different rule in a different reader. The ported version's failure mode is
invisible if the destination corpus is scam-only — which returns to the argument
in §1, and to the reason this paper is about negatives.

We are careful about what this is and is not. It is one catalogue on two models,
so it is an existence proof rather than a trend; a third model would make it a
finding. The false-alarm figure rests on 28 messages and does not license a rate.
And the loosely-read paragraph is at least as much a fault in our writing as in
the model.

## 9. Related work

**The argument we inherit.** Axelsson's base-rate analysis [1] and the pitfall
catalogue of Arp et al. [2] — which names sampling bias (P1), inappropriate
performance measures (P7) and the base-rate fallacy (P8) across 30 top-tier
security papers — establish that false alarms are the limiting quantity. We do
not add to that argument; we ask what the negatives it demands are made of.

**The nearest work, and why it cannot run this contrast.** PhreshPhish [3] builds
a real-world phishing benchmark with 366,201 benign samples drawn from anonymised
browsing telemetry and brand search results, and evaluates across five base rates
from 0.05% to 5%. Every one of its negatives is collected, which is exactly what
we argue for and is also why it cannot vary provenance. Bhuiyan & Bhuiyan [4]
show that corpus identity is itself learnable — six public phishing corpora are
separable by origin alone at 0.9722 accuracy with TF-IDF logistic regression and
0.9806 with a linear SVC — which is corpus mismatch rather than provenance, and
which compounds the problem we describe. Kaya et al. [5] report AUC falling from
87.5% to 62.6% purely by changing which benign samples the model is tested
against, with the model held fixed; that is difficulty composition *within*
collected negatives, distinct from provenance, and it establishes that the field
already accepts that negative-set construction moves headline numbers.

**Prompt-as-policy.** Palla et al. [6] formalise moderation policy as an English
prompt and measure its instability: GPT-4o-mini over 2,115 items, accuracy moving
0.76–0.80 on prompt structure alone, and predictive multiplicity — near-identical
prompts producing different verdicts on the same samples. Their appendix does run
several models, reporting aggregate accuracy per model. The cell left unmeasured,
and the one §8 addresses, is a rule's *extension*: which specific messages a
**fixed** rule fires on across **different** models.

**On small hand-built negative sets.** XSTest [7] is 250 hand-written safe
prompts and is a standard over-refusal benchmark, so the field accepts
hand-constructed negatives when their construction is principled. Our exposure is
not that 16 is small. It is that one Fisher test carries the claim — and §5 is an
argument that hand-construction has a specific bias which principle alone does
not remove.

**The comparator a reader will have in mind.** Yadav & Masum [8] report Macro-F1
98.28% and phishing recall 99.45% from a multi-agent LLM framework on a fixed
1000-email subset of a unified TREC/Nazario corpus, and their own abstract says
the gain is "driven primarily by reduced false positives on legitimate emails".
They are optimising the same quantity we measure, which makes the comparison
honest rather than point-scoring. **The disagreement is entirely about what a
legitimate email is.** TREC's ham is genuinely collected, which is what we ask
for, and it is still not a sample of anyone's life: TREC's own track overview
describes the canonical public corpus as all mail delivered to one server over
three months of 2007, a server holding "many accounts that have fallen into
disuse but continue to receive a lot of spam", to which honeypot addresses
published on the web were added [9]. Against that, our negatives are 2026 mail
arriving in an inbox somebody actually reads: a Spotify payment reminder, a
Google Play points expiry, an ORCID address verification, four Zoom seasonal
offers, and a genuine power-company disconnection notice. A false alarm on any of
those is a person taught to distrust a real message. There is no equivalent
failure available on a honeypot account. 98.28% and 21.8% are both correct, about
different populations; the number a deployed detector needs is one that neither
paper produces, and the difference is that we say so.

**On novelty.** We searched for work that holds model and task fixed, varies only
the provenance of the negative, and reports a significance test, across the
phishing, spam, malware, intrusion-detection and fraud literatures, and found
none. That is a claim about an absence and no check can settle it, so we phrase
it as "we found none" rather than "there is none". Every citation in this paper
was pulled and read in full text on 2026-09-22; the record, including the
verbatim sentence carrying each claim and the two things the checks could not
establish, is in the repository.

## 10. Threats to validity

**One system, one author, one pair of inboxes.** The collected negatives come
from two mailboxes belonging to one person in New Zealand, and their composition
— heavy on job-search, payments and retail marketing in September 2026 — is a
property of that inbox. The direction reproduces across two detectors here, not
across two populations.

**The written arm is small, and the test does not clear 0.05.** Stated in §7 and
not softened.

**The blind batch is three messages.** It supplies a mechanism and no power. We
would not report it as a result on its own; we report it because it went against
the hypothesis it was run to support, and because suppressing a pre-registered
batch that came back inconvenient would be indefensible in this paper in
particular.

**The scam side of the corpus is partly model-authored**, which biases scam-side
results upward. It is disclosed per item, and the verbatim tier is free of it. It
does not touch the false-alarm measurement, which is the paper's claim.

**"Written" and "collected" are not perfectly matched on difficulty.** 47 of the
71 legitimate items are hard negatives, spread across both arms, and the written
ones were written to be hard. But difficulty is not randomised, and §5 is our
best account of the systematic difference that remains.

**The collected smishing corpus [10] is biased toward link-free messages**,
because its build script drops every row that would require a fabricated word
rather than filling placeholders — 253 clean plus 39 brand-restored, from 292.
That is the shape the engine is documented as weakest against, so the bias is
conservative.

## 11. What we recommend

The requirement this work started with was "negatives must be collected, not
written". §5 says that is not sufficient on its own. The requirement has two
clauses:

1. **Collected from the population the system will deploy into** — not from an
   archive that happens to be labelled, however carefully it was built. An
   archive can be collected and still be the wrong population, and its identity
   may itself be learnable [4].
2. **Not authored by anyone who knows what the detector looks for.** 0/13
   written beside the patterns against 1/3 written blind says the gap tracks the
   author's knowledge, not the provenance of the text. If you must write
   negatives, have them written by someone who has never seen your rules, and fix
   the batch size before the messages exist.

Two practical notes for anyone repeating this. **Compute Fisher's floor before
collecting**: the smaller arm sets the limit, and we spent a collection round on
the larger one. And **do not fix the false alarms you find this way** until you
have measured on messages nobody has read. Narrowing a rule while looking at the
message that caught it retires that message as evidence, and it is how a held-out
corpus gets spent. Ours are left standing, unfixed, including the one that cost
us a p-value.

## 12. Generative-AI disclosure

This disclosure is unusually load-bearing, because the paper's argument is about
honest measurement and the work is saturated with model authorship.

The system under test was built with Claude Code. Half of its engine is a
language model. Most of the corpus's non-verbatim messages — including the
written negatives and most of the reconstructed scams — were authored by a
language model working to a human brief. The three blind negatives of §5 were
written by a model instance placed under the access restrictions described in
§3.3. The planning document behind this paper, the methodology log it cites, and
substantial portions of this draft were written by a model. The analysis script
that computes every statistic here was model-written, and asserts its arithmetic
against previously published values before it reports.

No measurement here was produced by a model acting without a human brief, no
number in this paper was generated or estimated by a model rather than computed
from run output, and every citation was retrieved and read rather than recalled.

## 13. Ethics, data and artifact availability

**The collected messages are the author's own mail**, from two of the author's
own mailboxes. There is no third-party subject, no consent problem and no
institutional-review trigger under most definitions — but we state it rather than
leave a reader to wonder. Messages are redacted shape-preservingly, unredacted
originals are kept outside the public repository, and a test fails the build if a
consumer email address, a real IP or a personal mobile reaches a corpus message.
Third parties appear only as sending institutions, which are not redacted because
they are the finding.

**The smishing corpus** is Agarwal et al. [10], used under CC BY 4.0.

**Artifact.** The application, the corpus, the benchmark harness, the analysis
script and the cached run outputs are public under AGPL-3.0. The statistics
recompute for free from the cache (`npm run bench:f2`); the deterministic
baseline recomputes for free from source (`npm run bench`); the language-model
run costs $1.31 to reproduce from scratch. The methodology log is the part we
would point a sceptical reader at first: it is contemporaneous and was never
tidied, so every superseded number in this paper is still standing in it, beside
the reading that overtook it.

## References

[1] S. Axelsson, "The base-rate fallacy and its implications for the difficulty
of intrusion detection," in *Proc. 6th ACM Conf. on Computer and Communications
Security (CCS '99)*, 1999, pp. 1–7. doi:10.1145/319709.319710. Expanded as *ACM
TISSEC* 3(3), 2000, pp. 186–205.

[2] D. Arp, E. Quiring, F. Pendlebury, A. Warnecke, F. Pierazzi, C. Wressnegger,
L. Cavallaro, and K. Rieck, "Dos and don'ts of machine learning in computer
security," in *31st USENIX Security Symposium*, 2022. arXiv:2010.09470.

[3] T. Dalton, H. Gowda, G. Rao, S. Pargi, A. Hadj Khodabakhshi, J. Rombs,
S. Jou, and M. Marwah, "PhreshPhish: A real-world, high-quality, large-scale
phishing website dataset and benchmark," arXiv:2507.10854, 2025.

[4] I. Bhuiyan and T. Bhuiyan, "The fragility of phishing detection models:
Evidence from cross-corpus transfer, prevalence shift, artifact learning, and
evasion risk," *Big Data and Cognitive Computing*, 10(7):211, 2026.
doi:10.3390/bdcc10070211.

[5] Y. Kaya, Y. Chen, M. Botacin, S. Saha, F. Pierazzi, L. Cavallaro, D. Wagner,
and T. Dumitraş, "ML-based behavioral malware detection is far from a solved
problem," arXiv:2405.06124, 2024.

[6] K. Palla, J. L. Redondo García, C. Hauff, F. Fabbri, H. Lindström,
D. R. Taber, A. Damianou, and M. Lalmas, "Policy-as-prompt: Rethinking content
moderation in the age of large language models," in *ACM FAccT '25*, 2025.
doi:10.1145/3715275.3732054.

[7] P. Röttger, H. R. Kirk, B. Vidgen, G. Attanasio, F. Bianchi, and D. Hovy,
"XSTest: A test suite for identifying exaggerated safety behaviours in large
language models," in *NAACL-HLT 2024*, 2024.

[8] T. Yadav and M. Masum, "Explainable multi-agent LLM framework for phishing
email detection via role-specialized evidence decomposition," *Electronics*,
15(12):2606, 2026. doi:10.3390/electronics15122606.

[9] G. V. Cormack, "TREC 2007 spam track overview," in *Proc. 16th Text REtrieval
Conference (TREC 2007)*, NIST SP 500-274, 2007.

[10] S. Agarwal, A. Papasavva, G. Suarez-Tangil, and M. Vasek, "Fishing for
smishing: Understanding SMS phishing infrastructure and strategies by mining
public user reports," in *Proc. ACM Internet Measurement Conference (IMC '25)*,
2025. CC BY 4.0.
