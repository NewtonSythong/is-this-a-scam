The corpus in [`bench/corpus.ts`](./bench/corpus.ts) is twenty messages the
engine was never built against, run with `npm run bench`. Six are `verbatim` —
transcribed by eye from screenshots ANZ and NZ Post publish, because New Zealand
organisations release annotated images of scam texts rather than the text.

| | Offline engine only | Both engines |
| :-- | :-- | :-- |
| Scams raised, never developed against | 6/9 (67%) | **9/9 (100%)** |
| Legitimate messages left quiet | 8/8 | 8/8 |
| — of those, genuine messages that look like scams | 5/5 | 5/5 |

Three further scam messages are excluded from those figures. Narrative patterns
were written after studying them, so they now pass by construction and measure
nothing — they are flagged in the corpus and `npm run bench` says so on every
run.

**The headline hides the model's half.** Every recent addition carries a
lookalike domain, so the deterministic rules reach them without the model being
consulted — a narrative pattern could be completely broken and that number would
not move. `npm run bench:narrative` runs the model's half with the rules taken
away: it finds something in 12/12 scams, raises **zero** false alarms on all
eight legitimate messages, and shows two of the three new patterns firing on real
messages they were never written from. The third,
`unauthorised-payment-pretext`, is still unvalidated for want of a real example.

**Read [`docs/benchmark-method.md`](./docs/benchmark-method.md) before quoting
any number from here.** It gives every reason to distrust these figures,
including that most non-verbatim items were written by a language model, which is
also half of what is being tested.

The benchmark has earned its keep three times: it caught the app calling a
genuine NZ Post tracking text a scam, it told us when it had stopped being a
measurement, and it showed which of three new patterns had actually generalised.

# Is This a Scam?

An app that tells someone whether a text message or email they have received is a scam, in language they can act on without knowing anything about how scams work.

Built for older and less digitally confident people in New Zealand. The name is deliberately the sentence the person is already thinking — because on a phone it is also the button they will see when they highlight a message.

- **Engine:** TypeScript, no framework, no network — imported by everything else
- **API + web demo:** Next.js on Vercel
- **Android app:** Kotlin / Compose, `minSdk 26` — not built yet
- **Domain language:** [`CONTEXT.md`](./CONTEXT.md)
- **Decisions and why:** [`docs/adr/`](./docs/adr)

## What makes it different

**It never says a message is safe.** There are exactly three answers — *this is a scam*, *this has warning signs*, and *we can't tell* — and no fourth one meaning "looks fine". A false reassurance costs someone their savings; a false warning costs them a phone call. See [ADR 0001](./docs/adr/0001-never-say-safe.md).

**Two engines, and the more alarming one wins.** Deterministic rules own what can be looked up — lookalike domains, redirect chains, payment methods, Safe Browsing. A language model owns the story being told — impersonation, urgency, secrecy, the "Hi Mum, this is my new number" pretext. Neither can talk the other down. See [ADR 0003](./docs/adr/0003-two-engines-worst-verdict-wins.md).

**The model cannot write its own sentences.** It picks from a fixed catalogue of patterns and quotes the words that made it pick; the sentence a reader sees was written in advance by a person. A quote that does not appear in the message is discarded, which makes hallucination something the code catches rather than something the reader has to notice. See [ADR 0010](./docs/adr/0010-narrative-check-provider.md).

**The person they ask can answer in two taps.** The text a Checker sends their Trusted Person carries a link to a page with three buttons on it — *it's a scam*, *it looks genuine to me*, *I'm not sure either* — and the answer opens as a pre-written reply back. The Message travels in the link's fragment, the one part of a web address a browser never sends to the server, so none of it reaches us. See [ADR 0013](./docs/adr/0013-the-trusted-person-can-answer.md).

**A scam supplies its own proof**, so every answer points at a channel the message had no hand in choosing — ASB's own Caller Check, a bank's real number, or a number the person already has. See [ADR 0009](./docs/adr/0009-verified-route-back-to-the-organisation.md).

## What a scammer can do with it

The app is deliberately free, account-less and — if it is open-sourced — readable, and each of those is reachable by someone who wants to use it as a weapon. What is done about that:

