# SaTML 2027 — abstract registration

**Registration closes Tuesday 22 September 2026.** The fields below are what the
form asks for. Title and abstract may still change before the 29 September paper
deadline; authors, affiliations and topics are fixed at registration.

---

## Title

> **Position: Your Scam Detector's Benchmark Is Lying to You**

Category: **Position paper** (SaTML requires the title to begin `Position:`).

## Authors and affiliation

- Newton Sythong — independent researcher, Wellington, New Zealand.

Fixed at registration and cannot change later. If a co-author or an affiliation
is wanted, decide before submitting the form.

## Topics

Pick, in order of fit, from SaTML's list: **cybersecurity applications of ML**;
**secure ML in practice / deployment**; **trustworthy data curation and
benchmarking**; **evaluation methodology**.

---

## Abstract (draft, ~250 words)

> Benchmarks for LLM-based fraud detection are overwhelmingly corpora of scams.
> We argue that this single design choice makes their published numbers
> systematically optimistic, and we demonstrate it on a deployed consumer
> scam-checking application whose entire evaluation history is public and dated.
>
> Our central result is a natural experiment. The negative half of our benchmark
> contained 13 hard negatives we had written ourselves, against which the
> deployed detector measured a false-alarm rate of zero for nine months. We then
> added 55 genuine messages captured from two real inboxes under a pre-registered
> sampling rule, redacted but otherwise untouched, and re-ran the identical
> engine. It alarmed at **12 of the 55 real messages and 0 of the 13 we wrote** —
> 21.8% [12.9, 34.4] against 0.0% [0.0, 22.8] — flagging genuine Spotify and
> PlayStation billing notices, a Google Play points expiry, an ORCID address
> verification and four Zoom marketing offers. Self-authored negatives did not
> merely underestimate the false-alarm rate; they reported it as absent. The
> split is not significant at the conventional threshold (Fisher's exact,
> p = 0.060 one-sided) and cannot be: with 13 written negatives this is already
> the most extreme table the margins permit, which is itself a finding about how
> small the written half of a benchmark is allowed to be.
>
> Two further failures follow. A cheaper model scored 83.4% recall on 145
> held-out real smishing messages — twenty-one points above the shipping engine —
> while alarming at 21 of the 28 genuine messages then in the corpus: on a
> scam-only corpus,
> indiscriminate firing is indistinguishable from detection, and an engine that
> alarms at everything scores 100%. And a held-out corpus is consumed by the act
> of improving against it; we describe a dev/test split whose harness refuses to
> print the text of a missed test item, a guard in code rather than in a rule.
>
> We further show that a single paragraph of English describing a detection
> pattern is read incompatibly by two models, so prompt-based rule catalogues do
> not port. We conclude with concrete requirements for evaluating this class of
> system, the first of which is that negatives must be collected, not written.

---

## Notes on what this abstract does and does not claim

- Every number in it is already measured and in the repository. Nothing here is
  waiting on a run.
- It deliberately does **not** claim a false-alarm *rate*. "21 of 28" is a count,
  and the paper keeps it a count.
- **Updated 21 Sep, after Gap 1 was bought for $0.62.** The shipping model
  (`claude-opus-5`) was run over all 41 corpus items: 13/13 scams seen, 5/28
  false alarms, and every one of the five on a captured message rather than one
  we wrote. That closed the gap this file previously flagged, and the finding
  upgraded from "a cheap model does this" to "the deployed system does this",
  with a p-value. It is now the abstract's opening result rather than its
  second. Full entry: `docs/benchmark-method.md`.
- **Updated 22 Sep, after the re-run on the closed corpus for $1.26.** Same
  model, all 83 items: 14/15 scams seen, 12/68 false alarms, and **all twelve
  still on captured messages, none on written ones**, with forty more collected
  negatives for the written half to fail on. The effect is larger and better
  described than the 21 Sep version, and **the p-value is worse — 0.060, not
  0.031.** Both numbers are in the paragraph above on purpose. Do not quote the
  0.031: it belongs to a 28-item corpus that no longer exists, and a reviewer
  who recomputed it would find the newer, weaker figure.
- **One more written negative is the whole gap.** At the observed collected
  rate, 14 quiet written negatives clear p < 0.05 and 13 cannot, whatever the
  data does. This is the cheapest outstanding result in the project and it costs
  nothing but care — the message has to be written to the standard of the other
  twelve and **before** anyone reads which patterns fired, or it is a negative
  chosen to pass. `npm run bench:f2` recomputes all of this for free.
- "Deployed" is accurate: the application is live and public. It has no user base
  to speak of, and the paper should not imply one.

## Rejection risk, honestly

SaTML is a competitive venue with serious ML-security chairs. A single
unaffiliated author submitting a position paper built on n=68 negatives is a
long shot. The abstract registration costs twenty minutes and commits to nothing;
the draft it forces is reusable at CSET, eCrime and arXiv regardless of the
outcome. That asymmetry is the whole argument for registering.
