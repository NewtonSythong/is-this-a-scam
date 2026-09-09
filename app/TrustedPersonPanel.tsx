"use client";

import { type FormEvent, useState } from "react";
import type { CheckerIdentity, TrustedPerson } from "@/src/domain/types";
import { isReachable } from "@/src/trusted/askForHelp";
import { diagnose } from "@/src/trusted/phone";

interface Props {
	person: TrustedPerson | null;
	/** The Checker's own name and number. Optional, and often absent. */
	checker: CheckerIdentity | null;
	onSave: (person: TrustedPerson, checker: CheckerIdentity) => void;
	onForget: () => void;
	/** Set when the browser refused to remember them, so we can say so plainly. */
	saveFailed: boolean;
}

/**
 * What to say under a number that will not do what the Checker expects.
 *
 * Nothing here blocks the form. A number the app cannot use is still the number
 * they typed, and they may well know something we do not — so this says what
 * will happen and, where the number is recoverable, offers the fix as a button
 * rather than an instruction to go and retype it.
 *
 * `whose` changes what the consequence actually is. A landline given as the
 * Trusted Person's means the message never arrives; given as the Checker's own
 * it means only the one-tap reply is lost. An overseas number is worth
 * mentioning for the Checker and worth ignoring for the Trusted Person, because
 * ADR 0006 keeping this app to New Zealand was never a reason to refuse to help
 * somebody whose daughter lives in Sydney.
 */
function NumberAdvice({
	phone,
	whose,
	them,
	onUse,
}: {
	phone: string;
	whose: "theirs" | "yours";
	them: string;
	onUse: (suggestion: string) => void;
}) {
	const verdict = diagnose(phone);

	if (verdict.kind === "correctable") {
		return (
			<p className="hint" role="status">
				Did you mean <strong>{verdict.suggestion}</strong>? A New Zealand mobile starts with
				02.{" "}
				<button type="button" className="link" onClick={() => onUse(verdict.suggestion)}>
					Use that
				</button>
			</p>
		);
	}

	if (verdict.kind === "landline") {
		return (
			<p className="hint" role="status">
				{whose === "theirs"
					? `That looks like a landline, and a text message will not arrive on one. Is there a mobile for ${them}?`
					: `That looks like a landline, so ${them} cannot text an answer back to it. A mobile means they can answer you with one tap.`}
			</p>
		);
	}

	if (verdict.kind === "overseas" && whose === "yours") {
		return (
			<p className="hint" role="status">
				{them} will still get your message. They will have to type their answer, though — the
				one-tap reply only works to a New Zealand mobile.
			</p>
		);
	}

	if (verdict.kind === "unusable") {
		return (
			<p className="hint" role="status">
				That does not look like quite enough digits for a phone number.
			</p>
		);
	}

	return null;
}

/**
 * Setting up the person the Checker can hand a Message to (ADR 0007).
 *
 * Collapsed to a single line once somebody is saved, because this is scaffolding
 * for the thing the Checker came to do, not the thing itself. It stays out of the
 * way until it is needed.
 */
export function TrustedPersonPanel({ person, checker, onSave, onForget, saveFailed }: Props) {
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(person?.name ?? "");
	const [phone, setPhone] = useState(person?.phone ?? "");
	const [yourName, setYourName] = useState(checker?.name ?? "");
	const [yourPhone, setYourPhone] = useState(checker?.phone ?? "");

	const draft = { name, phone };

	function submit(event: FormEvent) {
		event.preventDefault();
		if (!isReachable(draft)) return;

		onSave(draft, { name: yourName, phone: yourPhone });
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
							setYourName(checker?.name ?? "");
							setYourPhone(checker?.phone ?? "");
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
				<p className="lead">
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

				<NumberAdvice
					phone={phone}
					whose="theirs"
					them={name.trim() === "" ? "them" : name.trim()}
					onUse={setPhone}
				/>

				<p className="hint">
					This stays on this device. It is never sent to us, and we never message them —
					your phone does.
				</p>

				{/* Optional on purpose. Asking an unconfident person for their own phone
				    number before they may check anything would cost more than the tap it
				    saves — so the app works without this, and works a little better with
				    it. */}
				<fieldset className="about-you">
					<legend>About you — you can skip this</legend>

					<label htmlFor="your-name">Your name</label>
					<input
						id="your-name"
						value={yourName}
						onChange={(event) => setYourName(event.target.value)}
						placeholder="Mum"
						autoComplete="name"
					/>

					<label htmlFor="your-phone">Your own mobile number</label>
					<input
						id="your-phone"
						value={yourPhone}
						onChange={(event) => setYourPhone(event.target.value)}
						placeholder="021 555 0199"
						inputMode="tel"
						autoComplete="tel"
					/>

					<NumberAdvice
						phone={yourPhone}
						whose="yours"
						them={name.trim() === "" ? "They" : name.trim()}
						onUse={setYourPhone}
					/>

					<p className="hint">
						So {name.trim() === "" ? "they" : name.trim()} can see who is asking, and answer
						you with one tap instead of typing a reply. This stays on this device too.
					</p>
				</fieldset>

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
