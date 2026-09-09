/**
 * Runs the Narrative Check alone over the IMC 2025 held-out corpus.
 *
 *   npm run bench:imc25            spends Anthropic credit, one call per message
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

import { existsSync, readFileSync } from "node:fs";

import Anthropic from "@anthropic-ai/sdk";
import { anthropicNarrativeCheck } from "../src/narrative/anthropic";

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

const narrative = anthropicNarrativeCheck(new Anthropic());

/** Modest, so a benchmark run cannot look like an attack on the API. */
const CONCURRENCY = 4;

const results: { item: Item; fired: string[]; failed: boolean }[] = [];
let done = 0;

async function worker(queue: Item[]) {
	for (;;) {
		const item = queue.shift();
		if (item === undefined) return;
		try {
			const signals = await narrative(item.message);
			results.push({ item, fired: signals.map((s) => s.kind), failed: false });
		} catch {
			// A failed call is not a miss. Counting it as one would quietly
			// understate the engine every time the network hiccuped.
			results.push({ item, fired: [], failed: true });
		}
		done += 1;
		if (done % 25 === 0) process.stderr.write(`  ${done}/${items.length}\n`);
	}
}

const queue = [...items];
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

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

const never = results.filter((r) => r.failed).length;
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
