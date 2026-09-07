# Is This a Scam?

An application that lets a person who has received a suspicious text message, email, or link find out whether it is a scam, in language they can act on without knowing anything about how scams work.

Built for older and less digitally confident people in New Zealand. The name is deliberately the sentence the person is already thinking, because the name is also the button label they will see in their phone's text-selection menu.

## Language

**Checker**:
The person doing the checking — the one who received the suspicious Message and wants to know if it is real. Usually older, usually not confident with phones, and frightened at the moment they open the app. Every word the app shows is written for them.
_Avoid_: User, victim, elderly person, non-technical user

**Trusted Person**:
Someone the Checker already relies on — an adult child, a neighbour, a friend — who the Checker can hand the Message to when the app cannot settle it. Chosen by the Checker themselves, from their own contacts. Not a carer with authority over them and not an account with elevated permissions.
_Avoid_: Emergency contact, guardian, carer, supervisor, admin

**Message**:
The thing being checked: the text of an SMS, the body of an email, or a bare link. Always plain text by the time it reaches the engine, whatever the Entry Point was.
_Avoid_: Input, payload, content, submission

**Check**:
One complete run — a Message goes in, a Verdict with its Reasons and Actions comes out. The unit of work the whole system is organised around, and the only thing the API does.
_Avoid_: Scan, analysis, request, query

**Verdict**:
The outcome of a Check. Exactly three exist, and none of them is "safe" — see ADR 0001. Always a sentence, never a number, never a colour alone.
_Avoid_: Score, rating, confidence, risk level, result

**Reason**:
One plain-language sentence telling the Checker something concrete the app found — "The link says anz.co.nz but it really goes to anz-secure.top." Every Reason must trace back to a Signal that was actually produced; the app may not say anything it did not find.
_Avoid_: Explanation, finding, justification, insight

**Signal**:
A single piece of evidence produced by the Artifact Check or the Narrative Check. Internal — a Checker never sees a Signal, only the Reason written from it.
_Avoid_: Flag, hit, indicator, feature, red flag

**Artifact Check**:
The deterministic engine. Examines the things in a Message that can be looked up and verified: links, domains, redirects, phone numbers, email addresses, payment methods asked for. Plain TypeScript, no model, fully unit-testable.
_Avoid_: Rules engine, heuristics, filter, classifier

**Narrative Check**:
The language-model engine. Examines the story a Message is telling: impersonation, manufactured urgency, isolation ("don't tell anyone"), the new-number pretext. Judges what cannot be looked up.
_Avoid_: AI check, LLM call, model, semantic analysis

**Known Organisation**:
An organisation on the hand-curated New Zealand list — a bank, a courier, a government agency — recorded with its real domains and its real public phone number, so the app can both spot an impersonation and tell the Checker the number they should have called instead.
_Avoid_: Brand, allowlist, whitelist, trusted sender

**Entry Point**:
One of the three ways a Message reaches the app: the text-selection menu, the share sheet, or the quick-settings tile. Three thin surfaces over one Check.
_Avoid_: Integration, trigger, channel, hook

**Suspicion Score**:
The internal number the engines produce and the thresholds are tuned against. Never shown to a Checker. Visible only in the developer view — see ADR 0001.
_Avoid_: Confidence, probability, likelihood, percentage
