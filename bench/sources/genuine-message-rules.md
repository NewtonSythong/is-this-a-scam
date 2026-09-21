# What official New Zealand sources say a GENUINE message looks like

Checked 2026-09-21. Gathered while building out the legitimate half of
`bench/corpus.ts`, which until now rested on thirteen messages we wrote
ourselves.

**The headline finding, and it is the reason this file exists rather than a pile
of quotes:** New Zealand banks, couriers and agencies publish *rules about* their
genuine messages, not the messages. Every page below describes what a real
notification contains and what it will never contain; not one of them prints the
text of one. That is the mirror image of the scam half, where the same
organisations publish annotated screenshots of the scam itself.

So published sources can only ever produce `reconstructed` negatives here — ours
prose, constrained by an official rule. They cannot produce `verbatim` ones. The
only verbatim genuine New Zealand messages available to this project are the ones
in a New Zealander's own inbox.

## Inland Revenue

- Genuine texts come from **5678** or **4478**. Any other number is a scam.
- Genuine email is from a `ird.govt.nz` address.
- Genuine messages **do not contain a link to a refund, and do not state a refund
  amount**. They tell you to log in to myIR yourself.
- Never asks for a password; never asks for payment in gift cards or crypto.
- Real domains: `ird.govt.nz`, `myir.govt.nz`, `taxtechnical.ird.govt.nz`,
  `taxpolicy.ird.govt.nz`.

Source: https://www.ird.govt.nz/managing-my-tax/scams/signs-of-a-scam

## NZ Post

- Email always ends `@nzpost.co.nz`, never another domain.
- Links **always** go to `nzpost.co.nz` or `http://nzp.st/` — "the short link we
  often use". A genuine NZ Post message can therefore carry a shortened link,
  which is the single most useful fact on this page for a false-alarm corpus.
- Never texts from a number outside New Zealand.
- Never uses WhatsApp or another messaging app.

Source: https://www.nzpost.co.nz/contact-support/scams-and-fraud

## ANZ

- A genuine SMS or email **includes information you can validate**: ANZ's contact
  number, the **last four digits of your card or account**, and specific
  transaction detail.
- ANZ **sends a pre-call SMS** to say they are about to ring, and leaves a
  voicemail if they do not reach you.
- Never asks for passwords, PINs, ANZ Shield codes or one-time passcodes by email
  or SMS; never asks you to click a link to log in; never asks for remote access;
  never asks you to move money to another account.

Source: https://www.anz.com.au/security/protect-yourself/anz-contact-scam/

## ASB

- Netcode is a one-time code sent by text. ASB will **never ask you to read it
  out**.
- Genuine phone contact can be confirmed by a **Caller Check notification in the
  ASB mobile app** — if the caller cannot send one, it is a scam.
- The ASB fraud team **does** ring customers to check unusual transactions, and
  will ask security questions, but never for codes or passwords.
- Genuine number: 0800 ASB FRAUD / 0800 272 372, or +64 9 303 0332 from overseas. <!-- pragma: allow — ASB's own published fraud line -->


Source: https://www.asb.co.nz/banking-with-asb/security-alerts.html

## NZTA Waka Kotahi

- Toll reminders are sent **only from 3651**.
- Genuine toll texts **do not contain a link to pay online**.

Source: https://www.nzta.govt.nz/online-services/phishing-scams/latest-phishing-scams/text-message-scam/

## Department of Internal Affairs

- Scam texts are forwarded free to **7726**. Worth knowing because a genuine
  message *about* scam reporting is itself an awkward negative.

Source: https://www.dia.govt.nz/diawebsite.nsf/wpg_URL/Services-Anti-Spam-TXT-Scams

## Not reachable

- Westpac NZ's "Keeping you safe" page returns HTTP 403 to an automated fetch.
  Nothing from Westpac is recorded here, rather than guessed at.
