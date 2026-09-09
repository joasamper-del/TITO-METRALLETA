# Market Leadership Index - Learning Loop (Phase B Ready)

**Date:** 2026-09-05  
**Status:** ✅ Phase A complete, Phase B framework ready  
**Commit:** `2b756bb`  

---

## The Complete Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. MARKET SNAPSHOT (Current)                                    │
│    • SPY/QQQ prices & MAs                                       │
│    • VIX level                                                  │
│    • Volume, spread, flow data                                  │
└─────────────┬───────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. MARKET LEADERSHIP INDEX CALCULATES                           │
│    • 6 components vote (weighted)                               │
│    • Produces: Score (0-100) + Action (ENTER/ESPERAR/EVITAR)   │
│    • Full audit trail explaining every decision                 │
│    → recordDecision(entryId, symbol, result)                    │
└─────────────┬───────────────────────────────────────────────────┘
              ↓
         ┌────────────┐
         │ PREDICTION │  "Index says ENTER with 81% confidence"
         │ LOGGED     │  "SPY in uptrend, VIX normal, vol strong"
         └────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. TRADE EXECUTES (if MLI says ENTER)                           │
│    • Place BUY order @ current market                           │
│    • Log entry: price, qty, timestamp                           │
│    → recordTradeEntry(entryId, direction, price, qty)           │
└─────────────┬───────────────────────────────────────────────────┘
              ↓
         ┌────────────┐
         │ POSITION   │  "Bought 100 SPY @ 578.45"
         │ ACTIVE     │  "TP: 580.00 | SL: 576.50"
         └────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. TRADE CLOSES (TP / SL / Signal Change)                       │
│    • Record exit price, P&L, close reason                       │
│    → recordTradeExit(entryId, exitPrice, pnlPercent, reason)    │
└─────────────┬───────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. LEARNING ENGINE AUDITS                                       │
│    ✓ Compare: Prediction vs Outcome                             │
│    ✓ Evaluate: Each component's accuracy                        │
│    ✓ Calculate: Overall MLI prediction success rate             │
│    ✓ Propose: Weight adjustments (if any)                       │
└─────────────┬───────────────────────────────────────────────────┘
              ↓
         ┌────────────┐
         │ AUDIT      │  "INDEX said BULLISH, market went +2.5%"
         │ COMPLETE   │  "SPY Trend: ✓ correct (+100 pts)"
         │            │  "VIX: ✓ correct (+80 pts)"
         │            │  "Accuracy: 6/6 components right"
         │            │  "Suggested: Increase SPY Trend to 28%"
         └────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. HUMAN REVIEW & DECISION                                      │
│    • Review suggested adjustments (if any)                      │
│    • Assess: Is this component consistently accurate?           │
│    • Decide: Accept, reject, or modify weight change            │
│    • Apply: Only after PROTOCOLO_INTEGRACION_VICTOR approval    │
└─────────────────────────────────────────────────────────────────┘
              ↓
         ┌────────────┐
         │ PROPOSAL   │  "Increase SPY Trend: 25% → 28%"
         │ SUBMITTED  │  "Confidence: 72% (3/3 correct trades)"
         │            │  "Expected impact: +3% better timing"
         └────────────┘
```

---

## Code Example: Full Cycle

```typescript
// 1. Calculate MLI
const calculator = new MarketLeadershipCalculator();
const result = calculator.calculate(marketData);

// 2. Record the prediction
const learning = new MLILearningIntegration();
const decision = learning.recordDecision(
  "TRADE_001",
  "SPY",
  result
);
// → Logs: INDEX 81/100, ENTER, confidence 81%

// 3. Execute trade
alpacaClient.submitOrder({
  symbol: "SPY",
  qty: 100,
  side: "buy",
  type: "market",
});

learning.recordTradeEntry("TRADE_001", "LONG", 578.45, 100);
// → Logs: Bought 100 @ 578.45

// 4. Close trade
alpacaClient.submitOrder({
  symbol: "SPY",
  qty: 100,
  side: "sell",
  type: "market",
});

learning.recordTradeExit("TRADE_001", 580.00, 2.5, "TP");
// → Logs: Exited @ 580.00, +2.5% profit

// 5. Get audit
const audit = learning.getSummary();
// → {
//     totalDecisions: 1,
//     correctPredictions: 1,
//     accuracy: 100%,
//     avgConfidence: 81%,
//     suggestedAdjustments: [
//       {
//         componentName: "SPY Trend",
//         currentWeight: 0.25,
//         suggestedWeight: 0.275,
//         confidence: 72%,
//         reasoning: "SPY Trend was 100% accurate in this trade..."
//       }
//     ]
//   }

