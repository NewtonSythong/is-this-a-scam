# What would actually move the numbers, and whether it is worth doing

**Written 2026-09-22** in answer to a direct question: are there methods that
outperform this detector, or is this the wrong tree to bark up against
corporations with real funding?

Everything down to the horizontal rule rests on published sources, read this
session, cited inline, and describes the engine as it stood on 22 September.

**One of the routes below has since been built and measured — see "Stage 1" at
the foot of this page**, which is the part to read if you only read one. The
survey above it is left exactly as written so the reasoning that chose that
route can be seen rather than taken on trust.

## Where we actually stand

| | Figure | Instrument |
| :-- | :-- | :-- |
| Recall, LLM half | **61.0%** | 146 held-out real scam SMS (IMC25 `test`), `claude-opus-5` |
| False alarm, LLM half | **12/55 — 21.8%** [12.9, 34.4] | collected NZ negatives |
| False alarm, deterministic half | **6/55** | same |
| False alarm, written negatives | **1/16** | the F2 finding |
| Weakest strata | wrong number 25%, banking 40% | |

## The comparison that matters: SmishX

Wang et al., **SOUPS 2025**, "Can You Walk Me Through It? Explainable SMS
Phishing Detection using LLM-based Agents" (USENIX; code at
`github.com/yizhu-joy/SmishX`). Same task, same shape of product — a detector
that must also *explain itself to a frightened person* — and the closest thing
to a direct competitor this project has.

Their architecture is ours plus one thing: **they leave the message.** An
extraction LLM pulls URLs and brand names, then an agent collects external
context before any judgement is made:

- **redirect chain** — follow the URL to its true destination
- **domain history from WHOIS** — a domain registered last week claiming to be a
  bank is the signal
- **HTML content** of the destination, via the JINA Reader API
- **web screenshot**, via Puppeteer, read by a vision model
- **brand to true domain**, by querying a search engine for the claimed brand and
  taking the top-ranked result's domain

Results on 1,200 messages (622 legitimate, 259 phishing, 319 spam):

| System | Overall | Phishing | Spam | Legitimate |
| :-- | :-- | :-- | :-- | :-- |
| **SmishX** | **98.8%** | 100% | 99.1% | 98.2% |
| Baseline 1 — *LLM on the SMS text, no external context* | 96.0% | 100% | 99.4% | **92.6%** |
| Baseline 2 — no spam prompt | 89.7% | 98.5% | 64.6% | 98.9% |
| SpaLLM-Guard | 96.8% | 99.8% | — | 93.9% |
| PhishE (ML) | 85.0% | 74.2% | — | 93.1% |

### The number to take away

**Baseline 1 is our architecture.** An LLM reasoning over the message text with
no external lookup — that is exactly what `narrative.ts` plus `artifactCheck.ts`
is, minus their vision model.

> "Within this category, there are 70 messages with URLs. We find that the
> baseline 1 accuracy on these messages is even lower (only **71.4%**)."

A **28.6% false-alarm rate on legitimate messages that contain a link**, measured
by an independent group, ablating their own system down to our architecture.

We measured **21.8%** on 55 collected New Zealand negatives, arrived at
independently, with no knowledge of that ablation.

Two groups, two corpora, two countries, the same failure mode, within seven
points of each other. That is corroboration, and it belongs in the paper.

### And SmishX's own legitimate number is suspect by our thesis

Their legitimate set is "primarily sampled from existing datasets" with 22
messages from researchers' personal archives. F2's whole claim is that where the
negatives came from moves the measured rate. Their 98.2% is a number our paper
predicts is optimistic — not as an attack, as an instance. They also excluded
messages whose URLs had gone dead, which selects for live infrastructure on both
sides.

## Four routes, ranked by what they would buy

**1. Resolve the claimed brand's real domain, instead of hand-listing it.**
This is the root cause of the false-alarm class, and it is not a tuning problem.
`src/data/knownOrganisations.nz.ts:26` gives ANZ exactly one domain,
`anz.co.nz`. Four of our six deterministic false alarms are `careers.anz.com`
and `jobs2web.com`; two more are `sau.hvue.io`. **No hand-maintained allowlist
will ever contain the third-party vendor domains that real institutions send
from** — HireVue, jobs2web, SendGrid, Braze. The list is structurally incapable
of being complete, and its incompleteness is emitted as a confident accusation.
SmishX's search-engine brand resolution is the published answer.

