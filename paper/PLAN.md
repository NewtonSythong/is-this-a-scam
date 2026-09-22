# Turning this repository into a paper

Written 2026-09-21. This file is the brief: what the evidence here can and
cannot carry, which claim to make, where to send it, what is missing, and what
closing each gap costs. Read this before writing any of the paper itself.

---

## 1. The verdict, first

**Newton confirmed F2 as the spine on 2026-09-22, and this section was rewritten
that day.** The position-paper verdict it replaced is in git history; do not
restore it.

The paper makes one measured claim: **a detector's false-alarm rate depends on
whether its negatives were *collected* or *written*, and written ones make the
detector look quieter than it is.** Model and task are held fixed, only the
provenance of the negative varies, and the difference is significance-tested.
The two-round literature sweep in §2 found no paper that runs that contrast.

What this paper is not, and why each alternative was ruled out:

- **Not "how good is an LLM-built scam detector?"** — the question this project
  opened with. It cannot be answered from this repository: n = 1 system, built
  one way by one person; no baseline against an existing smishing classifier or
  even a bag-of-words control; no control arm built without an LLM; and no
  construct validity for "secure", since the benchmark measures which of three
  words the app picks, not whether a frightened person behaves more safely. Any
  one of those is fatal on its own, and a reviewer would say so in the first
  paragraph.
- **Not F1, "recall-only corpora reward crying wolf."** It is true, it motivates
  the work, and it is already owned — Axelsson (ACM CCS 1999) and Arp et al.
  (USENIX Security 2022). **Cite it as motivation; never claim it.** This was the
  headline recommended on 21 Sep, and the sweep showed it was wrong.

F4 — prompt-rule catalogues do not port across models — is the second
contribution, not the spine. F3 is a methods-section note about corpus erosion.

**The single largest exposure is that one Fisher test at p = 0.031 carries the
entire claim.** Closing it is Gap 3: grow the collected negatives from 15 to
roughly 50–60 and re-run. It costs collection time, not money, and it is first
in §8.
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

**Re-run on the closed corpus, 2026-09-22** (§8 item 4): the Narrative Check
alone, `claude-opus-5`, all 83 items, $1.26. Of the 68 legitimate messages, 13
were written by us and 55 were captured from two real inboxes. Asked the
identical questions:

| Negative | False alarms | 95% CI (Wilson) |
| :-- | :-- | :-- |
| Written by us | **0 / 13** = 0.0% | [0.0, 22.8] |
| Captured from a real inbox | **12 / 55** = 21.8% | [12.9, 34.4] |

**Every false alarm the model has is on a message we did not write.** Twelve of
them, across five patterns: `manufactured-urgency` on five pieces of ordinary
marketing (four Zoom seasonal-offer mails and a GradConnection application
deadline), `verify-account-pretext` and `benefit-expiry-pretext` together on
genuine Spotify, PlayStation and Google Play billing mail, `verify-account-pretext`
on an ORCID address-verification mail and a SEEK profile nudge,
`job-or-earnings-offer` on a real ANZ referral, and `unexpected-money` on a ski-field
survey. The reproduction script is `bench/f2.ts` (`npm run bench:f2`), which is free
and reads the benchmark's cache.

**And the significance moved the wrong way: p = 0.060 one-sided, 0.104
two-sided**, against 0.031 and 0.044 on the 28-item corpus. This must be
reported as the headline, not buried — the effect got *larger* and the test got
*weaker*, which looks like a contradiction and is not.

The explanation is the whole lesson of §8 item 5. **Fisher's floor is set by the
smaller arm.** With the written negatives held at 13 and all twelve alarms
landing on the collected side, this is already the most extreme table the
margins permit: 0.060 is the *smallest p obtainable at n_written = 13*, however
the data had fallen. Collecting more real messages cannot rescue it, and the
enlarged collection is in fact what pushed it up, by moving mass into the arm
that was never the constraint. **One more written negative resolves it** — at 14
written, all quiet, the same collected rate clears p < 0.05. Both figures come
from `bench/f2.ts`, which also asserts its arithmetic against the four
previously published values.

*Strength:* high on direction and on effect size — 0% against 21.8%, with
non-overlapping point estimates and a mechanism visible in the pattern names.
*Weakness:* **not significant at 0.05, and the fix is to write negatives, not to
collect them.** Say so plainly; a reviewer will find it in a minute otherwise.
The honest sentence is that the direction reproduces in two independent systems
and the LLM side is one message short of resolving.

