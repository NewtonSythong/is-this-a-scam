# Turning this repository into a paper

Written 2026-09-21. This file is the brief: what the evidence here can and
cannot carry, which claim to make, where to send it, what is missing, and what
closing each gap costs. Read this before writing any of the paper itself.

---

## 1. The verdict, first

**There is enough data for a paper. There is not enough data for the paper that
was first asked for.**

The opening framing was *"how good are AI systems at generating security
systems — is a Claude Code-built scam detector any good?"* That question cannot
be answered from this repository, and it is worth being blunt about why:

- **n = 1 system.** One detector, built one way, by one person. No control arm
  built without an LLM, no second system, no ablation over how it was authored.
- **No baseline.** The engine has never been compared against an existing
  smishing classifier, a commercial filter, or a bag-of-words baseline. Without
  one, 61.0% recall is a number with nothing to sit beside.
- **No construct validity for "secure."** The benchmark measures which of three
  words the app picks. It does not measure whether a frightened person behaves
  more safely, which is the thing the app exists for.

A reviewer would reject that framing in the first paragraph, and would be right
to. Any of the three objections alone is fatal.

**What the repository does carry is stronger, and it is a different paper.** It
is one of the few fully-logged records of an LLM-authored, LLM-powered fraud
detector being *measured*, in which the measurement apparatus itself failed
three separate times, each failure was caught, and each is quantified. The
contribution is methodological: **evaluating LLM-based fraud detectors is
systematically harder than it looks, in ways that make published numbers
optimistic by default.**

That is publishable. The rest of this file assumes it.

---

## 2. The four findings, and how strong each one is

### F1 — Recall-only corpora reward crying wolf, and hide it completely

The strongest result in the repository, because it has a clean before/after.

