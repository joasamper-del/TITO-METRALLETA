# Decision History Logger

## Overview

The **Decision History Logger** is a complete audit trail system that captures every decision Tito makes:
- Which strategy was selected
- Why it was selected (confidence score breakdown)
- Which sources supported or contradicted the decision
- Why "DO NOT OPERATE" was chosen (if applicable)
- Trade execution details (if trade was placed)
- Trade results and lessons learned

This enables:
1. **Post-trade analysis** — Why did this trade win/lose?
2. **Pattern detection** — Which signals work best?
3. **Continuous improvement** — ML feedback loops
4. **Compliance/auditability** — Full trail of reasoning
5. **Backtesting accuracy** — Real decision trees, not simplified models

---

## DecisionLogEntry Structure

Every decision is logged with complete context:

```typescript
{
  id: "decision_1630000000000_abc123def",
  timestamp: 2026-08-30T14:32:15.000Z,
  sessionId: "session_1630000000000",
  
  // Market context
  symbol: "SPY",
  regime: "BULLISH_STRONG",
  vix: 18.5,
  price: 450.23,
  
  // Strategy selection
  selectedStrategy: "TrailingExitStrategy",
  strategyBlocked: false,
  
  // Risk gates (from Strategy Selector)
  riskGatesPassed: true,
  
  // Confidence score (from Confirmation Engine)
  confidenceScore: 72,
  confidenceThreshold: 65,
  confidenceMet: true,
  sourceBreakdown: [
    {
      sourceId: "vix_regime",
      sourceName: "VIX Regime",
      verdict: "CONFIRM",
      vote: 65,
      dataQuality: "EXCELLENT",
      dataQualityScore: 95,
      weight: 0.15,
      adjustedWeight: 0.1425,
      reasoning: "VIX: 18.5 (normal range) → CONFIRM",
      dataPoints: ["VIX = 18.50"]
    },
    // ... other 4 sources
  ],
  consensusPercentage: 80,
  strongestSignal: "TradingViewSource",
  weakestSignal: "MarketSniperSource",
  
  // Final decision
  outcome: "OPERATE",
  primaryReason: "ALL_GATES_PASSED",
  reasoning: [
    "Regime: BULLISH_STRONG (matched TrailingExit)",
    "Strategy: TrailingExitStrategy selected (excellent generalization)",
    "Risk gates: All 6 passed",
    "Confidence: 72/100 (meets 65 threshold)",
    "Sources agreement: 80% consensus (4/5 sources confirm)"
  ],
  
  // Trade execution
  executedTrade: {
    orderId: "20260830_SPY_001",
    positionSize: 100,
    entryPrice: 450.23,
    stopLoss: 449.00,
    takeProfit: 451.50,
    executedAt: 2026-08-30T14:32:20.000Z
  },
  
  // Trade result
  tradeResult: {
    exitPrice: 451.50,
    pnlDollars: 127.00,
    pnlPercent: 0.28,
    exitReason: "TP_HIT",
    closedAt: 2026-08-30T15:45:32.000Z,
    durationSeconds: 4572
  },
  
  // Lessons
  lessonsLearned: [
    "VIX 18.5 (normal) + TrailingExit highly predictive",
    "TradingView signal alignment matters",
    "Stop loss at -0.27% worked well"
  ],
  feedbackForNextTime: "Consider wider stop loss when VIX < 20"
}
```

---

## Usage Examples

### 1. Log a Decision (at trade time)

```typescript
const logger = new DecisionHistoryLogger();

// After Strategy Selector + Confirmation Engine complete:
const decisionId = logger.logDecision({
  symbol: "SPY",
  regime: selectionResult.regime,
  vix: conditions.vix,
  price: conditions.price,
  
  selectedStrategy: selectionResult.selectedStrategy,
  strategyBlocked: false,
  
  riskGatesPassed: selectionResult.riskGateResult.allPassed,
  riskGateFailures: selectionResult.riskGateResult.reasons,
  
  confidenceScore: confirmationResult.confidence.finalScore,
  confidenceThreshold: 65,
  confidenceMet: confirmationResult.isConfirmed,
  sourceBreakdown: confirmationResult.confidence.votes.map(v => ({
    sourceId: v.sourceId,
    sourceName: v.sourceName,
    verdict: v.verdict,
    vote: v.vote,
    dataQuality: v.dataQuality,
    dataQualityScore: v.dataQualityScore,
    weight: v.weight,
    adjustedWeight: v.weight * (v.dataQualityScore / 100),
    reasoning: v.reasoning,
    dataPoints: v.dataPoints
  })),
  
  outcome: selectionResult.selectedStrategy ? "OPERATE" : "DO_NOT_OPERATE",
  primaryReason: "ALL_GATES_PASSED",
  reasoning: [
    `Regime: ${selectionResult.regime}`,
    `Strategy: ${selectionResult.selectedStrategy}`,
    `Confidence: ${confirmationResult.confidence.finalScore}/100`
  ]
});

// Now execute trade, then log result later
```

### 2. Log Trade Result (at exit time)

```typescript
const decision = logger.getDecision(decisionId);
decision.executedTrade = {
  orderId: "20260830_SPY_001",
  positionSize: 100,
  entryPrice: 450.23,
  stopLoss: 449.00,
  takeProfit: 451.50,
  executedAt: new Date()
};

decision.tradeResult = {
  exitPrice: 451.50,
  pnlDollars: 127.00,
  pnlPercent: 0.28,
  exitReason: "TP_HIT",
  closedAt: new Date(),
  durationSeconds: 4572
};

decision.lessonsLearned = [
  "VIX 18.5 (normal) + TrailingExit highly predictive",
  "Stop loss at -0.27% was appropriate"
];
```

