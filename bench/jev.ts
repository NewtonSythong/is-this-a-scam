/**
 * The Narrative Check's pattern selection, asked of Jev instead of Opus.
 *
 * This lives in `bench/` rather than `src/` deliberately. Nothing in the app
 * calls it and nothing should until the spike in `docs/jev-spike.md` says it is
 * worth adopting — a second implementation sitting in `src/narrative/` that no
 * Check ever reaches is a thing someone later has to work out the status of.
 *
 * ## What this is and is not
 *
 * It is the *deciding* half only: which patterns are present. Jev cannot extract
 * spans, so it cannot produce the quote that `narrativeSignals` verifies, and it
 * therefore cannot be a `NarrativeCheck` on its own. Do not give it that type —
 * the type promises Signals, and a Signal without a checked quote is exactly the
 * guarantee this project refuses to give up.
 *
 * It returns raw probabilities rather than a decision. That is the point: the
 * threshold is unknown, and if the bench caches booleans then every candidate
 * threshold is a fresh purchase. Cache what came back, decide locally, sweep for
 * free.
 */

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

import { NARRATIVE_PATTERNS } from "../src/engine/narrative";

/** The gateway id, as `GET https://ai-gateway.vercel.sh/v1/models` reports it. */
export const JEV_MODEL = "typesafe-ai/jev";

const ENDPOINT = "https://ai-gateway.vercel.sh/v1/evaluate";

/**
 * One probability per pattern in the catalogue, keyed by pattern id.
 *
 * Every id is present in the result. A pattern the model is confident about and
 * a pattern it never considered must not look the same, and an absent key would
 * read as the latter while meaning nothing of the sort.
 */
export type PatternProbabilities = Record<string, number>;

/**
 * The questions, generated from the catalogue rather than written beside it.
 *
 * `description` is the field the Anthropic system prompt already uses to tell a
 * model what each pattern is. Reusing it verbatim is not laziness about wording:
 * it is the only way the comparison measures the models rather than measuring
 * two different descriptions of the same fourteen patterns.
 */
export function questionsFromCatalogue(): Record<string, unknown> {
	return Object.fromEntries(
		NARRATIVE_PATTERNS.map((pattern) => [
			pattern.id,
			{ type: "boolean", instructions: pattern.description },
		]),
	);
}

/**
 * Bearer token for the gateway.
 *
 * `AI_GATEWAY_API_KEY` wins when it is set, because someone who went and made a
 * key meant to use it. Otherwise `VERCEL_OIDC_TOKEN`, which `vercel env pull`
 * writes and which authenticates a linked project with no key at all — but which
 * **expires within hours**. A stale one fails as a 403 about billing rather than
 * anything resembling "your token is old", so re-pull before a run.
 */
function token(): string {
	const key = process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;
	if (key === undefined || key === "") {
		throw new Error(
			"bench/jev.ts needs AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN. " +
				"For the OIDC route: npx vercel env pull .env.local --environment=development --yes",
		);
	}
	return key;
}

interface EvaluateResponse {
	answers?: Record<string, { type?: string; probability?: number }>;
	usage?: { inputTokens?: number; outputTokens?: number };
	providerMetadata?: { gateway?: { cost?: string } };
}

export interface JevReading {
	probabilities: PatternProbabilities;
	/** What the gateway says this call cost, in dollars. Reported, never estimated. */
	cost: number;
	inputTokens: number;
}

/**
 * Asks Jev every question in the catalogue about one message, in one request.
 *
 * One request rather than fourteen is not only cheaper — the model evaluates
 * every question in a request against the same state in parallel, which is the
 * shape the Narrative Check has always had and the reason Jev was worth looking
 * at in the first place.
 */
export async function jevProbabilities(message: string): Promise<JevReading> {
	const response = await fetch(ENDPOINT, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token()}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: JEV_MODEL,
			state: message,
			questions: questionsFromCatalogue(),
			// No `zeroDataRetention` flag. It was set here first, and the gateway
			// rejects it on a hobby plan — it is a Pro/Enterprise enforcement
			// control. Removing it does not loosen anything: the model catalogue
			// reports `zdr: "all"` and `no_training: "all"` for this model, so the
			// provider already applies both to every request. The flag would have
			// made the gateway enforce what typesafe-ai promises anyway.
			// If this project ever sends something less public than
			// `bench/imc25.csv` — which is anonymised public scam reports — revisit
			// that reasoning rather than inheriting it.
		}),
	});

	if (!response.ok) {
		throw new Error(`Jev ${response.status}: ${(await response.text()).slice(0, 300)}`);
	}

	const body = (await response.json()) as EvaluateResponse;

	// Absent is 0, and that is a real answer rather than a missing one: the
	// question was asked about every pattern, so a pattern the response does not
	// mention is one the model did not find.
	const probabilities: PatternProbabilities = {};
	for (const pattern of NARRATIVE_PATTERNS) {
		probabilities[pattern.id] = body.answers?.[pattern.id]?.probability ?? 0;
	}

	return {
		probabilities,
		cost: Number(body.providerMetadata?.gateway?.cost ?? 0),
		inputTokens: body.usage?.inputTokens ?? 0,
	};
}

/** Which patterns count as fired at a given cut-off. Pure, so the sweep is free. */
export function firedAt(probabilities: PatternProbabilities, threshold: number): string[] {
	return NARRATIVE_PATTERNS.map((p) => p.id).filter((id) => (probabilities[id] ?? 0) >= threshold);
}

/**
 * The cache, and the only definition of it.
 *
 * Both runners write the same file, so both must derive the same key or a reading
 * bought by one is invisible to the other and gets bought twice. The fingerprint
 * hashes the model and the whole question set, so editing a single pattern's
 * `description` changes every key and empties the cache — answers from two
 * different catalogues must never blend into one reading with nothing to say so.
 */
const CACHE = "bench/.jev-cache.jsonl";

const FINGERPRINT = createHash("sha256")
	.update(`${JEV_MODEL}\u0000${JSON.stringify(questionsFromCatalogue())}`)
	.digest("hex")
	.slice(0, 16);

export const cacheKeyFor = (message: string) =>
	createHash("sha256").update(`${FINGERPRINT}\u0000${message}`).digest("hex").slice(0, 24);

/** Every answer already paid for, keyed by `cacheKeyFor`. */
export function readCache(): Map<string, PatternProbabilities> {
	const out = new Map<string, PatternProbabilities>();
	if (!existsSync(CACHE)) return out;
	for (const line of readFileSync(CACHE, "utf8").split("\n")) {
		if (line.trim() === "") continue;
		try {
			const row = JSON.parse(line) as { key: string; probabilities: PatternProbabilities };
			out.set(row.key, row.probabilities);
		} catch {
			// A half-written final line after a hard kill. Everything before it is good.
		}
	}
	return out;
}

/** Written the moment an answer arrives, so a run killed mid-flight keeps what it paid for. */
export function appendCache(key: string, id: string, probabilities: PatternProbabilities): void {
	appendFileSync(CACHE, `${JSON.stringify({ key, id, probabilities })}\n`);
}
