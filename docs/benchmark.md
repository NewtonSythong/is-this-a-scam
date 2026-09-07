# Benchmark — both engines

Run 2026-09-07. Corpus: 16 messages, held out from the regression suite.

| Measure | Result | What it means |
| :-- | :-- | :-- |
| Scams raised | 5/8 (63%) | Reached `scam` or `warning` rather than `unclear` |
| — of which verbatim | 1/2 | The only items free of model-authorship bias |
| Legitimate left quiet | 8/8 (100%) | Correctly returned `unclear` |
| — hard negatives | 5/5 | Genuine messages wearing a scam's clothes |
| Overall | 13/16 (81%) | |

### Scams — 5/8 (63%)

| | id | verdict | provenance |
| :-- | :-- | :-- | :-- |
| pass | `nzpost-signature-verbatim` | scam | verbatim |
| **FAIL** | `nzpost-warehouse-verbatim` | unclear | verbatim |
| **FAIL** | `bnz-rewards-expiry` | unclear | reconstructed |
| **FAIL** | `bank-dispute-payment` | unclear | reconstructed |
| pass | `customs-duty` | warning | reconstructed |
| pass | `ird-refund-plausible-domain` | scam | reconstructed |
| pass | `asb-fraud-team-callback` | warning | reconstructed |
| pass | `hi-mum-no-secrecy` | warning | reconstructed |

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