*Superseded:* an earlier draft of this section quoted alarm probabilities of
0.51 – 0.67 for written negatives against 0.83 – 0.91 for captured ones. Those
are **Jev's**, from the closed spike (`docs/jev-spike.md`), on the 28-item
corpus, and they are a different model on a different corpus. Keep them as
corroborating colour if the draft wants them; the table above is the result.

Corollary, and it is the sharper version: the earlier reading was that one bad
pattern explained everything, and that excluding it left the model quiet on all
thirteen negatives. Five patterns now fire, and the largest single contributor
is `manufactured-urgency` on ordinary marketing mail. There was never one bad
pattern; there was one pattern bad enough to hide the others.

#### The same asymmetry appears with no model in the system at all

The deterministic baseline (§8 item 3, `docs/benchmark-offline.md`, regenerated
2026-09-22 over all 81 items, free) holds 62 of 68 legitimate messages quiet.
**All six false alarms are collected messages. Not one is a written one** —
6/55 collected against 0/13 written.

This matters out of proportion to its size: the offline engine is regular
expressions and a known-organisation list, so whatever produces the provenance
gap here cannot be an artefact of language-model behaviour. Real inboxes simply
contain shapes nobody thought to write down. The mechanism is legible in a way
the LLM's is not — all six are one brand-impersonation check misfiring on
`careers.anz.com` (a genuine ANZ subdomain), `sau.hvue.io` (HireVue, ANZ's
genuine interview vendor), and one case where the checker read an email
address's local part as a domain.

**State the significance honestly: there is none.** One-sided Fisher on
6/55 vs 0/13 gives **p = 0.265**. With 13 written negatives the test cannot
resolve a gap this size, and the enlarged collection did nothing for that half.
Report it as a consistent direction in an independent system, never as a
second significant result — and note that growing the *written* negatives, not
the collected ones, is what would make this testable.

**The six are not to be fixed yet.** Narrowing a check while looking at the
messages that caught it is how the corpus was spent the first time (F3), and it
would retire these six as evidence. Fix it from published documentation of ANZ's
and HireVue's real domains, then measure on messages nobody has read.

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

### Novelty, checked against the literature — 2026-09-21

Checked before committing to a research question, because strength and novelty
are different axes and this repository had only ever been rated on strength.
**The verdicts below reverse the ordering in §2.** These hold whichever question
the paper ends up asking.

| Finding | Verdict | What already exists |
| :-- | :-- | :-- |
| **F1** recall-only corpora reward crying wolf | **Well covered** | Axelsson, *The Base-Rate Fallacy and its Implications for the Difficulty of Intrusion Detection*, ACM CCS 1999. Arp et al., *Dos and Don'ts of Machine Learning in Computer Security*, USENIX Security 2022 — names sampling bias, inappropriate performance measures and base-rate fallacy as measured pitfalls across 30 top-tier papers. PhreshPhish (arXiv 2507.10854) builds base-rate-adjusted suites. **Cite this, do not claim it.** |
| **F2** self-authored negatives understate false alarms | **Novel** | No paper found that holds model and task fixed, varies only negative *provenance*, and reports a significance test. Verified against the two papers most likely to pre-empt it (below), plus a sweep of malware, IDS, spam and fraud. |
| **F4** prompt-rule catalogues do not port | **Partial** | Palla et al., *Policy-as-Prompt*, ACM FAccT 2025 formalises policy-as-English-prompt and **measures** interpretation instability: GPT-4o-mini over 2,115 items, accuracy 0.76–0.80 on prompt structure alone, and *predictive multiplicity* — near-identical prompts giving different verdicts on the same samples. Its appendix A.3 does run several models, but reports **aggregate accuracy per model only**. The unmeasured cell is a rule's *extension* — which messages it fires on — for a **fixed** rule across **different** models. |

**The two near-misses, checked in full text rather than by abstract:**

- **PhreshPhish** cannot run the provenance contrast: *all* its negatives are
  collected — 366,201 benign samples from Webroot browsing telemetry and brand
  search results. What it does is prevalence adjustment across five base rates.
  That is F1, not F2.
- **Fragility of Phishing Detection Models** (BDCC 10(7):211, 2026) uses six
  collected public corpora. Its "artifact learning" result is corpus-identity
  learnability (0.9722 accuracy for Logistic Regression and 0.9806 for Linear
  SVC, predicting which corpus a message came from) —
  corpus mismatch, not provenance. Full text pulled and searched directly:
  **zero** occurrences of "synthetic", "authored", "hand-crafted" or
  "simulated", and no appendix or supplementary section exists.

