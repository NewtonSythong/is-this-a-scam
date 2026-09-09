import { describe, expect, it } from "vitest";
import { diagnose, dialable, isNewZealandMobile, smsLink, withoutInvisibles } from "./phone";

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

/*
 * The Checker's own number is silently dropped when it is not a New Zealand
 * mobile, and until `diagnose` existed nothing told them so — the consequence
 * appeared much later, on somebody else's phone, as a missing button. These
 * tests are about what the app can now say, not about what it accepts: the gate
 * is `isNewZealandMobile` and it has not moved.
 */
describe("diagnose: what to tell someone about the number they typed", () => {
	it("says nothing about an empty field, because both are optional", () => {
		expect(diagnose("")).toEqual({ kind: "empty" });
		expect(diagnose("   ")).toEqual({ kind: "empty" });
	});

	it("passes a New Zealand mobile however it is written", () => {
		for (const phone of [
			"021 555 0100",
			"0215550100",
			"(021) 555-0100",
			"+64 21 555 0100",
			"64 21 555 0100",
			"0064 21 555 0100", // the international prefix as email signatures write it
		]) {
			expect(diagnose(phone), phone).toEqual({ kind: "mobile" });
		}
	});

	// The common slip, and the whole reason for the "suggestion" field: people
	// give the number the way they say it aloud, which drops the leading zero.
	it("offers the missing leading zero back", () => {
		expect(diagnose("21 555 0100")).toEqual({ kind: "correctable", suggestion: "021 555 0100" });
		expect(diagnose("27 555 0100")).toEqual({ kind: "correctable", suggestion: "027 555 0100" });
	});

	// The number they wrote, grouped as they grouped it — not a bare ten digits.
	it("keeps the spacing they typed in the suggestion", () => {
		expect(diagnose("21 555 0100")).toMatchObject({ suggestion: "021 555 0100" });
		expect(diagnose("215550100")).toMatchObject({ suggestion: "0215550100" });
	});

	it("never suggests a number the gate would then refuse", () => {
		for (const phone of ["21 555 010", "2155501000", "21 555 0100"]) {
			const verdict = diagnose(phone);
			if (verdict.kind === "correctable") {
				expect(isNewZealandMobile(verdict.suggestion), verdict.suggestion).toBe(true);
			}
		}
	});

	// The one wrong answer where the message itself never arrives, rather than
	// just the reply to it.
	it("recognises a landline, which no text will ever reach", () => {
		for (const phone of ["09 555 0100", "03 555 0100", "+64 4 555 0100"]) {
			expect(diagnose(phone), phone).toEqual({ kind: "landline" });
		}
	});

	// Not an error. ADR 0006 keeps the app to New Zealand; it is not a reason to
	// refuse to help somebody whose daughter lives in Sydney.
	it("treats a real overseas number as usable, not wrong", () => {
		expect(diagnose("+61 412 345 678")).toEqual({ kind: "overseas" });
		expect(diagnose("+44 7700 900123")).toEqual({ kind: "overseas" });
	});

	it("calls something too short to dial what it is", () => {
		expect(diagnose("12345")).toEqual({ kind: "unusable" });
		expect(diagnose("abc")).toEqual({ kind: "empty" });
	});

	// Premium rate must never be reachable by a suggestion either — the whole
	// point of the 02 rule is that 0900 is excluded outright.
	it("does not offer a route to a premium-rate number", () => {
		for (const phone of ["900 12345", "0900 12345", "+64 900 12345"]) {
			expect(diagnose(phone).kind, phone).not.toBe("mobile");
			const verdict = diagnose(phone);
			if (verdict.kind === "correctable") {
				expect(verdict.suggestion, phone).not.toMatch(/^09/);
			}
		}
	});
});
