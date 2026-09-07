/**
 * Runs the held-out corpus through the engine and reports what it actually does.
 *
 *   npx tsx bench/run.ts            offline engine only — free, no keys, no network
 *   npx tsx bench/run.ts --full     both engines — spends Anthropic credit per message
 *
 * The two modes exist because they answer different questions. Offline is what
 * every Checker gets when a key is missing or the model is down, and ADR 0003
 * requires it to be a complete answer on its own; `--full` is what a Checker gets
 * on a good day. Reporting only the second would overstate the floor.
 *
 * Results go to stdout and, with --write, to docs/benchmark.md.
 */

import { NEW_ZEALAND_ORGANISATIONS } from "../src/data/knownOrganisations.nz";
import type { VerdictLevel } from "../src/domain/types";
import { check } from "../src/engine/check";
import { checkAsync } from "../src/engine/checkAsync";
import { type CorpusItem, CORPUS, isCorrect, type Provenance } from "./corpus";

const full = process.argv.includes("--full");
const write = process.argv.includes("--write");

interface Row {
	item: CorpusItem;
	level: VerdictLevel;
	correct: boolean;
	reasons: readonly string[];
}

async function verdictFor(item: CorpusItem): Promise<{ level: VerdictLevel; reasons: readonly string[] }> {
	if (!full) {
		const verdict = check(item.message, NEW_ZEALAND_ORGANISATIONS);
		return { level: verdict.level, reasons: verdict.reasons };
	}

	// Imported lazily so the offline run needs neither a key nor these modules.
	const { liveLookups } = await import("../src/lookups/live");
	const { anthropicNarrativeCheck } = await import("../src/narrative/anthropic");

	if (!process.env.ANTHROPIC_API_KEY) {
		throw new Error("--full needs ANTHROPIC_API_KEY set; refusing to report a full run without it");
	}

	// Safe Browsing is optional even here: without it the link lookups degrade
	// exactly as they do in production, and the run is still a real full run.
	const verdict = await checkAsync(
		item.message,
		NEW_ZEALAND_ORGANISATIONS,
		liveLookups(process.env.SAFE_BROWSING_API_KEY ?? ""),
		null,
		anthropicNarrativeCheck(),
	);
	return { level: verdict.level, reasons: verdict.reasons };
}

function tally(rows: readonly Row[]) {
	const total = rows.length;
	const right = rows.filter((row) => row.correct).length;
	return { total, right, pct: total === 0 ? null : Math.round((right / total) * 100) };
}

function section(title: string, rows: readonly Row[]): string {
	if (rows.length === 0) return "";
	const { total, right, pct } = tally(rows);
	const lines = [`### ${title} — ${right}/${total}${pct === null ? "" : ` (${pct}%)`}`, ""];
	lines.push("| | id | verdict | provenance |");
	lines.push("| :-- | :-- | :-- | :-- |");
	for (const row of rows) {
		const mark = row.correct ? "pass" : "**FAIL**";
		const hard = row.item.hardNegative ? " *(hard)*" : "";
		lines.push(`| ${mark} | \`${row.item.id}\`${hard} | ${row.level} | ${row.item.provenance} |`);
	}
	lines.push("");
	return lines.join("\n");
}

async function main() {
	const rows: Row[] = [];

	for (const item of CORPUS) {
		const { level, reasons } = await verdictFor(item);
		rows.push({ item, level, correct: isCorrect(item, level), reasons });
	}

	const scams = rows.filter((row) => row.item.kind === "scam");
	const legit = rows.filter((row) => row.item.kind === "legitimate");
	const hard = legit.filter((row) => row.item.hardNegative);
	const verbatim = scams.filter((row) => row.item.provenance === "verbatim");

	const out: string[] = [];
	out.push(`# Benchmark — ${full ? "both engines" : "offline engine only"}`);
	out.push("");
	out.push(`Run ${new Date().toISOString().slice(0, 10)}. Corpus: ${CORPUS.length} messages, held out from the regression suite.`);
	out.push("");

	const overall = tally(rows);
	const scamT = tally(scams);
	const legitT = tally(legit);
	const hardT = tally(hard);
	const verbT = tally(verbatim);

	out.push("| Measure | Result | What it means |");
	out.push("| :-- | :-- | :-- |");
	out.push(`| Scams raised | ${scamT.right}/${scamT.total} (${scamT.pct}%) | Reached \`scam\` or \`warning\` rather than \`unclear\` |`);
	out.push(`| — of which verbatim | ${verbT.right}/${verbT.total} | The only items free of model-authorship bias |`);
	out.push(`| Legitimate left quiet | ${legitT.right}/${legitT.total} (${legitT.pct}%) | Correctly returned \`unclear\` |`);
	out.push(`| — hard negatives | ${hardT.right}/${hardT.total} | Genuine messages wearing a scam's clothes |`);
	out.push(`| Overall | ${overall.right}/${overall.total} (${overall.pct}%) | |`);
	out.push("");

	out.push(section("Scams", scams));
	out.push(section("Legitimate messages", legit));

	const failures = rows.filter((row) => !row.correct);
	if (failures.length > 0) {
		out.push("## Failures in detail");
		out.push("");
		for (const row of failures) {
			out.push(`**\`${row.item.id}\`** — returned \`${row.level}\`, wanted ${row.item.kind === "scam" ? "`scam` or `warning`" : "`unclear`"}`);
			out.push("");
			out.push(`> ${row.item.message}`);
			out.push("");
			if (row.item.note) out.push(`${row.item.note}`);
			if (row.reasons.length > 0) {
				out.push("");
				out.push("Reasons given:");
				for (const reason of row.reasons) out.push(`- ${reason}`);
			}
			out.push("");
		}
	}

	const report = out.join("\n");
	console.log(report);

	if (write) {
		const { writeFileSync, mkdirSync } = await import("node:fs");
		mkdirSync("docs", { recursive: true });
		const path = full ? "docs/benchmark.md" : "docs/benchmark-offline.md";
		writeFileSync(path, `${report}\n`, "utf8");
		console.error(`\nwritten to ${path}`);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
