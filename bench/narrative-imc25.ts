/**
 * Runs the Narrative Check alone over the IMC 2025 held-out corpus.
 *
 *   npm run bench:imc25            spends Anthropic credit, one call per message
 *
 * That is 292 calls per run, and a run is not free. Check the balance before
 * starting one: an exhausted balance halfway through does not read as an error,
 * it reads as a lower score, because a call that never happened looks exactly
 * like a message the engine found nothing in. This script stops dead rather than
 * report a number computed from a partial run — see the catch below.
 *
 * ## Why this exists
 *
 * `bench/corpus.ts` is spent. Every miss it ever showed has since been fixed by
 * someone reading the message that produced it, so those items now pass by
 * construction and the report says so. A held-out corpus is a wasting asset and
 * that one is spent; this is a fresh one, from messages nobody on this project
 * has read.
 *
 * It is built from public user reports of real smishing (see
 * `bench/build-imc25.mjs` for the source, the licence and what was excluded),
 * and every message in it survived anonymisation without a word being invented.
 *
 * ## What it can and cannot tell you
 *
 * It measures **recall only**: how often the model's half finds something in a
 * message that really is a scam. It CANNOT measure false alarms, because every
 * message in it is a scam. That half of the picture still rests entirely on the
 * eight legitimate messages in `bench/corpus.ts`, and a good number here means
 * nothing on its own — an engine that shouted at everything would score 100%.
 *
 * Read the two together, always: `npm run bench:narrative` for the false-alarm
 * side, this for the recall side.
 */

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

import Anthropic from "@anthropic-ai/sdk";
import { NARRATIVE_MODEL, anthropicNarrativeCheck, systemPrompt } from "../src/narrative/anthropic";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

if (!process.env.ANTHROPIC_API_KEY) {
	throw new Error("bench/narrative-imc25.ts needs ANTHROPIC_API_KEY — it is the thing being measured");
}

interface Item {
	id: string;
	tier: string;
	scamType: string;
	message: string;
}

function parseCsv(csv: string): string[][] {
	const out: string[][] = [];
	let row: string[] = [], field = "", quoted = false;
	for (let i = 0; i < csv.length; i++) {
		const c = csv[i];
		if (quoted) {
			if (c === '"' && csv[i + 1] === '"') { field += '"'; i++; }
			else if (c === '"') quoted = false;
			else field += c;
		} else if (c === '"') quoted = true;
		else if (c === ",") { row.push(field); field = ""; }
		else if (c === "\n") { row.push(field); out.push(row); row = []; field = ""; }
		else if (c !== "\r") field += c;
	}
	if (field !== "" || row.length > 0) { row.push(field); out.push(row); }
	return out;
}

const rows = parseCsv(readFileSync("bench/imc25.csv", "utf8")).slice(1).filter((r) => r.length >= 5);
const items: Item[] = rows.map((r) => ({ id: r[0], tier: r[1], scamType: r[2], message: r[4] }));

/** `--model claude-haiku-4-5` to price a run differently. See the note below. */
const modelArg = process.argv.indexOf("--model");
const MODEL = modelArg === -1 ? NARRATIVE_MODEL : process.argv[modelArg + 1];

const narrative = anthropicNarrativeCheck(new Anthropic(), MODEL);

/**
 * Answers already paid for, so a run that stops halfway — for a rate limit, an
 * exhausted balance, a closed laptop — resumes instead of being bought twice.
 *
 * The key is the model, the *whole* system prompt and the message. That is the
 * important part: the system prompt contains the pattern catalogue, so adding or
 * editing a single pattern changes every key and the cache empties itself. A
 * cache keyed on the message alone would silently serve answers from the engine
 * as it was before the change, and the run would report a mixture of two
 * engines as though it were one reading.
 *
 * Delete `bench/.imc25-cache.jsonl` to force a clean run.
 */
const CACHE = "bench/.imc25-cache.jsonl";
const fingerprint = createHash("sha256").update(`${MODEL}\u0000${systemPrompt()}`).digest("hex").slice(0, 16);
const keyFor = (message: string) =>
	createHash("sha256").update(`${fingerprint}\u0000${message}`).digest("hex").slice(0, 24);

