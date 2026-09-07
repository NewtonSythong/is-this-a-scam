# Benchmark — offline engine only

Run 2026-09-07. Corpus: 20 messages, held out from the regression suite.

| Measure | Result | What it means |
| :-- | :-- | :-- |
| **Scams raised, never developed against** | **6/9** (67%) | **The headline. The only scam figure that measures the engine.** |
| Scams raised, since developed against | 0/3 | Proves nothing — the engine was changed while looking at these |
| — of which verbatim | 5/6 | The only items free of model-authorship bias |
| Legitimate left quiet | 8/8 (100%) | Correctly returned `unclear` |
| — hard negatives | 5/5 | Genuine messages wearing a scam's clothes |
| All scams, held out or not | 6/12 (50%) | The flattering number. Do not quote it alone |
| Overall | 14/20 (70%) | |

> **3 of 12 scam messages no longer measure anything.** A held-out
> corpus is a wasting asset: once somebody fixes a miss by studying the message
> that produced it, that message passes by construction. They are listed at the
> end with what was done to them, and the headline above excludes them.

### Scams — 6/12 (50%)

| | id | verdict | provenance |
| :-- | :-- | :-- | :-- |
| pass | `nzpost-signature-verbatim` | scam | verbatim |
| **FAIL** | `nzpost-warehouse-verbatim` *(no longer held out)* | unclear | verbatim |
| **FAIL** | `bnz-rewards-expiry` *(no longer held out)* | unclear | reconstructed |
| **FAIL** | `bank-dispute-payment` *(no longer held out)* | unclear | reconstructed |
| **FAIL** | `customs-duty` | unclear | reconstructed |
| pass | `ird-refund-plausible-domain` | scam | reconstructed |
| **FAIL** | `asb-fraud-team-callback` | unclear | reconstructed |
| **FAIL** | `hi-mum-no-secrecy` | unclear | reconstructed |
| pass | `anz-account-frozen-verbatim` | scam | verbatim |
| pass | `anz-points-expiry-verbatim` | scam | verbatim |
| pass | `anz-points-expiry-short-verbatim` | scam | verbatim |
| pass | `nzpost-redelivery-verbatim` | scam | verbatim |

### Legitimate messages — 8/8 (100%)

| | id | verdict | provenance |
| :-- | :-- | :-- | :-- |
| pass | `ird-genuine-assessment` | unclear | reconstructed |
| pass | `nzpost-genuine-tracking` | unclear | reconstructed |
| pass | `nzpost-genuine-shortener` *(hard)* | unclear | reconstructed |
| pass | `bank-genuine-2fa` *(hard)* | unclear | reconstructed |
| pass | `bank-genuine-confirm-payment` *(hard)* | unclear | reconstructed |
| pass | `family-money-request` *(hard)* | unclear | synthetic |
| pass | `appointment-reminder` *(hard)* | unclear | synthetic |
| pass | `ordinary-personal` | unclear | synthetic |

## Failures in detail

**`nzpost-warehouse-verbatim`** — returned `unclear`, wanted `scam` or `warning`

> Your package has arrived at the warehouse and has been suspended for delivery due to a missing home number in the package.

No link and no organisation named — only the Narrative Check can reach this.

**`bnz-rewards-expiry`** — returned `unclear`, wanted `scam` or `warning`

> BNZ: Your BNZ Rewards points will expire shortly. Reply Y to confirm you wish to keep them.

BNZ, April 2026. No link — the payload is the reply, which harvests a live number.

**`bank-dispute-payment`** — returned `unclear`, wanted `scam` or `warning`

> A payment of $739.00 to WELLINGTON TRADING was authorised on your account. If you did not authorise this, dispute it here: secure-verify-nz.com/dispute

The May 2022 pattern: a fictitious charge, and the 'dispute' link is the hook. No bank is named, so there is no impersonation to spot.

**`customs-duty`** — returned `unclear`, wanted `scam` or `warning`

> Your international parcel is held by customs pending an unpaid duty of $3.20. Settle within 24 hours or the item will be returned to sender. customs-clearance-nz.com/pay


**`asb-fraud-team-callback`** — returned `unclear`, wanted `scam` or `warning`

> This is the ASB fraud team. We have stopped a transaction on your account. Please call us back on 09 887 4412 immediately to secure your funds.

The number is the payload. No link at all, and it names a real bank.

**`hi-mum-no-secrecy`** — returned `unclear`, wanted `scam` or `warning`

> Hey mum, dropped my phone down the loo this morning so I'm on a temporary number. Save this one. Are you free later?

The opening move only — no ask yet. Catching this is what would actually protect someone, and it is the hardest case in the corpus.

## Items that no longer measure anything

**`nzpost-warehouse-verbatim`** — 2026-09-07: the delivery-blocked-pretext narrative pattern was written after reading this message.

**`bnz-rewards-expiry`** — 2026-09-07: the benefit-expiry-pretext narrative pattern was written after reading this message.

**`bank-dispute-payment`** — 2026-09-07: the unauthorised-payment-pretext narrative pattern was written after reading this message, including the clause separating it from bank-genuine-confirm-payment.

