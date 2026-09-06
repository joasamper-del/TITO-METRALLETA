# S57 AUDIT TRAIL INTEGRATION MAP
## 7 Pipeline Points for Decision Recording

---

## POINT 1: Strategy Selector (Decision Point)
**File:** `strategyLibrary/decision/strategySelector.ts`  
**Method:** `selectStrategy(conditions: MarketConditions)`  
**What to record:** Initial OPERATE/DO_NOT_OPERATE decision  
**When:** After `selectStrategy()` returns `SelectionResult`  

```typescript
// INTEGRATION POINT
const selectionResult = this.selectStrategy(conditions);

// NEW: Record selection decision
if (this.auditTrail) {
  const context = { 
    timestamp: new Date(),
    symbol: conditions.symbol,
    strategy: selectionResult.selectedStrategy || 'UNKNOWN',
    marketData: {
      price: conditions.price,
      vix: conditions.vix,
      volume: conditions.volume,
    },
    dataAvailability: { price: 'REAL', vix: 'REAL', volume: 'REAL' }
  };
  
  await this.auditTrail.recordSelectionDecision(
    context, 
    selectionResult,
    riskGateResult
  );
}
```

---

## POINT 2: Risk Gates (Filtering Point)
**File:** `strategyLibrary/decision/riskGate.ts`  
**Method:** `validateStrategy(strategy, symbol, ...params)`  
**What to record:** Risk gate failures = blocking reasons  
**When:** Gate fails (allPassed = false)  

```typescript
// INTEGRATION POINT
const gateResult = this.validateStrategy(...);

if (!gateResult.allPassed && this.auditTrail) {
  const context = { ... };
  
  // Record as ESPERAR or NO_ENTRAR based on severity
  if (HIGH_SEVERITY_GATES_FAILED) {
    await this.auditTrail.recordAvoidDecision(
      context,
      confidence,
      gateResult.reasons
    );
  } else {
    await this.auditTrail.recordWaitDecision(
      context,
      confidence,
      gateResult.reasons.join('; ')
    );
  }
}
```

---

## POINT 3: MLI Calculator (Evaluation Point)
**File:** `strategyLibrary/decision/marketLeadership/calculator.ts`  
**Method:** `calculate(marketData)`  
**What to record:** MLI score, component breakdown, action recommendation  
**When:** After MLI evaluation complete  

```typescript
// INTEGRATION POINT
const mliResult = calculator.calculate(marketData);

if (this.auditTrail && mliResult.score !== null) {
  // Store MLI details for later decision recording
  this.currentMLIState = {
    score: mliResult.score,
    breakdown: {
      spyTrend: mliResult.componentScores.spyTrend,
      qqqTrend: mliResult.componentScores.qqqTrend,
      leadership: mliResult.componentScores.leadership,
      volatility: mliResult.componentScores.volatility,
      volume: mliResult.componentScores.volume,
      flow: mliResult.componentScores.flow,
    },
    action: mliResult.action, // ENTER/ESPERAR/EVITAR
    confidence: mliResult.confidence
  };
}
```

---

## POINT 4: Confirmation Engine (Final Gate)
**File:** `strategyLibrary/confirmation/confirmationEngine.ts`  
**Method:** `confirm(selectionResult, mliResult)`  
**What to record:** Final ENTER confirmation with all context  
**When:** Confirmation passes and decision is FINAL  

```typescript
// INTEGRATION POINT
const confirmed = this.confirm(selectionResult, mliResult);

if (confirmed && this.auditTrail) {
  const context = { ... };
  
  // THIS is the final ENTER decision
  this.auditTrailDecisionId = await this.auditTrail.recordEnterDecision(
    context,
    confirmed.confidence,
    this.currentMLIState.score,
    this.currentMLIState.breakdown,
    entry,
    target,
    stop
  );
}
```

---

## POINT 5: Execution Engine (Trade Placement)
**File:** `strategyLibrary/execution/executionEngine.ts`  
**Method:** `execute(context: ExecutionContext)`  
**What to record:** Trade execution success/failure, order ID link  
**When:** After `supervisor.approve()` and order placement attempt  

```typescript
// INTEGRATION POINT
const executionDecision = await this.alpaca.placeOrder({...});

if (this.auditTrail && this.auditTrailDecisionId) {
  if (executionDecision.status === 'TRADE_PLACED') {
    await this.auditTrail.recordExecutionSuccess(
      this.auditTrailDecisionId,
      executionDecision
    );
  } else {
    await this.auditTrail.recordExecutionFailure(
      this.auditTrailDecisionId,
      executionDecision.reason
    );
  }
}
```

---

## POINT 6: Supervisor Gate (Position Monitoring)
**File:** `strategyLibrary/execution/supervisorGate.ts`  
**Method:** `closePosition(orderId)` or manual exit  
**What to record:** Exit signal (SALIR) with P&L  
**When:** Position closed (TP hit, SL hit, manual)  

