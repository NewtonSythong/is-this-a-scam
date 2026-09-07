import type { TrustedPerson } from "../domain/types";

export const TRUSTED_PERSON_KEY = "is-this-a-scam.trusted-person";

/**
 * Somewhere to keep the Trusted Person. `localStorage` in a browser; anything
 * with the same three methods in a test.
 *
 * An interface rather than reaching for `localStorage` directly, because that
 * object is absent during server rendering and *throws* in some browsers with
 * site data blocked — and a saved contact must never be the reason the app fails
 * to load.
 */
export interface KeyValueStore {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

/**
 * The Trusted Person, or `null` if there isn't a usable one.
 *
 * Everything here is defensive on purpose: the value is read from a store the
 * Checker's browser owns, so it may be missing, corrupted by a half-finished
 * write, left over from an older shape of this app, or throw on access. A
 * malformed contact reads as no contact, which the app already knows how to
 * handle.
 */
export function loadTrustedPerson(store: KeyValueStore | null): TrustedPerson | null {
	if (store === null) return null;

	let raw: string | null;
	try {
		raw = store.getItem(TRUSTED_PERSON_KEY);
	} catch {
		return null;
	}

	if (raw === null) return null;

	try {
		const parsed: unknown = JSON.parse(raw);
		const name = (parsed as { name?: unknown } | null)?.name;
		const phone = (parsed as { phone?: unknown } | null)?.phone;

		if (typeof name !== "string" || typeof phone !== "string") return null;
		if (name.trim() === "" || !/\d/.test(phone)) return null;

		return { name, phone };
	} catch {
		return null;
	}
}

/**
 * Saves the Trusted Person, or reports that it could not.
 *
 * Returns `false` rather than throwing: a Checker in a private window should be
 * told plainly that this will not be remembered, not shown a crash.
 */
export function saveTrustedPerson(store: KeyValueStore | null, person: TrustedPerson): boolean {
	if (store === null) return false;

	try {
		store.setItem(TRUSTED_PERSON_KEY, JSON.stringify(person));
		return true;
	} catch {
		return false;
	}
}

export function forgetTrustedPerson(store: KeyValueStore | null): void {
	try {
		store?.removeItem(TRUSTED_PERSON_KEY);
	} catch {
		// Nothing to do: they asked to forget it, and it is already unreachable.
	}
}

/** The browser's own store, or `null` when there isn't one to reach. */
export function browserStore(): KeyValueStore | null {
	try {
		return typeof localStorage === "undefined" ? null : localStorage;
	} catch {
		return null;
	}
}
