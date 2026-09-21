/**
 * Does Jev cry wolf? The legitimate messages, asked the same questions.
 *
 * As of 2026-09-21 there are 28 of them, fifteen of which are genuine New Zealand
 * messages captured from real inboxes rather than written by us. The counts below
 * are computed from the corpus, not hard-coded, so this file does not go stale
 * when more are added — but the prose does, so treat any number written in a
 * comment here as a date-stamped observation rather than a fact.
 *
 *   npm run bench:jev:legit        free until 25 Sep 2026, about a cent after
 *
 * Read the stage-one section of `docs/jev-spike.md` first. In short: Jev found
 * 83.4% of the scams in the IMC25 dev half, but `benefit-expiry-pretext` fired on
 * 73 of 145 messages, which is not credible for a pattern describing one specific
 * pretext. On a corpus where every message is a scam, a model that reaches for the
 * nearest label scores exactly like a model that is right, and nothing in that run
 * can tell the two apart.
 *
 * These can. They are the only false-alarm evidence this project has, and they are
 * the cheapest measurement that can kill the 83.4% outright: if Jev fires on
 * genuine messages the way it fires on scams, the recall was noise and no further
 * money needs spending on the spike.
 *
 * It did, twice. On the original thirteen it alarmed at eight. On the enlarged 28
 * it alarmed at twenty-one, and — this is the part the thirteen could not show —
 * it alarmed *harder* on the real messages than on ours. Our invented hard
 * negatives drew 0.51 to 0.67; the genuine ones drew 0.83, 0.88, 0.91. We wrote
 * negatives we thought were difficult and they turned out to be the easy half.
 *
 * ## Why quiet is the score here, and recall is not
 *
 * Every message in `bench/corpus.ts`'s legitimate half is one the app must NOT
 * alarm at. So a pattern firing is a fault, and the right reading is the *pair* of
 * columns this prints: the quiet rate here beside the recall already bought on the
 * dev half. A cut-off is only interesting where both are good, and either column
 * alone can be made perfect by moving the threshold to an extreme.
 *
 * ## What this is not
 *
 * Twenty-eight messages still cannot measure a false-alarm *rate* — the interval
 * on twenty-eight items is too wide to publish a percentage from, and thirteen of
 * them are still our own prose. This is a smoke test. It can say "this fires on
 * genuine messages", which is decisive; it cannot say "this fires on 75% of
 * genuine messages", which would be a number with very little underneath it.
 *
 * The 2026-09-21 additions moved the bottleneck without clearing it. Fifty to a
 * hundred genuine New Zealand messages remains the target; fifteen of them now
 * exist, and the first fifteen were enough to change the conclusion, which is the
 * best argument there is for finding the rest.
 */

import { existsSync } from "node:fs";

import { NARRATIVE_PATTERNS } from "../src/engine/narrative";
import { CORPUS } from "./corpus";
import { loadCorpus, splitOf } from "./corpus-imc25";
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

const items = CORPUS.filter((item) => item.kind === "legitimate");
const hardNegatives = items.filter((item) => item.hardNegative === true).length;

const cached = readCache();
const remaining = items.filter((i) => !cached.has(cacheKeyFor(i.message))).length;

console.log("");
console.log(`Corpus     ${items.length} legitimate messages from bench/corpus.ts (${hardNegatives} hard negatives)`);
console.log(`Model      ${JEV_MODEL}  (NOT the model the app runs on — this is a spike)`);
console.log(`Questions  ${NARRATIVE_PATTERNS.length}, asked in one request per message`);
console.log(`Cached     ${items.length - remaining} already answered and paid for`);
console.log(`To buy     ${remaining}`);
if (remaining > 0) console.log(`Very roughly $${((remaining * 1900 * 0.042) / 1_000_000).toFixed(4)}`);
if (remaining === 0) console.log("Nothing to buy. Reporting from cache.");
console.log("");

/**
 * Failures that will never come right by waiting — the same vocabulary the IMC25
 * runner refuses to retry, for the same reason. Retrying these turns one clear
 * problem into hundreds of vague ones.
 */
const HOPELESS =
	/customer_verification_required|permission_denied|authentication|unauthorized|invalid_request|insufficient|budget|not found/i;

const results: { id: string; probabilities: PatternProbabilities }[] = [];
let spent = 0;
let bought = 0;

