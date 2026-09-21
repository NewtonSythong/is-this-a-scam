# The Jev spike: what it asks, what it costs, and what would make it a yes

**Written 2026-09-21. Nothing here has been run.** This is the brief for a spike
that has not started, written so that whoever starts it — including a later
session of this project — does not have to reconstruct the reasoning first.

The short version: Jev cannot replace the Narrative Check, because it cannot
quote. It might replace the *half* of the Narrative Check that decides which
patterns are present, leaving Opus to do nothing but produce the quote for the
patterns already chosen. That would take a full 292-message benchmark from $4.38
to roughly a cent, which would stop the corpus being rationed. Whether it is any
good at the deciding half is unmeasured, and this spike measures it.

## What Jev is

TypeSafe's "System One" model, launched around 15 September 2026. It takes a
state plus typed questions and returns typed probabilistic decisions. Three
primitives: **Noul** (a binary probability), **Choice** (one of at most 255
options, with a distribution and a confidence) and **Score** (an ordinal, 2–10).
It cannot generate text at all, and it evaluates several questions in parallel
within one request — which is exactly how the catalogue's fourteen patterns over one
message wants to be asked.

Confirmed against the Vercel AI Gateway's own model listing on 2026-09-21, which
corrects one figure carried in the earlier note:

| | |
| :--- | :--- |
| Gateway id | `typesafe-ai/jev` |
| Type | `evaluation` (not a chat model; `max_tokens` is 0) |
| Context | **32,000 tokens** — the earlier note said 64k, which was wrong |
| Input | $0.042 per million tokens |
| Output | free |
| Retention | zero data retention, no training, both on all traffic |

It is six days old and in early access. "Never hallucinates" is a claim about the
output's *shape*, not its correctness — TypeSafe's own documentation says a
high-confidence answer can still be wrong. Nothing from this goes anywhere near
the app before it is measured.

## Why it fits the shape this project already has

The Narrative Check is not a generation task wearing a classifier's clothes. It
is fourteen independent bounded questions over one shared state: for each pattern
in `NARRATIVE_PATTERNS`, is this pattern present in this message? That is
fourteen **Nouls**, not one Choice — the patterns are not mutually exclusive, and
a message that is both `authority-threat` and `manufactured-urgency` is the
normal case rather than the awkward one.

Two things follow that are worth more than the price.

**The catalogue constraint becomes structural.** The rule that the model may not
write its own sentences — it must pick from a catalogue a human reviewed — is
currently enforced in code, in `narrativeSignals`, by dropping any pattern id the
catalogue does not contain. With typed decisions there is no id to invent.

**There would finally be a signal between "fires" and "does not".** Jev returns a
calibrated probability per pattern. The engine has no equivalent today, and that
absence has already cost something concrete: the "hey stranger" fault sat in
`wrong-number-opener` for nine days and was invisible the whole time, because a
pattern that fires slightly too eagerly and a pattern that fires correctly look
identical when the only output is a boolean.

## The blocker, and the hybrid that follows from it

**Jev cannot extract spans.** Confirmed in its documentation. That is fatal to a
straight replacement, because the hallucination guarantee in this project is not
a promise about the model — it is `narrativeSignals` checking, verbatim, that the
words the model pointed at actually occur in the Message, and discarding the
finding when they do not. A model that cannot point at words cannot be checked
that way, and dropping the check would mean dropping the constraint the
architecture was built around.

So the only viable shape is a hybrid:

> **Jev decides which patterns fire. Opus is called only for those, and only to
> produce the quote.** A message in which Jev finds nothing never reaches Opus at
> all.

Most messages are quiet, so most messages would cost a fraction of a cent instead
of about a cent and a half. That is where the 1.2-cents-per-292 figure comes from.

## What the spike actually is

Wire Jev behind the existing `NarrativeCheck` interface as an alternate
implementation, run it against the **`dev` half only**, and compare
pattern-for-pattern against Opus.

`NarrativeCheck` is already the right seam — `(message: string) =>
Promise<Signal[]>`, one function type, with `anthropicNarrativeCheck` as the only
implementation today. A second implementation is a new file next to
`src/narrative/anthropic.ts` and nothing else has to move.
`bench/narrative-imc25.ts` would need an `--engine jev` flag alongside its
existing `--model`, and the cache fingerprint already hashes the model name and
the whole system prompt, so it will not mix two engines' answers into one
reading.

**It must be the `dev` half.** The `test` half is the only instrument this
project has left, and choosing between two implementations by comparing them on
it would spend it — that is model selection on a held-out set, and it is exactly
how `bench/corpus.ts` died.

### One paid pass buys every threshold

