/**
 * Stage one of the Jev spike: does a typed decision model pick the same patterns?
 *
 *   npm run bench:jev          the dev half, about $0.006
 *
 * Read `docs/jev-spike.md` first. In short: Jev cannot quote, so it can never be
 * the whole Narrative Check — but if it can decide *which* patterns are present
 * as well as Opus does, then Opus only has to be called for the patterns it
 * picks, and a full 292-message run stops costing $4.38.
 *
 * ## Why this scores the same way `narrative-imc25.ts` does
 *
 * A message counts as found when at least one pattern fires, exactly as there.
 * The two reports are meant to be read side by side and a different scoring rule
 * would make that comparison a lie.
 *
 * ## Why the cache holds probabilities and not decisions
 *
 * Jev answers with a number between 0 and 1 per pattern. The cut-off that turns
 * that into "fired" is precisely what nobody knows yet. Storing the raw numbers
 * means every candidate cut-off is scored locally, for free, from one paid pass
 * — and the sweep printed at the end costs nothing beyond the run itself.
 */

import { existsSync } from "node:fs";

import { NARRATIVE_PATTERNS } from "../src/engine/narrative";
import { type Item, loadCorpus, splitFromArgv, splitOf } from "./corpus-imc25";
import {
	JEV_MODEL,
	type PatternProbabilities,
	appendCache,
	cacheKeyFor,
	firedAt,
	jevProbabilities,
	readCache,
} from "./jev";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const all = loadCorpus();
const SPLIT = splitFromArgv(process.argv);

// The spike compares two implementations, and choosing between implementations
// on the held-out half is model selection on the test set — which is how
// `bench/corpus.ts` died. The refusal is mechanical because good intentions
// were not enough last time.
if (SPLIT !== "dev") {
	throw new Error(
		"bench/jev-imc25.ts runs on --split dev only.\n" +
			"Comparing two engines on the test half spends the only instrument this project has.\n" +
			"See docs/jev-spike.md.",
	);
}

const items = splitOf(all, SPLIT);

/**
 * Answers already paid for, keyed and stored by `bench/jev.ts` so that this
 * runner and `bench/jev-legit.ts` share one cache rather than two.
 */
const cached = readCache();
const keyFor = cacheKeyFor;

const remaining = items.filter((i) => !cached.has(keyFor(i.message))).length;
console.log("");
console.log(`Corpus     ${items.length} messages  (${SPLIT} half of ${all.length})`);
console.log(`Model      ${JEV_MODEL}  (NOT the model the app runs on — this is a spike)`);
console.log(`Questions  ${NARRATIVE_PATTERNS.length}, asked in one request per message`);
console.log(`Cached     ${items.length - remaining} already answered and paid for`);
console.log(`To buy     ${remaining}`);
// ~1,900 input tokens per call: the fourteen pattern descriptions plus a message.
// Output is free on this model. Order of magnitude, not a quote — the real
// figure comes back from the gateway and is reported at the end.
if (remaining > 0) console.log(`Very roughly $${((remaining * 1900 * 0.042) / 1_000_000).toFixed(4)}`);
if (remaining === 0) console.log("Nothing to buy. Reporting from cache.");
console.log("");

// Matches the Anthropic harness. Modest, so a benchmark cannot look like an
// attack on the API — and the upstream provider has already returned 429 once
// at four.
const CONCURRENCY = 2;

const queue: Item[] = [...items];
const results: { item: Item; probabilities: PatternProbabilities }[] = [];
const failures: { item: Item; why: string }[] = [];
const run: { fatal: string | null } = { fatal: null };
let spent = 0;
let bought = 0;
let done = 0;

/**
 * Failures that will never come right by waiting.
 *
 * Retrying these turns one clear problem into hundreds of vague ones — the
 * Anthropic harness learned that the hard way and the comment there is worth
 * reading. Both of this runner's real failures so far belong here: the billing
 * refusal before a card existed, and `permission_denied` for asking a hobby plan
 * to enforce zero data retention. Neither improves on the fifth attempt.
 */
const HOPELESS =
	/customer_verification_required|permission_denied|authentication|unauthorized|invalid_request|insufficient|budget|not found/i;