| The move | What stops it |
| :-- | :-- |
| Craft an `/asked` link that texts a premium-rate number | The reply number must be an NZ mobile (`02…`); `0900` cannot pass, and the destination is printed beside the button |
| Put an organisation's name in the "who is asking" field | Names are cut to 24 characters, and whoever is named is cast as the person confused and asking for help |
| Hide a hostname behind a right-to-left override | Invisible and bidirectional characters are stripped from everything shown |
| Borrow the domain's credibility for their own text | A provenance line above it says the contents came from the link, not from us; nothing in a quoted message is ever clickable |
| Submit drafts until one comes back "we can't tell" | Only partly. A per-caller cap and a provider spend cap ([ADR 0011](./docs/adr/0011-rate-limiting-and-spend.md)) are brakes, not a fix — see below |
| Report genuine bank messages to poison the scam library | Reports are human-reviewed, and a library entry cannot be added without a `source` citing where the scam was published |

**The endpoint is an oracle and cannot fully stop being one.** Anyone can submit a draft and learn whether it comes back as a scam. Nothing closes that while the app is free and has no accounts, and those are the two properties that make it reachable by the people it is for. Note also what the benchmark says: the offline rules catch 2/8 of unfamiliar scams on their own, so they are not a filter whose secrecy would be worth much. See [ADR 0013](./docs/adr/0013-the-trusted-person-can-answer.md) for the reasoning, including what was rejected.

## Setup

Requires Node.js `>=22.12.0`.

```sh
npm install
bash scripts/setup.sh   # optional — walks you through the two API keys
npm run dev             # http://localhost:3000
```

**No keys are needed to run it.** A missing key degrades the check rather than breaking it: without either, the deterministic rules still return a complete verdict.

[`scripts/setup.sh`](./scripts/setup.sh) opens each console for you, explains what to click, hides your paste, and **proves each key with a real call before saving it** — so a key that is valid but whose API was never switched on is caught here rather than in front of the person you built this for. Either key can be skipped, and re-running the script picks up where you left off.

| Variable | Effect when set |
| :-- | :-- |
| `ANTHROPIC_API_KEY` | Enables the Narrative Check — the half that catches scams with no link in them |
| `SAFE_BROWSING_API_KEY` | Enables Safe Browsing lookups and shortened-link expansion |
| `REVIEW_TOKEN` | Opens the review queue at `/review?token=…`. Unset means the queue refuses everything |
| `REPORTS_DB_PATH` | Where reported scams are kept (default `./data/reports.db`) |

Both go in `.env.local`, which is git-ignored.

## Does it actually work?

The corpus in [`bench/corpus.ts`](./bench/corpus.ts) is sixteen messages the
engine was never built against, run with `npm run bench`. It gave one clean
reading, on 2026-09-07:

| | Offline engine only | Both engines |
| :-- | :-- | :-- |
| Scams raised | 2/8 (25%) | 5/8 (63%) |
| Legitimate messages left quiet | 8/8 | 8/8 |
| — of those, genuine messages that look like scams | 5/5 | 5/5 |

The deterministic half alone catches a quarter of unfamiliar scams; the model
roughly doubles that. Neither raises a false alarm, which matters more than it
sounds: an app that shouts at a real courier text teaches a frightened person to
ignore it.

**That reading is the last one this corpus can give.** Three narrative patterns
have since been written to catch the three scams it caught getting through, so
those three now pass by construction and measure nothing. They are flagged in the
corpus, the report counts them separately, and `npm run bench` will tell you so.
Whether those patterns generalise is unknown until there are messages nobody has
looked at. **Read [`docs/benchmark-method.md`](./docs/benchmark-method.md) before
quoting any number from here** — it gives six reasons to distrust these figures,
starting with the fact that only two of the sixteen could be sourced verbatim and
most of the rest were written by a language model, which is also half of what is
being tested.

The benchmark has already earned its keep twice. Its first run caught the app
calling a genuine NZ Post tracking text a scam, because NZ Post's own link
shortener was missing from their record. Its second told us it had stopped
being a measurement.

## What a scammer can do with it

The app is deliberately free, account-less and — if it is open-sourced — readable, and each of those is reachable by someone who wants to use it as a weapon. What is done about that:

