# Verified citations

Every citation in `PLAN.md` §2, checked against the actual paper on
**2026-09-22**. This closes item 2 of §8's order of work.

The rule this file exists to enforce: a citation in `PLAN.md` is a research lead
until it appears here. The leads were produced by an agent sweep; the entries
below were produced by pulling the paper and reading the sentence that carries
the claim. A fabricated citation in a paper arguing for honest measurement is
fatal in a way it would not be elsewhere.

Each entry records the claim `PLAN.md` attaches to the paper, and the verdict on
**that claim** — not merely on the paper's existence. Six of seven verified
clean. One (Palla et al.) was wrong and has been corrected in §2.

---

## 1. Axelsson 1999 — base-rate fallacy · VERIFIED

> Stefan Axelsson. "The base-rate fallacy and its implications for the
> difficulty of intrusion detection." *Proceedings of the 6th ACM Conference on
> Computer and Communications Security (CCS '99)*, ACM Press, 1999, pp. 1–7.
> doi:10.1145/319709.319710

Title, venue, year and pagination confirmed. Note for the bibliography: the
expanded and more commonly cited version is *ACM TISSEC* 3(3), Aug 2000,
pp. 186–205, doi:10.1145/357830.357849. Cite the CCS paper for priority or the
TISSEC one for the full argument, but do not conflate their titles — the 2000
version drops "and its implications for".

Claim in §2 (F1 is well covered; the false-alarm rate is the limiting factor
under class imbalance): **supported.**

## 2. Arp et al. 2022 — Dos and Don'ts · VERIFIED

> Daniel Arp, Erwin Quiring, Feargus Pendlebury, Alexander Warnecke, Fabio
> Pierazzi, Christian Wressnegger, Lorenzo Cavallaro, Konrad Rieck. "Dos and
> Don'ts of Machine Learning in Computer Security." *31st USENIX Security
> Symposium (USENIX Security '22)*, 2022. Distinguished Paper Award.
> arXiv:2010.09470

All three pitfalls §2 names are named pitfalls in the paper, with these exact
labels and numbers: **P1 Sampling Bias**, **P7 Inappropriate Performance
Measures**, **P8 Base Rate Fallacy**. The study covers **30 papers** from
top-tier security venues (CCS, S&P, USENIX Security, NDSS) over ten years.

Claim in §2: **supported, and the pitfall numbers should be cited directly** —
P1/P7/P8 is a sharper citation than the paper as a whole.

## 3. PhreshPhish (arXiv 2507.10854) · VERIFIED, every number

> Thomas Dalton, Hemanth Gowda, Girish Rao, Sachin Pargi, Alireza Hadj
> Khodabakhshi, Joseph Rombs, Stephan Jou, Manish Marwah. "PhreshPhish: A
> Real-World, High-Quality, Large-Scale Phishing Website Dataset and Benchmark."
> arXiv:2507.10854, 14 Jul 2025 (v2, 11 Feb 2026).

- Benign count **366,201** — confirmed, Table 3 ("Remaining after Stage 2").
- Provenance — confirmed verbatim: "Benign URLs were drawn from anonymized
  browsing telemetry from over six million global Webroot users and Google
  search results for heavily targeted brands."
- **Five** base rates — confirmed: "benchmark datasets with five different base
  rates varying from 0.05% to 5%."
- All negatives collected, none authored — confirmed; no synthetic generation
  appears anywhere in the methodology.

Claim in §2 (it cannot run the provenance contrast because every negative is
collected; what it does is prevalence adjustment, which is F1 and not F2):
**supported.**

## 4. Palla et al. 2025 — Policy-as-Prompt · CORRECTED

> Konstantina Palla, José Luis Redondo García, Claudia Hauff, Francesco Fabbri,
> Henrik Lindström, Daniel R. Taber, Andreas Damianou, Mounia Lalmas.
> "Policy-as-Prompt: Rethinking Content Moderation in the Age of Large Language
> Models." *ACM FAccT '25*, Athens, 23–26 Jun 2025.
> doi:10.1145/3715275.3732054 · arXiv:2502.18695

The paper, its authors and its venue are right. **The claim attached to it was
not.** §2 said the paper "measures no cross-model firing rates", which reads as
*no measurements at all*. It has a substantial empirical section:

- §3.2.1 runs **GPT-4o-mini** over **2,115** text descriptions across six
  moderation categories, varying prompt structure and format (plain text, XML,
  YAML, JSON); accuracy moves roughly **0.76–0.80** on structure alone.
- Its headline effect is **predictive multiplicity** — "despite similar overall
  performance, seemingly identical prompts produced different predictions for
  the same samples." That is a per-item divergence result, and §2 did not
  acknowledge that it existed.
- **Appendix A.3 does use several models**, from different providers and size
  bands (anonymised as P#; 32–64B and >100B), finding that sensitivity to prompt
  structure "decreases with model size, it is still present".

What it genuinely does not do, checked directly: A.3 reports **aggregate
accuracy per model only** — never, for a fixed policy, which specific items each
model flags. So F4's surviving novelty is narrower than §2 claimed and must be
stated as such. Palla measures per-item divergence *across prompt variants of
one model*, and *aggregate* accuracy across models. The unmeasured cell is
per-item firing sets for a **fixed** rule across **different** models. The F4
verdict stays **Partial**; the reasoning behind it has changed.

Had this reached a reviewer as written, "measures no cross-model firing rates"
would have been read as a false claim about a paper that has a multi-model
appendix.

## 5. Fragility of Phishing Detection Models · VERIFIED

> Istiaque Bhuiyan, Tanvir Bhuiyan. "The Fragility of Phishing Detection Models:
> Evidence from Cross-Corpus Transfer, Prevalence Shift, Artifact Learning, and
> Evasion Risk." *Big Data and Cognitive Computing* 10(7):211, 2026.
> doi:10.3390/bdcc10070211

§2 abbreviates the title; a bibliography needs the full one above.

- Six public corpora — confirmed: CEAS_08, Enron, Ling, Nazario, Nigerian Fraud,
  SpamAssassin. TF-IDF Logistic Regression and Linear SVC.
- Corpus-identity learnability — confirmed, and the figure should be stated as a
  pair: "Logistic Regression TF-IDF achieved an accuracy of **0.9722**... Linear
  SVC TF-IDF achieved an accuracy of **0.9806**." §2's "0.97" is the lower of
  the two; quoting both is more honest and costs nothing.
- Provenance absence — re-confirmed by full-text search of the rendered article:
  **zero** occurrences of "synthetic", "authored", "hand-craft(ed)" or
  "simulated". Its artifact result is corpus identity, i.e. corpus mismatch, not
  provenance.

Claim in §2: **supported.** (MDPI returns 403 to plain fetches; the full text was
read through the browser.)

## 6. ML-Based Behavioral Malware Detection (arXiv 2405.06124) · VERIFIED

> Yigitcan Kaya, Yizheng Chen, Marcus Botacin, Shoumik Saha, Fabio Pierazzi,
> Lorenzo Cavallaro, David Wagner, Tudor Dumitraş. "ML-Based Behavioral Malware
> Detection Is Far From a Solved Problem." arXiv:2405.06124, 9 May 2024
> (v2, 6 Mar 2025).

The 87.5% → 62.6% drop is real and is **exactly** the mechanism §2 claims:
benign-set composition, with the model held fixed. Verbatim, from the "Difficult
Benign Samples" case study: "On a test set containing only AM_Delta samples as
the benign samples, the model achieves only 62.6% AUC, compared to 87.5% with
all benign samples." (AM_Delta is Windows Defender definition updates.) The
87.5% is the EP→EP row of Table VI under original distributions.

Care needed: the paper's *headline* gap — over 90% as measured in the literature
against about 20–50% at real endpoints — is sandbox-versus-endpoint traces, a
different result. Cite the case study, not the abstract, or the claim will not
survive a reader who checks it.

Claim in §2: **supported** — difficulty composition *within* collected negatives,
distinct from provenance, establishing that the field already accepts that
negative-set construction moves headline numbers.

## 7. XSTest (Röttger et al., NAACL 2024) · VERIFIED

> Paul Röttger, Hannah Rose Kirk, Bertie Vidgen, Giuseppe Attanasio, Federico
> Bianchi, Dirk Hovy. "XSTest: A Test Suite for Identifying Exaggerated Safety
> Behaviours in Large Language Models." *NAACL-HLT 2024*, Mexico City.
> aclanthology.org/2024.naacl-long.301 · arXiv:2308.01263

**250** safe prompts and 200 unsafe contrasts — confirmed. Hand-written —
confirmed verbatim: "For each of the ten safe prompt types in XSTest, we
hand-craft 25 test prompts, for a total of 250 safe prompts."

Claim in §2 (small hand-built negative sets are accepted when their construction
is principled, so the exposure is that p = 0.031 carries the whole claim, not
that n is small): **supported.**

---

## What this pass could not check

The sweep behind F2's "Novel" verdict — "a sweep of malware, IDS, spam and
fraud" — is a claim about the *absence* of a paper, and no citation check can
verify an absence. It rests on the two near-misses above being the closest
existing work, and both were pulled in full and both fail to run the provenance
contrast. That is as far as verification reaches. The residual risk is a paper
nobody thought to search for, which is why the novelty claim should be phrased
as "we found none" rather than "there is none".
