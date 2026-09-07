import { describe, expect, it } from "vitest";
import {
	forgetTrustedPerson,
	type KeyValueStore,
	loadTrustedPerson,
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