// Sequential, because thirteen messages do not need a worker pool and a pool is
// one more place for a partial run to hide. Each answer is cached the moment it
// arrives, so stopping below costs nothing that was already paid for.
for (const item of items) {
	const key = cacheKeyFor(item.message);
	const already = cached.get(key);
	if (already !== undefined) {
		results.push({ id: item.id, probabilities: already });
		continue;
	}

	for (let attempt = 1; ; attempt++) {
		try {
			const reading = await jevProbabilities(item.message);
			appendCache(key, item.id, reading.probabilities);
			results.push({ id: item.id, probabilities: reading.probabilities });
			spent += reading.cost;
			bought += 1;
			break;
		} catch (error) {
			const why = error instanceof Error ? error.message : String(error);
			// No score from a partial run. On a corpus this small one missing answer
			// is several percent of the only false-alarm evidence there is, and a
			// quiet rate computed over the remainder would not say so.
			if (HOPELESS.test(why) || attempt >= 4) {
				console.error(`\nStopped at ${item.id}: ${why.slice(0, 300)}`);
				console.error("Answers bought so far are cached and reused next run. No score reported.");
				process.exit(1);
			}
			await new Promise((r) => setTimeout(r, 2 ** attempt * 1000 + Math.random() * 500));
		}
	}
}

const pct = (n: number, d: number) => (d === 0 ? "  n/a" : `${((n / d) * 100).toFixed(1)}%`);
const THRESHOLDS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

/**
 * The scam-side column, recomputed from the cache the dev run already paid for.
 *
 * Free, and it belongs beside the quiet rate rather than in a second report: the
 * threshold is a trade between these two columns, and reading either one alone is
 * how a cut-off gets chosen badly. `dev` only — the test half is the only
 * instrument this project has left and nothing here may read it.
 */
const devRecall = new Map<number, string>();
try {
	const answered = splitOf(loadCorpus(), "dev")
		.map((i) => cached.get(cacheKeyFor(i.message)))
		.filter((p): p is PatternProbabilities => p !== undefined);
	for (const t of THRESHOLDS) {
		if (answered.length === 0) break;
		const found = answered.filter((p) => firedAt(p, t).length > 0).length;
		devRecall.set(t, `${pct(found, answered.length)} of ${answered.length}`);
	}
} catch {
	// No IMC25 csv to hand, or nothing cached against it. The quiet column stands
	// on its own; it is the measurement this runner exists for.
}

console.log("FALSE ALARMS  (a message counts as alarmed when any pattern fires — here that is a fault)");
console.log("  cut-off   quiet           mean patterns   scams found (dev, from cache)");
for (const t of THRESHOLDS) {
	const fired = results.map((r) => firedAt(r.probabilities, t));
	const quiet = fired.filter((f) => f.length === 0).length;
	const mean = fired.reduce((a, f) => a + f.length, 0) / (fired.length || 1);
	console.log(
		`  ${t.toFixed(1)}       ${String(quiet).padStart(2)}/${String(results.length).padEnd(2)}  ${pct(quiet, results.length).padEnd(7)}  ${mean.toFixed(2).padStart(5)}           ${devRecall.get(t) ?? "—"}`,
	);
}

console.log("");
console.log("Both columns have to be good at the same cut-off. Quiet alone is bought by a");
console.log("threshold so high that nothing fires; recall alone by one so low that everything");
console.log("does. Neither is a result on its own.");

const REPORT_AT = 0.5;
console.log(`\nMESSAGE BY MESSAGE, at a ${REPORT_AT} cut-off`);
for (const r of results) {
	const fired = firedAt(r.probabilities, REPORT_AT);
	if (fired.length === 0) {
		console.log(`  ${r.id.padEnd(30)} quiet`);
		continue;
	}
	const named = fired.map((id) => `${id} ${(r.probabilities[id] ?? 0).toFixed(2)}`).join(", ");
	console.log(`  ${r.id.padEnd(30)} FIRED  ${named}`);
}

console.log(`\nPATTERNS THAT FIRED ON GENUINE MESSAGES, at a ${REPORT_AT} cut-off`);
const tally = new Map<string, number>();
for (const r of results) {
	for (const id of firedAt(r.probabilities, REPORT_AT)) tally.set(id, (tally.get(id) ?? 0) + 1);
}
for (const p of NARRATIVE_PATTERNS) {
	const n = tally.get(p.id) ?? 0;
	if (n > 0) console.log(`  ${p.id.padEnd(32)} ${n}/${results.length}`);
}
if (tally.size === 0) console.log("  none — nothing fired on any genuine message at this cut-off");

console.log(`\nSPENT: $${spent.toFixed(5)} on ${bought} call(s), as reported by the gateway.`);
console.log("");
console.log("This many messages cannot produce a false-alarm rate — see the header of this");
console.log("file. What they can do is say no. Record whatever comes back in");
console.log("docs/jev-spike.md, including and especially a result that ends the spike.");