const cached = new Map<string, string[]>();
if (existsSync(CACHE)) {
	for (const line of readFileSync(CACHE, "utf8").split("\n")) {
		if (line.trim() === "") continue;
		try {
			const row = JSON.parse(line) as { key: string; fired: string[] };
			cached.set(row.key, row.fired);
		} catch {
			// A half-written final line after a hard kill. Everything before it
			// is still good, so read what parses and carry on.
		}
	}
}

/** Modest, so a benchmark run cannot look like an attack on the API. */
const CONCURRENCY = 2;

// Said before anything is spent, not after, so a run can be abandoned while it
// is still free. Rates are the published per-MTok prices for the two models this
// is normally run against; they are a guide to the order of magnitude, not a
// quote, and thinking tokens bill as output so the real figure runs higher.
const RATES: Record<string, { input: number; output: number }> = {
	"claude-opus-5": { input: 5, output: 25 },
	"claude-haiku-4-5": { input: 1, output: 5 },
};

{
	const remaining = items.filter((i) => !cached.has(keyFor(i.message))).length;
	const rate = RATES[MODEL];
	console.log("");
	console.log(`Corpus     ${items.length} messages`);
	console.log(`Model      ${MODEL}${MODEL === NARRATIVE_MODEL ? "  (the model the app runs on)" : "  (NOT the model the app runs on)"}`);
	console.log(`Cached     ${items.length - remaining} already answered and paid for`);
	console.log(`To buy     ${remaining}`);
	if (rate !== undefined && remaining > 0) {
		// ~1,000 input tokens per call (a ~936-token system prompt plus the
		// message) and a few hundred out once thinking is counted.
		const dollars = (remaining * 1000 * rate.input + remaining * 400 * rate.output) / 1_000_000;
		console.log(`Very roughly $${dollars.toFixed(2)} — order of magnitude only`);
	}
	if (remaining === 0) console.log("Nothing to buy. Reporting from cache.");
	console.log("");
}

const queue: Item[] = [...items];
const results: { item: Item; fired: string[]; failed: boolean; why?: string }[] = [];
let done = 0;
let reused = 0;
let fatal: string | null = null;

