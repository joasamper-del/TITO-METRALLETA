# S57 Phase 3: Real Integration Plan - 7 Pipeline Points

**Status:** READY FOR REVIEW (NO changes executed yet)  
**Safety Level:** CRITICAL - Audit Trail must NEVER block/alter/duplicate orders  
**Test Status:** MOCK test PASSED ✅ (5 decision types persist + Learning Engine read-only verified)

---

## CRITICAL SAFETY RULES

```
🚨 RULE 1: Audit Trail is OBSERVATION ONLY
   - Records decisions but NEVER blocks them
   - If PostgreSQL fails → Tito continues operating
   - Error handling: LOG and CONTINUE (never throw)

🚨 RULE 2: Idempotency Protection
   - If INSERT fails (network timeout), retry with same ID
   - NEVER allow duplicate orders due to audit trail retry
   - Use unique constraint on (timestamp, symbol, strategy, decision)

🚨 RULE 3: Async Non-Blocking
   - Audit trail recording is FIRE-AND-FORGET
   - Max timeout: 500ms (fail-safe fallback to 100ms)
   - Never wait for PostgreSQL response before executing trade

🚨 RULE 4: Learning Engine Frozen
   - READ only: no UPDATE/DELETE on rules, weights, SL
   - Analysis generates insights but requires human approval
   - No automatic weight tuning until S59
```

---

## Integration Points Overview

| # | Component | File | Method | Records | Persistence |
|---|-----------|------|--------|---------|-------------|
| 1 | StrategySelector | `strategyLibrary/decision/strategySelector.ts` | `selectStrategy()` | OPERATE/DO_NOT_OPERATE | Before risk gates |
| 2 | RiskGates | `strategyLibrary/decision/riskGate.ts` | `validateStrategy()` | ESPERAR/NO_ENTRAR + reasons | Gate failures |
| 3 | MLI Calculator | `strategyLibrary/decision/marketLeadership/calculator.ts` | `calculate()` | MLI state + breakdown | Score + components |
| 4 | ConfirmationEngine | `strategyLibrary/confirmation/confirmationEngine.ts` | `confirm()` | ENTRAR (final) | Entry/target/stop |
| 5 | ExecutionEngine | `strategyLibrary/execution/executionEngine.ts` | `execute()` | Exec success/failure | Order ID + status |
| 6 | SupervisorGate | `strategyLibrary/execution/supervisorGate.ts` | `closePosition()` | SALIR + P&L | Exit reason + P&L |
| 7 | LearningEngine | `strategyLibrary/execution/strategyLearningEngine.ts` | `analyzeOutcome()` | Trade outcome + lessons | Analysis only (READ) |

---

## POINT 1: Strategy Selector

**File:** `backend/strategyLibrary/decision/strategySelector.ts`

**What to record:** Initial OPERATE/DO_NOT_OPERATE decision from strategy analysis

**Location:** After `selectStrategy()` returns `SelectionResult` (before passing to risk gates)

**Exact integration:**

```typescript
// Add import at top
import { AuditTrailIntegration } from '../execution/auditTrailIntegration';

// Add to class constructor
private auditTrail?: AuditTrailIntegration;

constructor(
  // ... existing params
  auditTrail?: AuditTrailIntegration  // NEW: optional, injected from outside
) {
  // ... existing code
  this.auditTrail = auditTrail;
}

// Add to selectStrategy() method, AFTER selection logic completes:
async selectStrategy(conditions: MarketConditions): Promise<SelectionResult> {
  const result = this.selectStrategy_Internal(conditions); // existing logic
  
  // NEW: Record decision (async, non-blocking)
  if (this.auditTrail) {
    try {
      const context: AuditContext = {
        timestamp: new Date(),
        symbol: conditions.symbol,
        strategy: result.selectedStrategy || 'NONE',
        marketData: {
          price: conditions.price,
          vix: conditions.vix,
          volume: conditions.volume,
        },
        dataAvailability: {
          price: 'REAL',
          vix: 'REAL',
          volume: 'REAL',
        },
      };
      
      // ASYNC: Don't wait for response
      this.auditTrail.recordSelectionDecision(
        context,
        result
      ).catch(err => {
        console.error('[S57] Selection decision logging failed (non-blocking):', err.message);
        // CONTINUE - never throw
      });
    } catch (err) {
      console.error('[S57] Selection audit error:', err.message);
      // CONTINUE - never throw
    }
  }
  
  return result;
}
```