async function worker() {
	for (;;) {
		const item = queue.shift();
		if (item === undefined) return;

		const key = keyFor(item.message);
		const already = cached.get(key);
		if (already !== undefined) {
			results.push({ item, probabilities: already });
			done += 1;
			continue;
		}

		let attempt = 0;
		for (;;) {
			try {
				const reading = await jevProbabilities(item.message);
				appendCache(key, item.id, reading.probabilities);
				results.push({ item, probabilities: reading.probabilities });
				spent += reading.cost;
				bought += 1;
				break;
			} catch (error) {
				attempt += 1;
				const why = error instanceof Error ? error.message : String(error);

				if (HOPELESS.test(why)) {
					// Set the work down rather than calling process.exit() here:
					// exiting mid-await trips a libuv assertion on Windows and
					// loses answers already paid for. This runner did exactly
					// that on its first failure.
					run.fatal = why;
					queue.length = 0;
					break;
				}
				if (attempt >= 5) {
					// A failed call is not a miss. Counting it as one would
					// understate the model every time the provider was busy.
					failures.push({ item, why });
					break;
				}
				await new Promise((r) => setTimeout(r, 2 ** attempt * 1000 + Math.random() * 500));
			}
		}
		done += 1;
		if (done % 25 === 0) process.stderr.write(`  ${done}/${items.length}\n`);
	}
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

if (run.fatal !== null) {
	console.error("");
	console.error("Stopped: this will not come right by retrying.");
	console.error(`  ${run.fatal.slice(0, 300)}`);
	console.error("");
	console.error(`${results.length} of ${items.length} answered, saved to the Jev cache and reused next run.`);
	console.error("No score is reported, because a score from a partial run is not a score.");
	process.exitCode = 1;
} else {

const pct = (n: number, d: number) => (d === 0 ? "  n/a" : `${((n / d) * 100).toFixed(1)}%`);

/** The sweep. Free, because the probabilities are already bought. */
const THRESHOLDS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

console.log("RECALL BY THRESHOLD  (a message counts as found when any pattern fires)");
console.log("  cut-off   found        mean patterns per message");
for (const t of THRESHOLDS) {
	const fired = results.map((r) => firedAt(r.probabilities, t));
	const found = fired.filter((f) => f.length > 0).length;
	const mean = fired.reduce((a, f) => a + f.length, 0) / (fired.length || 1);
	console.log(
		`  ${t.toFixed(1)}       ${String(found).padStart(3)}/${String(results.length).padEnd(3)}  ${pct(found, results.length)}      ${mean.toFixed(2)}`,
	);
}

console.log("");
console.log("The mean matters as much as the recall. The saving in the hybrid comes entirely");
console.log("from messages Jev finds nothing in, because those never reach Opus. A cut-off");
console.log("that fires on everything scores well here and saves nothing.");

const REPORT_AT = 0.5;
console.log(`\nBY SCAM TYPE, at a ${REPORT_AT} cut-off`);
const byType = new Map<string, { seen: number; total: number }>();
for (const r of results) {
	const e = byType.get(r.item.scamType) ?? { seen: 0, total: 0 };
	e.total += 1;
	if (firedAt(r.probabilities, REPORT_AT).length > 0) e.seen += 1;
	byType.set(r.item.scamType, e);
}
for (const [type, e] of [...byType].sort((a, b) => b[1].total - a[1].total)) {
	console.log(`  ${type.padEnd(14)} ${String(e.seen).padStart(3)}/${String(e.total).padEnd(3)}  ${pct(e.seen, e.total)}`);
}

console.log(`\nPATTERNS THAT FIRED, at a ${REPORT_AT} cut-off`);
const patterns = new Map<string, number>();
for (const r of results) for (const id of firedAt(r.probabilities, REPORT_AT)) patterns.set(id, (patterns.get(id) ?? 0) + 1);
for (const p of NARRATIVE_PATTERNS) {
	console.log(`  ${p.id.padEnd(32)} ${patterns.get(p.id) ?? 0}`);
}

console.log(`\nSPENT: $${spent.toFixed(5)} on ${bought} call(s), as reported by the gateway.`);
console.log("");
console.log("Compare against the Opus dev-half figure, and read docs/jev-spike.md before");
console.log("believing the comparison: the published 62.3% predates the current catalogue,");
console.log("so this is indicative only. The honest head-to-head needs a fresh Opus dev run.");
console.log("");
console.log("RECALL ONLY. Every message here is a scam. Nothing here says whether Jev cries");
console.log("wolf, and a cheap model that fires eagerly is exactly what this corpus cannot see.");

if (failures.length > 0) {
	console.log("");
	console.log(`${failures.length} call(s) never succeeded and are EXCLUDED, not counted as misses:`);
	for (const f of failures) console.log(`  ${f.item.id}  ${f.why.slice(0, 80)}`);
}
}

