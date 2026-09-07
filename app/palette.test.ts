import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The palette, held to the contrast it was designed for.
 *
 * This is here for the same reason `bench/isolation.test.ts` is: the rule is
 * easy to state, easy to agree with, and easy to break by accident six months
 * from now while making something look nicer. Nobody sees a 2.4:1 border on the
 * machine they designed it on — the people who see it are the ones this app was
 * built for, and they will not file an issue about it.
 *
 * The numbers come from WCAG 2.2: 4.5:1 for body text (1.4.3), 3:1 for the
 * boundary of a control somebody has to find (1.4.11). Where a pair clears 7:1
 * it also meets AAA, and most of them do.
 */

const CSS = readFileSync("app/globals.css", "utf8");

/** Relative luminance, per the WCAG definition. */
function luminance(hex: string): number {
	const channel = (value: number) => {
		const v = value / 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	};
	const at = (i: number) => channel(Number.parseInt(hex.slice(i, i + 2), 16));

	return 0.2126 * at(1) + 0.7152 * at(3) + 0.0722 * at(5);
}

function contrast(a: string, b: string): number {
	const one = luminance(a);
	const other = luminance(b);
	const hi = Math.max(one, other);
	const lo = Math.min(one, other);

	return (hi + 0.05) / (lo + 0.05);
}

/**
 * The tokens as declared, read out of the stylesheet rather than copied here.
 *
 * A copy would pass this test forever while the app rendered something else.
 * `light` is the bare `:root` block; `dark` is `:root` inside the
 * `prefers-color-scheme: dark` query, layered over it exactly as the cascade
 * does.
 */
function palettes(): { light: Record<string, string>; dark: Record<string, string> } {
	const declarations = (block: string) => {
		const found: Record<string, string> = {};
		for (const match of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
			const name = match[1];
			const value = match[2];
			if (name !== undefined && value !== undefined) found[name] = value.toLowerCase();
		}
		return found;
	};

	const darkQuery = CSS.slice(CSS.indexOf("@media (prefers-color-scheme: dark)"));
	const light = declarations(CSS.slice(0, CSS.indexOf("@media")));
	const dark = { ...light, ...declarations(darkQuery.slice(0, darkQuery.indexOf("}\n\n\tbutton"))) };

	return { light, dark };
}

/** [description, foreground, background, minimum]. */
const PAIRS: readonly [string, string, string, number][] = [
	["body text on the page", "ink", "page", 4.5],
	["body text on a card", "ink", "card", 4.5],
	["muted text on the page", "ink-soft", "page", 4.5],
	["muted text on a card", "ink-soft", "card", 4.5],
	["the disclaimer on a scam verdict", "ink-soft", "scam-wash", 4.5],
	["the disclaimer on a warning verdict", "ink-soft", "warning-wash", 4.5],
	["the disclaimer on an unclear verdict", "ink-soft", "unclear-wash", 4.5],
	["a reason on a scam verdict", "ink", "scam-wash", 4.5],
	["a reason on a warning verdict", "ink", "warning-wash", 4.5],
	["a reason on an unclear verdict", "ink", "unclear-wash", 4.5],
	["the scam headline", "scam", "scam-wash", 4.5],
	["the warning headline", "warning", "warning-wash", 4.5],
	["the unclear headline", "unclear", "unclear-wash", 4.5],
	["a link on the page", "unclear", "page", 4.5],
	["a link on a card", "unclear", "card", 4.5],
	// 1.4.11: the boundary of a control a person has to find. --edge is
	// deliberately absent from this list; it only separates things, and the rule
	// does not reach decoration.
	["a control's border on a card", "field", "card", 3],
	["a control's border on the page", "field", "page", 3],
	["a control's border on a scam verdict", "field", "scam-wash", 3],
	["a control's border on a warning verdict", "field", "warning-wash", 3],
	["a control's border on an unclear verdict", "field", "unclear-wash", 3],
	// The ring has to be findable against every surface it can appear over.
	["the focus ring on a card", "unclear", "card", 3],
	["the focus ring on the page", "unclear", "page", 3],
];

describe.each(["light", "dark"] as const)("the %s palette", (scheme) => {
	const tokens = palettes()[scheme];

	/** Throws rather than comparing against `undefined` and quietly passing. */
	const token = (name: string): string => {
		const value = tokens[name];
		if (value === undefined) throw new Error(`the ${scheme} palette has no --${name}`);
		return value;
	};

	it("declares every token the design depends on", () => {
		const required = new Set(PAIRS.flatMap(([, a, b]) => [a, b]));

		expect([...required].filter((name) => tokens[name] === undefined)).toEqual([]);
	});

	it.each(PAIRS)("%s meets its minimum", (_what, foreground, background, minimum) => {
		expect(contrast(token(foreground), token(background))).toBeGreaterThanOrEqual(minimum);
	});
});