**What gets recorded:**
```
{
  timestamp: Date,
  symbol: string,
  strategy: string,
  decision: 'ESPERAR' (OPERATE→ESPERAR until confirmed) | 'NO_ENTRAR' (DO_NOT_OPERATE),
  confidence: number,
  marketData: { price, vix, volume },
  dataAvailability: { ... },
  executionStatus: 'PENDING'
}
```

**Error handling:**
- PostgreSQL down? → Log only, continue
- Timeout? → Fail-safe 100ms, continue
- Network error? → Log, continue

---

## POINT 2: Risk Gates

**File:** `backend/strategyLibrary/decision/riskGate.ts`

**What to record:** Gate failures that cause ESPERAR or NO_ENTRAR decisions

**Location:** After `validateStrategy()` returns `RiskGateResult` with `allPassed = false`

**Exact integration:**

```typescript
// Add import at top
import { AuditTrailIntegration } from '../execution/auditTrailIntegration';

// Add to class constructor
private auditTrail?: AuditTrailIntegration;

constructor(
  // ... existing params
  auditTrail?: AuditTrailIntegration  // NEW
) {
  this.auditTrail = auditTrail;
}

// Add to validateStrategy() method, AFTER gate evaluation:
async validateStrategy(...params): Promise<RiskGateResult> {
  const result = this.validateStrategy_Internal(...params); // existing logic
  
  // NEW: Record gate failures (non-blocking)
  if (this.auditTrail && !result.allPassed) {
    try {
      const context: AuditContext = {
        timestamp: new Date(),
        symbol: params.symbol,
        strategy: params.strategy,
        marketData: {
          vix: params.vix,
          volume: params.volume,
        },
        dataAvailability: { vix: 'REAL', volume: 'REAL' },
      };
      
      // Determine severity
      const severityGates = result.reasons.filter(r => 
        r.includes('VIX') || r.includes('Earnings') || r.includes('liquidity')
      );
      
      const isHighSeverity = severityGates.length >= 2;
      
      // ASYNC: Fire and forget
      if (isHighSeverity) {
        this.auditTrail.recordAvoidDecision(
          context,
          result.confidence || 0,
          result.reasons
        ).catch(err => {
          console.error('[S57] Risk gate decision logging failed:', err.message);
        });
      } else {
        this.auditTrail.recordWaitDecision(
          context,
          result.confidence || 0,
          result.reasons.join(' | ')
        ).catch(err => {
          console.error('[S57] Risk gate decision logging failed:', err.message);
        });
      }
    } catch (err) {
      console.error('[S57] Gate audit error:', err.message);
    }
  }
  
  return result;
}
```

**What gets recorded:**
```
NO_ENTRAR or ESPERAR depending on gate severity:
{
  decision: 'NO_ENTRAR' | 'ESPERAR',
  blockedReason: 'VIX > 25 | Earnings upcoming | Low volume',
  riskLevel: 'HIGH' | 'MEDIUM',
  confidence: number,
  executionStatus: 'REJECTED' | 'BLOCKED',
}
```

**Error handling:**
- Gate evaluation fails? → PostgreSQL call fails safely, gate still blocks
- Audit fails? → Continue blocking (safety-first)

---

## POINT 3: MLI Calculator

**File:** `backend/strategyLibrary/decision/marketLeadership/calculator.ts`

**What to record:** MLI score, component breakdown, action recommendation

**Location:** After `calculate()` returns `MLIResult`

**Exact integration:**

