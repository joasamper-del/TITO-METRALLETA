# 0DTE Options - Complete Risk Framework

## Account Base

```
Account balance:    $100,054.41
Paper Trading only: YES ✅
```

## Position Sizing Rules

### Per Trade Maximum

```
Max loss per trade:      $2,000 (2% of account)
Max account exposure:    2% per position

If premium = $1.50 per share ($150/contract):
  Max contracts = $2,000 / $150 = 13 contracts maximum

If premium = $0.50 per share ($50/contract):
  Max contracts = $2,000 / $50 = 40 contracts maximum
```

### Daily Cumulative Limits

```
Max daily loss:          $5,000 (5% of account)
Max daily gain:          $8,000 (8% of account)
Max trades per day:      10 trades maximum
Stop trading if:         Daily loss exceeds $5,000
```

## Entry Filters (Must Pass ALL)

```
Bid-Ask Spread:         < 5% of mid-price
Liquidity (Volume):     > 500 contracts/hour
Open Interest:          > 100 contracts
Expiration:             Same day (0DTE)
Time to expiration:     > 15 minutes remaining
Trading hours:          9:30 AM - 4:00 PM ET
Strike distance:        Within $1 of current price (ATM)
```

## Exit Rules

### Stop Loss (SL)

```
Application:           % of premium paid
Formula:               SL = entry_premium * 0.99

Example:
  Buy SPY CALL @ $2.00 premium
  SL = $2.00 * 0.99 = $1.98
  Loss: -$0.02 per share = -$2 per contract
  
Behavior:              Market order executes immediately at SL
Max loss per contract: 1% of premium
Cannot be modified:    YES (frozen at entry)
```

### Take Profit (TP)

```
Application:           % of premium paid
Formula:               TP = entry_premium * 1.02

Example:
  Buy SPY CALL @ $2.00 premium
  TP = $2.00 * 1.02 = $2.04
  Gain: +$0.04 per share = +$4 per contract
  
Behavior:              Limit order, cancels at market close
Max gain per contract: 2% of premium
Cannot be modified:    YES (frozen at entry)
```

### Trailing Stop (Optional, not yet active)

```
When price moves favorably:
  - Move SL up by 50% of gains
  - Lock in minimum 0.5% profit
  - Only for winning positions

Example:
  Entry @ $2.00, currently @ $2.10 (up $0.10)
  Original SL: $1.98
  New trailing SL: $2.05 (locks $0.05)
  
Status:                DISABLED (needs review before enabling)
```

## Trade Duration & Monitoring

```
Max hold time:         Until market close (4:00 PM ET)
Monitoring interval:   Every 10 seconds (SL check)
Force close at:        3:55 PM ET (last 5 min, exit)
Weekend/Holiday:       NO trading (market closed)
```

## Greeks Management (Advanced)

```
Delta:                 Track but no auto-action
Theta decay:           Monitor, consider manual exit if > -0.10/day
Vega (implied vol):    Avoid if IV rank < 30% or > 90%
Gamma:                 Accept as part of 0DTE risk
```

## Symbols & Strategies

```
Approved symbols:      SPY, QQQ, IWM (0DTE only)
Strategies:            
  - Buy CALL (bullish)
  - Buy PUT (bearish)
  - Vertical spreads (if liquidity > 1000)
Selling (naked):       DISABLED (too risky for 0DTE)
```

## Real-Time Risk Monitoring

```
Position P&L check:    Every 10 seconds
Account drawdown:      Real-time tracking
Daily loss limit:      Auto-enforcement at $5,000
Trade count:           Auto-enforcement at 10/day
Connection loss:       Auto-close all positions
```

## Conflict Resolution

```
What if SL % (1%) contradicts account risk (2%)?
  → Use whichever is STRICTER
  → 1% SL per contract wins (smaller loss)
  
What if bid-ask spread is 4.9% vs 5% threshold?
  → PASS (just under)
  
What if position hits SL same second as TP?
  → SL triggers first (loss-limiting priority)
  
What if daily loss limit hit mid-trade?
  → Immediately close all open positions
```

## Paper Trading Verification

```
Endpoint:              https://paper-api.alpaca.markets ✅
Account type:          PAPER ✅
Real money:            NO ✅
Can disable Live:      YES (hardcoded PAPER only)
```

## Configuration Not Yet Active

```
This framework is COMPLETE but not yet implemented.
When activated, Tito will enforce ALL these rules automatically.

NO trades will execute until you explicitly approve.
```

## Summary Table

| Rule | Value | Hard Limit? |
|------|-------|-------------|
| Max per trade | $2,000 | YES |
| Max daily loss | $5,000 | YES |
| Max daily gain | $8,000 | NO |
| Max trades/day | 10 | YES |
| SL % | 1% of premium | YES |
| TP % | 2% of premium | YES |
| Bid/Ask spread | < 5% | YES |
| Min volume | > 500 contracts/hr | YES |
| Trading hours | 9:30-4:00 PM ET | YES |
| Market hours only | YES | YES |

---

## Ready for Review

This is the **complete** framework that will govern 0DTE trading.

**Questions before activation:**
- [ ] Are these limits appropriate?
- [ ] Should we adjust any thresholds?
- [ ] Are bid/ask/volume filters too strict?
- [ ] Should trailing stop be enabled?
- [ ] Any additional protections needed?

**Confirm to proceed with implementation.**
