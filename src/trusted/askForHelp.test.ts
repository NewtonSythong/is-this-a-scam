import { describe, expect, it } from "vitest";
import { askForHelp, isReachable, smsHref } from "./askForHelp";

const SARAH = { name: "Sarah", phone: "021 555 0100" };

describe("askForHelp: the message sent to a Trusted Person", () => {
	it("says who is asking for what, then quotes the message", () => {
		expect(askForHelp(SARAH, "ANZ: verify at anz-secure.top")).toBe(
			"Hi Sarah, I got this message and I'm not sure if it's real. Can you have a look?\n\n" +
				'"ANZ: verify at anz-secure.top"',
		);
	});

	it("greets them by name", () => {
		expect(askForHelp({ name: "Tama", phone: "021 555 0100" }, "x")).toMatch(/^Hi Tama,/);
	});

	// The whole point is that the Trusted Person sees the actual words. A summary
	// would hide the very details they are being asked to judge.
	it("quotes the message rather than describing it", () => {
		expect(askForHelp(SARAH, "Hi Mum, my phone broke")).toContain('"Hi Mum, my phone broke"');
	});

	// A forwarded email can run to thousands of characters, and an SMS link that
	// long is silently dropped by some phones. Better a trimmed message that
	// arrives than a complete one that does not.
	it("trims a very long message and says that it did", () => {
		const long = "a".repeat(1200);
		const asked = askForHelp(SARAH, long);

		expect(asked.length).toBeLessThan(1100);
		expect(asked).toContain("(shortened)");
	});

	it("leaves a normal-length message whole", () => {
		const normal = "b".repeat(400);

		expect(askForHelp(SARAH, normal)).toContain(normal);
		expect(askForHelp(SARAH, normal)).not.toContain("(shortened)");
	});
});

describe("smsHref: handing the message to the phone", () => {
	// The phone sends it, not us. Nothing about the Trusted Person or the message
	// reaches the server.
	it("builds an sms link to their number", () => {
		expect(smsHref(SARAH, "hello")).toBe("sms:0215550100?body=hello");
	});

	it("strips the spaces people write phone numbers with", () => {
		expect(smsHref({ name: "S", phone: "021 555 0100" }, "x")).toContain("sms:0215550100?");
	});

	it("keeps a leading + for an international number", () => {
		expect(smsHref({ name: "S", phone: "+64 21 555 0100" }, "x")).toContain("sms:+64215550100?");
	});

	// Quotes, newlines and ampersands all appear in these messages, and any one of
	// them unescaped truncates the text the Trusted Person receives.
	it("escapes everything that would break the link", () => {
		const href = smsHref(SARAH, 'a "quoted" line\n& another');

		expect(href).not.toContain('"');
		expect(href).not.toContain("\n");
		expect(href).toContain("%22");
		expect(href).toContain("%0A");
		expect(href).toContain("%26");
	});
});

describe("isReachable: whether we have enough to ask anyone", () => {
	it("accepts a name and a number", () => {
		expect(isReachable(SARAH)).toBe(true);
	});

	it("rejects a missing name", () => {
		expect(isReachable({ name: "", phone: "021 555 0100" })).toBe(false);
		expect(isReachable({ name: "   ", phone: "021 555 0100" })).toBe(false);
	});

	it("rejects a number with no digits in it", () => {
		expect(isReachable({ name: "Sarah", phone: "" })).toBe(false);
		expect(isReachable({ name: "Sarah", phone: "call me" })).toBe(false);
	});

	// Deliberately permissive about the shape. People write their family's
	// numbers however they like, and rejecting a real number because it has
	// brackets in it would be the app refusing to help for no reason.
	it("accepts a number written however the Checker writes it", () => {
		for (const phone of ["021-555-0100", "(021) 555 0100", "+64 21 555 0100", "0800 83 83 83"]) {
			expect(isReachable({ name: "Sarah", phone }), phone).toBe(true);
		}
	});
});