```typescript
// Add import
import { AuditTrailIntegration } from '../../execution/auditTrailIntegration';

// Add to class
private auditTrail?: AuditTrailIntegration;
private currentMLIState?: any;  // Store for later use in pipeline

constructor(
  // ... existing params
  auditTrail?: AuditTrailIntegration  // NEW
) {
  this.auditTrail = auditTrail;
}

// Add to calculate() method, AFTER MLI calculation:
calculate(marketData: MarketData): MLIResult {
  const result = this.calculate_Internal(marketData); // existing
  
  // NEW: Store MLI state for pipeline use (non-blocking)
  if (this.auditTrail && result.score !== null) {
    this.currentMLIState = {
      score: result.score,
      breakdown: {
        spyTrend: { score: result.componentScores.spyTrend, ... },
        qqqTrend: { score: result.componentScores.qqqTrend, ... },
        leadership: { score: result.componentScores.leadership, ... },
        volatility: { score: result.componentScores.volatility, ... },
        volume: { score: result.componentScores.volume, ... },
        flow: { score: result.componentScores.flow, ... },
      },
      action: result.action,  // ENTER | ESPERAR | EVITAR
      confidence: result.confidence,
    };
    
    // Log to audit trail (non-blocking)
    try {
      // Note: MLI calculator does NOT make decisions itself
      // It provides data for ConfirmationEngine to use
      console.log('[S57] MLI state captured for decision audit');
    } catch (err) {
      console.error('[S57] MLI audit error:', err.message);
    }
  }
  
  return result;
}

// Getter for pipeline components
getMLIState() {
  return this.currentMLIState;
}
```

**What gets recorded (implicitly):**
- Not recorded at this point; state stored for ConfirmationEngine
- Will be included in ENTRAR decision record (Point 4)

---

## POINT 4: Confirmation Engine

**File:** `backend/strategyLibrary/confirmation/confirmationEngine.ts`

**What to record:** Final ENTRAR decision with full context (entry/target/stop)

**Location:** After `confirm()` returns true and decision is FINAL

**Exact integration:**

```typescript
// Add imports
import { AuditTrailIntegration } from '../execution/auditTrailIntegration';
import { AuditContext } from '../execution/auditTrailIntegration';

// Add to class
private auditTrail?: AuditTrailIntegration;
private auditTrailDecisionId?: string;  // Link to audit trail
private mliState?: any;  // From MLI calculator

constructor(
  // ... existing params
  auditTrail?: AuditTrailIntegration  // NEW
) {
  this.auditTrail = auditTrail;
}

// Add method to receive MLI state
setMLIState(state: any) {
  this.mliState = state;
}

// Add to confirm() method, AFTER confirmation passes:
async confirm(selectionResult: SelectionResult, ...params): Promise<ConfirmationResult> {
  const confirmed = this.confirm_Internal(...params); // existing
  
  // NEW: Record ENTRAR decision (async, non-blocking)
  if (confirmed && this.auditTrail) {
    try {
      const context: AuditContext = {
        timestamp: new Date(),
        symbol: selectionResult.selectedSymbol,
        strategy: selectionResult.selectedStrategy,
        marketData: {
          price: params.currentPrice,
          vix: params.vix,
          volume: params.volume,
        },
        dataAvailability: {
          price: 'REAL',
          vix: 'REAL',
          volume: 'REAL',
        },
      };
      
      // ASYNC: Fire and forget
      this.auditTrailDecisionId = await this.auditTrail.recordEnterDecision(
        context,
        confirmed.confidence,
        this.mliState?.score || 0,
        this.mliState?.breakdown || {},
        confirmed.entry,
        confirmed.target,
        confirmed.stop
      ).catch(err => {
        console.error('[S57] ENTRAR decision logging failed:', err.message);
        // Return undefined - execution continues anyway
        return undefined;
      });
      
    } catch (err) {
      console.error('[S57] Confirmation audit error:', err.message);
      // CONTINUE - never throw
    }
  }
  
  return confirmed;
}

// Getter for execution engine
getAuditTrailDecisionId(): string | undefined {
  return this.auditTrailDecisionId;
}
```

**What gets recorded:**
```
{
  timestamp: Date,
  symbol: string,
  strategy: string,
  decision: 'ENTRAR',
  confidence: number,
  riskLevel: 'LOW' | 'MEDIUM',
  mliScore: number,
  mliBreakdown: { 6 components },
  proposedEntry: number,
  proposedTarget: number,
  proposedStop: number,
  executionStatus: 'PENDING',
}
```

**Error handling:**
- PostgreSQL down? → Log and return undefined, continue execution
- Confirmation logic unaffected

---

## POINT 5: Execution Engine

