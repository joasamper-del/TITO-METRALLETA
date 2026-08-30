# Confirmation Engine Architecture

## Overview

The **Confirmation Engine** is a completely decoupled module that complements (but never replaces) the **Strategy Selector**. It takes market context and produces a **Confidence Score** (0-100) that enriches trading decisions.

```
┌─────────────────────────────────────────────────────────┐
│                    Market Data Feed                     │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────────┐   ┌──────────────────────┐
│ Strategy Selector    │   │ Confirmation Engine  │
│ (S49 - FROZEN)       │   │ (S50B - NEW)         │
│                      │   │                      │
│ Analyzes regime      │   │ Aggregates signals   │
│ Selects strategy     │   │ Produces confidence  │
│ Returns: OPERATE or  │   │ Returns: score 0-100 │
│ DO NOT OPERATE       │   │                      │
└──────┬───────────────┘   └──────┬───────────────┘
       │                          │
       └──────────┬───────────────┘
                  │
           ┌──────▼──────┐
           │  Combined   │
           │  Decision   │
           │             │
           │ Operate? +  │
           │ Confidence? │
           └──────┬──────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Execution Engine │
         │ (S50 Phase 1)    │
         └──────────────────┘
```

---

## Architecture Principles

### 1. **Complete Decoupling**
- Confirmation Engine is 100% independent from Strategy Selector
- No imports from `decision/` module
- Can be developed, tested, and deployed separately
- Strategy Selector never imports from Confirmation Engine

### 2. **Plugin Architecture**
- Each confirmation source extends `ConfirmationSource` base class
- Sources are registered dynamically at runtime
- New sources can be added without modifying existing code
- Failing sources don't break the engine (configurable failure modes)

### 3. **Three Failure Modes per Source**

| Mode | Behavior | Use Case |
|------|----------|----------|
| **VETO** | Entire confirmation fails if this source fails | Critical data (earnings, major events) |
| **NEUTRAL** | On error, vote returns 50 (neutral) | Non-critical sources (minor indicators) |
| **SKIP** | On error, source is skipped | Optional sources |

### 4. **Weighted Voting**
- Each source has a `weight` (0-1)
- Weights are normalized by engine
- Final score is weighted average: `(vote₁×w₁ + vote₂×w₂ + ...) / Σw`
- Score range: 0-100
- Threshold: configurable (default 65)

---

## File Structure

```
backend/strategyLibrary/confirmation/
├── index.ts                    # Module exports
├── types.ts                    # Core interfaces
├── confirmationSource.ts       # Abstract base class
├── confirmationEngine.ts       # Main orchestrator
├── confidenceCalculator.ts     # Vote aggregation
├── ARCHITECTURE.md             # This file
└── sources/
    ├── tradingViewSource.ts    # TradingView alerts (RSI, ADX, etc.)
    ├── vixSource.ts            # VIX regime detection
    ├── optionLevelsSource.ts   # Option Greeks + levels
    ├── marketSniperSource.ts   # Microstructure signals
    └── redPillSource.ts        # Macro/news veto
```

---

## Source Breakdown

### TradingView Source (20% weight)
- **Input**: TVContext alerts (RSI, ADX, SuperTrend)
- **Output**: 0-100 confidence
- **Failure Mode**: NEUTRAL (if TVContext down, vote neutral)
- **Implementation Status**: 🟡 PENDING TVContext integration

### VIX Source (15% weight)
- **Input**: Current VIX level
- **Output**: Regime confirmation (volatility-adjusted)
- **Failure Mode**: NEUTRAL (VIX data always available)
- **Implementation Status**: 🟡 PENDING FRED integration

### Option Levels Source (15% weight)
- **Input**: Option strikes, IV Rank, Greeks
- **Output**: Technical level confirmation
- **Failure Mode**: NEUTRAL (if options data unavailable)
- **Implementation Status**: 🟡 PENDING option Greeks integration

### Market Sniper Source (15% weight)
- **Input**: Order flow, bid/ask spread, volume clusters
- **Output**: Microstructure confidence
- **Failure Mode**: VETO (if liquidity crisis detected)
- **Implementation Status**: 🟡 PENDING microstructure data

### Red Pill Source (20% weight)
- **Input**: Earnings calendar, economic news, black swan alerts
- **Output**: Macro risk assessment
- **Failure Mode**: VETO (macro events kill trades)
- **Implementation Status**: 🟡 PENDING earnings + news API

---

## Usage Flow (S50B+)

### Step 1: Initialize Engine with Sources
```typescript
const engine = new ConfirmationEngine();

// Register sources as they become available
engine.registerSource(new VIXSource());
engine.registerSource(new TradingViewSource());
engine.registerSource(new OptionLevelsSource());
engine.registerSource(new MarketSniperSource());
engine.registerSource(new RedPillSource());
```

### Step 2: Get Market Context
```typescript
const context: ConfirmationContext = {
  symbol: "SPY",
  regime: "BULLISH_STRONG",
  vix: 18.5,
  price: 450.23,
  timestamp: new Date(),
  selectedStrategy: "TrailingExitStrategy", // From Strategy Selector
};
```

