import { describe, expect, it } from "vitest";
import {
	CHECKER_KEY,
	forgetChecker,
	forgetTrustedPerson,
	type KeyValueStore,
	loadChecker,
	loadTrustedPerson,
	saveChecker,
	saveTrustedPerson,
	TRUSTED_PERSON_KEY,
} from "./storage";

const fakeStore = (initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } => {
	const data = { ...initial };

	return {
		data,
		getItem: (key) => data[key] ?? null,
		setItem: (key, value) => {
			data[key] = value;
		},
		removeItem: (key) => {
			delete data[key];
		},
	};
};

const throwingStore: KeyValueStore = {
	getItem: () => {
		throw new Error("site data blocked");
	},
	setItem: () => {
		throw new Error("site data blocked");
	},
	removeItem: () => {
		throw new Error("site data blocked");
	},
};

describe("saving and loading a Trusted Person", () => {
	it("reads back what it wrote", () => {
		const store = fakeStore();

		expect(saveTrustedPerson(store, { name: "Sarah", phone: "021 555 0100" })).toBe(true);
		expect(loadTrustedPerson(store)).toEqual({ name: "Sarah", phone: "021 555 0100" });
	});

	it("has nobody before anybody is saved", () => {
		expect(loadTrustedPerson(fakeStore())).toBeNull();
	});

	it("forgets them when asked", () => {
		const store = fakeStore();
		saveTrustedPerson(store, { name: "Sarah", phone: "021 555 0100" });
		forgetTrustedPerson(store);

		expect(loadTrustedPerson(store)).toBeNull();
	});
});

// Everything below is a real state a browser can be in. A saved contact must
// never be the reason the app fails to load.
describe("when the browser's store cannot be trusted", () => {
	it("has nobody when there is no store at all", () => {
		expect(loadTrustedPerson(null)).toBeNull();
		expect(saveTrustedPerson(null, { name: "Sarah", phone: "021" })).toBe(false);
	});

	// Some browsers throw on access rather than returning null when site data is
	// blocked, which is a crash on page load if it is not caught.
	it("survives a store that throws", () => {
		expect(loadTrustedPerson(throwingStore)).toBeNull();
		expect(saveTrustedPerson(throwingStore, { name: "Sarah", phone: "021" })).toBe(false);
		expect(() => forgetTrustedPerson(throwingStore)).not.toThrow();
	});

	it("reports honestly that it could not save", () => {
		expect(saveTrustedPerson(throwingStore, { name: "Sarah", phone: "021" })).toBe(false);
	});

	it("treats unreadable data as nobody saved", () => {
		expect(loadTrustedPerson(fakeStore({ [TRUSTED_PERSON_KEY]: "{not json" }))).toBeNull();
	});

	// Left over from an older shape of this app, or a half-finished write.
	it("treats a contact of the wrong shape as nobody saved", () => {
		for (const stored of ['{"name":"Sarah"}', '{"phone":"021"}', '{"name":5,"phone":"021"}', "null", "[]"]) {
			expect(loadTrustedPerson(fakeStore({ [TRUSTED_PERSON_KEY]: stored })), stored).toBeNull();
		}
	});

	// A saved contact we cannot actually reach is worse than none: the app would
	// offer a button that does nothing.
	it("treats an unusable contact as nobody saved", () => {
		for (const stored of ['{"name":"","phone":"021 555 0100"}', '{"name":"Sarah","phone":"none"}']) {
			expect(loadTrustedPerson(fakeStore({ [TRUSTED_PERSON_KEY]: stored })), stored).toBeNull();
		}
	});
});

describe("saving and loading the Checker's own details", () => {
	it("reads back what it wrote", () => {
		const store = fakeStore();
		saveChecker(store, { name: "Mum", phone: "021 555 0199" });

		expect(loadChecker(store)).toEqual({ name: "Mum", phone: "021 555 0199" });
	});

	// Both halves are optional and useful alone: a name greets them, a number
	// makes the answer one tap.
	it("keeps a name with no number, and a number with no name", () => {
		expect(loadChecker(fakeStore({ [CHECKER_KEY]: '{"name":"Mum","phone":""}' }))).toEqual({
			name: "Mum",
			phone: "",
		});
		expect(loadChecker(fakeStore({ [CHECKER_KEY]: '{"name":"","phone":"021"}' }))).toEqual({
			name: "",
			phone: "021",
		});
	});

	it("reads an empty pair as nothing at all", () => {
		expect(loadChecker(fakeStore({ [CHECKER_KEY]: '{"name":" ","phone":""}' }))).toBeNull();
	});

	it("reads a corrupted or absent value as nothing", () => {
		expect(loadChecker(fakeStore())).toBeNull();
		expect(loadChecker(fakeStore({ [CHECKER_KEY]: "{half-writ" }))).toBeNull();
		expect(loadChecker(fakeStore({ [CHECKER_KEY]: "null" }))).toBeNull();
		expect(loadChecker(null)).toBeNull();
	});

	// A browser with site data blocked throws on access. Their own details are
	// never worth a crash.
	it("survives a store that throws", () => {
		expect(loadChecker(throwingStore)).toBeNull();
		expect(saveChecker(throwingStore, { name: "Mum", phone: "021" })).toBe(false);
		expect(() => forgetChecker(throwingStore)).not.toThrow();
	});

	it("forgets them when asked", () => {
		const store = fakeStore({ [CHECKER_KEY]: '{"name":"Mum","phone":"021"}' });
		forgetChecker(store);

		expect(loadChecker(store)).toBeNull();
	});
});