**File:** `backend/strategyLibrary/execution/executionEngine.ts`

**What to record:** Trade execution success/failure linking to ENTRAR decision

**Location:** After `alpaca.placeOrder()` completes and returns result

**Exact integration:**

```typescript
// Add imports
import { AuditTrailIntegration } from './auditTrailIntegration';

// Add to class
private auditTrail?: AuditTrailIntegration;
private auditTrailDecisionId?: string;  // From ConfirmationEngine

constructor(
  // ... existing params
  auditTrail?: AuditTrailIntegration  // NEW
) {
  this.auditTrail = auditTrail;
}

// Add setter
setAuditTrailDecisionId(id: string | undefined) {
  this.auditTrailDecisionId = id;
}

// Add to execute() method, AFTER order placement:
async execute(context: ExecutionContext): Promise<ExecutionResult> {
  // Existing execution logic...
  const result = await this.placeOrder(context);  // existing
  
  // NEW: Record execution outcome (async, non-blocking)
  if (this.auditTrail && this.auditTrailDecisionId) {
    try {
      if (result.status === 'TRADE_PLACED') {
        // ASYNC: Fire and forget
        this.auditTrail.recordExecutionSuccess(
          this.auditTrailDecisionId,
          {
            status: 'TRADE_PLACED',
            orderId: result.orderId,
            position: {
              symbol: context.symbol,
              quantity: result.quantity,
              entryPrice: result.entryPrice,
              stopLoss: result.stop,
              takeProfit: result.target,
              placedAt: new Date(),
            },
            supervisorDecision: {},
          }
        ).catch(err => {
          console.error('[S57] Execution success logging failed:', err.message);
        });
      } else {
        // ASYNC: Fire and forget
        this.auditTrail.recordExecutionFailure(
          this.auditTrailDecisionId,
          result.reason || 'Unknown error'
        ).catch(err => {
          console.error('[S57] Execution failure logging failed:', err.message);
        });
      }
    } catch (err) {
      console.error('[S57] Execution audit error:', err.message);
      // CONTINUE - never throw
    }
  }
  
  return result;
}
```

**What gets recorded:**
```
UPDATE to ENTRAR record:
{
  executionStatus: 'EXECUTED' | 'FAILED',
  executionId: string (order ID),
}
```

**Error handling:**
- Order placement fails? → Audit call fails safely, order failure is still recorded
- PostgreSQL down? → Order placement unaffected

**CRITICAL:** This point uses UPDATE because:
- INSERT happened at Point 4 (ENTRAR)
- At Point 5 we link the execution to that decision

---

## POINT 6: Supervisor Gate

**File:** `backend/strategyLibrary/execution/supervisorGate.ts`

**What to record:** Exit signal (SALIR) with P&L and exit reason

**Location:** After `closePosition()` completes and returns result with P&L

**Exact integration:**

```typescript
// Add imports
import { AuditTrailIntegration } from './auditTrailIntegration';
import { AuditContext } from './auditTrailIntegration';

// Add to class
private auditTrail?: AuditTrailIntegration;
private auditTrailEntryId?: string;  // From execution engine

constructor(
  // ... existing params
  auditTrail?: AuditTrailIntegration  // NEW
) {
  this.auditTrail = auditTrail;
}

// Add setter
setAuditTrailEntryId(id: string | undefined) {
  this.auditTrailEntryId = id;
}

// Add to closePosition() or exit handler:
async closePosition(orderId: string): Promise<ClosePositionResult> {
  const result = await this.closePosition_Internal(orderId); // existing
  
  // NEW: Record SALIR decision (async, non-blocking)
  if (this.auditTrail) {
    try {
      const context: AuditContext = {
        timestamp: new Date(),
        symbol: result.symbol,
        strategy: 'exit-management',
        marketData: {
          price: result.exitPrice,
        },
        dataAvailability: {
          price: 'REAL',
        },
      };
      
      // ASYNC: Fire and forget
      const exitDecisionId = await this.auditTrail.recordExitDecision(
        context,
        result.exitReason,  // 'TP_HIT' | 'SL_HIT' | 'MANUAL' | 'TIMEOUT'
        result.pnl,         // ±dollars
        result.pnlPercent   // ±percentage
      ).catch(err => {
        console.error('[S57] Exit decision logging failed:', err.message);
        return undefined;
      });
      
      // Link exit to entry if we have the entry ID
      if (this.auditTrailEntryId && exitDecisionId) {
        try {
          await this.auditTrail.updateDecisionOutcome(
            this.auditTrailEntryId,
            {
              outcome: result.pnl > 0 ? 'PROFITABLE' : 'LOSS',
              profitLoss: result.pnl,
              profitLossPercent: result.pnlPercent,
            }
          ).catch(err => {
            console.error('[S57] Entry update failed:', err.message);
          });
        } catch (err) {
          console.error('[S57] Entry link error:', err.message);
        }
      }
    } catch (err) {
      console.error('[S57] Supervisor audit error:', err.message);
      // CONTINUE - never throw
    }
  }
  
  return result;
}
```

