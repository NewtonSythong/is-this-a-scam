/**
 * F2's table, computed rather than asserted.
 *
 *   npx tsx bench/f2.ts        free — reads the cache `bench/narrative.ts` wrote
 *
 * F2 is the claim that self-authored negatives understate false alarms: the
 * legitimate half splits into messages we wrote and messages we captured, and
 * the captured ones alarm more. The claim is a 2x2 and a p-value, and both were
 * previously worked out by hand. At n = 28 that was checkable by eye; at n = 68
 * it is not, and a paper's crispest number should not rest on arithmetic nobody
 * can re-run.
 *
 * Reads only the cache, so it costs nothing and can be run as often as it is
 * doubted. Run `npm run bench:narrative` first — that is the part that spends.
 *
 * "Written" is `reconstructed` or `synthetic`; "collected" is `verbatim`. The
 * distinction is provenance, not difficulty: several written negatives were
 * written specifically to be hard.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import { NARRATIVE_MODEL, systemPrompt } from "../src/narrative/anthropic";
import { CORPUS } from "./corpus";

const modelArg = process.argv.indexOf("--model");
const MODEL = modelArg === -1 ? NARRATIVE_MODEL : (process.argv[modelArg + 1] ?? NARRATIVE_MODEL);

const CACHE = "bench/.narrative-cache.jsonl";

/** Same key as `bench/narrative.ts`, so editing the catalogue invalidates this too. */
const fingerprint = createHash("sha256").update(`${MODEL} ${systemPrompt()}`).digest("hex").slice(0, 16);
const keyFor = (message: string): string =>
	createHash("sha256").update(`${fingerprint} ${message}`).digest("hex").slice(0, 24);

const logFactorial = (n: number): number => {
	let total = 0;
	for (let i = 2; i <= n; i += 1) total += Math.log(i);
	return total;
};

/**
 * Probability of this exact table under the hypergeometric null, with all four
 * margins held fixed. Computed in logs because 68! overflows a double.
 */
const tableProbability = (a: number, b: number, c: number, d: number): number =>
	Math.exp(
		logFactorial(a + b) +
			logFactorial(c + d) +
			logFactorial(a + c) +
			logFactorial(b + d) -
			logFactorial(a + b + c + d) -
			logFactorial(a) -
			logFactorial(b) -
			logFactorial(c) -
			logFactorial(d),
	);

/**
 * Fisher's exact test on
 *
 *     written   a alarms, b quiet
 *     collected c alarms, d quiet
 *
 * One-sided is P(collected alarms at least this often), which is F2's
 * direction and was stated in advance. Two-sided sums every table no more
 * likely than the observed one — the conventional definition, and the reason
 * it is not simply twice the one-sided value.
 */
const fisher = (a: number, b: number, c: number, d: number): { oneSided: number; twoSided: number } => {
	const observed = tableProbability(a, b, c, d);
	const alarms = a + c;
	const written = a + b;
	const collected = c + d;
	let oneSided = 0;
	let twoSided = 0;
	// Enumerate every table with these margins by its top-left cell.
	for (let x = Math.max(0, alarms - collected); x <= Math.min(written, alarms); x += 1) {
		const probability = tableProbability(x, written - x, alarms - x, collected - alarms + x);
		if (x <= a) oneSided += probability;
		if (probability <= observed * (1 + 1e-9)) twoSided += probability;
	}
	return { oneSided, twoSided };
};

