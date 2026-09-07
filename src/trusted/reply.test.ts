import { describe, expect, it } from "vitest";
import type { Ask } from "../domain/types";
import { askUrl, parseAsk, replyHref, replyText, whatTheAppSaid } from "./reply";

const ASK: Ask = {
	message: "NZ Post: your parcel is held. Pay $1.50 at nzpost-track.top",
	from: "Mum",
	to: "Sarah",
	back: "021 555 0100",
	level: "unclear",
};

describe("askUrl: the link the Trusted Person taps", () => {
	// The single most important character in this file. A query string would put
	// every checked message into the host's access log; a fragment is never sent
	// to the server at all. See ADR 0013.
	it("puts everything after the # so none of it reaches the server", () => {
		const url = new URL(askUrl("https://example.nz", ASK));

		expect(url.pathname).toBe("/asked");
		expect(url.search).toBe("");
		expect(url.hash).not.toBe("");
	});

	it("carries the message, both names, the number and the verdict", () => {
		expect(parseAsk(new URL(askUrl("https://example.nz", ASK)).hash)).toEqual(ASK);
	});

	it("leaves out what it was not given rather than carrying empty values", () => {
		const bare = askUrl("https://example.nz", {
			message: "x",
			from: null,
			to: "  ",
			back: null,
			level: null,
		});

		expect(bare).toBe("https://example.nz/asked#m=x");
	});

	// A number with no digits in it cannot be answered on, and carrying it would
	// give the page a reply button that opens an empty message.
	it("drops a number that is not a number", () => {
		const url = askUrl("https://example.nz", { ...ASK, back: "ring me at work" });

		expect(parseAsk(new URL(url).hash)?.back).toBeNull();
	});

	it("does not double the slash when the origin has a trailing one", () => {
		expect(askUrl("https://example.nz/", ASK)).toContain("https://example.nz/asked#");
	});

	// The whole link travels inside an SMS, and phones drop long ones silently.
	it("trims a forwarded email down to something a phone will send", () => {
		const url = askUrl("https://example.nz", { ...ASK, message: "a".repeat(3000) });

		expect(url.length).toBeLessThan(900);
		expect(parseAsk(new URL(url).hash)?.message).toContain("(shortened)");
	});

	// URLSearchParams escapes spaces as "+", so the link contains no whitespace
	// for a phone's link detector to stop at, and it survives being tapped.
	it("contains no spaces or newlines to break the link on", () => {
		const url = askUrl("https://example.nz", { ...ASK, message: 'a "quoted"\nline & more' });

		expect(url).not.toMatch(/[\s]/);
		expect(parseAsk(new URL(url).hash)?.message).toBe('a "quoted"\nline & more');
	});
});

describe("parseAsk: reading a link that arrived by text message", () => {
	it("accepts the fragment with or without its #", () => {
		expect(parseAsk("#m=hello")?.message).toBe("hello");
		expect(parseAsk("m=hello")?.message).toBe("hello");
	});

	// An SMS can be forwarded, truncated by a carrier, or pasted back together by
	// hand. A page built from half a message is worse than no page at all.
	it("reads a message-less link as nothing rather than as an empty message", () => {
		expect(parseAsk("")).toBeNull();
		expect(parseAsk("#")).toBeNull();
		expect(parseAsk("#f=Mum&b=0215550100")).toBeNull();
		expect(parseAsk("#m=")).toBeNull();
		expect(parseAsk("#m=%20%20")).toBeNull();
	});

	it("ignores a verdict level it does not recognise", () => {
		expect(parseAsk("#m=x&l=safe")?.level).toBeNull();
		expect(parseAsk("#m=x&l=scam")?.level).toBe("scam");
	});

	it("ignores anything else that was tacked on", () => {
		expect(parseAsk("#m=x&utm_source=whatever")?.message).toBe("x");
	});
});