**The near-miss that helps.** *ML-Based Behavioral Malware Detection Is Far From
a Solved Problem* (arXiv 2405.06124) reports AUC dropping 87.5% → 62.6%
depending purely on which benign set the model is evaluated against. That is
difficulty composition *within* collected negatives, so it is distinct from
provenance — and it establishes that the field already accepts that negative-set
construction moves headline numbers.

**On the n = 13/15 objection.** The field's precedent is friendlier than §2
assumed: XSTest (Röttger et al., NAACL 2024) is 250 *hand-written* safe prompts
and is a standard over-refusal benchmark. Small hand-built negative sets are
accepted when their construction is principled. The exposure is not the sample
size but that a single Fisher test at p = 0.031 carries the whole claim. Growing
the collected negatives to roughly 50–60 and re-running moves p off the boundary.

**Every citation above was verified against the actual paper on 2026-09-22.**
The record — full bibliographic entries, the verbatim sentence carrying each
claim, and what each check could not establish — is `paper/CITATIONS.md`. Six of
the seven held; the Palla row was wrong and the table above now carries the
corrected reading. Anything added to §2 after this date is an unverified lead
again until it appears in `CITATIONS.md`: a fabricated citation in a paper about
honest measurement would be fatal in a way it would not be elsewhere.

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
| `bench/corpus.ts` legitimate | 68 (44 hard negatives) | 13 authored, 55 captured from two real inboxes under `paper/SAMPLING-PROTOCOL.md`, redacted shape-preservingly | Yes — see §6 |
| Deterministic baseline | 81 messages, no model | `docs/benchmark-offline.md`, regenerated 2026-09-22, free and reproducible | Yes |
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

> **Written Negatives Make Detectors Look Quiet**
> *False-alarm rates depend on where the negatives came from: a
> provenance-controlled measurement on a deployed LLM fraud detector*

Rewritten 2026-09-22 when F2 was confirmed as the spine. The superseded title was
*"Position: Your Scam Detector's Benchmark Is Lying to You — three ways
evaluation fails for LLM-based fraud detection"*, which went with the F1 framing
the literature sweep ruled out as a claim.

**`paper/ABSTRACT.md` is stale.** It was sized for the SaTML registration field
and still argues the three-failures position. Rewrite it against the title above
before it is used anywhere, and drop the length constraint — SaTML is abandoned
on purpose (§5).

---

## 8. The order of work

The SaTML clock was released on 2026-09-22, so nothing below is dated against a
submission. The order is by what unblocks what.

1. ~~**Gap 3 — grow the collected negatives from 15 to roughly 50–60.**~~
   **DONE 2026-09-22, at 55.** Two capture rounds under
   `paper/SAMPLING-PROTOCOL.md`; the legitimate half is 68, of which 13 written
   and 55 collected. Cost nothing but time. The positive-side capture closed the
   same day at 2, taking the corpus to **83 items, 15 scams and 68 legitimate**.
2. ~~**Verify every citation in §2 against the actual paper.**~~
   **DONE 2026-09-22.** All seven pulled and read; the record is
   `paper/CITATIONS.md`. Six held exactly, including every number quoted from
   PhreshPhish and the 87.5% → 62.6% benign-set drop. One did not: Palla et al.
   *does* measure interpretation instability, and has a multi-model appendix, so
   the old "measures no cross-model firing rates" line would have read as a
   false claim to any reviewer who knew the paper. F4's verdict is unchanged at
   Partial; its justification is narrower. Cost nothing but time.
3. ~~**Gap 4**, the deterministic baseline.~~ **DONE 2026-09-22.**
   `npm run bench -- --write` regenerated `docs/benchmark-offline.md` over all
   81 items for $0.00. It answers the reviewer's first question — the offline
   engine gets 6/9 on held-out scams, so the LLM is not merely dressing up a
   regex — and it returned an unplanned result: all six of its false alarms are
   collected messages and none is written, the F2 direction reproducing in a
   system with no model in it (p = 0.265, so direction only). Written up under
   F2 in §2. The six are deliberately left unfixed; see §2.
4. ~~**Re-run F2** on the enlarged negative set and re-test.~~
   **DONE 2026-09-22, and it changed the finding.** `npm run bench:narrative` on
   `claude-opus-5`, all 83 items, **$1.26** — the same model as the original run,
   because a measurement moved to a cheaper model measures a different system.
   Result: **0/13 written against 12/55 collected**, every false alarm on a
   message we did not write, but **p = 0.060 one-sided, up from 0.031**. Written
   up under F2 in §2. The effect grew and the test weakened, because Fisher's
   floor is set by the smaller arm and the collection effort went into the arm
   that was never the constraint. **This makes item 5 the critical path, not a
   tidying step.**
