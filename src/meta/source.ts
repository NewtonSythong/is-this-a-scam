/**
 * Where this app's own source can be read.
 *
 * The AGPL's section 13 is the reason this exists rather than a nicety: a
 * licence built around network use obliges an app people only ever reach over a
 * network to offer them its source, and a link in the footer is how that offer
 * is made. `NEXT_PUBLIC_` so it survives into the browser bundle, and read
 * through one function so the compliance question has one answer rather than
 * one per page.
 *
 * Unset returns `null`, and the footers then say what the licence is without
 * pointing at a link that goes nowhere — which is the honest state before the
 * repository exists, and the state a fork gets if it forgets to set this.
 */
export function sourceUrl(): string | null {
	const url = process.env.NEXT_PUBLIC_SOURCE_URL?.trim();

	return url === undefined || url === "" ? null : url;
}
