# Benchmark — both engines

Run 2026-09-07. Corpus: 20 messages, held out from the regression suite.

| Measure | Result | What it means |
| :-- | :-- | :-- |
| **Scams raised, never developed against** | **9/9** (100%) | **The headline. The only scam figure that measures the engine.** |
| Scams raised, since developed against | 3/3 | Proves nothing — the engine was changed while looking at these |
| — of which verbatim | 6/6 | The only items free of model-authorship bias |
| Legitimate left quiet | 8/8 (100%) | Correctly returned `unclear` |
| — hard negatives | 5/5 | Genuine messages wearing a scam's clothes |
| All scams, held out or not | 12/12 (100%) | The flattering number. Do not quote it alone |
| Overall | 20/20 (100%) | |

> **3 of 12 scam messages no longer measure anything.** A held-out
> corpus is a wasting asset: once somebody fixes a miss by studying the message
> that produced it, that message passes by construction. They are listed at the
> end with what was done to them, and the headline above excludes them.

### Scams — 12/12 (100%)

| | id | verdict | provenance |
| :-- | :-- | :-- | :-- |
| pass | `nzpost-signature-verbatim` | scam | verbatim |
| pass | `nzpost-warehouse-verbatim` *(no longer held out)* | warning | verbatim |
| pass | `bnz-rewards-expiry` *(no longer held out)* | warning | reconstructed |
| pass | `bank-dispute-payment` *(no longer held out)* | warning | reconstructed |
| pass | `customs-duty` | warning | reconstructed |
| pass | `ird-refund-plausible-domain` | scam | reconstructed |
| pass | `asb-fraud-team-callback` | warning | reconstructed |
| pass | `hi-mum-no-secrecy` | warning | reconstructed |
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

## Items that no longer measure anything

**`nzpost-warehouse-verbatim`** — 2026-09-07: the delivery-blocked-pretext narrative pattern was written after reading this message.

**`bnz-rewards-expiry`** — 2026-09-07: the benefit-expiry-pretext narrative pattern was written after reading this message.

**`bank-dispute-payment`** — 2026-09-07: the unauthorised-payment-pretext narrative pattern was written after reading this message, including the clause separating it from bank-genuine-confirm-payment.