/** Wilson score interval — the one that behaves when the count is zero. */
const wilson = (successes: number, n: number): [number, number] => {
	if (n === 0) return [0, 0];
	const z = 1.959963985;
	const p = successes / n;
	const denominator = 1 + (z * z) / n;
	const centre = (p + (z * z) / (2 * n)) / denominator;
	const spread = ((z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denominator) * 100;
	return [Math.max(0, centre * 100 - spread), Math.min(100, centre * 100 + spread)];
};

const percent = (successes: number, n: number): string => {
	const [low, high] = wilson(successes, n);
	return `${successes}/${n} = ${((100 * successes) / n).toFixed(1)}%  95% CI [${low.toFixed(1)}, ${high.toFixed(1)}]`;
};

// Guards the p-values against a silent arithmetic regression, using the two
// results already published in `docs/benchmark-method.md` and PLAN.md §2 F2.
const demo = (): void => {
	// F2 as first reported: 0/13 written, 5/15 collected.
	const f2 = fisher(0, 13, 5, 10);
	console.assert(f2.oneSided.toFixed(3) === "0.031", `one-sided was ${f2.oneSided}`);
	console.assert(f2.twoSided.toFixed(3) === "0.044", `two-sided was ${f2.twoSided}`);
	// The offline baseline: 0/13 written, 6/55 collected.
	console.assert(fisher(0, 13, 6, 49).oneSided.toFixed(3) === "0.265");
	// Wilson, as quoted beside them.
	console.assert(wilson(0, 13).map((v) => v.toFixed(1)).join() === "0.0,22.8");
	console.assert(wilson(5, 15).map((v) => v.toFixed(1)).join() === "15.2,58.3");
};
demo();

if (!existsSync(CACHE)) {
	throw new Error(`No ${CACHE}. Run \`npm run bench:narrative\` first — that is the part that spends.`);
}

const fired = new Map<string, string[]>();
for (const line of readFileSync(CACHE, "utf8").split("\n")) {
	if (line.trim() === "") continue;
	try {
		const row = JSON.parse(line) as { key: string; fired: string[] };
		fired.set(row.key, row.fired);
	} catch {
		// Half-written final line after a hard kill; everything before it is good.
	}
}

const legitimate = CORPUS.filter((item) => item.kind === "legitimate");
const missing = legitimate.filter((item) => !fired.has(keyFor(item.message)));
if (missing.length > 0) {
	// A message with no cached answer is not a message the model stayed quiet
	// on, and counting it as one would understate exactly the rate F2 measures.
	throw new Error(
		`${missing.length} of ${legitimate.length} legitimate messages have no cached answer for ${MODEL}. ` +
			`Run \`npm run bench:narrative\` to completion first. First missing: ${missing[0]?.id}`,
	);
}

const alarmed = (item: (typeof CORPUS)[number]): boolean => (fired.get(keyFor(item.message)) ?? []).length > 0;
const written = legitimate.filter((item) => item.provenance !== "verbatim");
const collected = legitimate.filter((item) => item.provenance === "verbatim");
const a = written.filter(alarmed).length;
const c = collected.filter(alarmed).length;
const { oneSided, twoSided } = fisher(a, written.length - a, c, collected.length - c);

console.log(`Model: ${MODEL}`);
console.log("");
console.log(`False alarms, written negatives    ${percent(a, written.length)}`);
console.log(`False alarms, collected negatives  ${percent(c, collected.length)}`);
console.log("");
console.log(`Fisher exact  one-sided p = ${oneSided.toFixed(4)}   two-sided p = ${twoSided.toFixed(4)}`);

/**
 * §8 item 5 asks for a minimum-detectable effect, and here it is load-bearing
 * rather than decorative. Fisher's floor is set by the smaller arm: with the
 * written negatives held at 13 and every alarm landing on the collected side,
 * the *most extreme table obtainable* still only reaches the p below. Growing
 * the collected half cannot fix that — it is the written half that is too small
 * to resolve the gap, which is the opposite of where the collection effort went.
 */
const floor = fisher(0, written.length, c, collected.length - c).oneSided;
let needed = written.length;
while (needed < 400 && fisher(0, needed, c, collected.length - c).oneSided >= 0.05) needed += 1;
console.log("");
console.log(`Best case at n_written = ${written.length}: one-sided p = ${floor.toFixed(4)} even with 0 alarms`);
console.log(`To reach p < 0.05 at the observed collected rate, n_written must be >= ${needed}, all quiet`);
console.log("");
console.log("The alarms:");
for (const item of [...written, ...collected].filter(alarmed)) {
	const kind = item.provenance === "verbatim" ? "collected" : "written  ";
	console.log(`  ${kind} ${item.id}`);
	console.log(`            ${(fired.get(keyFor(item.message)) ?? []).join(", ")}`);
}
