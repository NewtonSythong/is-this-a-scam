/**
 * What is actually still at the end of the corpus's links?
 *
 *     npx tsx bench/destination.ts
 *
 * Free. No model, no key. It is HTTP requests and a table.
 *
 * TWO THINGS THIS DOES, AND THE SECOND IS THE IMPORTANT ONE.
 *
 * First, it measures the destination lookup the way `bench/domain-age.ts`
 * measured the age lookup: the real `checkAsync` over every corpus item with a
 * link, once without the lookup and once with it, so the delta is the lookup's
 * alone.
 *
 * Second — and this is what it was actually written to find out — it reports
 * what each link's host is serving *today*. A corpus of messages is not a corpus
 * of live infrastructure. The scam messages stay exactly as captured; the hosts
 * behind them are taken down, cleaned up, or handed back to their rightful
 * owners, and after that the destination lookup can no longer see what the
 * message was for. Any number this script prints about the scam half is a number
 * about September 2026's internet, not about the method, and re-running it next
 * month will print a different one.
 *
 * That decay is the reason SmishX (Wang et al., SOUPS 2025) excluded messages
 * whose URLs had gone dead — a rule that quietly selects for campaigns still
 * running at evaluation time, on both sides of the ledger. This script does the
 * opposite and reports the graveyard, because the size of the graveyard is the
 * honest bound on what a fetch-based check can be shown to be worth here.
 *
 * NOTE THAT THIS LOADS ATTACKER INFRASTRUCTURE. That is sanctioned now (ADR 0008,
 * amended 2026-09-23) and constrained in `src/lookups/destinationPage.ts` — server
 * side, no browser, no script execution, capped bytes, private address space
 * refused. Run it on a machine you are happy to have make those requests.
 */
import { NEW_ZEALAND_ORGANISATIONS } from "../src/data/knownOrganisations.nz";
import { checkAsync } from "../src/engine/checkAsync";
import { extractLinks } from "../src/engine/links";
import { NO_LOOKUPS } from "../src/engine/lookups";
import { destinationPage } from "../src/lookups/destinationPage";
import { rdapDomainAge } from "../src/lookups/domainAge";
import { CORPUS } from "./corpus";

const destination = destinationPage();

/** The engine as it stands today: age on, page off. */
const before = { ...NO_LOOKUPS, establishedSince: rdapDomainAge() };

/** The engine with this change. */
const after = { ...before, destination };

const linked = CORPUS.filter((item) => extractLinks(item.message).length > 0);

console.log(`${linked.length} of ${CORPUS.length} corpus items contain a link.\n`);

let fixed = 0;
let broken = 0;
const rows: string[] = [];

for (const item of linked) {
	const was = await checkAsync(item.message, NEW_ZEALAND_ORGANISATIONS, before);
	const now = await checkAsync(item.message, NEW_ZEALAND_ORGANISATIONS, after);
	if (was.level === now.level) continue;

	const good = item.kind === "legitimate" ? now.level === "unclear" : now.level !== "unclear";
	good ? fixed++ : broken++;

	rows.push(
		`${good ? "FIXED " : "BROKE "} ${item.id}\n` +
			`         ${item.kind}: ${was.level} -> ${now.level}`,
	);
}

console.log(rows.join("\n") || "Nothing moved.");
console.log(`\nimproved: ${fixed}    made worse: ${broken}`);

// The graveyard census. Read this before reading the table above.
console.log("\nwhat each host is serving today:");

const hosts = new Map<string, "scam" | "legitimate">();
for (const item of linked) {
	for (const link of extractLinks(item.message)) hosts.set(link.host, item.kind);
}

let live = 0;
let dead = 0;

for (const [host, kind] of [...hosts].sort()) {
	const page = await destination({ raw: host, host }).catch(() => null);
	page === null ? dead++ : live++;

	const what =
		page === null
			? "no readable page"
			: `${page.asksForPassword ? "ASKS FOR A PASSWORD" : "no password field"}` +
				`  "${page.presentsAs.slice(0, 48)}"`;

	console.log(`  ${kind === "scam" ? "scam" : "legit"}  ${host.padEnd(30)} ${what}`);
}

console.log(`\n${live} of ${hosts.size} hosts still serve a readable page; ${dead} do not.`);
