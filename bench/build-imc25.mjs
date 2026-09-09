/**
 * Builds a held-out corpus file from the IMC 2025 public smishing dataset.
 *
 *   node bench/build-imc25.mjs        writes bench/imc25.csv
 *
 * Run once. The output is committed so a benchmark run is reproducible and does
 * not depend on GitHub being reachable, or on the upstream file staying still.
 *
 * Source: Agarwal, Papasavva, Suarez-Tangil and Vasek, "Fishing for Smishing:
 * Understanding SMS Phishing Infrastructure and Strategies by Mining Public User
 * Reports", ACM IMC 2025. Dataset at
 * https://github.com/reportsmishing/Smishing-Dataset-IMC25, CC BY 4.0.
 * Downloaded 2026-09-09.
 *
 * ## What is selected, and why it is narrow
 *
 * The upstream text is anonymised: URLs, dates, phone numbers and — in 17,270
 * rows — the impersonated brand itself are replaced with tokens like `<URL>`.
 * A benchmark must not be built on invented words, so nothing here is filled in
 * or guessed. Instead the selection is restricted to rows that survive
 * anonymisation intact:
 *
 * - **`clean`** — no placeholder token of any kind. The message is the words a
 *   real person received, unaltered. This is the only tier free of doubt.
 * - **`brand-restored`** — the sole placeholder is `<NAMED_ENTITY>`, and it is
 *   put back from the dataset's own `named_entity` column. That is restoration
 *   from the same record, not invention, but it is tiered separately so a reader
 *   can discount it.
 *
 * Rows carrying `<URL>` are excluded outright rather than given a fabricated
 * link. That exclusion is a feature: what remains is the shape this engine is
 * documented as weakest against — no link to look up, and often no organisation
 * to check — which is exactly the half the Narrative Check has to reach alone.
 */
import { writeFileSync } from "node:fs";

const SOURCE = "https://raw.githubusercontent.com/reportsmishing/Smishing-Dataset-IMC25/main/dataset/final_dataset_output.csv";
/** Per scam_type, so one category cannot dominate the reading. */
const PER_TYPE = 40;

function parse(csv) {
	const out = []; let row = [], field = "", quoted = false;
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

/** Deterministic order, so the same rows are chosen on any machine, any day. */
function hash(s) {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
	return h >>> 0;
}

const rows = parse(await (await fetch(SOURCE)).text());
const head = rows[0].map((h) => h.trim());
const at = Object.fromEntries(head.map((h, i) => [h, i]));
const data = rows.slice(1).filter((r) => r.length >= head.length);

const PLACEHOLDER = /<[A-Z_]{2,24}>|\[REDACTED\]/g;
const candidates = [];

for (const r of data) {
	const text = (r[at.text] ?? "").trim();
	const language = (r[at.language] ?? "").trim();
	const brand = (r[at.named_entity] ?? "").trim();
	const scamType = (r[at.scam_type] ?? "").trim() || "unlabelled";

	if (!/^en/i.test(language)) continue;
	if (text.length < 40) continue; // too short to judge as a message

	const tokens = text.match(PLACEHOLDER) ?? [];
	let tier = null;
	let message = text;

	if (tokens.length === 0) {
		tier = "clean";
	} else if (tokens.every((t) => t === "<NAMED_ENTITY>") && brand !== "" && brand.toUpperCase() !== "NA") {
		tier = "brand-restored";
		message = text.replaceAll("<NAMED_ENTITY>", brand);
	} else {
		continue; // anything needing an invented word is dropped
	}

	candidates.push({ message, tier, scamType, brand, order: hash(message) });
}

// Stratify by scam type, deterministic within each.
const byType = new Map();
for (const c of candidates) {
	if (!byType.has(c.scamType)) byType.set(c.scamType, []);
	byType.get(c.scamType).push(c);
}

const chosen = [];
for (const [type, items] of [...byType].sort((a, b) => a[0].localeCompare(b[0]))) {
	items.sort((a, b) => a.order - b.order);
	const seen = new Set();
	for (const item of items) {
		if (chosen.length >= 10000) break;
		const key = item.message.slice(0, 60).toLowerCase();
		if (seen.has(key)) continue; // near-duplicate campaigns flood this data
		seen.add(key);
		chosen.push(item);
		if (seen.size >= PER_TYPE) break;
	}
	console.error(`  ${type.padEnd(14)} ${Math.min(items.length, PER_TYPE)} of ${items.length} usable`);
}

const esc = (s) => `"${s.replaceAll('"', '""')}"`;
const csv = ["id,tier,scam_type,brand,message",
	...chosen.map((c, i) => [`imc25-${String(i + 1).padStart(3, "0")}`, c.tier, esc(c.scamType), esc(c.brand), esc(c.message)].join(","))].join("\n");

writeFileSync("bench/imc25.csv", `${csv}\n`);
console.error(`\nwrote bench/imc25.csv — ${chosen.length} messages`);
console.error(`  clean          ${chosen.filter((c) => c.tier === "clean").length}`);
console.error(`  brand-restored ${chosen.filter((c) => c.tier === "brand-restored").length}`);
