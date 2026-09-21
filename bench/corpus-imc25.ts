/**
 * Loading and splitting `bench/imc25.csv`, in one place.
 *
 * Extracted from `bench/narrative-imc25.ts` when a second runner needed the same
 * corpus. It is shared rather than copied for one reason: **the split must be
 * identical everywhere or the benchmark quietly stops meaning anything.** Two
 * runners that each define "the dev half" are two runners that can disagree
 * about which messages have been read, and the whole value of the split is that
 * nobody has read the other half.
 */

import { readFileSync } from "node:fs";

export interface Item {
	id: string;
	tier: string;
	scamType: string;
	message: string;
}

export function parseCsv(csv: string): string[][] {
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

export function loadCorpus(path = "bench/imc25.csv"): Item[] {
	const rows = parseCsv(readFileSync(path, "utf8")).slice(1).filter((r) => r.length >= 5);
	return rows.map((r) => ({
		id: r[0] ?? "",
		tier: r[1] ?? "",
		scamType: r[2] ?? "",
		message: r[4] ?? "",
	}));
}

export type Split = "all" | "dev" | "test";

/**
 * The cut, and the only definition of it.
 *
 * The file's own order alternated: rows are grouped by scam type in blocks of
 * forty, so taking every other row splits each stratum exactly in half — 146 and
 * 146, 20/20 within each type — with no random seed to record and no shuffle to
 * reproduce. Deterministic, so a message is in the same half forever, which is
 * the only property that matters.
 *
 * **`dev` is the half you may read.** `test` is only ever scored.
 */
export function splitOf(all: readonly Item[], split: Split): Item[] {
	return split === "all" ? [...all] : all.filter((_, i) => (i % 2 === 0) === (split === "dev"));
}

/** Reads `--split` from argv, rejecting anything that is not a half. */
export function splitFromArgv(argv: readonly string[]): Split {
	const at = argv.indexOf("--split");
	const value = at === -1 ? "all" : (argv[at + 1] ?? "all");
	if (!["all", "dev", "test"].includes(value)) {
		throw new Error(`--split must be dev, test or all; got ${value}`);
	}
	return value as Split;
}