**2. Follow the link — redirect chain and WHOIS domain age.**
The largest ablation delta in SmishX, and we do none of it (ADR 0008 follows
shorteners and stops). Domain age alone is cheap, is a two-sided signal, and
needs no model: `anz.com` registered 1995, a phishing host registered three days
ago. It is plausibly enough on its own to separate the two.

**3. Retrieval against a live scam corpus.**
SpaLLM-Guard (arXiv 2501.04985) reports GPT-4's false-positive rate falling from
**17.2% to 3.5%** with RAG. New Zealand has a public feed for this — DIA's
reported TXT spam (`dia.govt.nz/Spam-Report-TXT-Spam`). That is an NZ-specific
asset that a US-trained model does not have.

**4. Calibrated probabilities instead of booleans.**
Already argued in `jev-spike.md` and still right: a pattern that fires slightly
too eagerly and a pattern that fires correctly are indistinguishable when the
output is a boolean, which is how the `wrong-number-opener` fault survived nine
days. Asking for a confidence per pattern costs nothing extra per call and makes
every threshold scoreable afterwards for free.

### What not to do

**Fine-tuning.** Mixtral 8x7B reaches 98.6% accuracy with sub-2% error rates on
SMS spam collections — a number inflated by train/test duplication in those
corpora. Chasing it is F2's own fault wearing different clothes.

**Adding more patterns to the catalogue.** The catalogue is at fourteen and the
measured problem is that four of them fire on genuine institutional mail. More
patterns makes the false-alarm side worse, and the false-alarm side is the
binding constraint.

## Are we barking up the wrong tree?

Not the way the question assumes, and yes in one specific way.

**Where the funded competition actually is.** Google ships Scam Detection in
Messages and Phone using on-device Gemini Nano, expanded to Samsung's S26 range
in February 2026. As of September 2026 it runs in the US, UK, Australia, Canada,
Singapore, India, Germany, Mexico, Japan and France. **New Zealand is not on
that list.** It is also passive and channel-bound: it watches messages arriving
in Google Messages. It cannot answer "my aunt forwarded me this email, is it
real?" — which is the thing this app does.

**The paper is not in a performance race at all.** Its claim is about how
false-alarm rates are measured, and that is a methodology result, not a
capability result. Funding does not fix it. Scale arguably makes it worse,
because scale rewards convenient data, and written negatives are the most
convenient data there is. SmishX's legitimate set, above, is the example.

**The defensible asset is the corpus, not the detector.** 55 genuine New Zealand
negatives captured under a pre-registered protocol is something no funded team
has and none would build. Every route in this document is an implementation
detail; the corpus is the only thing here that cannot be bought quickly.

**The honest concession.** If the goal is to beat a published accuracy number,
stop. 61.0% recall against a published 98.8% is not a contest worth entering,
and no amount of catalogue work closes it from a text-only architecture. The
gap is architectural and the architecture is known.

## Why none of this should be built yet

> **Superseded in part on 23 September**, and the distinction this section draws
> is what made building route 2 safe: the rule was written from SmishX's
> published method, not from our six failures. The paragraph below still governs
> routes 1, 3 and 4.


Three of the four routes above would be written while looking at the six
messages that caught us, which is the corpus-spending error this project exists
to name. Adding `anz.com` to the ANZ entry makes four alarms vanish and measures
nothing at all.

Any of these must be **written from the published method, not from our
failures**, and measured on messages nobody here has read. That is a sequencing
constraint, not a reason to skip it.

One item on this page is exempt, because it is a defect rather than a
calibration: `hirevue-genuine-interview-reminder` was reported as a link to
`firstname.lastname`. That is an email address parsed as a URL host, and fixing a
parser is not tuning a threshold.

## Sources, all read 2026-09-22

- Wang, Zhai, Wang, Hao, Cohen, Foulger, Handler, Wang. *Can You Walk Me Through
  It? Explainable SMS Phishing Detection using LLM-based Agents.* SOUPS 2025.
  `usenix.org/system/files/soups2025-wang.pdf` — Tables 1–3, §3.2, §4.1–4.2.
- SpaLLM-Guard, arXiv 2501.04985 — RAG false-positive figures, Mixtral fine-tune.
- `blog.google/security/staying-one-step-ahead-strengthening-androids-lead-in-scam-protection/`
  and `9to5google.com/2026/02/25/google-messages-scam-detection-gemini/` —
  Scam Detection rollout and country list.