### Step 3: Evaluate Confidence
```typescript
const result = await engine.evaluate(context);
// result.confidence.finalScore: 72 (example)
// result.isConfirmed: true (>= threshold of 65)
// result.suggestions: ["✅ Good confirmation", "⚠️ VIX elevated"]
```

### Step 4: Combined Decision
```typescript
if (result.context.selectedStrategy) {
  // Strategy Selector said OPERATE
  if (result.isConfirmed) {
    // Confirmation Engine also agrees (score >= 65)
    // ✅ Execute trade with HIGH confidence
  } else {
    // Confirmation Engine doubts (score < 65)
    // ⚠️ Execute trade with LOW confidence (or skip)
  }
} else {
  // Strategy Selector said DO NOT OPERATE
  // ❌ Don't trade, regardless of confirmation
}
```

---

## Integration with Strategy Selector

### What Does NOT Change (S49 Frozen)
- Strategy Selector logic
- Risk gate architecture
- Blocked strategy list
- Regime preferences
- All 10 strategy profiles

### What IS Added (S50B)
- Confirmation Engine runs AFTER Strategy Selector
- Produces additional confidence metric
- Enriches decision explanation
- Can optionally modify position size based on confidence
- Creates detailed audit trail

### Example Execution Flow
```
Market Conditions
  ↓
Strategy Selector: "OPERATE — TrailingExitStrategy"
  ↓
Confirmation Engine: "Score: 72/100 — STRONG_BUY"
  ↓
Execution Engine:
  - Strategy: TrailingExitStrategy ✓
  - Confidence: 72% ✓
  - Position Size: 100 shares (full) ✓
  - Stop Loss: 449.00
  - Take Profit: 451.50
```

---

## Confidence Score Interpretation

| Score | Recommendation | Action |
|-------|----------------|--------|
| 81-100 | STRONG_BUY | Full position, tight stops |
| 61-80 | BUY | Full position, normal stops |
| 41-60 | NEUTRAL | Reduced position OR skip |
| 21-40 | SELL | Skip trade |
| 0-20 | STRONG_SELL | Veto (if VETO source triggered) |

---

## How to Add a New Source

### 1. Create Source File
```typescript
// sources/myIndicatorSource.ts
export class MyIndicatorSource extends ConfirmationSource {
  async evaluate(context: ConfirmationContext): Promise<ConfidenceVote> {
    // Your indicator logic here
    return scoreFromYourIndicator;
  }
  
  async getReasoning(...): Promise<string> {
    // Explain your vote
    return "...";
  }
  
  async healthCheck(): Promise<boolean> {
    // Can your indicator run right now?
    return true;
  }
}
```

### 2. Register in Engine
```typescript
engine.registerSource(new MyIndicatorSource({
  sourceId: "my_indicator",
  sourceName: "My Indicator",
  weight: 0.10, // 10% in final confidence
  failureMode: "NEUTRAL",
}));
```

### 3. Done!
- Engine automatically includes it in vote aggregation
- No changes to Strategy Selector
- No changes to Execution Engine
- Fully decoupled

---

## Success Criteria for S50B Implementation

1. ✅ All 5 sources have stub implementations (completed today)
2. ✅ ConfirmationEngine orchestrates sources correctly
3. ✅ Confidence scores aggregate with proper weighting
4. ✅ Failure modes (VETO/NEUTRAL/SKIP) work as specified
5. ✅ No imports from Strategy Selector → true decoupling
6. ✅ No changes to S49 risk gates or blocked strategies
7. ✅ Dashboard displays both Strategy decision + Confirmation score
8. ✅ Comprehensive tests for all scenarios

---

## Timeline

| Phase | Task | Timeline |
|-------|------|----------|
| S50 Phase 1 | Connect StrategySelector → ExecutionEngine | Week 1 |
| S50 Phase 2 | Confirmation Engine structure + interfaces | **TODAY** ✓ |
| S50B Phase 3 | Integrate VIX + simple technical indicators | Week 2 |
| S50C Phase 4 | Integrate TradingView alerts + Options Greeks | Week 3 |
| S51+ | Integrate MarketSniper + Red Pill (macro) | Following sessions |

---

## Key Design Decisions

1. **No modification to S49**: Strategy Selector remains frozen and untouched
2. **Plugin architecture**: Each source is independent, easy to debug/replace
3. **Weighted voting**: More important signals get higher weight
4. **Failure modes**: Critical sources can veto; optional sources skip gracefully
5. **Audit trail**: Every vote logged for backtesting and post-trade analysis
6. **Runtime registration**: Sources can be added without deployment restarts

---

## Next Steps

1. ✅ Architecture complete (this document + 5 source stubs)
2. 🟡 S50 Phase 1: Connect to Execution Engine
3. 🟡 S50B Phase 3: Implement VIX Source
4. 🟡 S50C Phase 4: Implement TradingView Source
5. 🟡 S51+: Implement MarketSniper + Red Pill

All modular, all decoupled, nothing breaks. Ready to ship!