A cheap model (Vercel's `jev`) scored **83.4%** recall on 145 held-out real
smishing messages, against the shipping engine's 59.9–61.0% on the same corpus
family. Read alone, that is a twenty-one-point win for a model costing a
twentieth of a cent per hundred messages.

Then the same catalogue, same model, same cut-off was put to 28 genuine
messages: it alarmed at **21 of 28**. A tradesman running late. A courier at the
door. A bank's own two-factor code. A retail refund receipt.

The 83.4% was not detection. It was a model firing often enough to blanket a
corpus in which every item was a scam. **An engine that alarms at everything
scores 100% on every recall-only benchmark**, and scam-only corpora are the norm
in this literature.

*Strength:* high. Two runs, same corpus family, same prompts, opposite
conclusions.
*Weakness:* 28 negatives is not a false-alarm rate, and the paper must say so.

### F2 — Self-authored negatives systematically understate false alarms

The crispest number in the repository, and the one most likely to be quoted.

Of the 28 legitimate messages, 13 were written by us and 15 were captured from
two real inboxes. Asked the identical questions:

| Negative | Alarm probabilities drawn |
| :-- | :-- |
| Our own invented hard negatives | 0.51 – 0.67 |
| Genuine captured messages | 0.83, 0.86, 0.88, 0.89, 0.91 |

**The real messages fired harder than the ones we invented to be hard.** The
model was more confident a genuine Google sign-in alert was a scam than that any
message we wrote was. Neither the Google alert nor the Inland Revenue login
alert mentions a benefit, a reward or an expiry — so `benefit-expiry-pretext`
was not detecting its pretext at all. It was detecting *institutional email*,
and on a scam-only corpus there was no way to see that.

Corollary, and it is the sharper version: the earlier reading was that one bad
pattern explained everything, and that excluding it left the model quiet on all
thirteen negatives. On the enlarged 28, **eight messages still fire on three
further patterns**. There was never one bad pattern; there was one pattern bad
enough to hide the others.

*Strength:* high, and genuinely novel-feeling. Synthetic-negative bias is
assumed in the literature; here it is measured, with a confidence gap.
*Weakness:* n = 15 real. The direction is clear; the magnitude is not.

### F3 — A held-out corpus is a wasting asset, and the usual fix is not a rule

Documented three times in this repository, each time with numbers:

1. `bench/corpus.ts` was held out, its misses were read to write three patterns,
   and it reported 16/16 — passing by construction. Worse: the headline
   "items never developed against" also became meaningless, because that set was
   now exactly the set already passing. **Partitioning a corpus by which items
   you then fixed guarantees the remainder looks perfect.**
2. `bench/imc25.csv` (292 real reported smishing texts) replaced it and was
   scheduled for the same death, because there was no way to improve the engine
   except by reading misses.
3. The mitigation that worked: a `dev`/`test` split where **the harness refuses
   to print the text of a missed `test` message**, only its id. The refusal is
   in code, not in a rule, "because a rule addressed to a person who is
   mid-debugging and wants to know *why* is not a guard."

The split also produced a reusable caution: the two halves differ by **5 points
on Opus and 7 on Haiku** purely by accident of the cut, permanently. Dev scores
and test scores are not comparable, and the temptation to read one against the
other would have manufactured a six-point improvement before anything changed.

*Strength:* high as an experience report; this is the CSET/SaTML genre exactly.
*Weakness:* not novel as a concept. Novel as a *mechanism* and as a measured cost.

### F4 — Prompt-rule catalogues do not port across models

`benefit-expiry-pretext` is one paragraph of English. Opus reads it narrowly — a
specific pretext about a reward or entitlement about to lapse. Jev reads the same
words as "something is being offered or is expiring", fires it on **73 of 145**
scams and on genuine institutional mail.

Same text, two behaviours, on a system whose entire detection logic is natural
language. This has a direct practical consequence: **a prompt-based rule
catalogue cannot be moved to a cheaper model and assumed to mean the same
thing**, and the ported version's failure mode is invisible if the destination
corpus is scam-only (which returns to F1).

*Strength:* medium-high. One catalogue, two models, but the effect is enormous
and the mechanism is legible.
*Weakness:* two models. A third would make it a trend rather than an anecdote.

### The supporting result worth keeping: a controlled single-clause ablation

61.6% → 61.0% on the 146 held-out messages, with model, corpus and catalogue
fixed and exactly one sentence changed. It is the only fully controlled
comparison in the project, it cost $0.82, and it demonstrates the standard the
other comparisons fall short of. Use it in the methods section as the
counter-example, not as a finding.

### The vignette that anchors the ethics section: "hey stranger"

`wrong-number-opener` shipped for nine days measuring **0/10 false alarms on
both models**. It was, throughout, alarming on *"Hey stranger! It's been far too
long"* — an ordinary English greeting between friends. Four probe variants
isolated it to the literal token *stranger*, surviving the sender signing their
name, which the pattern's own text says excludes it.

The zero was a property of the corpus, not the engine. **A false-alarm corpus
measures only the shapes somebody thought to write down.** Recall corpora do not
have this problem — the 292 IMC messages were collected from people who were
actually targeted, so they contain shapes nobody here would have invented. The
negative half has no equivalent source, and that asymmetry is the paper's
through-line.

---

## 3. Evidence inventory

| Asset | Size | Provenance | Publishable? |
| :-- | :-- | :-- | :-- |
| `bench/imc25.csv` | 292 real reported smishing texts | Agarwal et al., ACM IMC 2025, CC BY 4.0 | Yes, with attribution |
| `bench/corpus.ts` scams | 13 | 7 verbatim from published screenshots, rest reconstructed/synthetic | Yes |
| `bench/corpus.ts` legitimate | 28 (25 hard negatives) | 13 authored, 15 captured from two real inboxes, redacted shape-preservingly | Yes — see §6 |
| Opus runs on `test` | 3 × 146 messages | Cached, `bench/.imc25-cache.jsonl` | Yes |
| Haiku runs | 292 + narrative half | Cached | Yes |
| Jev runs | 145 dev + 28 legit | Cached, $0.00 inside free window | Yes |
| Methodology log | `docs/benchmark-method.md`, 785 lines, dated | Written contemporaneously, never rewritten | **This is the artifact.** Its value is that superseded numbers were left standing with the reading that overtook them below. |
| ADRs | 13 | `docs/adr/` | Yes |
| Code | AGPL-3.0, public | `github.com/NewtonSythong/is-this-a-scam` | Yes |

The contemporaneous log is the thing that makes this credible rather than a
retrospective tidy-up. Most papers reporting an evaluation failure reconstruct it
afterwards; this one has the dated record of believing the wrong number first.

---

## 4. What is missing, and what it costs

Ordered by how much each buys.

### Gap 1 — CLOSED 2026-09-21, for $0.62

`claude-opus-5` over all 41 items: **13/13 scams, 5/28 false alarms — 0 of the 13
we wrote, 5 of the 15 captured** (Fisher's exact, p = 0.031 one-sided, 0.044
two-sided). The three patterns implicated are the same three the Jev run
implicated, so finding F4 survives the model change and F2 becomes a claim about
the deployed system with a statistic behind it. This is now the paper's opening
result. Entry: `docs/benchmark-method.md`, last section. The brief that motivated
it is kept below.

<details><summary>The original Gap 1 brief</summary>

Everything in F1 and F2 currently rests on Jev, a six-day-old cheap model nobody
would ship. The obvious reviewer question — *does Opus, the model your app
actually runs, do the same thing?* — is unanswered, and `docs/jev-spike.md` names
it as the open question.

Two outcomes, and **both make the paper stronger**:

- Opus also alarms → the finding is about prompt-rule catalogues in general, not
  about one cheap model, and F2 becomes a claim about the deployed system.
- Opus stays quiet → the paper gets a clean capability separation: recall-only
  benchmarking hid a fault that only appears on weaker models, which is precisely
  the substitution a cost-conscious deployer would make.

Cost: 28 messages on `claude-opus-5` via `bench/narrative.ts --model`. At the
$0.015/message rate the 146-message runs established, **about $0.42.** Resumable
and cached. This is the single highest-value forty cents in the project.

</details>

### Gap 2 — a third model for F4

Sonnet 5 on the same catalogue over the same 28 negatives plus the dev half.
Turns "two models read one paragraph differently" into a spread. ~$0.60 for the
negatives; ~$1.50 more if the dev-half recall column is wanted.

### Gap 3 — the other ~35 genuine messages

The handover already names this as the next move and says nothing about it is
blocked. Fifty negatives would let the paper report a false-alarm *proportion*
with a Wilson interval instead of a count. It does not change any finding's
direction; it changes whether a reviewer accepts the numbers as rates.

Cost: browser-claw time, no money. **Do this before submission if the calendar
allows; it is the difference between "21 of 28" and a rate with an interval.**

### Gap 4 — a baseline

Even a keyword/URL-heuristic baseline on the same 292 + 28 would answer "is the
LLM doing anything a regex could not?" It is the first thing a security reviewer
asks, and the deterministic half of the engine already exists to provide it —
`docs/benchmark-offline.md` is free to regenerate. **Free. Do it.**

### Gap 5 — statistics

Nothing in the repository has a confidence interval. Every percentage needs one,
every stratum comparison at n=20 needs to be labelled as noise (the log already
says this in prose three times), and the ablation needs a stated
minimum-detectable-effect. Free, but it is real work.

### Deliberately out of scope

Whether the advice helps a frightened person. That needs a user study, an ethics
board and a population this project has no access to. State it as a limitation
and do not gesture at it as future work without a plan.

---

## 5. Where to send it

**The live one, with a clock on it:**

**IEEE SaTML 2027** (Secure and Trustworthy Machine Learning), Reykjavik, May
2027. Chairs Fabio Pierazzi and Florian Tramèr.

- **Mandatory abstract registration: Tuesday 22 September 2026.** Tentative
  title and abstract, fixed authors, affiliations and topics.
- **Paper deadline: Tuesday 29 September 2026.**
- **Position papers: 5–12 pages body**, IEEE conference template, title must
  begin `Position:`. References and appendices unlimited.
- Double-blind. Anonymised artifact within 3 days of submission; Zenodo for
  accepted papers.

Position track is the right door. It explicitly solicits "open challenges,
technical perspectives, educational aspects, societal impact, or notable research
results," which is a lower evidence bar than the research track and an exact
description of what this is.

*Risks, stated plainly:* SaTML is competitive and these are serious ML-security
chairs. Double-blind is awkward when the artifact is a public repo under a real
name — solvable with an anonymised mirror, but the repo itself is findable by
searching a distinctive phrase from the paper. A single unaffiliated author is
unusual though not disqualifying. **Realistic odds are modest. The cost of
trying is one week and one abstract registration, and the draft is reusable at
every venue below.**

**Backstops, in order of fit:**

| Venue | Deadline | Fit |
| :-- | :-- | :-- |
| **CSET 2027** (Cyber Security Experimentation and Test) | ~Aug–Sep 2027 | **Perfect.** Its stated scope is "meta" topics: reliability, validity, reproducibility, transferability, ethics. CSET'26 closed 17 Sep 2026, four days ago. Short paper 4pp, long 8pp. |
| **APWG eCrime 2027** | CFP not yet posted; historically ~June | Strong. Fraud measurement, on-topic corpus, receptive to experience reports. |
| **SOUPS 2027 poster** | Papers ~Feb 2027; posters later | Main track wants user studies, which this is not. Poster is realistic, and the "teaches people to ignore the warning" argument lands there. |
| **arXiv cs.CR preprint** | Any time | **Do this regardless.** It timestamps the findings, it is what "help other people" actually means, and most of these venues permit preprints. First-time cs.CR submitters need an endorsement — check before relying on it. |

**Recommended sequence:** register the SaTML abstract tomorrow, draft during the
week, submit on the 29th, post to arXiv either way. If SaTML declines, the same
draft goes to eCrime and then CSET with a broadened evidence base from Gaps 1–4.

---

## 6. Ethics, anonymity and reproducibility — the parts that sink papers

**The genuine messages.** Fifteen come from two inboxes belonging to the author.
This is self-collected personal data, which is the cleanest case there is, and
the paper must say so explicitly: no third-party subject, no consent problem, no
IRB trigger under most institutional definitions — but say it, do not leave a
reviewer to wonder. They are redacted shape-preservingly; the unredacted
originals live outside the public repository and are never published.
`bench/redaction.test.ts` fails the build if a consumer email address, a real IP
or a personal mobile reaches a corpus message. Describe that guard in the paper;
it is evidence of care and costs three sentences.

Third parties appear as *senders* (Google, IRD, ANZ, Spotify, Dyson). That is
ordinary transactional mail about the author, not about anyone else, and naming
the sending institution is necessary to the finding. Do not redact the
institution; it is the whole point of F2.

**The IMC 2025 dataset.** CC BY 4.0. Cite Agarwal, Papasavva, Suarez-Tangil and
Vasek, *"Fishing for Smishing: Understanding SMS Phishing Infrastructure and
Strategies by Mining Public User Reports"*, ACM IMC 2025, and state that the
build script drops every row that would require a fabricated word rather than
filling placeholders — 253 `clean` plus 39 `brand-restored`. That decision is
itself worth a paragraph: it biases the corpus toward link-free messages, which
is the shape the engine is documented as weakest against, so it is a
*conservative* bias and should be named as one.

**Generative AI disclosure.** Non-negotiable and unusually load-bearing here.
The system under test was built with Claude Code, half the engine is a language
model, most of the corpus's non-verbatim messages were model-authored, and this
plan was written by a model. CSET requires a disclosure section excluded from
page count; SaTML expects the same. Write it early and write it fully — the
paper's honesty about model authorship *is* its methodological contribution, so
burying the disclosure would be self-defeating.

**Artifact.** Public repo, AGPL-3.0, with cached run outputs. For double-blind
submission, mirror to `anonymous.4open.science` or an anonymised Zenodo deposit;
strip author name from commit metadata in the mirror. Do not make the working
repo private — the contemporaneous log's value depends on it being visibly
contemporaneous.

**One thing not to claim.** "Jev alarms at 75% of genuine messages" is not a
sentence to print. Twenty-eight messages say *no*, twice, more loudly than
thirteen did. They do not give a rate.

---

## 7. Working title and abstract

> **Position: Your Scam Detector's Benchmark Is Lying to You**
> *Three ways evaluation fails for LLM-based fraud detection, measured on a
> deployed system*

Draft abstract in `paper/ABSTRACT.md`, sized for the SaTML registration field.

---

## 8. The order of work

1. **Register the SaTML abstract** — 22 Sep, ~20 minutes. Buys the option.
2. **Buy Gap 1**, Opus on the 28 genuine messages, ~$0.42. Needed before the
   abstract's claims are load-bearing; do it the same day if possible.
3. **Gap 4**, the deterministic baseline. Free, and it closes the obvious hole.
4. **Draft**, 5–8 pages. F1 and F2 are the paper; F3 and F4 are the two sections
   after them.
5. **Gap 5**, intervals on every number.
6. **Gap 3** if the calendar allows — genuine negatives 16 to 50.
7. **Anonymised artifact mirror**, within 3 days of submitting.