| The move | What stops it |
| :-- | :-- |
| Craft an `/asked` link that texts a premium-rate number | The reply number must be an NZ mobile (`02…`); `0900` cannot pass, and the destination is printed beside the button |
| Put an organisation's name in the "who is asking" field | Names are cut to 24 characters, and whoever is named is cast as the person confused and asking for help |
| Hide a hostname behind a right-to-left override | Invisible and bidirectional characters are stripped from everything shown |
| Borrow the domain's credibility for their own text | A provenance line above it says the contents came from the link, not from us; nothing in a quoted message is ever clickable |
| Submit drafts until one comes back "we can't tell" | Only partly. A per-caller cap and a provider spend cap ([ADR 0011](./docs/adr/0011-rate-limiting-and-spend.md)) are brakes, not a fix — see below |
| Report genuine bank messages to poison the scam library | Reports are human-reviewed, and a library entry cannot be added without a `source` citing where the scam was published |

**The endpoint is an oracle and cannot fully stop being one.** Anyone can submit a draft and learn whether it comes back as a scam. Nothing closes that while the app is free and has no accounts, and those are the two properties that make it reachable by the people it is for. Note also what the benchmark says: the offline rules catch 2/8 of unfamiliar scams on their own, so they are not a filter whose secrecy would be worth much. See [ADR 0013](./docs/adr/0013-the-trusted-person-can-answer.md) for the reasoning, including what was rejected.

## Setup

Requires Node.js `>=22.12.0`.

```sh
npm install
bash scripts/setup.sh   # optional — walks you through the two API keys
npm run dev             # http://localhost:3000
```

**No keys are needed to run it.** A missing key degrades the check rather than breaking it: without either, the deterministic rules still return a complete verdict.

[`scripts/setup.sh`](./scripts/setup.sh) opens each console for you, explains what to click, hides your paste, and **proves each key with a real call before saving it** — so a key that is valid but whose API was never switched on is caught here rather than in front of the person you built this for. Either key can be skipped, and re-running the script picks up where you left off.

| Variable | Effect when set |
| :-- | :-- |
| `ANTHROPIC_API_KEY` | Enables the Narrative Check — the half that catches scams with no link in them |
| `SAFE_BROWSING_API_KEY` | Enables Safe Browsing lookups and shortened-link expansion |
| `REVIEW_TOKEN` | Opens the review queue at `/review?token=…`. Unset means the queue refuses everything |
| `REPORTS_DB_PATH` | Where reported scams are kept (default `./data/reports.db`) |

Both go in `.env.local`, which is git-ignored.

## Does it actually work?

Measured against a held-out corpus of sixteen messages the engine was never built
against — [`bench/corpus.ts`](./bench/corpus.ts), run with `npm run bench`:

| | Offline engine only | Both engines |
| :-- | :-- | :-- |
| Scams raised | 2/8 (25%) | 5/8 (63%) |
| Legitimate messages left quiet | 8/8 | 8/8 |
| — of those, genuine messages that look like scams | 5/5 | 5/5 |

The deterministic half alone catches a quarter of unfamiliar scams; the model
roughly doubles that. It currently raises no false alarms, which matters more
than it sounds: an app that shouts at a real courier text teaches a frightened
person to ignore it.

**Read [`docs/benchmark-method.md`](./docs/benchmark-method.md) before quoting any
of this.** The corpus is sixteen messages, only two of which could be sourced
verbatim, and most of the rest were written by a language model — which is also
half of what is being tested. The three scams that still get through all share
one shape: no link worth checking and no organisation named.

The benchmark has already earned its keep. Its first run caught the app calling a
genuine NZ Post tracking text a scam, because NZ Post's own link shortener was
missing from their record.

## Commands

| Command | Action |
| :-- | :-- |
| `npm run dev` | Dev server on `localhost:3000` |
| `npm run build` | Production build |
| `npm test` | Run the test suite (Vitest) |
| `npm run typecheck` | Type-check without emitting |
| `npm run verify` | Both of the above — run this before pushing |
| `npm run bench` | Score the held-out corpus with the offline engine (free) |
| `npm run bench:full` | Score it with both engines (spends Anthropic credit) |