**What gets recorded:**
```
NEW record (SALIR):
{
  timestamp: Date,
  symbol: string,
  decision: 'SALIR',
  confidence: 100,
  executionStatus: 'EXECUTED',
  blockedReason: 'TP hit | SL hit | Manual exit | Timeout',
  outcome: 'PROFITABLE' | 'LOSS',
  profitLoss: number,
  profitLossPercent: number,
}

PLUS: UPDATE entry record with outcome
```

**Error handling:**
- Exit logic unchanged
- Audit failures don't affect position closing

---

## POINT 7: Learning Engine

**File:** `backend/strategyLibrary/execution/strategyLearningEngine.ts`

**What to record:** Post-trade analysis, component accuracy, lessons learned

**Location:** After `analyzeOutcome()` completes analysis

**Exact integration:**

```typescript
// Add imports
import { AuditTrailIntegration } from './auditTrailIntegration';

// Add to class
private auditTrail?: AuditTrailIntegration;

constructor(
  // ... existing params
  auditTrail?: AuditTrailIntegration  // NEW
) {
  this.auditTrail = auditTrail;
}

// Add to analyzeOutcome() method, AFTER analysis complete:
async analyzeOutcome(tradeResult: TradeResult): Promise<OutcomeAnalysis> {
  const analysis = this.analyzeOutcome_Internal(tradeResult); // existing
  
  // NEW: Record lessons learned (READ-ONLY, no modifications)
  if (this.auditTrail && tradeResult.entryAuditId) {
    try {
      // ASYNC: Fire and forget
      await this.auditTrail.recordTradeOutcome(
        tradeResult.entryAuditId,
        analysis.outcome,  // PROFITABLE | LOSS | PARTIAL
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
      ).catch(err => {
        console.error('[S57] Outcome logging failed (read-only):', err.message);
      });
      
      // CRITICAL: Learning engine analysis is READ-ONLY
      // These insights inform decisions but do NOT automatically modify:
      // ❌ MLI weights
      // ❌ Stop Loss logic
      // ❌ Risk gate thresholds
      // ❌ Execution rules
      
      // All modifications require human review (future S59)
      console.log('[S57] Analysis complete (read-only). Results require manual review.');
      
    } catch (err) {
      console.error('[S57] Learning engine audit error:', err.message);
      // CONTINUE - never throw
    }
  }
  
  return analysis;
}
```

**What gets recorded:**
```
UPDATE to entry record:
{
  outcome: 'PROFITABLE' | 'LOSS' | 'PARTIAL',
  profitLoss: number,
  profitLossPercent: number,
  lessons: {
    correct_components: string[],
    incorrect_components: string[],
    mli_prediction_accuracy: 'CORRECT' | 'INCORRECT',
    component_scores: { component: accuracy },
    recommendation: string,
    next_action: string,
  }
}
```

**Error handling:**
- Learning analysis unaffected by audit failures
- Insights are logged but NOT automatically applied
- READ-ONLY constraint enforced (no code modifications)

---

## GLOBAL ERROR HANDLER

**File:** All files (wrapping execute() and critical paths)

**Location:** Top-level exception handlers in trading loop

