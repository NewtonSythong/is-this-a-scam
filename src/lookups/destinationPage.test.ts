import { describe, expect, it, vi } from "vitest";
import type { Link } from "../domain/types";
import { destinationPage, readPage, type Resolve } from "./destinationPage";

const LINK: Link = { raw: "lahresour.example.nl/tickets/1", host: "lahresour.example.nl" };

/** Every name resolves somewhere public unless a test says otherwise. */
const PUBLIC: Resolve = async () => ["93.184.216.34"];

const html = (body: string) =>
	new Response(body, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });

const redirectTo = (location: string) =>
	new Response(null, { status: 302, headers: { location } });

describe("readPage: what a page says about itself", () => {
	it("sees a password field", () => {
		const page = readPage('<form><input type="password" name="pw"></form>');

		expect(page.asksForPassword).toBe(true);
	});

	it("does not see one where there is none", () => {
		const page = readPage('<form><input type="email"><input type=text></form>');

		expect(page.asksForPassword).toBe(false);
	});

	// Unquoted attributes are legal HTML and a phishing kit is not obliged to be tidy.
	it("sees an unquoted password field", () => {
		expect(readPage("<input type=password>").asksForPassword).toBe(true);
	});

	it("reads the title and the declared site name together", () => {
		const page = readPage(
			'<head><title>Sign in</title>' +
				'<meta property="og:site_name" content="Afterpay"></head>',
		);

		expect(page.presentsAs).toBe("Sign in Afterpay");
	});

	it("survives a page with neither", () => {
		expect(readPage("<p>hello</p>")).toEqual({ asksForPassword: false, presentsAs: "" });
	});
});

// The guard exists because a Check is a stranger's text arriving at our server.
// "Fetch this URL" from an unauthenticated caller is a request to make the
// server reach somewhere the caller cannot.
describe("destinationPage: refusing to be a confused deputy", () => {
	const refuses = async (address: string) => {
		const fetchImpl = vi.fn();
		const destination = destinationPage(fetchImpl as never, async () => [address]);

		expect(await destination(LINK)).toBeNull();
		// The point is not the null. It is that nothing was ever requested.
		expect(fetchImpl).not.toHaveBeenCalled();
	};

	it("refuses the cloud metadata service", () => refuses("169.254.169.254"));
	it("refuses loopback", () => refuses("127.0.0.1"));
	it("refuses a private network", () => refuses("192.168.1.10"));
	it("refuses the other private ranges", () => refuses("10.0.0.5"));
	it("refuses carrier-grade NAT space", () => refuses("100.64.0.1"));
	it("refuses IPv6 loopback", () => refuses("::1"));
	it("refuses IPv6 unique-local", () => refuses("fd00::1"));
	it("refuses loopback wearing an IPv6 coat", () => refuses("::ffff:127.0.0.1"));

	it("refuses a host that resolves to a public and a private address", async () => {
		const fetchImpl = vi.fn();
		const destination = destinationPage(fetchImpl as never, async () => [
			"93.184.216.34",
			"127.0.0.1",
		]);

		expect(await destination(LINK)).toBeNull();
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("refuses a name that does not resolve at all", async () => {
		const fetchImpl = vi.fn();
		const destination = destinationPage(fetchImpl as never, async () => {
			throw new Error("NXDOMAIN");
		});

		expect(await destination(LINK)).toBeNull();
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	// A public first hop that redirects inward is the whole trick, so the guard
	// has to run per hop rather than once at the start.
	it("refuses a redirect that points back inside the network", async () => {
		const seen: string[] = [];
		const fetchImpl = vi.fn(async (url: string) => {
			seen.push(url);
			return redirectTo("http://169.254.169.254/latest/meta-data/");
		});
		const resolve: Resolve = async (host) =>
			host === "lahresour.example.nl" ? ["93.184.216.34"] : ["169.254.169.254"];

		expect(await destinationPage(fetchImpl as never, resolve)(LINK)).toBeNull();
		expect(seen).toEqual(["https://lahresour.example.nl/tickets/1"]);
	});
});

describe("destinationPage: reading the page", () => {
	const read = (fetchImpl: unknown) => destinationPage(fetchImpl as never, PUBLIC)(LINK);

	it("reads a sign-in page at the end of the link", async () => {
		const page = await read(async () =>
			html('<title>Afterpay</title><input type="password">'),
		);

		expect(page).toEqual({ asksForPassword: true, presentsAs: "Afterpay" });
	});

	it("follows a redirect and reads where it lands", async () => {
		const pages = [redirectTo("https://elsewhere.example/login"), html("<title>Afterpay</title>")];
		const page = await read(async () => pages.shift());

		expect(page?.presentsAs).toBe("Afterpay");
	});

	it("gives up rather than following a chain forever", async () => {
		const fetchImpl = vi.fn(async () => redirectTo("https://elsewhere.example/again"));

		expect(await read(fetchImpl)).toBeNull();
		expect(fetchImpl.mock.calls.length).toBeLessThanOrEqual(6);
	});

	// A link to a 500MB installer must cost one refused read, not a download.
	it("does not read anything that is not HTML", async () => {
		const page = await read(async () =>
			new Response("MZ", { headers: { "content-type": "application/octet-stream" } }),
		);

		expect(page).toBeNull();
	});

	it("stops reading at the byte cap", async () => {
		const huge = `<title>Afterpay</title>${"x".repeat(50_000)}<input type="password">`;
		const destination = destinationPage(
			(async () => html(huge)) as never,
			PUBLIC,
			{ maxBytes: 64 },
		);

		const page = await destination(LINK);

		// The title was inside the first 64 bytes; the password field was not, and
		// a truncated read must not invent what it did not see.
		expect(page).toEqual({ asksForPassword: false, presentsAs: "Afterpay" });
	});

	it("reports nothing when the page is gone", async () => {
		expect(await read(async () => new Response("", { status: 404 }))).toBeNull();
	});
});
