# 0DTE Options: SL/TP Specification

## Problem Statement

For equities/crypto:
- SL = 1% means: entry * 0.99
- TP = 2% means: entry * 1.02

For 0DTE options:
- 1% and 2% behave **very differently**
- Options decay rapidly (theta)
- Bid-ask spread is wider
- Price can swing 10-50% in minutes
- Traditional % SL/TP may be too tight or too loose

## Current State

Today Tito has:
- ETHUSD position: 0.209475 @ $2458.12
- SL: $2433.54 (1% below entry)
- TP: $2507.28 (2% above entry)

## Decision Needed: How to Apply 1%/2% to 0DTE?

### Option 1: Apply Literally (Not Recommended)

```
CALL with premium $2.50:
  Entry: $2.50
  SL (1%): $2.475 (very tight - one tick away)
  TP (2%): $2.55 (very tight - almost impossible to reach)
  Result: Almost instant stop or miss profit targets
```

**Problem**: In options, 1 cent movement is negligible. Spreads are 1-5 cents. This would trigger constantly on slippage.

### Option 2: Apply to Expected Move (Recommended)

```
Expected move on CALL:
- Premium paid: $2.50
- Max loss we accept: 1% of position size
- Max gain we accept: 2% of position size

Example:
  Buy 1 CALL contract @ $2.50 premium
  SL: -1% of premium = -$0.025 per share = -$2.50 (loses 1 contract)
  TP: +2% of premium = +$0.050 per share = +$5.00 (doubles position value)

OR: Absolute $ amounts
  Buy @ $2.50
  SL @ $2.25 (lose $0.25/share = $25 total)
  TP @ $2.75 (gain $0.25/share = $25 total)
```

**Advantage**: Respects option-specific pricing, accounts for theta decay, realistic for market conditions.

### Option 3: Apply Percentage to Intrinsic Value + Extrinsic

```
For deep ITM CALL:
- Intrinsic value: $3.00 (stock $123, strike $120)
- Extrinsic (time value): $0.50
- Total: $3.50

Apply 1%/2% only to extrinsic to protect time decay
```

**Advantage**: Protects against theta while keeping SL reasonable.

## Recommendation for Implementation

**Use Option 2: Percentage of Premium Paid**

```typescript
For 0DTE options:

entryPrice = premiumPaid (e.g., $2.50 for CALL)
slPercentage = 1% (0.01)
tpPercentage = 2% (0.02)

SL = entryPrice - (entryPrice * slPercentage)
   = $2.50 - $0.025
   = $2.475

TP = entryPrice + (entryPrice * tpPercentage)
   = $2.50 + $0.050
   = $2.55

OR (safer alternative - absolute amounts):

SL = entryPrice - $0.025 (flat 1 cent)
TP = entryPrice + $0.050 (flat 2 cents)
```

## Risk Management

For $100,000 account trading 0DTE:

```
Per contract size (100 shares):
- Max loss per contract: 1% of account = $1,000
- Max gain per contract: 2% of account = $2,000

Premium paid $2.50 = $250/contract
- Can buy 4 contracts max ($1,000 risk max)
- Target $2,000 max gain = would need 8 contracts
- Only buy 4 to respect risk limit

Risk Constraint: 2% position sizing on $100k = $2,000 max per trade
```

## Final Specification

✅ **Confirm**: Use 1%/2% of premium paid for SL/TP

- SL: Premium * 0.99 = Exit if loss exceeds 1% of premium
- TP: Premium * 1.02 = Exit if gain reaches 2% of premium
- Position size: Max 2% of account per trade ($2,000 on $100k)
- Time decay: Monitor closely, consider manual exit if theta accelerates

Example:
```
BUY SPY CALL (Apr 5, Strike 565)
Entry: $1.75 premium
SL: $1.75 * 0.99 = $1.7325
TP: $1.75 * 1.02 = $1.785
Max loss: $25/contract (if 1 contract)
Max gain: $35/contract (if 1 contract)
```

## Next Step

✅ **READY** for implementation once you confirm this specification
