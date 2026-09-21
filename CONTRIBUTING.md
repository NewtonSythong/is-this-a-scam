# Contributing

This app tells people who are frightened, and often not confident with a phone, whether a message is trying to rob them. That single fact decides everything below.

## What helps most, in order

**1. A genuine New Zealand message that should *not* raise an alarm.** This is
now the bottleneck, and it is the one nobody expects. The corpus holds 27
messages — 14 scams and 13 legitimate — and against those 13 the language model's
half has raised **exactly one false alarm**, on 2026-09-18, from a pattern that
had been shipping clean for nine days. One in thirteen is not a rate. A model
that shouted at one real message in twenty would still come through these
thirteen clean about half the time, so a clean sweep here says almost nothing and
the one hit we did get was luck rather than coverage. The number that decides
whether this app is usable is how often it shouts at ordinary mail, and it is
exactly the number this corpus is least able to see.

How little it can see was made concrete on 2026-09-21. A candidate model scored
83.4% on 145 real scams and looked like a clear win; asked the same questions
about these thirteen genuine messages it alarmed at **eight of them** — a
tradesman saying he was running late, a courier saying a parcel was at the door,
a bank's own two-factor code. Thirteen messages were enough to find that, and
that is the argument for the thirteen. They were nowhere near enough to say how
often it would happen in a real inbox, and that is the argument for the hundred.
See [`docs/jev-spike.md`](./docs/jev-spike.md).

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

## Resources that would unlock the most

Written down because most of what this project is short of is not code, and
someone reading this may be one email away from something no amount of work here
can produce. In rough order of what it would change:

- **Fifty to a hundred genuine New Zealand text messages**, redacted, with the
  sender named and the date you received them. This is item 1 above and it is
  still the single highest-value thing anyone could add. No special access is
  needed — everyone's phone already holds them.
- **Reported scam text from the DIA's 7726 service or CERT NZ.** They hold the
  only large body of real New Zealand scam messages that exists, and they publish
  counts rather than text. Anyone who could ask them for even a redacted sample,
  or say what the process for asking is, would move this further than a year of
  pattern-writing. The 292 messages in `bench/imc25.csv` are real and published,
  but they are not New Zealand's.
- **One real bank text about a payment you did not make**, as published text or a
  legible screenshot. The `unauthorised-payment-pretext` pattern is the only
  unvalidated pattern in the engine, and it is the one that sits closest to a
  genuine bank message.
- **API credit.** Measurement is the expensive part, not inference: scoring the
  held-out 146 with the shipping model costs about $2.19 a run, and a catalogue
  change empties the cache and costs a full one. Several questions this project
  has left open are open because nobody wants to spend $4.38 to answer them.
- **Someone who receives scam texts in te reo Māori, or in a language other than
  English.** The engine reads English. Nothing here knows how badly it fails on
  anything else, which is a gap in who the app is for rather than in its accuracy.
- **A person who works in bank or telco fraud**, for half an hour. Every pattern
  in the catalogue was written from published descriptions by someone who has
  never seen the inside of a fraud team. Which pretexts are actually common — and
  which of ours are museum pieces — is knowledge that exists and is not written
  down anywhere we can read.

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
- **Do not tune the engine against the benchmark corpus.** Nothing in `src/` may import `bench/`. The moment the engine is developed against those 27 messages they stop measuring anything, and the number in the README becomes a claim about our own imagination. Fix a miss by principle, then see whether the fix generalises to cases you did not look at.
- **Read the dev half. Never read the test half.** The 292 real messages in [`bench/imc25.csv`](./bench/imc25.csv) are cut permanently in two by `--split`. The `dev` half is there to be read: study its misses, write patterns from them, iterate as often as you like, and understand that its score is not this project's number and never will be. The `test` half is only ever *scored*. Do not print it, page through it, or open the CSV looking for the ids a run listed as missed — the moment you read one, the only instrument this project has for telling a real improvement from a memorised one is gone, and nothing can bring it back. `npm run bench:imc25:test` prints miss ids without their text on purpose. This rule exists because the corpus before it, `bench/corpus.ts`, died exactly this way: every miss it ever found was fixed by somebody reading the message that produced it, and it now passes everything by construction.

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
npm run bench:full        # score the corpus with both engines (spends credit)
npm run bench:narrative    # score the model's half alone, scams and legitimate (spends credit)
npm run bench:imc25:dev    # 146 real scams you may read the misses of (spends credit)
npm run bench:imc25:test   # the other 146, scored and never read — this is the number
```

Every run prints what it will cost before it spends anything, and saves each
answer as it arrives, so a run can be abandoned while it is still free and
resumed without paying twice. The cache key includes the whole system prompt, so
touching a single pattern empties it — which is correct, and is why a catalogue
change costs a full run rather than a cheap one.

`npm test` does not type-check, so a broken type can pass the tests. `npm run verify` is the one that catches both.

Run `bench:narrative` whenever you touch a narrative pattern. The main benchmark
cannot see your change: most real scam texts carry a lookalike domain, so the
deterministic rules reach `scam` without the model being consulted, and a pattern
you have broken will not move the headline number at all.

## Licence

By contributing you agree your work is licensed under the [GNU AGPL, version 3 or later](./LICENSE), the same as the rest of the project.