5. **Gap 5**, a confidence interval on every number, and a stated
   minimum-detectable-effect for the ablation. **Half-done and now load-bearing.**
   `bench/f2.ts` (`npm run bench:f2`, free) computes Wilson intervals, Fisher
   both ways, and the MDE, and asserts its arithmetic against the four values
   already published. What it reports is that **F2 needs one more written
   negative** — 14 quiet written negatives clear p < 0.05 at the observed
   collected rate, and 13 cannot, whatever the data does. Writing that message
   is the cheapest significant result available and costs nothing but care: it
   must be written to the same standard as the other twelve, *before* looking at
   which patterns fired, or it is a message chosen to pass.
6. **Draft**, 5–8 pages. F2 is the paper; F4 is the section after it.
7. **Anonymised artifact mirror**, within 3 days of submitting.

---

## 9. Toolchain — surveyed 2026-09-21, and the answer is mostly "you already have it"

Checked what is on the machine before looking at what could be installed.

**Already present, nothing to add:**

| Tool | Version | What it covers |
| :-- | :-- | :-- |
| MiKTeX | 25.12 (pdfTeX 4.23) | Compiles the paper locally |
| `IEEEtran.cls` | installed | **SaTML's required template, already there.** `\documentclass[conference]{IEEEtran}` compiles today. |
| Pandoc | present | Markdown to LaTeX, so `PLAN.md` and `ABSTRACT.md` convert rather than being retyped |
| Python | present | Fisher's exact and the Wilson intervals are eight lines of `math`; no SciPy needed |

Run `miktex packages update` before the first real build — kpsewhich warns the
package database has never been refreshed.

**Local, zero-egress MCP servers worth adding (ranked by stars, all verified
actively maintained)** — *this ranking was superseded the same day; the download
figures below reverse it, and the table is left standing as the reading that was
overtaken:*

