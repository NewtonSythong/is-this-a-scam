import { describe, expect, it } from "vitest";
import { paymentRailSignals } from "./paymentRails";

const kinds = (message: string) => paymentRailSignals(message).map((signal) => signal.kind);

describe("paymentRailSignals: being asked to pay in a way that cannot be undone", () => {
	it("spots a gift card request", () => {
		expect(kinds("Buy a $200 gift card and send me the code")).toEqual(["gift-card-request"]);
	});

	it("spots the named store cards scams actually ask for", () => {
		expect(kinds("Please get an iTunes card from the dairy")).toEqual(["gift-card-request"]);
		expect(kinds("Get a Google Play card and photograph the back")).toEqual(["gift-card-request"]);
		expect(kinds("A Steam card will do")).toEqual(["gift-card-request"]);
	});

	it("reads plurals and any capitalisation", () => {
		expect(kinds("send GIFT CARDS please")).toEqual(["gift-card-request"]);
	});

	it("spots a request for money that cannot be traced", () => {
		expect(kinds("Send $500 in Bitcoin to this wallet")).toEqual(["untraceable-payment-request"]);
		expect(kinds("Pay by Western Union today")).toEqual(["untraceable-payment-request"]);
	});

	it("explains why in words a Checker can act on", () => {
		const [signal] = paymentRailSignals("Buy a $200 gift card and send me the code");

		expect(signal?.reason).toBe(
			"This message asks you to pay with a gift card. Real businesses and government " +
				"departments never ask to be paid that way.",
		);
	});

	// Warning, not scam, on its own. A message can mention a gift card innocently,
	// and the Verdict is settled by combining Signals — a single rule here should
	// not be able to call something a scam by itself.
	it("raises a warning rather than calling it a scam outright", () => {
		expect(paymentRailSignals("Buy a $200 gift card")[0]?.severity).toBe("warning");
	});

	it("says nothing about a message that asks for no payment", () => {
		expect(kinds("Hi Mum, this is my new number, my old phone broke.")).toEqual([]);
	});

	// "Gifted", "card" on its own, and "a card from the whole family" are ordinary
	// English. Only the actual payment phrases count.
	it("is not set off by ordinary talk of cards and gifts", () => {
		expect(kinds("I gifted her a book and signed the card from all of us")).toEqual([]);
		expect(kinds("Your card ending 4471 was used at Countdown")).toEqual([]);
	});

	it("reports each distinct request once, not once per phrase", () => {
		expect(kinds("Buy a gift card, any gift card, and send the code")).toEqual([
			"gift-card-request",
		]);
	});

	it("uses no jargon", () => {
		for (const message of ["Buy a gift card", "Send Bitcoin now"]) {
			expect(paymentRailSignals(message)[0]?.reason).not.toMatch(
				/url|domain|phishing|malicious|rail|vector/i,
			);
		}
	});
});
