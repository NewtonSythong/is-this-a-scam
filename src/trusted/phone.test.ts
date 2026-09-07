import { describe, expect, it } from "vitest";
import { dialable, isNewZealandMobile, smsLink, withoutInvisibles } from "./phone";

describe("dialable", () => {
	it("strips everything a person writes a number with", () => {
		expect(dialable("(021) 555-0100")).toBe("0215550100");
	});

	it("keeps a leading + for an international number", () => {
		expect(dialable("+64 21 555 0100")).toBe("+64215550100");
	});
});

describe("smsLink", () => {
	it("escapes everything that would truncate the body", () => {
		const link = smsLink("021 555 0100", 'a "quoted" line\n& more');

		expect(link).toBe("sms:0215550100?body=a%20%22quoted%22%20line%0A%26%20more");
	});
});

/*
 * This is a security boundary, not a formatting nicety. The value it guards
 * arrives inside a link, so it may have been chosen by whoever sent that link
 * rather than by the Checker — and it decides which number a stranger's page
 * makes somebody's phone text.
 */
describe("isNewZealandMobile", () => {
	it("accepts New Zealand mobiles, however they are written", () => {
		for (const phone of [
			"021 555 0100",
			"0215550100",
			"022 555 0100",
			"027 555 0100",
			"(021) 555-0100",
			"+64 21 555 0100",
			"+64215550100",
			"64 21 555 0100",
			"021 555 010", // the short end: 02, one digit, six more
			"021 555 01000", // the long end: 02, one digit, eight more
		]) {
			expect(isNewZealandMobile(phone), phone).toBe(true);
		}
	});

	// The attack this exists to stop: a crafted link whose one large button texts
	// a premium-rate number, charging the reader and confirming their number is
	// live. Premium rate is 0900, so insisting on 02 excludes the range outright.
	it("refuses premium-rate numbers", () => {
		for (const phone of ["0900 12345", "0900123456", "+64 900 12345"]) {
			expect(isNewZealandMobile(phone), phone).toBe(false);
		}
	});

	it("refuses landlines, service numbers and anything overseas", () => {
		for (const phone of [
			"03 555 0100",
			"09 555 0100",
			"0800 83 83 83",
			"111",
			"+61 400 555 010",
			"+1 202 555 0100",
			"",
			"ring me at work",
			"02",
			"021",
			"021 555 010000", // too long to be one
		]) {
			expect(isNewZealandMobile(phone), phone).toBe(false);
		}
	});
});

describe("withoutInvisibles", () => {
	// A right-to-left override makes a screen lie about its own contents, which
	// matters most on the page asking somebody to judge a hostname.
	it("removes bidirectional overrides and zero-width marks", () => {
		expect(withoutInvisibles("anz\u202E.top\u200B")).toBe("anz.top");
		expect(withoutInvisibles("\uFEFFhello\u2066there\u2069")).toBe("hellothere");
	});

	it("removes control codes", () => {
		expect(withoutInvisibles("a\u0000b\u001Fc\u007Fd")).toBe("abcd");
	});

	// In a forwarded message the line breaks are sometimes the tell.
	it("keeps newlines and ordinary text alone", () => {
		expect(withoutInvisibles("Kia ora Māori\nsecond line")).toBe("Kia ora Māori\nsecond line");
	});
});
