"use client";

import { type FormEvent, useState } from "react";
import type { TrustedPerson } from "@/src/domain/types";
import { isReachable } from "@/src/trusted/askForHelp";

interface Props {
	person: TrustedPerson | null;
	onSave: (person: TrustedPerson) => void;
	onForget: () => void;
	/** Set when the browser refused to remember them, so we can say so plainly. */
	saveFailed: boolean;
}

/**
 * Setting up the person the Checker can hand a Message to (ADR 0007).
 *
 * Collapsed to a single line once somebody is saved, because this is scaffolding
 * for the thing the Checker came to do, not the thing itself. It stays out of the
 * way until it is needed.
 */
export function TrustedPersonPanel({ person, onSave, onForget, saveFailed }: Props) {
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(person?.name ?? "");
	const [phone, setPhone] = useState(person?.phone ?? "");

	const draft = { name, phone };

	function submit(event: FormEvent) {
		event.preventDefault();
		if (!isReachable(draft)) return;

		onSave(draft);
		setEditing(false);
	}

	if (person !== null && !editing) {
		return (
			<section className="trusted">
				<p>
					<strong>Your trusted person:</strong> {person.name} · {person.phone}
				</p>
				<div className="trusted-actions">
					<button
						type="button"
						className="link"
						onClick={() => {
							setName(person.name);
							setPhone(person.phone);
							setEditing(true);
						}}
					>
						Change
					</button>
					<button type="button" className="link" onClick={onForget}>
						Remove
					</button>
				</div>
			</section>
		);
	}

	if (!editing) {
		return (
			<section className="trusted">
				<p>
					<strong>Add someone you trust</strong>
					Then you can send them anything you are unsure about, with one tap.
				</p>
				<button type="button" className="link" onClick={() => setEditing(true)}>
					Add a trusted person
				</button>
			</section>
		);
	}

	return (
		<section className="trusted">
			<form onSubmit={submit}>
				<label htmlFor="trusted-name">Their name</label>
				<input
					id="trusted-name"
					value={name}
					onChange={(event) => setName(event.target.value)}
					placeholder="Sarah"
					autoComplete="name"
				/>

				<label htmlFor="trusted-phone">Their mobile number</label>
				<input
					id="trusted-phone"
					value={phone}
					onChange={(event) => setPhone(event.target.value)}
					placeholder="021 555 0100"
					inputMode="tel"
					autoComplete="tel"
				/>

				<p className="hint">
					This stays on this device. It is never sent to us, and we never message them —
					your phone does.
				</p>

				{saveFailed && (
					<p className="error" role="alert">
						Your browser would not let us remember this. You can still use it now, but you
						will have to add it again next time.
					</p>
				)}

				<div className="trusted-actions">
					<button type="submit" disabled={!isReachable(draft)}>
						Save
					</button>
					<button type="button" className="link" onClick={() => setEditing(false)}>
						Cancel
					</button>
				</div>
			</form>
		</section>
	);
}