A probability needs a cut-off to become a boolean, and the right cut-off is not
knowable in advance. It does not need to be: save the raw per-pattern
probabilities to the cache, and every threshold from 0.1 to 0.9 can be scored
afterwards for free, locally, as many times as anyone likes. Only the model calls
cost money, and they happen once.

This is worth doing deliberately rather than falling into, because the obvious
implementation — threshold inside the engine, booleans into the cache — throws
the sweep away and makes each threshold a fresh purchase.

## What it costs — and the thing that turned out not to be true

The archived note said "about a cent". That is right for Jev's side and wrong for
the comparison, and the difference was found while writing this page.

**The Opus baseline for the `dev` half is not cached.** At the current
catalogue's fingerprint (`036de0bd9e79d2c9`), `bench/.imc25-cache.jsonl` holds
**146/146 for `test` and 0/146 for `dev`**. Every paid run at this catalogue went
to the held-out half. The published Opus dev figure — 91/146, 62.3% — is one
catalogue behind, from before the "hey stranger" clause.

So a clean same-catalogue head-to-head on `dev` costs the Jev run **plus a fresh
Opus dev run at about $2.19**, not a cent.

Which makes the spike two stages, and the first one still costs under a cent:

**Stage one — triage, about $0.006.** Run Jev on the 146 `dev` messages. Score
against the published 62.3%, noting out loud that it is one catalogue behind. The
clause that separates them moved the overall figure by one message in 146 on the
test half, so the drift is small, but it is unmeasured on `dev` and the
comparison is indicative only. If Jev lands far below — say under 50% — that is
enough to stop, and it cost less than a cent to learn.

**Stage two — the honest head-to-head, about $2.19, only if stage one survives
it.** Re-run Opus on the `dev` half at the current catalogue and compare
pattern-for-pattern on identical messages.

Do not skip stage one to save a round trip. Its whole value is that it can say no
for a cent.

## What would make it a yes

Recall on `dev` within a few points of Opus is **not** the bar, because recall is
not the only thing the hybrid changes. The bar is:

- **Recall broadly comparable** on the `dev` half — near enough that stage two is
  worth buying.
- **The quiet messages stay quiet.** The hybrid's saving is entirely in messages
  Jev finds nothing in. If Jev fires on nearly everything, every message still
  reaches Opus and the cost argument collapses even if recall is fine.
- **Opus confirms what Jev picks.** In the hybrid, Opus is asked for a quote for a
  pattern Jev already chose. If Opus routinely cannot quote those patterns, Jev is
  picking patterns that are not there and the quote guard will drop them — which
  shows up as recall loss and is the most likely way this fails.

And one that is not a number: Jev is six days old, in early access, and this app
is for frightened people. A marginal win is not enough to take on a dependency
that young. It needs to be clearly better or it is not worth it.

## Getting access — tested 2026-09-21, and what is left

Most of this is already solved, and the part that is not is smaller than it
looked.

**The OIDC route works.** `npx vercel env pull` refreshed `VERCEL_OIDC_TOKEN`
and kept the three locally-defined keys rather than overwriting them. That token
authenticates against the gateway directly — `GET
https://ai-gateway.vercel.sh/v1/models` with it as a bearer returns HTTP 200 and
376 models, `typesafe-ai/jev` among them. **No API key is needed and no signup
or waitlist is involved.** The token expires in hours, so re-run `vercel env
pull` before a run.

**What is left is a credit card.** The first inference call returns HTTP 403:

> `AI Gateway requires a valid credit card on file to service requests. Please
> visit … to add a card and unlock your free credits.`
> — `customer_verification_required`

A card on the Vercel account unlocks the free credits; the spike's own spend is
about six tenths of a cent, so the card is a verification step rather than a
bill. It is the one thing here that cannot be done from a terminal. Vercel serves
Jev free until **25 September 2026**.

**The request shape is settled.** Evaluation is its own modality on the gateway
and is explicitly *not* served by the OpenAI-, Anthropic- or Cohere-compatible
endpoints. It is `POST https://ai-gateway.vercel.sh/v1/evaluate` with `model`,
`state` and a `questions` map, each question `{ type: "boolean" | "choice" |
"score", instructions, criteria? }`; the response carries `answers[key].probability`
and, usefully, the gateway's own `providerMetadata.gateway.cost` for the call, so
spend is reported rather than estimated. The AI SDK route
(`experimental_evaluate`) needs AI SDK 7, which this project does not have and
does not need for fourteen questions over `fetch`.

**A stale token reads as a billing error.** The 403 above is what an expired
`VERCEL_OIDC_TOKEN` looks like too — it does not say anything about the token.
Re-run `vercel env pull` before concluding the account is the problem.

## Stage one, run 2026-09-21: 83.4% on the dev half, and a reason not to celebrate

