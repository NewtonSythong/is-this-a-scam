/**
 * Runs the Narrative Check *alone* over the corpus, and reports which patterns
 * it fires on.
 *
 *   npx tsx bench/narrative.ts     spends Anthropic credit, one call per message
 *
 * The main benchmark cannot answer the question this one exists for. Most real
 * scam texts carry a lookalike domain, so the Artifact Check reaches `scam`
 * without the model ever being consulted — which means a narrative pattern can
 * be completely broken and the headline number will not move. The model's half
 * is invisible behind the deterministic half exactly where the deterministic
 * half is strongest.
 *
 * So this reports the model's findings with the rules taken away. Two things to
 * read it for:
 *
 * 1. **Does a pattern fire on messages it was not written from?** A pattern
 *    written from one message and firing only on that message has not
 *    generalised, it has memorised, and the main benchmark cannot tell you which
 *    happened.
 * 2. **Does anything fire on the legitimate half?** A narrative pattern that
 *    fires on a genuine bank text is a false alarm waiting for the day the
 *    Artifact Check has nothing to say — invisible until it matters.
 */

import { existsSync } from "node:fs";

import Anthropic from "@anthropic-ai/sdk";
import { anthropicNarrativeCheck } from "../src/narrative/anthropic";
import { CORPUS } from "./corpus";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

if (!process.env.ANTHROPIC_API_KEY) {
	throw new Error("bench/narrative.ts needs ANTHROPIC_API_KEY — it is the thing being measured");
}

const narrative = anthropicNarrativeCheck(new Anthropic());

let scamsReached = 0;
let scamsTotal = 0;
let falseAlarms = 0;

for (const item of CORPUS) {
	const signals = await narrative(item.message);
	const fired = signals.map((signal) => signal.kind);
	const spent = item.developedAgainst === undefined ? "" : " (no longer held out)";

	if (item.kind === "scam") {
		scamsTotal += 1;
		if (fired.length > 0) scamsReached += 1;
	} else if (fired.length > 0) {
		falseAlarms += 1;
	}

	const mark = item.kind === "scam" ? (fired.length > 0 ? "seen " : "MISS ") : fired.length > 0 ? "ALARM" : "quiet";

	console.log(`${mark} ${item.id}${spent}`);
	console.log(`      ${fired.length > 0 ? fired.join(", ") : "— nothing —"}`);
}

console.log("");
console.log(`Scams the model alone saw something in: ${scamsReached}/${scamsTotal}`);
console.log(`False alarms on legitimate messages:    ${falseAlarms}`);
console.log("");
console.log("A miss here is not necessarily a miss in the app: the Artifact Check may still");
console.log("reach it. An ALARM here is always worth investigating, because it will surface");
console.log("in the app the first time a message like it arrives without a link.");