- MBIE, *New Zealand Anti-Scam Alliance Work Programme 2026* — NZ policy context,
  not yet read in full.

---

# Stage 1, built and measured — 2026-09-23

Route 2 above, the cheap half of it: **RDAP registration age**, wired in as a
third `LinkLookups` method. No new dependency, no API key, no cost. RDAP is the
registries' own successor to WHOIS and is public and unmetered.

Plus one thing that was not on the list because it is a defect rather than a
method: `src/engine/links.ts` was reading the local part of an email address as
a link. `Firstname.Lastname2@example.com` matched as `firstname.lastname` — the leading
lookbehind keeps out text *after* an `@`, and nothing kept out text before one.
The app told a Checker their message linked somewhere it did not.

## What it does

An allowlist's silence was being read as proof of forgery. `NEW_ZEALAND_ORGANISATIONS`
gives ANZ one domain, `anz.co.nz`, so every genuine ANZ message routed through
`careers.anz.com`, `jobs2web.com` or `sau.hvue.io` was called a scam. That list
can never be complete — real institutions send through vendors whose domains
carry nobody's brand.

`checkAsync` now skips **both** impersonation rules for a host whose registrable
domain has been registered for more than two years, and skips nothing else: a
twenty-year-old shortener still gets its "hides where it goes" warning, because
`bit.ly` is older than most banks' web presences.

## Measured, live, on the deterministic half

`npx tsx bench/domain-age.ts` — free, runs the real `checkAsync` against live
registries with no model and no Safe Browsing key, so the delta is the lookup's
alone.

| | before | after |
| :-- | :-- | :-- |
| False alarms on the 55 collected negatives | **6** | **0** |
| — cleared by domain age | | 5 |
| — cleared by the link-parser fix | | 1 |
| Scams lost | | **1** |

Registration dates behind the cleared alarms, live from the registries:

```
careers.anz.com      1996-06-04   11,067 days
sau.hvue.io          2023-09-29    1,088 days
nz.seek.com          1994-01-13   11,940 days
orcid.org            2009-10-29    6,171 days
```

And behind the scams the engine still catches:

```
anz-points.click     2026-03-08      197 days
mypost.securebn.homes 2025-12-01     295 days
secure-verify-nz.com  no registry holds this name
```

## The one it broke, and why it is the important line on this page

`afterpay-verify-account-verbatim` went from `scam` to `unclear`. Its link is
`lahresour.inportal.nl` — **registered 2020, 2,388 days old.** It is a genuine
Dutch ticketing host that an attacker compromised and served a phishing page
from.

Domain age assumes phishing runs on fresh infrastructure. Phishing on a
**compromised established host** breaks that assumption completely, and no
amount of threshold tuning recovers it — the domain really is old, and it really
is hosting an attack.

This is precisely why SmishX does not stop at WHOIS. Its HTML-content and
screenshot steps are what separate "old domain" from "old domain currently
serving an Afterpay login form", and that is now the argued case for route 2's
expensive half rather than a feature on a list.

Two things soften the loss without excusing it. The item is flagged
`developedAgainst` — Afterpay was added to the Known Organisation list after
reading it, so it has not measured the engine since 7 September and the report
already says it proves nothing. And Google Safe Browsing, which this script
deliberately ran without, is the lookup most likely to know about a compromised
host; whether it knows about this one is untested.

## What this measurement is not

The six false alarms have been read, quoted and written about for two weeks. A
change measured on them is weaker evidence than a change measured on messages
nobody has seen. What keeps it honest is that the rule came from SmishX's
published WHOIS component rather than from these six items — no pattern was
narrowed while looking at a message it had fired on, and the threshold is
deliberately nowhere near the closest case.

It still has to be confirmed on collected negatives nobody here has read. That
is the next thing worth doing, and it is a collection job rather than a coding
one.

## Known hole: `.nz` has no RDAP at all

IANA's bootstrap has no entry for `.nz`, so `anz.co.nz`, `nzpost.co.nz`,
`ird.govt.nz` and `nzblood.co.nz` all return "unknown" and fall back to today's
behaviour. Survivable, because those are exactly the domains the Known
Organisation list already covers and scam infrastructure is overwhelmingly gTLD
— but it means the lookup is blind on home soil, and it is the reason "unknown"
must never be read as "new".
