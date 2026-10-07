import { describe, expect, it } from "vitest";

import { CORPUS } from "./corpus";

/**
 * The corpus now contains genuine messages taken from real inboxes, and this
 * repository is public.
 *
 * That combination is a standing hazard rather than a one-off one. The messages
 * that make the best false-alarm probes are exactly the ones that arrived
 * addressed to somebody: a courier naming the shop, a bank naming the applicant,
 * an agency quoting an account and an IP address back at its owner. Stripping
 * those details out entirely is not an option either, because a message with a
 * name in it does not behave like one without, and blanking the field would
 * quietly change what the corpus measures. So the rule is shape-preserving
 * redaction, and this test is what enforces it.
 *
 * It deliberately does NOT contain a list of the identifiers to look for. A
 * deny-list of somebody's real email addresses and phone numbers, committed to a
 * public repository in order to keep them out of a public repository, would be
 * the same leak wearing a hat. It matches on shape instead: the *kinds* of string
 * that only ever appear in a message because a capture went in unedited.
 *
 * It runs under `npm run verify`, which is the gate that already runs, because
 * the person who pastes a raw capture in will be doing it at the end of a long
 * sourcing session and will have every reason to believe they redacted it.
 */

/** Consumer mail providers. A genuine corporate sender never appears as these. */
const PERSONAL_MAIL = /[\w.+-]+@(gmail|googlemail|hotmail|outlook|live|yahoo|icloud|proton|protonmail)\.[\w.]+/gi;

/** Any IPv4 that is not one of the RFC 5737 documentation ranges. */
const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const DOCUMENTATION_IP = /^(192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/;

/**
 * New Zealand mobile numbers, which is the form a personal number takes in this
 * corpus. Landlines and 0800 numbers are left alone: organisations publish those
 * on purpose and several genuine messages quote them, which is part of what
 * makes those messages hard.
 */
const NZ_MOBILE = /\b(?:\+?64\s?|0)2\d[\s-]?\d{3}[\s-]?\d{3,5}\b/g;
/** The stand-in a redacted mobile number must use. */
const PLACEHOLDER_MOBILE = "021 000 0000";

describe("genuine messages are redacted before they are published", () => {
	it("quotes no personal email address", () => {
		const offenders = CORPUS.flatMap((item) =>
			(item.message.match(PERSONAL_MAIL) ?? []).map((hit) => `${item.id}: ${hit}`),
		);

		expect(
			offenders,
			"a consumer mailbox address in a corpus message means a capture went in unedited — replace it with an @example.com stand-in of the same shape",
		).toEqual([]);
	});

	it("quotes no real IP address", () => {
		const offenders = CORPUS.flatMap((item) =>
			(item.message.match(IPV4) ?? [])
				.filter((ip) => !DOCUMENTATION_IP.test(ip))
				.map((ip) => `${item.id}: ${ip}`),
		);

		expect(
			offenders,
			"use an RFC 5737 documentation address (203.0.113.x) rather than the one the message arrived with",
		).toEqual([]);
	});

	it("quotes no personal mobile number", () => {
		const offenders = CORPUS.flatMap((item) =>
			(item.message.match(NZ_MOBILE) ?? [])
				.filter((number) => number !== PLACEHOLDER_MOBILE)
				.map((number) => `${item.id}: ${number}`),
		);

		expect(offenders, `replace it with ${PLACEHOLDER_MOBILE}, which keeps the shape`).toEqual([]);
	});

	it("gives every item a distinct id, so nothing is silently overwritten", () => {
		const seen = new Map<string, number>();
		for (const item of CORPUS) seen.set(item.id, (seen.get(item.id) ?? 0) + 1);

		expect([...seen].filter(([, n]) => n > 1).map(([id]) => id)).toEqual([]);
	});
});