async function worker() {
	for (;;) {
		const item = queue.shift();
		if (item === undefined) return;
		// Rate limits are the normal case at this size, not an exception, so a
		// call is retried with a widening pause before it is given up on. A
		// benchmark that silently drops two thirds of its corpus reports a
		// number computed from whatever happened to get through, which is worse
		// than reporting nothing.
		const key = keyFor(item.message);
		const already = cached.get(key);
		if (already !== undefined) {
			results.push({ item, fired: already, failed: false });
			reused += 1;
			done += 1;
			continue;
		}

		let attempt = 0;
		for (;;) {
			try {
				const signals = await narrative(item.message);
				const fired = signals.map((s) => s.kind);
				// Written the moment it arrives, not at the end, so a run killed
				// mid-flight still keeps everything it paid for.
				appendFileSync(CACHE, `${JSON.stringify({ key, id: item.id, fired })}\n`);
				results.push({ item, fired, failed: false });
				break;
			} catch (error) {
				attempt += 1;
				const why = error instanceof Error ? error.message : String(error);
				// Some failures will never come right by waiting, and retrying
				// them turns one clear problem into hundreds of vague ones. An
				// exhausted balance is the one that actually happened: the first
				// run of this benchmark spent the credit the second needed, and
				// the retries then dressed a billing message up as flakiness.
				// `invalid_request_error` belongs here too, and its absence cost an
				// hour: a run against a model that refused the request shape
				// retried all 292 messages five times each and reported nothing,
				// while looking from the outside exactly like slow progress. A
				// request the server calls malformed is malformed on every
				// attempt.
				if (/credit balance|authentication|invalid x-api-key|permission|invalid_request_error/i.test(why)) {
					// Set down the work and let the other workers finish what is
					// already in flight. Calling process.exit() here kills the
					// loop mid-await, which on Windows trips a libuv assertion
					// and loses answers that were already paid for.
					fatal = why;
					queue.length = 0;
					break;
				}
				if (attempt >= 5) {
					// A failed call is not a miss. Counting it as one would quietly
					// understate the engine every time the network hiccuped.
					results.push({ item, fired: [], failed: true, why });
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

// A run that stopped early reports nothing at all. Printing a table here would
// be printing the very thing this harness exists to prevent: a percentage
// computed from whichever messages happened to get an answer.
if (fatal !== null) {
	const paid = results.filter((r) => !r.failed).length;
	console.error("");
	console.error("Stopped: this will not come right by retrying.");
	console.error(`  ${fatal.slice(0, 200)}`);
	console.error("");
	console.error(`${paid} of ${items.length} answered. They are saved in ${CACHE} and will be`);
	console.error("reused, so re-running once this is resolved only pays for the remainder.");
	console.error("");
	console.error("No score is reported, because a score from a partial run is not a score.");
	process.exit(1);
}

const answered = results.filter((r) => !r.failed);
const seen = answered.filter((r) => r.fired.length > 0);
const pct = (n: number, d: number) => (d === 0 ? "  n/a" : `${((n / d) * 100).toFixed(1)}%`);

const by = (key: (r: (typeof results)[number]) => string) => {
	const m = new Map<string, { seen: number; total: number }>();
	for (const r of answered) {
		const k = key(r);
		const e = m.get(k) ?? { seen: 0, total: 0 };
		e.total += 1;
		if (r.fired.length > 0) e.seen += 1;
		m.set(k, e);
	}
	return [...m].sort((a, b) => b[1].total - a[1].total);
};

console.log("\nNarrative Check alone, against messages nobody here has read");
console.log(`Corpus: bench/imc25.csv — ${items.length} real reported scams\n`);

console.log("BY SCAM TYPE");
for (const [type, e] of by((r) => r.item.scamType)) {
	console.log(`  ${type.padEnd(14)} ${String(e.seen).padStart(3)}/${String(e.total).padEnd(3)}  ${pct(e.seen, e.total)}`);
}

console.log("\nBY TIER");
for (const [tier, e] of by((r) => r.item.tier)) {
	console.log(`  ${tier.padEnd(14)} ${String(e.seen).padStart(3)}/${String(e.total).padEnd(3)}  ${pct(e.seen, e.total)}`);
}

const patterns = new Map<string, number>();
for (const r of answered) for (const f of new Set(r.fired)) patterns.set(f, (patterns.get(f) ?? 0) + 1);

console.log("\nPATTERNS THAT FIRED");
for (const [p, n] of [...patterns].sort((a, b) => b[1] - a[1])) {
	console.log(`  ${p.padEnd(32)} ${n}`);
}

const failures = results.filter((r) => r.failed);
const never = failures.length;
if (never > 0) {
	const why = new Map<string, number>();
	for (const f of failures) {
		const key = (f.why ?? "unknown").slice(0, 60);
		why.set(key, (why.get(key) ?? 0) + 1);
	}
	console.log("\nCALLS THAT NEVER SUCCEEDED, and why:");
	for (const [k, n] of [...why].sort((a, b) => b[1] - a[1])) console.log(`  ${n} x ${k}`);
}
console.log(`\nOVERALL: the model's half found something in ${seen.length}/${answered.length}  (${pct(seen.length, answered.length)})`);
if (never > 0) console.log(`         ${never} call(s) failed and are excluded rather than counted as misses`);
console.log("\nThis is RECALL ONLY. Every message here is a scam, so nothing in this report");
console.log("can tell you whether the engine cries wolf — an engine that alarmed at every");
console.log("message would score 100%. Read it beside `npm run bench:narrative`, whose");
console.log("legitimate half is the only false-alarm evidence this project has.");

const missed = answered.filter((r) => r.fired.length === 0);
console.log(`\n${missed.length} message(s) the model's half found nothing in. Their ids:`);
console.log(missed.map((r) => r.item.id).join(" ") || "  (none)");
console.log("\nReading those messages in order to fix them spends them, exactly as it spent");
console.log("bench/corpus.ts. Record any you study, and treat their later passing as proof");
console.log("of nothing.");