describe("replyText: the answer the Trusted Person sends back", () => {
	it("greets the Checker by name when it knows it", () => {
		expect(replyText("scam", "", "Mum")).toMatch(/^Hi Mum, that one's a scam\./);
	});

	// The three answers are written to follow a greeting. Without one they have to
	// open the message themselves, and a text message that starts in lower case
	// reads like it was cut off.
	it("starts the message properly when it has no name to greet", () => {
		expect(replyText("scam", "", null)).toMatch(/^That one's a scam\./);
		expect(replyText("genuine", "", "  ")).toMatch(/^I think/);
	});

	// The hard part of helping is the wording, not the opinion. Each answer says
	// what to do, not just what it is.
	it("tells them what to do, not only what it is", () => {
		expect(replyText("scam", "", null)).toContain("Don't reply");
		expect(replyText("genuine", "", null)).toContain("ring them on a number you already have");
		expect(replyText("unsure", "", null)).toContain("let's have a look at it together");
	});

	// ADR 0001 forbids the *app* from saying a message is safe. A Trusted Person
	// may say it — but they can be wrong, and the cost of being wrong this way is
	// somebody's savings, so the all-clear carries the check that costs nothing.
	it("attaches a check to the all-clear rather than ending on it", () => {
		const genuine = replyText("genuine", "", null);

		expect(genuine).toContain("genuine");
		expect(genuine).toContain("ring them on a number you already have");
	});

	it("adds their own words underneath, when they wrote any", () => {
		expect(replyText("scam", "I got the same one yesterday.", "Mum")).toBe(
			`${replyText("scam", "", "Mum")}\n\nI got the same one yesterday.`,
		);
	});

	it("leaves no dangling gap when they wrote nothing", () => {
		expect(replyText("scam", "   ", "Mum")).not.toContain("\n");
	});

	it("trims a note long enough to break the reply", () => {
		expect(replyText("scam", "z".repeat(600), null)).toContain("(shortened)");
	});
});

describe("replyHref: answering in one tap", () => {
	it("opens a message back to the Checker, pre-written", () => {
		expect(replyHref("021 555 0100", "It's a scam")).toBe("sms:0215550100?body=It's%20a%20scam");
	});

	// Not a failure: they are holding a text from the Checker and can reply in
	// the thread. The page offers them the words instead of the tap.
	it("returns nothing when there is no number to answer on", () => {
		expect(replyHref(null, "x")).toBeNull();
		expect(replyHref("no number here", "x")).toBeNull();
	});
});

describe("whatTheAppSaid", () => {
	it("says plainly that the app could not tell, which is the usual reason to ask", () => {
		expect(whatTheAppSaid("unclear")).toContain("could not tell");
	});

	it("has nothing to say when the link did not carry a verdict", () => {
		expect(whatTheAppSaid(null)).toBeNull();
	});
});

/*
 * Anyone can build a link to /asked, so every field below may have been written
 * by a stranger rather than by the Checker. These are the limits on what that
 * stranger can make the page say and do.
 */
describe("a link built by somebody other than the Checker", () => {
	it("refuses a reply number that is not a New Zealand mobile", () => {
		expect(parseAsk("#m=x&b=0900+12345")?.back).toBeNull();
		expect(parseAsk("#m=x&b=%2B61+400+555+010")?.back).toBeNull();
		expect(parseAsk("#m=x&b=021+555+0100")?.back).toBe("021 555 0100");
	});

	// Without this the page's one large button texts a number of the sender's
	// choosing — a premium-rate charge, and a confirmation that the number works.
	it("offers no reply button at all for such a number", () => {
		expect(replyHref("0900 12345", "x")).toBeNull();
	});

	// The names go straight into headings on our domain, so they are somewhere a
	// stranger can put words. Nothing sentence-shaped survives the length.
	it("cuts a name down to a name", () => {
		const long = parseAsk("#m=x&f=ANZ+Security+Team+-+your+account+is+suspended");

		expect(long?.from?.length).toBeLessThanOrEqual(24);
		expect(long?.from).not.toContain("suspended");
	});

	it("keeps names with macrons, hyphens and apostrophes intact", () => {
		expect(parseAsk("#m=x&f=M%C4%81ori")?.from).toBe("Māori");
		expect(parseAsk("#m=x&f=Anne-Marie+O'Brien")?.from).toBe("Anne-Marie O'Brien");
	});

	it("strips the invisible characters that make a screen lie", () => {
		expect(parseAsk("#m=anz%E2%80%AE.top")?.message).toBe("anz.top");
		expect(parseAsk("#m=x&f=Mum%E2%80%8B")?.from).toBe("Mum");
	});

	it("reads a name that was only invisibles as no name", () => {
		expect(parseAsk("#m=x&f=%E2%80%8B%E2%80%8B")?.from).toBeNull();
	});
});

describe("askUrl: what the Checker's own device will and will not carry", () => {
	// Better they find out here than have their Trusted Person tap a button that
	// goes nowhere.
	it("leaves out the Checker's own number when the page would refuse it", () => {
		const url = askUrl("https://example.nz", { ...ASK, back: "+61 400 555 010" });

		expect(parseAsk(new URL(url).hash)?.back).toBeNull();
	});

	it("carries a New Zealand mobile through unchanged", () => {
		const url = askUrl("https://example.nz", { ...ASK, back: "027 555 0100" });

		expect(parseAsk(new URL(url).hash)?.back).toBe("027 555 0100");
	});
});
