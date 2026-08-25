# ODTE Configuration - Tito Metralleta

**Document**: ODTE (Opportunity Data Tracking Entities) Configuration  
**Version**: 1.0.0  
**Date**: 2026-08-25  
**Status**: VERIFIED - NO CHANGES AUTHORIZED WITHOUT APPROVAL  
**Source**: `backend/start_continuous_trading.js:13`

---

## 📋 ODTE Watchlist - Verified List

### **Initial Symbols (3 Total)**

| Ticker | Name | Type | Region | Sector | Status |
|--------|------|------|--------|--------|--------|
| **SPY** | SPDR S&P 500 ETF Trust | ETF | US | Broad Market | ✅ Active |
| **QQQ** | Invesco QQQ Trust (Nasdaq-100) | ETF | US | Technology | ✅ Active |
| **IWM** | iShares Russell 2000 ETF | ETF | US | Small-Cap | ✅ Active |

**Verified Date**: 2026-08-25  
**Source Code Location**: `backend/start_continuous_trading.js:13`  
**No Modifications Authorized**: Without explicit approval

---

## 📊 Associated Strategies (6 Total)

| Strategy | Type | Description |
|----------|------|-------------|
| **Momentum** | Technical | Trend-following based on price momentum |
| **Support/Resistance** | Technical | Mean-reversion using key price levels |
| **Volatility Play** | Options/Technical | Strategy based on IV changes |
| **Trending** | Technical | Directional strategy following trends |
| **Gap Fill** | Technical | Trading intraday price gaps |
| **0DTE** | Options | Zero Days to Expiration strategy |

**Total Combinations**: 3 symbols × 6 strategies = 18 possible analysis combinations

---

## ⚙️ Continuous Analysis Configuration

```javascript
// From: backend/start_continuous_trading.js

// Symbols
const symbols = ['SPY', 'QQQ', 'IWM'];

// Strategies
const strategies = [
  { name: 'Momentum', entry: 485, target: 495, stop: 475 },
  { name: 'Support/Resistance', entry: 480, target: 500, stop: 470 },
  { name: 'Volatility Play', entry: 490, target: 510, stop: 480 },
  { name: 'Trending', entry: 475, target: 505, stop: 465 },
  { name: 'Gap Fill', entry: 488, target: 502, stop: 478 },
  { name: '0DTE', entry: 482, target: 492, stop: 472 },
];

// Execution
const INTERVAL_MS = 60000; // Every 60 seconds
```

**Behavior**:
- Runs every 60 seconds
- Randomly selects 1 symbol from 3
- Randomly selects 1 strategy from 6
- Sends analysis request to `/api/analyze`
- Logs decision (✅ operar, ⏳ esperar, ❌ rechazar)

---

## 🔐 Restrictions (NO CHANGES)

### **Symbols**
```
❌ Cannot add symbols without approval
❌ Cannot delete symbols without approval
❌ Cannot modify ticker names without approval
✅ Can view current watchlist
✅ Can review analysis results
```

### **Strategies**
```
❌ Cannot add strategies without approval
❌ Cannot modify entry/target/stop levels without approval
❌ Cannot change strategy names without approval
✅ Can view strategy parameters
✅ Can review strategy performance
```

### **Analysis**
```
❌ Cannot execute analysis without running backend
❌ Cannot modify analysis logic without approval
✅ Can review analysis results
✅ Can view analysis history
```

---

## 📊 Data Source Status

### **Current (Session 10)**
```
Data Source:     Alpha Vantage (demo) + Finnhub (demo)
API Key Status:  DEMO KEYS ONLY (no real data access)
Real Data:       NO - All analysis uses simulated data
Broker:          NOT INTEGRATED (no Alpaca yet)
Paper Orders:    SIMULATED (no real execution)
```

### **Planned (Session 11+)**
```
Data Source:     Alpaca Paper Trading API
API Key Status:  PENDING (awaiting account creation approval)
Real Data:       YES - Live market data from Alpaca
Broker:          Alpaca (paper trading only)
Paper Orders:    BLOCKED (no execution without approval)
```

