import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Signal } from "../domain/types";
import {
	NARRATIVE_PATTERNS,
	type NarrativeCheck,
	type NarrativeFinding,
	narrativeSignals,
} from "../engine/narrative";

const PATTERN_IDS = NARRATIVE_PATTERNS.map((pattern) => pattern.id) as [string, ...string[]];

/**
 * The shape the model must answer in.
 *
 * `pattern` is an enum of the catalogue's ids rather than a free string, so the
 * API itself guarantees a valid id comes back — the model is not merely asked to
 * stay inside the vocabulary, it is unable to leave it. `narrativeSignals` still
 * re-checks every id, because the guarantee covers the schema and not the
 * catalogue drifting out from under a cached prompt.
 */
const FindingsSchema = z.object({
	findings: z.array(
		z.object({
			pattern: z.enum(PATTERN_IDS),
			/**
			 * Copied from the message, exactly. The instruction is repeated in the
			 * system prompt because this is the field the hallucination guard checks,
			 * and a paraphrase here throws away a true finding.
			 */
			quote: z.string(),
		}),
	),
});

/**
 * The system prompt, generated from the catalogue rather than written beside it.
 *
 * Generating it means a pattern cannot be added to the catalogue and forgotten in
 * the prompt, or described one way to the model and another way to the Checker.
 */
export function systemPrompt(): string {
	const catalogue = NARRATIVE_PATTERNS.map(
		(pattern) => `- ${pattern.id}: ${pattern.description}`,
	).join("\n");

	return [
		"You examine text messages and emails that a person in New Zealand suspects may be a scam.",
		"Many of these people are older and are frightened when they read them.",
		"",
		"Report only the patterns below that are genuinely present:",
		"",
		catalogue,
		"",
		"For each pattern you report, quote the words from the message that show it,",
		"copied exactly and never paraphrased. If you cannot quote the message, do not",
		"report the pattern. Report nothing at all if none of these patterns is present —",
		"an empty list is a useful and correct answer, and inventing a pattern to be",
		"helpful causes real harm.",
		"",
		"Do not write advice or explanation. Only report patterns and quotes.",
	].join("\n");
}

/**
 * Reads the model's answer, tolerating every way it can be absent.
 *
 * `parsed_output` is null when the response could not be parsed against the
 * schema, and an absent or malformed `findings` array is treated the same way: as
 * nothing found. Separated from the API call so all of that is testable without a
 * key or a network.
 */
export function findingsFrom(parsed: unknown): NarrativeFinding[] {
	const result = FindingsSchema.safeParse(parsed);

	return result.success ? result.data.findings : [];
}

/**
 * The Narrative Check, backed by Claude with a schema the API enforces (ADR 0010).
 *
 * Runs at medium effort: this is a short classification, but a wrong answer here
 * reaches a frightened person, so it does not get the cheapest setting either.
 * That is the knob to turn once there is a real corpus to measure against — it
 * should be tuned on evidence rather than left at whatever felt right today.
 *
 * Note what this does *not* do: it never rejects on a bad response, because
 * `checkAsync` treats a thrown error as "found nothing" and a Checker must still
 * get a Verdict (ADR 0003). Genuine transport failures are still allowed to
 * throw — that is `checkAsync`'s call to absorb, not this function's to hide.
 */
export function anthropicNarrativeCheck(client: Anthropic = new Anthropic()): NarrativeCheck {
	return async function narrative(message: string): Promise<Signal[]> {
		const response = await client.messages.parse({
			model: "claude-opus-5",
			max_tokens: 4000,
			system: systemPrompt(),
			thinking: { type: "adaptive" },
			output_config: {
				effort: "medium",
				format: zodOutputFormat(FindingsSchema),
			},
			messages: [{ role: "user", content: message }],
		});

		return narrativeSignals(message, findingsFrom(response.parsed_output));
	};
}