```typescript
// INTEGRATION POINT
const result = await this.closePosition(orderId);

if (this.auditTrail && this.auditTrailDecisionId) {
  const exitContext = { 
    timestamp: new Date(),
    symbol: result.symbol,
    ...
  };
  
  this.auditTrailExitId = await this.auditTrail.recordExitDecision(
    exitContext,
    result.exitReason, // 'TP_HIT' | 'SL_HIT' | 'MANUAL'
    result.pnl,
    result.pnlPercent
  );
}
```

---

## POINT 7: Learning Engine (Post-Trade Analysis)
**File:** `strategyLibrary/execution/strategyLearningEngine.ts`  
**Method:** `analyzeOutcome(tradeResult)`  
**What to record:** Lessons, component accuracy, improvement proposals  
**When:** Trade closed and analyzed  

```typescript
// INTEGRATION POINT
const analysis = this.analyzeOutcome(tradeResult);

if (this.auditTrail && this.auditTrailDecisionId) {
  await this.auditTrail.recordTradeOutcome(
    this.auditTrailDecisionId,
    analysis.outcome, // PROFITABLE | LOSS | PARTIAL
    analysis.pnl,
    analysis.pnlPercent,
    {
      correct_components: analysis.correctComponents,
      incorrect_components: analysis.incorrectComponents,
      mli_prediction_accuracy: analysis.mliWasCorrect ? 'CORRECT' : 'INCORRECT',
      component_scores: analysis.componentAccuracy,
      recommendation: analysis.recommendation,
      next_action: analysis.nextAction,
    }
  );
  
  // IMPORTANT: Do NOT automatically update MLI weights, rules, or SL yet
  // Just log the analysis for human review
  console.log('[LEARNING] Analysis complete, awaiting manual review');
}
```

---

## ERROR POINT (System-wide)
**Location:** All error handlers  
**What to record:** System failures that prevent decision recording  
**When:** Exceptions occur  

```typescript
// GLOBAL ERROR HANDLER
try {
  // ... execution flow ...
} catch (error) {
  if (this.auditTrail) {
    await this.auditTrail.recordErrorDecision(
      context,
      error.message,
      error.stack
    );
  }
  throw error; // Re-throw after logging
}
```

---

## Implementation Checklist

- [ ] **POINT 1:** Inject AuditTrailIntegration into StrategySelector
- [ ] **POINT 2:** Inject AuditTrailIntegration into RiskGate
- [ ] **POINT 3:** Inject AuditTrailIntegration into MarketLeadershipCalculator
- [ ] **POINT 4:** Inject AuditTrailIntegration into ConfirmationEngine
- [ ] **POINT 5:** Inject AuditTrailIntegration into ExecutionEngine
- [ ] **POINT 6:** Inject AuditTrailIntegration into SupervisorGate
- [ ] **POINT 7:** Inject AuditTrailIntegration into StrategyLearningEngine
- [ ] **ERROR:** Add global error handler recording
- [ ] **TESTS:** Verify each point records correctly
- [ ] **PROSPECTIVE TEST:** End-to-end dry-run with all 5 decision types

---

## State Management Pattern

Each service tracks audit trail ID:

```typescript
export class ExecutionEngine {
  private auditTrail?: AuditTrailIntegration;
  private auditTrailDecisionId?: string;
  private auditTrailExitId?: string;
  private currentMLIState?: any;

  constructor(auditTrail?: AuditTrailIntegration) {
    this.auditTrail = auditTrail;
  }

  async executeFullCycle() {
    // POINT 1: Record selection
    await this.recordSelection();
    // -> auditTrailDecisionId is set

    // POINT 4: Record ENTER
    await this.recordEnter();
    // -> auditTrailDecisionId is updated

    // POINT 5: Record execution
    await this.recordExecution();
    // -> links to auditTrailDecisionId

    // POINT 6: Record exit (later)
    await this.recordExit();
    // -> auditTrailExitId is set

    // POINT 7: Record outcome (later)
    await this.recordOutcome();
    // -> links to auditTrailDecisionId
  }
}
```

---

## KEY RULES FOR S57

**✅ MUST DO:**
- Record EVERY decision (ENTER/ESPERAR/NO_ENTRAR/SALIR/ERROR)
- Include market data, MLI scores, filters, reasons
- Link decisions to trades and outcomes
- Capture lessons for Learning Engine to analyze

**❌ MUST NOT DO:**
- DO NOT reconstruct Friday 2026-09-05 decisions
- DO NOT auto-apply learning suggestions to change rules
- DO NOT change Stop Loss, MLI weights, or execution logic
- DO NOT assume data availability (mark as MISSING if unknown)

**📊 PROSPECTIVE TEST:**
Generate 4-5 new decisions (dry-run, no real money) and verify all appear in audit trail with complete context.

---

**Status:** Integration map ready. Proceed to implementation.
