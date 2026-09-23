# Active verification goes as far as looking things up, and no further

A Check does not merely read the Message; it goes and establishes facts about it. In scope: expanding shortened links by following redirects server-side so the true destination is known without the Checker's browser ever touching it; looking every link up against Google Safe Browsing, which is free for non-commercial use and gives a citable third-party answer; checking domain registration age, since a bank domain registered nine days ago is a fact rather than an opinion; matching the organisation the Message claims to be from against the domains that organisation actually owns; and returning the organisation's real public phone number so the Checker has somewhere correct to call. Fetching and rendering the destination page in a sandbox to detect a cloned login screen was considered and rejected — it is the most powerful check available, but deliberately loading attacker infrastructure on a Checker's behalf is a liability this project should not carry. **That last sentence was reversed on 2026-09-23; see the amendment below.** Everything in scope except the redirect chain is deterministic, so it belongs to the Artifact Check and is testable without a model.

## Amended 2026-09-23 — the destination page is fetched after all

The rejection above is overturned, narrowly. A Check may now fetch the page a
link leads to, server-side, and read two facts off it: whether it asks for a
password, and what it says it is.

**What changed is evidence, not appetite.** Registration age (`src/lookups/domainAge.ts`)
took the deterministic false alarms from six to zero and broke exactly one item:
`afterpay-verify-account-verbatim`, whose link is a genuine Dutch ticketing host
registered in 2020 that an attacker compromised and served an Afterpay login form
from. The domain really is old and it really was hosting an attack. No threshold
recovers that, and the failure is not a calibration problem — it is the limit of
what any fact *about the address* can establish. Age says where a page lives.
Only the page says what it is for. The rejection above was written before there
was a measured case that only this could answer; there is one now.

**What restrains it**, since the liability named above is real and does not go
away by being outvoted:

- It runs on the server. The Checker's browser, IP and cookies never touch the
  address — already true of the redirect follower, and the reason that one was
  always in scope.
- It is `fetch`, not a browser. No script executes, no subresource loads, nothing
  is rendered anywhere. SmishX's Puppeteer screenshot and vision model stay out
  of scope, and that remains the line this amendment does not cross.
- Only `text/html` is read, and only the first 256KB of it.
- Every hop is resolved and refused if it points inside private address space.
  A Check is an unauthenticated stranger's text arriving at our server, so
  "fetch this URL" is a request to make the server a confused deputy; the cloud
  metadata service is the specific thing being kept out of reach.
- Nothing fetched reaches the Checker. Two facts leave the lookup; the bytes do
  not. The app does not become a viewer for attacker content.
- Only links that could change the answer are fetched at all: a Message naming a
  Known Organisation, and a link not belonging to any Known Organisation's own
  domains. A Message with no claimed organisation fetches nothing.

**What it may conclude.** One thing: that the page asks for a password while
presenting itself as the organisation the Message claimed to be from. Both halves
are required. A password field alone is half the web; an organisation's name
alone is any page that mentions a bank. The conjunction is the evidence, and it
is the only new accusation this lookup is allowed to make.

The restraints are in `src/lookups/destinationPage.ts` and asserted in the test
beside it — including that a refused address is never requested at all, rather
than requested and discarded.