| Server | Stars | Last push | Why |
| :-- | --: | :-- | :-- |
| [`54yyyu/zotero-mcp`](https://github.com/54yyyu/zotero-mcp) | 5,099 | 15 Sep 2026 | Highest-rated research MCP by some distance. Talks to a local Zotero library. Pays off across many papers rather than this one. |
| [`blazickjp/arxiv-mcp-server`](https://github.com/blazickjp/arxiv-mcp-server) | 3,169 | 26 Aug 2026 | "Papers stay on disk." Original-LaTeX section reads and BibTeX straight from arXiv metadata — the citation pipeline, and the one that helps *this* paper. |
| [`openags/paper-search-mcp`](https://github.com/openags/paper-search-mcp) | 2,672 | 21 Sep 2026 | Multi-source: arXiv, PubMed, bioRxiv, Semantic Scholar. Pushed the same day as this survey. |

Also-rans: `takashiishida/arxiv-latex-mcp` (146), `andybrandt/mcp-simple-arxiv`
(201), `JackKuo666/PubMed-MCP-Server` (129, untouched since May 2025). PubMed and
the biomedical servers are off-topic for this paper.

**Nothing hosted is recommended.** Every server above runs as a local process
against public APIs. Anything that wants an API key to a third-party aggregator
stays on hold until its safety is established.

**Citation management: install nothing.** Its bibliography is perhaps fifteen
works — the IMC'25 dataset paper, two FTC alerts, Netsafe, and a literature sweep
not yet done. A hand-written `.bib` is half an hour. Zotero earns its place
across a body of work, not across one submission.

### The real gap is not a tool, it is related work — re-surveyed 2026-09-21

A position paper whose thesis is *negatives must be collected, not written* has
to know who has already said it. Synthetic-versus-real evaluation data, base-rate
neglect in security classifiers, and benchmark contamination are all established
literatures, and a reviewer at SaTML will know them. **This is the largest
remaining risk to the submission and it is larger than any measurement gap in
§4.**

Checked the Claude Code plugin marketplace first (`SearchPlugins`, keywords
`research`/`citations`/`arxiv`/`zotero`/`latex`/`bibliography`) — nothing
relevant is published there; the official catalog has no research-search
plugin. So the tool has to come from the open MCP ecosystem, same as the table
above. Re-pulled live GitHub stats for the earlier candidates and two more
found via glama.ai's academic-research listing:

**Stars are the wrong metric, and they rank these three backwards.** PyPI
download counts (mirror-excluded, last 60 days) against the star counts above:

| Server | Stars | 60d downloads | Downloads per star |
| :-- | --: | --: | --: |
| [`blazickjp/arxiv-mcp-server`](https://github.com/blazickjp/arxiv-mcp-server) | 3,170 | **133,937** | 42.3 |
| [`openags/paper-search-mcp`](https://github.com/openags/paper-search-mcp) | 2,673 | 28,258 | 10.6 |
| [`54yyyu/zotero-mcp`](https://github.com/54yyyu/zotero-mcp) | 5,100 | 20,808 | 4.1 |

`zotero-mcp` has the most stars and the least use — roughly one download per
star, which is the signature of a project people bookmark rather than run.
`arxiv-mcp-server` is run ten times more per star. Stars measure intent to try;
downloads measure use. (Downloads are inflated by CI and by `uvx`-style
re-fetches, so read them as an order of magnitude, not a user count.)

**The reachability test matters more than either metric, and it is the one
nobody publishes.** Every server here is a thin wrapper over a public API, so
what decides whether it works is whether that API answers an unauthenticated
client. Tested directly, 21 Sep 2026:

| Source | Result |
| :-- | :-- |
| arXiv (`export.arxiv.org/api/query`) | **HTTP 200**, results returned, no key |
| Semantic Scholar (`api.semanticscholar.org`) | **HTTP 429** — shared anonymous pool exhausted; free key is a form application |
| dblp (`dblp.org/search/publ/api`) | **Bot-gated** — Anubis proof-of-work challenge, fails a plain client and a browser User-Agent alike |
| IEEE Xplore, ACM DL | API key required |

This kills the case for `paper-search-mcp` *on this paper*. It was worth
recommending for dblp and IACR ePrint — the CS and security venue coverage that
arXiv alone lacks — and dblp is currently unreachable by any HTTP client,
wrapper or not. Its Semantic Scholar connector inherits the same 429. What is
left working is arXiv, which `arxiv-mcp-server` already does with five times the
usage.

**Action: install nothing for this paper.** This is the same verdict §9 already
reached for Zotero, applied consistently: an MCP server is machinery for a
recurring need, and the related-work sweep is a one-time job eight days before a
deadline. The sources that answer — arXiv's API and ordinary web search — are
reachable from this session today with no install, no venv, and no dependency
footprint in a Windows Store Python that has neither `uv` nor a clean global
site-packages.

**If a second paper happens, the pick is `arxiv-mcp-server`**, on the download
evidence rather than the star count, and the Semantic Scholar key is worth
applying for before that point rather than during it.

**Nothing in the Claude Code plugin ecosystem does literature search.** Checked
the official catalog, `anthropics/claude-plugins-community` (4 plugins),
`wshobson/agents` (94), `ananddtyagi/cc-marketplace` (119),
`trailofbits/skills-curated` (29), `obra/superpowers-marketplace` (10) and
`numman-ali/n-skills` (5). No academic search, no citation management, no
BibTeX. The gap is real, and it stays unfilled — building one to save a single
half-hour `.bib` would cost more than the `.bib`.

### The plugin that does matter here is a prose one

The survey turned up one thing with direct bearing on acceptance, and it is not
a search tool. **`humanizer`** (in `trailofbits/skills-curated`, 505★ — a
security firm's vetted list) detects and strips the markers of machine-generated
prose. `wshobson/agents` carries the same idea as `avoid-ai-writing`, and
`obra/superpowers-marketplace` carries `elements-of-style`, Strunk-based prose
guidance. One of the three is worth enabling; all three would collide.

This is load-bearing rather than cosmetic. §6 already commits this paper to a
full generative-AI disclosure, and the disclosure is unusually broad: the system
under test was built with Claude Code, half the engine is a language model, most
non-verbatim corpus messages were model-authored, and this plan was written by a
model. A paper that *discloses* heavy model authorship and then *reads* like it
hands a sceptical reviewer a reason to discount the argument before reaching the
numbers. The honesty is the contribution; the prose has to not undercut it.

**Note on the metrics in this section.** Claude Code plugins have no downloads,
no views, no ratings and no reviews anywhere — not in `marketplace.json`, and
not on buildwithclaude.com, which indexes 28,000+ plugins and publishes no
per-item numbers at all. Marketplace-repo stars and last-push dates are the only
signals that exist, and as the table above shows, stars are a poor proxy for
use. Any plugin recommendation here rests on weaker evidence than the MCP
download figures, and should be read that way.
