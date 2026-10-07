# Active verification goes as far as looking things up, and no further

A Check does not merely read the Message; it goes and establishes facts about it. In scope: expanding shortened links by following redirects server-side so the true destination is known without the Checker's browser ever touching it; looking every link up against Google Safe Browsing, which is free for non-commercial use and gives a citable third-party answer; checking domain registration age, since a bank domain registered nine days ago is a fact rather than an opinion; matching the organisation the Message claims to be from against the domains that organisation actually owns; and returning the organisation's real public phone number so the Checker has somewhere correct to call. Fetching and rendering the destination page in a sandbox to detect a cloned login screen was considered and rejected — it is the most powerful check available, but deliberately loading attacker infrastructure on a Checker's behalf is a liability this project should not carry. Everything in scope except the redirect chain is deterministic, so it belongs to the Artifact Check and is testable without a model.

## Note — the page fetch was built, and is parked; domain age is live

Decision "Not yet" (Newton): the decision above stands, and the live Check does not fetch the page a link leads to.
A server-side destination fetch (`destinationPage.ts`) was built and measured on the
branch `hold-half-the-corpus-back` and is parked, not abandoned: it is not on this
branch and not wired into the live path. It stays parked until the DNS-rebinding
gap is closed: the private-address check resolves a host and the later request
resolves it again, so a hostile name can answer differently the second time.
Closing it means pinning the resolved address into the request.

The domain-age lookup is live. It was briefly parked with the fetch, and Newton
restored it: it is a separate, lower-risk lookup. It queries the public RDAP
registry, never the suspect host, so nothing an attacker controls is loaded on a
Checker's behalf. `liveLookups` does the redirect follower, Safe Browsing and RDAP
domain age (`src/lookups/domainAge.ts`). A host registered for more than two years is
exempted from the two impersonation rules only; every failure, and every registry
with no RDAP service such as `.nz`, reads as "unknown" and leaves the rules as they
were.

Where to recover the fetch: commit `f8f5cd9` on `hold-half-the-corpus-back` (tip
`f9de6e8`). Its research write-ups remain in `docs/method-alternatives.md` and
`paper/SAMPLING-PROTOCOL.md`.
