/**
 * Does the RDAP domain-age lookup actually clear the false alarms?
 *
 * Runs the real async Check — the same `checkAsync` the app calls — over every
 * corpus item that contains a link, once with the lookup off and once with it
 * on, against live registries. No model, no Safe Browsing key: the point is to
 * isolate what the new lookup alone is worth on the deterministic half.
 *
 *     npx tsx bench/domain-age.ts
 *
 * Free. RDAP is public and unmetered. The only cost is a few seconds of
 * requests, and registries rate-limit, so it goes one host at a time.
 *
 * WHAT THIS IS NOT. The six false alarms below have been read, written about and
 * quoted for two weeks. A change measured on them is weaker evidence than a
 * change measured on messages nobody has seen, and this script cannot fix that.
 * What keeps it meaningful is that the rule was written from SmishX's published
 * WHOIS component (`docs/method-alternatives.md`) rather than from these items —
 * nobody narrowed anything while looking at a message. Read it as a check that
 * the mechanism works, not as a false-alarm rate.
 */
import { CORPUS } from "./corpus";
import { NEW_ZEALAND_ORGANISATIONS } from "../src/data/knownOrganisations.nz";
import { checkAsync } from "../src/engine/checkAsync";
import { extractLinks } from "../src/engine/links";
import { NO_LOOKUPS } from "../src/engine/lookups";
import { rdapDomainAge } from "../src/lookups/domainAge";

const age = rdapDomainAge();

const withAge = {
	...NO_LOOKUPS,
	establishedSince: age,
};

const linked = CORPUS.filter((item) => extractLinks(item.message).length > 0);

console.log(`${linked.length} of ${CORPUS.length} corpus items contain a link.\n`);

let fixed = 0;
let broken = 0;
const rows: string[] = [];

for (const item of linked) {
	const before = await checkAsync(item.message, NEW_ZEALAND_ORGANISATIONS, NO_LOOKUPS);
	const after = await checkAsync(item.message, NEW_ZEALAND_ORGANISATIONS, withAge);
	if (before.level === after.level) continue;

	const wanted = item.kind === "legitimate" ? "unclear" : "scam/warning";
	const good = item.kind === "legitimate" ? after.level === "unclear" : after.level !== "unclear";
	good ? fixed++ : broken++;

	rows.push(
		`${good ? "FIXED " : "BROKE "} ${item.id}\n` +
			`         ${item.kind}, wanted ${wanted}: ${before.level} -> ${after.level}`,
	);
}

console.log(rows.join("\n") || "Nothing moved.");
console.log(`\nfalse alarms cleared: ${fixed}    true positives lost: ${broken}`);

// The ages themselves, so the table above can be read rather than trusted.
console.log("\nregistration dates, live from the registries:");
const hosts = [...new Set(linked.flatMap((i) => extractLinks(i.message).map((l) => l.host)))].sort();
for (const host of hosts) {
	let since: Date | null = null;
	try {
		since = await age({ raw: host, host });
	} catch (error) {
		console.log(`  ${host.padEnd(34)} lookup failed: ${(error as Error).message}`);
		continue;
	}
	const days = since === null ? null : Math.floor((Date.now() - since.getTime()) / 86_400_000);
	console.log(
		`  ${host.padEnd(34)} ${since === null ? "unknown" : `${since.toISOString().slice(0, 10)}  ${days} days`}`,
	);
}
