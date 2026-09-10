# Contributing

This app tells people who are frightened, and often not confident with a phone, whether a message is trying to rob them. That single fact decides everything below.

## What helps most, in order

**1. A genuine New Zealand message that should *not* raise an alarm.** This is
now the bottleneck, and it is the one nobody expects. The corpus holds 23
messages — 13 scams and 10 legitimate — and against those 10 the language model's
half raised **no false alarm at all**, on either model it was tried on. That
sounds like a finished result and is not one: a model that shouted at one real
message in twenty would still return a clean sweep of ten about three times in
five. The number that decides whether this app is usable is how often it shouts
at ordinary mail, and it is exactly the number this corpus is least able to see.

Closing that needs roughly **fifty to a hundred genuine New Zealand messages of
the awkward kind** — bank notifications, courier updates, government mail,
appointment reminders, anything that legitimately carries a link or a deadline.
They are not hard to find, because everyone's phone is full of them; they are
just nobody's idea of a contribution. Redact your own details and say who sent
it. They go in the `LEGITIMATE` array in [`bench/corpus.ts`](./bench/corpus.ts),
under the same `provenance` and `source` rules as the scams below. See [`docs/benchmark-method.md`](./docs/benchmark-method.md) for what this
currently blocks: the app runs on a model costing five times what the cheaper one
does, the cheaper one scored *higher* on held-out scams, and there is no
false-alarm evidence sharp enough to justify the switch either way.

**2. A real scam message, with a citation.** New Zealand publishes almost no scam
text. Banks, NZ Post and IRD publish annotated screenshots; CERT NZ publishes
quarterly counts; the DIA's 7726 service took over 114,000 reports in two months
of 2021 and published none of them as text. Of the 13 scams in
[`bench/corpus.ts`](./bench/corpus.ts), 7 could be sourced verbatim and the rest
are reconstructions from published descriptions. A real one with a citation is
worth more than any amount of code.

This is less desperate than it was — [`bench/imc25.csv`](./bench/imc25.csv) now
holds 292 real reported smishing texts from a published research dataset, so the
engine is no longer measured only against messages this project has read. But
that dataset is not a New Zealand one, and the NZ-specific impersonations it
cannot cover are the ones this app exists for.

**The single most wanted message right now** is a real bank text reporting a
payment you did not make and sending you to a link or number to dispute it. The
`unauthorised-payment-pretext` pattern was written from a reconstruction, it sits
closer to a genuine bank message than any other pattern, and no real example has
been found published as text or as a legible screenshot. It is the one
unvalidated pattern in the engine.

Where the organisation publishes a screenshot rather than text — which is nearly
always — transcribing it by eye is a legitimate and useful contribution. Say so
in the `source` field, name the image, and give the date you read it, so the next
person can re-check your transcription.

Add it to [`bench/corpus.ts`](./bench/corpus.ts) with its `provenance` set honestly:

- `verbatim` — the exact words, as published by the organisation impersonated or by a reporting body. The only tier free of authorship bias.
- `reconstructed` — written from a published description of a real scam, with the source recorded.
- `synthetic` — invented. Labelled as such wherever it appears in the results, so a reader can discount it.

**3. A New Zealand organisation that is missing or wrong.** [`src/data/knownOrganisations.nz.ts`](./src/data/knownOrganisations.nz.ts) holds who they are, the domains they genuinely own, and the number a person should actually ring.

> **Never add a phone number you have not read on that organisation's own website, and record where you read it.** A wrong number here sends a frightened person to a stranger at the exact moment they have decided to trust us. `phone: null` is a correct answer; a guess is not. The same goes for `verifiedRoute` — telling someone to use a verification feature that does not exist is worse than telling them nothing.

The benchmark has already caught one of these: a genuine NZ Post tracking text came back as a scam because `nzp.st`, NZ Post's own shortener, was missing from their record.

**4. A scam pattern for the library.** [`src/data/scamLibrary.nz.ts`](./src/data/scamLibrary.nz.ts) is read twice — once by a person browsing what is going around, and once by the test suite proving the engine still catches it. Every entry needs a `source` citing where the scam was documented. That requirement is a defence, not paperwork: without it, anyone could flood the review queue with genuine bank messages and eventually teach the app to cry wolf on real ones.

**5. Code.** Start with the three scams that still get through both engines, listed at the end of [`docs/benchmark-method.md`](./docs/benchmark-method.md). They share one shape — no link worth checking and no organisation named — so only the Narrative Check can reach them.

## The rules that are not up for discussion

These are decisions with reasons written down in [`docs/adr/`](./docs/adr). Disagree with one by arguing with its ADR, not by working around it in a pull request.

- **The app never says a message is safe.** There are three answers — *this is a scam*, *this has warning signs*, *we can't tell* — and no fourth one meaning "looks fine". A false reassurance costs someone their savings; a false warning costs them a phone call. [ADR 0001](./docs/adr/0001-never-say-safe.md)
- **The worse of the two engines wins, always.** Never an average. [ADR 0003](./docs/adr/0003-two-engines-worst-verdict-wins.md)
- **The model cannot write its own sentences.** It picks from a fixed catalogue and quotes the words that made it pick; a quote that does not appear in the message is discarded. Hallucination is something the code catches, not something the reader has to notice. [ADR 0010](./docs/adr/0010-narrative-check-provider.md)
- **A check stores nothing.** No accounts, no history, no log line, nothing written to disk. The single exception is a message somebody deliberately chose to report. [ADR 0005](./docs/adr/0005-nothing-is-stored.md), [ADR 0012](./docs/adr/0012-reporting-is-the-one-exception.md)
- **The palette is held to its contrast by a test.** `app/palette.test.ts` reads
  the tokens out of `globals.css` and asserts 4.5:1 for text and 3:1 for the
  border of any control someone has to find. If you change a colour and that
  test fails, the colour is wrong — nobody notices a faint border on the machine
  they designed it on, and the people who do notice will not file an issue.
  `--edge` separates things and is exempt; `--field` bounds controls and is not.
- **Do not tune the engine against the benchmark corpus.** Nothing in `src/` may import `bench/`. The moment the engine is developed against those 23 messages they stop measuring anything, and the number in the README becomes a claim about our own imagination. Fix a miss by principle, then see whether the fix generalises to cases you did not look at.

## Writing for the reader

The person reading this app's output is frightened. Words like "URL", "domain", "phishing" and "verify" do not appear in anything a Checker sees — it is "link", "the message", "the person who sent this". Advice is imperative and unconditional: *ring them on a number you already have*, not *you may wish to consider independently verifying*. The rate-limit message has a test asserting it contains none of "rate limit", "429", "quota" or "throttled", which is the standard the rest of the copy is held to.

## Running it

```sh
npm install
npm run dev        # http://localhost:3000 — no API keys needed
npm run verify     # tests and type-check; run this before pushing
npm run bench      # score the held-out corpus offline (free)
```

```sh
npm run bench:full       # score the corpus with both engines (spends credit)
npm run bench:narrative  # score the model's half alone (spends credit)
```

`npm test` does not type-check, so a broken type can pass the tests. `npm run verify` is the one that catches both.

Run `bench:narrative` whenever you touch a narrative pattern. The main benchmark
cannot see your change: most real scam texts carry a lookalike domain, so the
deterministic rules reach `scam` without the model being consulted, and a pattern
you have broken will not move the headline number at all.

## Licence

By contributing you agree your work is licensed under the [GNU AGPL, version 3 or later](./LICENSE), the same as the rest of the project.
