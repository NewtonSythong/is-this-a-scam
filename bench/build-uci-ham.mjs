/**
 * Builds a false-alarm corpus from the genuine ("ham") half of the UCI SMS Spam
 * Collection.
 *
 *   curl -LO https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip
 *   unzip sms+spam+collection.zip
 *   node bench/build-uci-ham.mjs SMSSpamCollection     writes bench/uci-ham.csv
 *
 * Run once. The output is committed so a run is reproducible without the zip.
 *
 * Source: Almeida, Gómez Hidalgo and Yamakami, "Contributions to the Study of
 * SMS Spam Filtering: New Collection and Results", ACM DocEng 2011.
 * https://archive.ics.uci.edu/dataset/228/sms+spam+collection — free to use,
 * copyright the authors, who ask to be cited. Downloaded 2026-10-05.
 *
 * ## Why this exists
 *
 * `bench/corpus.ts` holds ten legitimate messages, and a model that alarmed at
 * one real message in twenty would still pass all ten about three times in five.
 * This turns "no false alarm observed" into a rate with a bound on it.
 *
 * ## What it can and cannot tell you
 *
 * These are personal texts between people in the UK and Singapore around 2010,
 * not New Zealand bank or courier mail. They are the easy negatives for the
 * organisation patterns and the hard ones for the personal patterns —
 * `wrong-number-opener`, `new-number-pretext`, `romance-pretext` — which fire on
 * exactly this kind of chat. A clean reading here says nothing about how the
 * engine treats a genuine ANZ notification; only NZ messages can say that.
 *
 * ## The sample
 *
 * Exact duplicates are dropped, then the 400 messages whose SHA-256 sorts lowest
 * are kept. Deterministic, so a rebuild selects the same 400, and blind, so
 * nobody chose which ones. 400 is where zero false alarms bounds the true rate
 * below 0.75% at 95% confidence (the rule of three), for about a dollar on Haiku.
 *
 * Messages are kept byte for byte as published, including the HTML entities and
 * mangled characters some of them carry. Repairing them would be inventing text.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const SIZE = 400;
const path = process.argv[2];
if (!path) throw new Error("usage: node bench/build-uci-ham.mjs <path to SMSSpamCollection>");

const sha = (s) => createHash("sha256").update(s).digest("hex");
const ham = [
	...new Set(
		readFileSync(path, "utf8")
			.split("\n")
			.filter((l) => l.startsWith("ham\t"))
			.map((l) => l.slice(4).trim())
			.filter((m) => m !== ""),
	),
];
const picked = ham.sort((a, b) => (sha(a) < sha(b) ? -1 : 1)).slice(0, SIZE);

const csvField = (s) => `"${s.replaceAll('"', '""')}"`;
const lines = ["id,tier,scam_type,brand,message"];
picked.forEach((m, i) => {
	lines.push(`uci-ham-${String(i + 1).padStart(3, "0")},ham,"legitimate","",${csvField(m)}`);
});
writeFileSync("bench/uci-ham.csv", `${lines.join("\n")}\n`);
console.log(`${ham.length} unique genuine messages, ${picked.length} written to bench/uci-ham.csv`);
