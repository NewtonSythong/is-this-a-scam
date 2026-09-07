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

**A scam supplies its own proof**, so every answer points at a channel the message had no hand in choosing — ASB's own Caller Check, a bank's real number, or a number the person already has. See [ADR 0009](./docs/adr/0009-verified-route-back-to-the-organisation.md).

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

## Commands

| Command | Action |
| :-- | :-- |
| `npm run dev` | Dev server on `localhost:3000` |
| `npm run build` | Production build |
| `npm test` | Run the test suite (Vitest) |
| `npm run typecheck` | Type-check without emitting |
| `npm run verify` | Both of the above — run this before pushing |

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

## Structure

```text
src/
├── domain/types.ts   the vocabulary from CONTEXT.md, as types
├── data/             the New Zealand lists — organisations, reporting, link reputation
├── engine/           the check itself: pure, offline, no framework
├── lookups/          Safe Browsing and redirect following
├── narrative/        the Claude client
└── api/              the endpoint, as a plain function of a Request
app/                  Next.js: the route, and the web demo
```

Nothing in `src/engine` imports a framework, a network client, or `app/`. That is what lets the whole check run in tests in milliseconds, with no mocks.

## Privacy

Messages are sent to the server to be checked and are not stored, logged, or kept afterwards. There are no accounts and no history. Redacting names before sending was considered and rejected — it would delete the "Hi Mum, my phone broke" signal the narrative check exists to catch. See [ADR 0005](./docs/adr/0005-nothing-is-stored.md).

## Not done yet

- The Android app — the text-selection menu, share sheet, and quick-settings tile
- `ACTION_PROCESS_TEXT` behaviour on Android 15/16 needs confirming against a real device ([ADR 0004](./docs/adr/0004-entry-points.md))
- Effort is set to `medium` on judgement, not measurement — it needs a real corpus to tune against
- The live path has been exercised by hand, not by anything repeatable: there is no end-to-end check that runs the real engines against known messages and fails if a verdict changes
- Rate limiting is in-memory only; a Vercel Firewall rule on `/api/check` would hold across restarts
- Reports are kept in SQLite, which is durable locally but **not** on a serverless host — a deployment there refuses reports (503) rather than losing them, until a hosted store is chosen