---

## 🎯 Verification Checklist

### **Symbols Verified**
- [x] SPY - SPDR S&P 500 ETF Trust (Nasdaq)
- [x] QQQ - Invesco QQQ Trust (Nasdaq)
- [x] IWM - iShares Russell 2000 (NASDAQ)
- [x] All 3 are major liquid ETFs
- [x] No typos or encoding issues

### **Strategies Verified**
- [x] 6 strategies defined with unique names
- [x] Entry/target/stop levels configured for each
- [x] All strategies are recognized trading methodologies
- [x] No duplicate strategy names

### **Integration Verified**
- [x] Symbols imported in `start_continuous_trading.js`
- [x] Strategies integrated with plan parameters
- [x] Analysis endpoint `/api/analyze` operational
- [x] Continuous agent runs every 60 seconds

### **No Unauthorized Changes**
- [x] No additional symbols added
- [x] No symbols deleted
- [x] No strategy modifications
- [x] No analysis logic changes

---

## 📁 Configuration Files

### **Versionable**
```
config/odte-watchlist.json       ← Primary configuration (versionable)
docs/ODTE-CONFIGURATION.md        ← This documentation
backend/start_continuous_trading.js  ← Source of truth for symbols/strategies
```

### **Dynamic Storage**
```
Browser localStorage:
  key: 'tito_watchlist'
  source: web/motor.js (loadWatchlist/saveWatchlist)
  note: Used for UI, not authoritative list
```

---

## 🚀 Phase Progression

### **Phase 1 (Current)**
```
Status: COMPLETE
Symbols: SPY, QQQ, IWM (verified)
Strategies: 6 (verified)
Data: Simulated (demo APIs)
Execution: Paper trading (simulated)
```

### **Phase 2 (Session 11+)**
```
Status: PENDING APPROVAL
Requirement: Create Alpaca account + get API keys
Symbols: SAME (SPY, QQQ, IWM)
Strategies: SAME (6 strategies)
Data: REAL (Alpaca paper trading)
Execution: BLOCKED (no orders without approval)
```

### **Phase 3+ (Future)**
```
Status: FUTURE
Requirement: Successful Phase 2 testing + explicit approval
Symbols: CAN EXPAND (with approval)
Strategies: CAN EXPAND (with approval)
Data: Real or paper (decision pending)
Execution: PENDING DECISION
```

---

## ⚠️ Important Notes

### **Data Accuracy**
- Current data is **100% simulated** (demo keys)
- Analysis results are **not realistic** until Alpaca integration
- Phase 2 will provide **real market data** for analysis

### **No Real Risk**
```
✅ No real money involved
✅ No broker integration
✅ No order execution possible
✅ Completely safe for testing
```

### **Approval Required For**
- [ ] Adding/removing symbols
- [ ] Modifying strategies
- [ ] Changing analysis logic
- [ ] Connecting to real broker
- [ ] Executing any real orders

---

## 📞 Reference

**Related Documentation**:
- [SESSION_10_ALPACA_PLAN.md](../SESSION_10_ALPACA_PLAN.md) - Alpaca integration plan
- [SESSION_10_HANDOFF.md](../SESSION_10_HANDOFF.md) - Session 10 technical details
- [backend/start_continuous_trading.js](../backend/start_continuous_trading.js) - Source code
- [web/motor.js](../web/motor.js) - UI watchlist implementation

**Contact**: joasamper80@gmail.com  
**Last Updated**: 2026-08-25  
**Verified By**: Claude AI (Session 10)

---

## ✅ Sign-Off

**Configuration Status**: VERIFIED AND LOCKED

This ODTE configuration has been verified against source code and documented. No changes will be made without explicit approval via documented communication.

**Current Safe to Use**: ✅ YES (for testing/development)  
**Real Data Available**: ❌ NO (demo keys only)  
**Production Ready**: ❌ NO (awaiting Phase 2)

---

*This configuration file is versionable and tracked in git.*  
*Last audit: 2026-08-25 by Claude (Session 10)*