learning.printAuditReport();
```

---

## Phase B Validation Window (Sessions 57-61)

### Goal
Run MLI in observation mode for 5-10 trading sessions, collect accuracy data, decide on weight adjustments.

### Process

**Week 1 (S57-S58):** Run 5 trades
- Record every decision
- Track outcomes
- Collect audit data

**Week 2 (S59-S60):** Analyze patterns
- Which components are predictive?
- Which add noise?
- What's the accuracy rate?

**Week 3 (S61):** Propose improvements
- Build weight adjustment recommendations
- Calculate expected impact
- Submit for human review

### Success Criteria

✅ Index accuracy ≥ 65% (predicts direction correctly)  
✅ Confidence score correlates with actual outcome  
✅ At least 3 components consistently accurate  
✅ No component predicts worse than 40%  

### Adjustment Rules

**Increase weight if:**
- Component predicted correctly in 3+ consecutive trades
- Score was >75 and outcome was positive
- Confidence gain justifies the weight increase

**Decrease weight if:**
- Component predicted incorrectly in 2+ consecutive trades
- Score was <40 and outcome was negative
- Noise level exceeds signal

**Never change:**
- More than ±15% per component per cycle
- Without at least 3 data points
- Without human approval via PROTOCOLO_INTEGRACION_VICTOR

---

## Data Saved

### Decision Log
```json
{
  "decisions": [
    {
      "entryId": "TRADE_001",
      "timestamp": "2026-09-05T08:30:00Z",
      "symbol": "SPY",
      "indexSnapshot": { /* full MLI result */ },
      "prediction": {
        "expectedDirection": "BULLISH",
        "expectedAction": "ENTER",
        "expectedConfidence": 81
      },
      "tradeEntry": {
        "timestamp": "2026-09-05T08:31:00Z",
        "direction": "LONG",
        "entryPrice": 578.45,
        "quantity": 100
      },
      "tradeExit": {
        "timestamp": "2026-09-05T10:15:00Z",
        "exitPrice": 580.00,
        "pnlPercent": 2.5,
        "reason": "TP"
      },
      "outcome": {
        "actualDirection": "BULLISH",
        "whatReallyHappened": "Entered LONG @ 578.45, exited @ 580.00, P&L +2.5%",
        "correctPredictions": [
          "Direction prediction: BULLISH ✓",
          "Action recommendation: ENTER was appropriate ✓"
        ],
        "incorrectPredictions": [],
        "componentEvaluation": [
          { "componentName": "SPY Trend", "wasAccurate": true, "reasoning": "..." },
          { "componentName": "VIX", "wasAccurate": true, "reasoning": "..." }
        ]
      },
      "suggestedAdjustments": [
        {
          "componentName": "SPY Trend",
          "currentWeight": 0.25,
          "suggestedWeight": 0.275,
          "confidence": 72,
          "reasoning": "SPY Trend predicted correctly (score 91/100)..."
        }
      ]
    }
  ]
}
```

### Audit Report
```json
{
  "summary": {
    "totalDecisions": 10,
    "correctPredictions": 8,
    "accuracy": 80.0,
    "avgConfidence": 75.3,
    "suggestedAdjustments": [
      {
        "componentName": "SPY Trend",
        "change": "+10%",
        "reason": "Consistently accurate"
      }
    ]
  },
  "lastUpdate": "2026-09-10T16:45:00Z"
}
```

---

## Key Safeguards

✅ **No automatic changes** — All adjustments require human approval  
✅ **Confidence tracking** — Only adjust if confidence ≥ 65%  
✅ **Minimum sample size** — At least 3 data points before adjusting  
✅ **Bounded changes** — Max ±15% per cycle, never to <5% or >30%  
✅ **Full transparency** — Every decision logged with reasoning  
✅ **Reversible** — Can revert weights at any time  

---

## Integration Points (Phase B)

### 1. After Trade Execution
```typescript
// executionEngine.ts
const result = await executeStrategy(symbol, signal);
learning.recordTradeEntry(result.entryId, direction, price, qty);
```

### 2. After Trade Close
```typescript
// supervisorGate.ts
const closeResult = await closePosition(position);
learning.recordTradeExit(
  position.entryId,
  closeResult.exitPrice,
  closeResult.pnlPercent,
  closeResult.reason
);
```

### 3. Daily Audit Report
```typescript
// operationLogger.ts
const audit = learning.getSummary();
if (audit.suggestedAdjustments.length > 0) {
  console.log(`\n💡 MLI suggests ${audit.suggestedAdjustments.length} adjustments`);
  learning.printAuditReport();
}
```

---

## What Happens If...

**Q: Component is consistently wrong (< 40% accuracy)?**  
A: Decrease weight to 5%, effectively muting it. Review why it failed.

**Q: All components agree but one contradicts?**  
A: The weighted system handles this naturally. 5 bullish (75%) vs 1 bearish (10%) = 67% bullish → BULLISH action.

**Q: Confidence and accuracy don't correlate?**  
A: Indicates the confidence calculation itself needs tuning. Flag for Phase C review.

**Q: A suggestion conflicts with our risk rules?**  
A: Reject it. Never sacrifice safety for accuracy.

---

## Transition to Phase C (Integration)

Once Phase B validation is complete (accuracy ≥ 65%), decide:

1. **Option A: Hard Blocker**
   - MLI "EVITAR" = cannot trade
   - MLI "ESPERAR" = strategy can suggest, but index warns
   - MLI "ENTER" = strategy can trade without hesitation

2. **Option B: Confidence Modifier**
   - MLI confidence adjusts strategy confidence
   - Example: Strategy 85% confident × MLI 70% confident = 60% actual
   - Prevents over-confidence in unfavorable regimes

3. **Option C: Advisor Only**
   - MLI suggests but doesn't block
   - Log all disagreements for later analysis
   - Useful if validation shows it's auxiliary, not core

---

## Summary

**Phase A:** Index observes, validates, logs  
**Phase B:** Learning engine audits, proposes improvements  
**Phase C:** Decision on integration level + weight tuning  

The portero watches. It learns. Eventually it protects. But first, we prove it's worth listening to.