### 3. Get Analytics (post-session)

```typescript
const analytics = logger.getAnalytics();
console.log(`
  Total Decisions: ${analytics.totalDecisions}
  Executed Trades: ${analytics.executedTrades}
  Blocked Decisions: ${analytics.blockedDecisions}
  Win Rate: ${analytics.winRate.toFixed(1)}%
  Total P&L: $${analytics.totalPnL.toFixed(2)}
  Avg Win: $${analytics.avgWinSize.toFixed(2)}
  Avg Loss: $${analytics.avgLossSize.toFixed(2)}
  High Confidence Accuracy: ${analytics.highConfidenceAccuracy.toFixed(1)}%
`);
```

**Output:**
```
Total Decisions: 47
Executed Trades: 38
Blocked Decisions: 9
Win Rate: 71.1%
Total P&L: $2,340.50
Avg Win: $125.30
Avg Loss: -$48.20
High Confidence Accuracy: 84.2%
```

### 4. Generate Summary Report

```typescript
console.log(logger.generateSummary(15)); // Last 15 decisions
```

**Output:**
```
═══════════════════════════════════════════════════════
DECISION HISTORY SUMMARY (last 15 decisions)
═══════════════════════════════════════════════════════

2026-08-30T15:45:32.000Z | SPY
  Strategy: TrailingExitStrategy
  Outcome: OPERATE
  Confidence: 72/100 (threshold: 65)
  Reason: ALL_GATES_PASSED
  Sources: VIX:C TW:N OL:C MS:N RP:C
  Result: +127.00 (0.28%)

2026-08-30T14:32:15.000Z | QQQ
  Strategy: BreakoutStrategy
  Outcome: OPERATE
  Confidence: 68/100 (threshold: 65)
  Reason: ALL_GATES_PASSED
  Sources: VIX:C TW:C OL:N MS:N RP:C
  Result: -32.50 (-0.15%)
  
... (13 more decisions)
```

### 5. Export for Analysis

```typescript
// Export as JSON for Python analysis
const json = logger.exportJSON();
fs.writeFileSync("decision_history.json", json);

// Export as CSV for spreadsheet
const csv = logger.exportCSV();
fs.writeFileSync("decision_history.csv", csv);
```

---

## Decision Outcome Types

### OPERATE
- **ALL_GATES_PASSED**: Strategy Selector approved + Confidence met
- **USER_OVERRIDE**: Manual intervention (future feature)

### DO_NOT_OPERATE
- **GATE_FAILED**: One or more risk gates failed (Strategy Selector)
- **REGIME_UNKNOWN**: Unrecognized market regime
- **NO_STRATEGY**: No unblocked strategy available
- **CONFIDENCE_LOW**: Confidence score below threshold
- **MACRO_VETO**: Red Pill (macro) source blocked
- **USER_OVERRIDE**: Manual intervention

---

## Post-Trade Analysis Example

```typescript
// After 30 days of trading
const analytics = logger.getAnalytics();

// Identify best-performing regime
const bullishTrades = logger.getExecutedTrades().filter(d => d.regime === "BULLISH_STRONG");
const bullishWins = bullishTrades.filter(d => d.tradeResult?.pnlDollars > 0).length;
console.log(`BULLISH_STRONG regime win rate: ${(bullishWins/bullishTrades.length*100).toFixed(1)}%`);

// Identify best-performing strategy
const trailingExitTrades = logger.getExecutedTrades().filter(d => d.selectedStrategy === "TrailingExitStrategy");
const trailingExitPnL = trailingExitTrades.reduce((sum, d) => sum + (d.tradeResult?.pnlDollars || 0), 0);
console.log(`TrailingExit P&L: $${trailingExitPnL.toFixed(2)}`);

// Identify worst source (many contradictions?)
const worstSources = logger.getBlockedDecisions().reduce((acc, d) => {
  d.sourceBreakdown.forEach(s => {
    if (s.verdict === "CONTRADICT") acc[s.sourceName] = (acc[s.sourceName] || 0) + 1;
  });
  return acc;
}, {});
console.log("Most contrarian source:", Object.keys(worstSources)[0]);
```

---

## Integration with ML Feedback Loop (Future)

```typescript
// After collecting 100 trades:
if (logger.getExecutedTrades().length >= 100) {
  // Train model: can we predict wins from confidence + sources?
  const features = logger.getExecutedTrades().map(d => ({
    inputs: {
      confidenceScore: d.confidenceScore,
      vixLevel: d.vix,
      sourceConsensus: d.consensusPercentage,
      topSourceVote: d.strongestSignal === "VIXSource" ? 1 : 0
    },
    output: d.tradeResult?.pnlDollars > 0 ? 1 : 0 // Win/loss
  }));
  
  // Feed to ML model for continuous improvement
  mlModel.train(features);
}
```

---

## Key Benefits

1. **Transparency** — See exactly WHY Tito made each decision
2. **Accountability** — Full audit trail for compliance
3. **Learning** — Identify patterns in winning vs losing trades
4. **Improvement** — ML feedback loops can optimize future decisions
5. **Debugging** — When things go wrong, you have the full context
6. **Backtesting** — Use real decision trees for accurate simulation

---

## Notes

- Logger stores last 10,000 decisions in memory (configurable)
- Export to JSON/CSV for long-term storage or analysis
- Each entry captures all source verdicts (no information loss)
- Lessons learned can be manually added post-trade
- Perfect for continuous monitoring and improvement