`npm test` does not type-check, so a broken type can pass the tests. `npm run verify` is the one that catches both.

## The API

One endpoint. Both clients use it, which is what keeps the keys off both of them.

```sh
curl -X POST http://localhost:3000/api/check \
  -H 'content-type: application/json' \
  -d '{"message":"ANZ: unusual activity. Verify at anz-secure.top"}'
```

```json
{
  "level": "scam",
  "headline": "This is a scam. Do not reply, do not tap the link.",
  "reasons": ["This message says it is from ANZ, but the link goes to anz-secure.top, which is not a real ANZ address."],
  "howToCheck": "To check for yourself: ring ANZ on 0800 269 296, which is their real number. Do not use any phone number or link in this message.",
  "reportTo": "If you want to help stop this: forward the message to 7726…",
  "escalationIsPrimary": false,
  "disclaimer": "This check is done by a computer and can be wrong…"
}
```

The internal suspicion score is never in the response. It exists for tuning and tests, and `?debug=1` returns it only outside production.

## Deploying

```sh
bash scripts/deploy.sh
```

Five stages: set a spend cap at Anthropic, run the tests and a real build, sign in to Vercel, push your keys up from `.env.local` and deploy, then send a known scam to the live site and check it comes back as one.

It sets the spend cap **before** it deploys anything. The app caps one caller at 20 checks per 10 minutes, but that lives in memory — it resets when the server restarts and does nothing about someone changing address. The provider's spend cap is the limit that cannot be out-run, because it is enforced where the money is. See [ADR 0011](./docs/adr/0011-rate-limiting-and-spend.md).

## Licence and contributing

Free software under the [GNU AGPL, version 3 or later](./LICENSE). The network-copyleft licence is deliberate: the risk worth guarding against is not somebody reading this code, it is somebody deploying a quietly degraded copy that a frightened person trusts. The AGPL covers use over a network, so a fork's users can demand its source. The app carries a link to that source in its own footer, which is section 13's requirement and also the only thing that makes the numbers above checkable by anyone but us — set `NEXT_PUBLIC_SOURCE_URL` before deploying.

The most useful contributions are not code. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) — a real scam text with a citation is worth more here than a refactor, because the benchmark's stated weakness is that the corpus is sixteen messages and only two of them are verbatim.

## Structure

```text
src/
├── domain/types.ts   the vocabulary from CONTEXT.md, as types
├── data/             the New Zealand lists — organisations, reporting, link reputation
├── engine/           the check itself: pure, offline, no framework
├── lookups/          Safe Browsing and redirect following
├── narrative/        the Claude client
├── trusted/          the escalation: the ask, the answer page's logic
└── api/              the endpoint, as a plain function of a Request
app/                  Next.js: the route, the web demo, and /asked
```

Nothing in `src/engine` imports a framework, a network client, or `app/`. That is what lets the whole check run in tests in milliseconds, with no mocks.

## Privacy

Messages are sent to the server to be checked and are not stored, logged, or kept afterwards. There are no accounts and no history. The Trusted Person's name and number, and the Checker's own, stay on the Checker's device — and when a Message is handed to a Trusted Person it travels inside the link's fragment, which browsers do not send to servers, so the escalation runs without us seeing any of it either (ADR 0013). Redacting names before sending was considered and rejected — it would delete the "Hi Mum, my phone broke" signal the narrative check exists to catch. See [ADR 0005](./docs/adr/0005-nothing-is-stored.md).

## Not done yet

- The Android app — the text-selection menu, share sheet, and quick-settings tile
- `ACTION_PROCESS_TEXT` behaviour on Android 15/16 needs confirming against a real device ([ADR 0004](./docs/adr/0004-entry-points.md))
- Effort is set to `medium` on judgement, not measurement — the benchmark corpus is too small to tune against
- Three scam shapes get through both engines: no link and no organisation named. See the end of `docs/benchmark-method.md`
- The benchmark corpus needs to be an order of magnitude larger, and sourced from real reported messages rather than reconstructions
- Rate limiting is in-memory only; a Vercel Firewall rule on `/api/check` would hold across restarts
- Reports are kept in SQLite, which is durable locally but **not** on a serverless host — a deployment there refuses reports (503) rather than losing them, until a hosted store is chosen
