# Benchmark — offline engine only

Run 2026-09-07. Corpus: 16 messages, held out from the regression suite.

| Measure | Result | What it means |
| :-- | :-- | :-- |
| Scams raised | 2/8 (25%) | Reached `scam` or `warning` rather than `unclear` |
| — of which verbatim | 1/2 | The only items free of model-authorship bias |
| Legitimate left quiet | 8/8 (100%) | Correctly returned `unclear` |
| — hard negatives | 5/5 | Genuine messages wearing a scam's clothes |
| Overall | 10/16 (63%) | |

### Scams — 2/8 (25%)

| | id | verdict | provenance |
| :-- | :-- | :-- | :-- |
| pass | `nzpost-signature-verbatim` | scam | verbatim |
| **FAIL** | `nzpost-warehouse-verbatim` | unclear | verbatim |
| **FAIL** | `bnz-rewards-expiry` | unclear | reconstructed |
| **FAIL** | `bank-dispute-payment` | unclear | reconstructed |
| **FAIL** | `customs-duty` | unclear | reconstructed |
| pass | `ird-refund-plausible-domain` | scam | reconstructed |
| **FAIL** | `asb-fraud-team-callback` | unclear | reconstructed |
| **FAIL** | `hi-mum-no-secrecy` | unclear | reconstructed |

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