145 of the 146 dev messages answered; one call never succeeded after five
attempts and is excluded rather than counted as a miss. **The run cost $0.00** —
the gateway reported zero for every call, which is Vercel's free window on Jev,
not a rounding artefact. The estimate was $0.0117 and reality was cheaper still.

| cut-off | found | mean patterns per message |
| :--- | :--- | :--- |
| 0.1 | 145/145 — 100.0% | 7.84 |
| 0.2 | 145/145 — 100.0% | 5.01 |
| 0.3 | 143/145 — 98.6% | 3.24 |
| 0.4 | 132/145 — 91.0% | 2.40 |
| **0.5** | **121/145 — 83.4%** | **1.79** |
| 0.6 | 106/145 — 73.1% | 1.19 |
| 0.7 | 92/145 — 63.4% | 0.92 |
| 0.8 | 80/145 — 55.2% | 0.70 |
| 0.9 | 57/145 — 39.3% | 0.42 |

Against the published Opus dev figure of 91/146 — 62.3%, one catalogue behind,
Jev at a 0.5 cut-off is **twenty-one points higher**. At 0.7 it matches Opus
almost exactly (63.4%) while firing 0.92 patterns per message.

By scam type at 0.5, the interesting column is the one this project is worst at:

| | Jev @ 0.5 (dev) | Opus (test, current catalogue) |
| :--- | :--- | :--- |
| banking | 20/20 — 100% | 8/20 — 40.0% |
| spam | 20/20 — 100% | 14/20 — 70.0% |
| delivery | 17/20 — 85.0% | 14/20 — 70.0% |
| others | 17/20 — 85.0% | 11/20 — 55.0% |
| government | 16/20 — 80.0% | 17/20 — 85.0% |
| telecom | 16/20 — 80.0% | 14/20 — 70.0% |
| **wrong number** | **10/20 — 50.0%** | **5/20 — 25.0%** |
| hey mum/dad | 5/5 — 100% | 6/6 — 100% |

Those two columns are different halves and are **not** a fair comparison — they
are put side by side only to show that the gap is not concentrated in one
stratum. Banking, the weakest category on the shipping engine at 40%, is 100%
here.

### Why this is not yet good news

**Every message in this corpus is a scam, so firing more always scores better.**
That is the whole reason the sweep prints mean patterns per message next to
recall. At 0.1 Jev "finds" 100% of scams while asserting 7.84 of the catalogue's
fourteen patterns on the average message, which is not detection, it is noise
that happens to overlap the right answer.

The pattern distribution at 0.5 says the same thing more quietly:

```
benefit-expiry-pretext        73     <- half the corpus
unexpected-money              42
verify-account-pretext        39
manufactured-urgency          22
```

`benefit-expiry-pretext` firing on **73 of 145** messages is not credible. It
describes a specific pretext — a reward or entitlement about to lapse — and half
of all smishing is not that. Either Jev is reading the description loosely or it
is reaching for the nearest available label, and both would look exactly like
strong recall on a corpus with no legitimate messages in it.

This is the same shape as the fault that took nine days to find in
`wrong-number-opener`: a pattern that fires too eagerly is invisible when the
only evidence is scams.

### What the cost argument actually looks like now

The hybrid's saving comes from messages Jev finds nothing in, because only those
skip Opus. At a 0.5 cut-off that is 16.6% of messages — a sixth off the Opus
bill, not the two-orders-of-magnitude saving the archived note implied. At 0.7 it
is 36.6%, for Opus-equivalent recall.

So the honest framing has inverted since this page was written. **Jev's case is
now about recall, not cost.** If the recall is real, the interesting question is
not "can this replace pattern selection to save money" but "does asking two
different models and taking the union find scams neither finds alone" — which is
a different and more expensive architecture, and one nobody should design before
the next measurement.

### The next measurement, and it is not stage two

Stage two as written — a $2.19 Opus dev run for a clean head-to-head — is no
longer the highest-value next step, because it would sharpen a recall comparison
while the thing actually in doubt is whether Jev cries wolf.

**Run Jev against the legitimate messages first.** The thirteen in
`bench/corpus.ts` are the only false-alarm evidence this project has, they cost
effectively nothing on this model, and if Jev fires on them the way it fires
`benefit-expiry-pretext` here, the 83.4% means nothing and no further money needs
spending. That is the cheapest possible way to find out this is wrong.

## The false-alarm run, 2026-09-21: it fired on eight of the thirteen

`npm run bench:jev:legit` — `bench/jev-legit.ts`, the thirteen legitimate messages
in `bench/corpus.ts` asked exactly the fourteen questions the dev run asked. All
thirteen answered, **$0.00 reported by the gateway** again, still inside Vercel's
free window.

This is the measurement the previous section asked for, and it came back badly.