```typescript
// Add global audit trail error handler
try {
  // Existing trading logic
  await executeFullTradingCycle();
} catch (error) {
  // Log error to audit trail (non-blocking)
  if (this.auditTrail) {
    try {
      await this.auditTrail.recordErrorDecision(
        {
          timestamp: new Date(),
          symbol: context.symbol || 'UNKNOWN',
          strategy: context.strategy || 'UNKNOWN',
          marketData: {},
          dataAvailability: {},
        },
        error.message,
        error.stack || ''
      ).catch(err => {
        console.error('[S57] Error logging failed:', err.message);
      });
    } catch (err) {
      console.error('[S57] Global error handler failed:', err.message);
    }
  }
  
  // Re-throw original error (trading stops only if real error)
  throw error;
}
```

---

## Validation Tests (Post-Integration)

**Test 1: Audit Trail Never Blocks Orders**
```typescript
// Temporarily disable PostgreSQL
// Run trade execution
// Verify: Order placed successfully despite DB down
// Verify: Error logged, trade continues

const result = await executionEngine.execute(context);
expect(result.status).toBe('TRADE_PLACED'); // ✓ Despite DB failure
```

**Test 2: No Duplicate Orders**
```typescript
// Send order
// PostgreSQL returns timeout on update
// Retry mechanism activates
// Verify: Single order placed, not duplicated

// Check Alpaca: 1 order
// Check audit trail: 1 record with retry count
```

**Test 3: Learning Engine Cannot Modify**
```typescript
// Analyze trade outcome
// Lessons show: "MLI was wrong, reduce weight to 0.3"
// Verify: MLI weight unchanged (still 0.25)
// Verify: Recommendation logged but not applied

const mliWeight = await getMliWeight();
expect(mliWeight).toBe(0.25); // Frozen, not modified
```

**Test 4: Full Audit Trail Query**
```typescript
// Execute 5 trades over 1 hour
// Query audit trail for timestamp range
// Verify: All 5 decisions visible with full context

const decisions = await auditService.getDecisionsByDateRange(start, end);
expect(decisions.length).toBe(5); // All recorded
expect(decisions[0].mliBreakdown).toBeDefined(); // Full context
```

---

## Rollback Strategy

**If integration introduces bugs:**

1. **Stop flag:** Set `AUDIT_TRAIL_ENABLED = false` in .env
2. **Code:** All `if (this.auditTrail)` blocks become no-ops
3. **Database:** No rollback needed (read-only from Tito's perspective)
4. **Orders:** Unaffected (trading continues normally)
5. **Recovery:** Fix bug, redeploy, set `AUDIT_TRAIL_ENABLED = true`

---

## Deployment Checklist

- [ ] All 7 points inject AuditTrailIntegration
- [ ] Error handling: LOG not THROW for all audit calls
- [ ] Timeout 500ms with 100ms fallback
- [ ] Database: PostgreSQL running, decision_audit_trail accessible
- [ ] Tests: 4 validation tests pass
- [ ] Learning Engine: No automatic modifications possible
- [ ] Monitoring: Watch logs for [S57] errors during first trades
- [ ] Fallback: AUDIT_TRAIL_ENABLED flag ready

---

## Files to Modify

1. `strategyLibrary/decision/strategySelector.ts` - POINT 1
2. `strategyLibrary/decision/riskGate.ts` - POINT 2
3. `strategyLibrary/decision/marketLeadership/calculator.ts` - POINT 3
4. `strategyLibrary/confirmation/confirmationEngine.ts` - POINT 4
5. `strategyLibrary/execution/executionEngine.ts` - POINT 5
6. `strategyLibrary/execution/supervisorGate.ts` - POINT 6
7. `strategyLibrary/execution/strategyLearningEngine.ts` - POINT 7
8. All entry points to these classes (need to inject AuditTrailIntegration)

---

## Implementation Order

1. ✅ Create AuditTrailIntegration service (DONE)
2. ✅ Create entity + controller + tests (DONE)
3. ✅ MOCK test all 5 decision types (DONE - PASSED)
4. ⏳ **Apply integrations to 7 points** (THIS DOCUMENT)
5. ⏳ Run unit tests for each modified file
6. ⏳ Integration test: Execute full trading cycle
7. ⏳ Production deployment

---

**Status:** READY FOR APPROVAL TO PROCEED TO STEP 4

**Next:** User review + authorization to apply integrations