| cut-off | quiet (13 genuine) | mean patterns | scams found (dev, from cache) |
| :--- | :--- | :--- | :--- |
| 0.3 | 0/13 — 0.0% | 1.62 | 98.6% |
| 0.4 | 3/13 — 23.1% | 1.00 | 91.0% |
| **0.5** | **5/13 — 38.5%** | **0.69** | **83.4%** |
| 0.6 | 10/13 — 76.9% | 0.31 | 73.1% |
| 0.7 | 12/13 — 92.3% | 0.08 | 63.4% |
| 0.9 | 13/13 — 100% | 0.00 | 39.3% |

**At the 0.5 cut-off the 83.4% was quoted at, Jev alarms at eight of thirteen
genuine messages.** Among them: a tradesman texting that he is running late, a
courier saying a parcel is at the door, a bank's own two-factor code, and a
Briscoes refund receipt. An app that did that would be useless — worse than
useless, because it teaches the person to ignore it, which is the specific failure
`bench/corpus.ts`'s legitimate half exists to catch.

So the 83.4% is dead as a headline figure. It was not detection; it was a model
firing often enough to cover a corpus in which everything is a scam.

### But it is one pattern, not the model

Every alarm traces to almost the same place:

```
benefit-expiry-pretext        8/13     <- and 73/145 on the scam half
verify-account-pretext        1/13
```

Nothing else in the catalogue fired on a genuine message at all. Scoring the same
cached probabilities with `benefit-expiry-pretext` excluded — free, no new calls:

| cut-off | recall (dev, 145) | quiet (13 genuine) |
| :--- | :--- | :--- |
| 0.5 | 71.7% | 12/13 |
| 0.6 | 67.6% | 12/13 |
| **0.7** | **62.1%** | **13/13** |

At a 0.7 cut-off with that one pattern dropped, Jev finds 62.1% of the dev half
and alarms at none of the thirteen. The published Opus dev figure is 62.3%. That
is a coin-flip apart on recall, at zero false alarms on the only negative evidence
this project has, from a model that costs a twentieth of a cent per hundred
messages.

**Read that as a lead, not a result.** Three reasons it is not a green light:

1. **Dropping the pattern that misfired, while looking at the messages it
   misfired on, is exactly the move `developedAgainst` exists to record.** It is
   the `false-familiarity` story again — a pattern withdrawn rather than narrowed
   because narrowing it in sight of the item that caught it spends the item. These
   thirteen have now been read. Any threshold or catalogue chosen with this table
   in hand is tuned to them and cannot be validated on them.
2. **Thirteen messages, ten of them ones we wrote.** 13/13 quiet is not a
   false-alarm rate. It is the absence of an obvious disqualification.
3. **It says something about the description, not only about Jev.** Opus reads
   `benefit-expiry-pretext`'s description narrowly and Jev reads it as "something
   is being offered or is expiring". The same words, two behaviours. That is worth
   knowing for the Anthropic path too, and it is a catalogue finding as much as a
   model finding.

### Where the spike stands

Stage two — the $2.19 Opus dev run — is still not the next move, and is now
clearly not: a head-to-head at a cut-off and catalogue nobody has settled would be
buying a number that a later catalogue edit invalidates.

What the spike has established for **$0.00** total:

- Jev answers the catalogue's shape cheaply and reliably, 158 messages, no
  refusals beyond one transient failure.
- Its headline recall was inflated by a single over-firing pattern, and that was
  invisible until the legitimate messages were asked.
- With that pattern set aside it is roughly Opus-equivalent on recall and quiet on
  the negatives — which is interesting enough to keep the file, and nowhere near
  enough to put a six-day-old model in front of frightened people.

And the honest constraint underneath, for the seventh time: this whole
conversation rests on thirteen negatives. Fifty to a hundred genuine New Zealand
messages of the awkward kind would be worth more than every number on this page.

## What this spike deliberately does not do

- **It does not touch the app.** The alternate implementation lives behind the
  interface and is reached only by the benchmark. `checkAsync` keeps calling Opus.
- **It does not measure a false-alarm rate.** `bench/imc25.csv` is 292 scams and
  cannot see one at all; `bench/jev-legit.ts` added the only negatives that exist,
  and thirteen messages is a smoke test rather than a rate. That it *found*
  something — eight of thirteen at the quoted cut-off — is decisive; had it found
  nothing, that would have proved much less.
- **It does not read the `test` half.**

And the thing that is still true underneath all of this, said here for the seventh
time: recall is measured at 61.0% and the false-alarm rate rests on thirteen
messages we wrote ourselves. Fifty to a hundred genuine New Zealand messages of
the awkward kind remains the single highest-value addition to this project, and
it is worth more than Jev is.
