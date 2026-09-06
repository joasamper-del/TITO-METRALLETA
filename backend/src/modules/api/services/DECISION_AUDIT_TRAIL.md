# Decision Audit Trail - Implementation Guide

## Overview

**Propósito:** Registrar TODAS las decisiones de Tito (ejecutadas y rechazadas) para auditoría, learning y validación de MLI.

**Tabla:** `decision_audit_trail` en PostgreSQL

**Entity:** `DecisionAuditTrail` (TypeORM)

**Service:** `DecisionAuditService` (inyectable en cualquier módulo)

---

## What Gets Recorded

```
TODAS las decisiones:
✅ ENTER    - Señal para entrar (ejecutada o bloqueada)
✅ ESPERAR  - Señal para esperar (oportunidad descartada)
✅ NO_ENTRAR - Señal rechazada (riesgo muy alto)
✅ SALIR    - Señal para salir de posición
✅ ERROR    - Decisión fallida (problemas del sistema)
```

### Complete Decision Record

```typescript
{
  id: UUID,                          // Record ID
  timestamp: Date,                   // When decision was made
  symbol: string,                    // SPY, QQQ, BTC, etc.
  strategy: string,                  // mean-reversion, breakout, etc.
  decision: string,                  // ENTER/ESPERAR/NO_ENTRAR/SALIR/ERROR
  confidence: number,                // 0-100 (strategy confidence)
  riskLevel: string,                 // LOW, MEDIUM, HIGH, EXTREME
  riskGatesApplied: Record,          // Risk filters that ran
  mliScore: number,                  // 0-100 (Market Leadership Index)
  mliBreakdown: Record,              // Component scores + reasoning
  marketData: Record,                // SPY/QQQ/VIX/Volume/etc at that moment
  dataAvailability: Record,          // Which data was REAL vs MOCK vs MISSING
  filtersApplied: Record,            // Strategy selector, earnings, etc.
  blockedReason: string,             // Why if decision was blocked
  proposedEntry: number,             // Suggested entry price
  proposedTarget: number,            // Suggested profit target
  proposedStop: number,              // Suggested stop loss
  executionStatus: string,           // PENDING/EXECUTED/FAILED/SKIPPED
  executionId: string,               // Link to actual trade (if executed)
  outcome: string,                   // PROFITABLE/LOSS/PARTIAL/PENDING
  profitLoss: number,                // $ P&L (after trade closes)
  profitLossPercent: number,         // % P&L
  lessons: Record,                   // Learning insights
  notes: string,                     // Additional context
  createdAt: Date,
  updatedAt: Date
}
```

---

## How to Use in Code

### 1. Inject the Service

```typescript
import { DecisionAuditService } from '../services/decision-audit.service';

@Injectable()
export class YourService {
  constructor(private auditService: DecisionAuditService) {}
}
```

### 2. Record a Decision When Signal Generated

```typescript
async recordSignal(symbol: string, marketData: any) {
  const decision = await this.auditService.recordDecision({
    timestamp: new Date(),
    symbol: 'SPY',
    strategy: 'mean-reversion',
    decision: 'ENTER',
    confidence: 78,
    riskLevel: 'MEDIUM',
    mliScore: 82,
    mliBreakdown: {
      spyTrend: { score: 85, verdict: 'BULLISH' },
      vix: { score: 65, verdict: 'NORMAL' },
      // ... all 6 components
    },
    marketData: {
      spyPrice: 578.45,
      vix: 19.42,
      volume: 82000000,
    },
    dataAvailability: {
      spyPrice: 'REAL',
      vix: 'REAL',
      volume: 'REAL',
    },
    filtersApplied: {
      strategySelector: 'MEAN_REVERSION',
      riskGate: 'PASSED',
    },
    proposedEntry: 578.45,
    proposedTarget: 582.00,
    proposedStop: 575.50,
    notes: 'Strong setup',
  });

  return decision; // Use decision.id for tracking
}
```

### 3. Update After Trade Closes

```typescript
async recordTradeOutcome(decisionId: string, pnl: number) {
  await this.auditService.updateDecisionOutcome(decisionId, {
    executionStatus: 'EXECUTED',
    executionId: 'trade_20260905_001',
    outcome: pnl > 0 ? 'PROFITABLE' : 'LOSS',
    profitLoss: pnl,
    profitLossPercent: (pnl / entry) * 100,
    lessons: {
      correct_components: ['spyTrend', 'volume'],
      recommendation: 'MLI was right',
    },
  });
}
```

### 4. Query the Audit Trail

```typescript
// Get all decisions for a date range
const decisions = await this.auditService.getDecisionsByDateRange(
  new Date('2026-09-05T00:00:00Z'),
  new Date('2026-09-05T23:59:59Z')
);

// Get decisions for a specific symbol
const spyDecisions = await this.auditService.getDecisionsBySymbol('SPY');

// Get statistics
const stats = await this.auditService.getDecisionStats(
  new Date('2026-09-05T00:00:00Z'),
  new Date('2026-09-05T23:59:59Z')
);
console.log(`Total decisions: ${stats.totalDecisions}`);
console.log(`Executed: ${stats.executedCount}`);
console.log(`Profitable: ${stats.profitableCount}`);
console.log(`Average P&L: ${stats.averagePnL}`);

// Get MLI accuracy
const accuracy = await this.auditService.getMliAccuracy(
  new Date('2026-09-05T00:00:00Z'),
  new Date('2026-09-05T23:59:59Z')
);
```

---

## API Endpoints

### Record Decision

```bash
POST /api/audit/record
Content-Type: application/json

{
  "symbol": "SPY",
  "strategy": "mean-reversion",
  "decision": "ENTER",
  "confidence": 78,
  "mliScore": 82,
  "marketData": { ... },
  ...
}

Response: 201
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2026-09-05T10:30:00Z",
  ...
}
```

### Update Decision Outcome

```bash
POST /api/audit/update/{id}
Content-Type: application/json

{
  "executionStatus": "EXECUTED",
  "outcome": "PROFITABLE",
  "profitLoss": 245.50,
  "profitLossPercent": 2.5
}
```

### Get Decisions by Date Range

```bash
GET /api/audit/range?start=2026-09-05T00:00:00Z&end=2026-09-05T23:59:59Z

Response: 200
[
  { decision object },
  { decision object },
  ...
]
```

### Get Decisions by Symbol

```bash
GET /api/audit/symbol/SPY?start=...&end=...

Response: 200
[ decisions ]
```

### Get Statistics

```bash
GET /api/audit/stats?start=2026-09-05T00:00:00Z&end=2026-09-05T23:59:59Z

Response: 200
{
  "totalDecisions": 42,
  "byDecision": {
    "ENTER": 15,
    "ESPERAR": 18,
    "NO_ENTRAR": 9
  },
  "executedCount": 12,
  "profitableCount": 9,
  "lossCount": 3,
  "averageConfidence": 72.5,
  "averagePnL": 156.75,
  "averagePnLPercent": 1.85
}
```

### Get MLI Accuracy

```bash
GET /api/audit/mli-accuracy?start=2026-09-05T00:00:00Z&end=2026-09-05T23:59:59Z

Response: 200
{
  "mliAccuracy": 81.5
}
```

---

## Database Schema

```sql
CREATE TABLE decision_audit_trail (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  symbol VARCHAR(10),
  strategy VARCHAR(100),
  decision VARCHAR(30) NOT NULL,
  confidence FLOAT,
  riskLevel VARCHAR(50),
  riskGatesApplied JSONB,
  mliScore FLOAT,
  mliBreakdown JSONB,
  marketData JSONB,
  dataAvailability JSONB,
  filtersApplied JSONB,
  blockedReason VARCHAR(255),
  proposedEntry FLOAT,
  proposedTarget FLOAT,
  proposedStop FLOAT,
  executionStatus VARCHAR(50),
  executionId VARCHAR(255),
  outcome VARCHAR(50),
  profitLoss FLOAT,
  profitLossPercent FLOAT,
  lessons JSONB,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_timestamp (timestamp),
  INDEX idx_symbol (symbol),
  INDEX idx_decision (decision),
  INDEX idx_timestamp_symbol (timestamp, symbol)
);
```

**Nota:** TypeORM crea esta tabla automáticamente si `synchronize: true` en desarrollo.

---

## Integration Points

### Where to Call recordDecision()

1. **StrategySelector** - When evaluating strategy signals
2. **ExecutionEngine** - When proposing trades
3. **RiskGates** - When filtering by risk
4. **MLI Calculator** - When market leadership is evaluated
5. **Learning Engine** - When analyzing post-trade results

### Where to Call updateDecisionOutcome()

1. **SupervisorEngine** - After position closes
2. **TradeMonitor** - When SL is hit or TP is reached
3. **ManualExit** - When user manually closes
4. **LearningEngine** - When P&L is calculated

---

## Example: Complete Flow

```typescript
// 1. SIGNAL GENERATED
const decision = await this.auditService.recordDecision({
  timestamp: new Date(),
  symbol: 'SPY',
  decision: 'ENTER',
  confidence: 78,
  mliScore: 82,
  marketData: { spyPrice: 578.45, vix: 19.42 },
  proposedEntry: 578.45,
  proposedTarget: 582.00,
  proposedStop: 575.50,
});
// decision.id = "123e4567..."

// 2. TRADE EXECUTED
const trade = await this.alpacaAdapter.placeOrder({
  symbol: 'SPY',
  side: 'buy',
  qty: 100,
  limit_price: 578.45,
});
// trade.id = "order_123"

// Update decision with execution
await this.auditService.updateDecisionOutcome(decision.id, {
  executionStatus: 'EXECUTED',
  executionId: trade.id,
});

// 3. POSITION CLOSED (4 hours later)
const result = await this.supervisor.closePosition('order_123');
// result = { pnl: 245.50, pnlPercent: 2.5 }

// 4. RECORD OUTCOME
await this.auditService.updateDecisionOutcome(decision.id, {
  outcome: 'PROFITABLE',
  profitLoss: 245.50,
  profitLossPercent: 2.5,
  lessons: {
    correct_components: ['spyTrend', 'volume'],
    recommendation: 'Setup was clean',
  },
});

// 5. ANALYZE MLI PERFORMANCE
const stats = await this.auditService.getDecisionStats(
  startDate, endDate
);
const accuracy = await this.auditService.getMliAccuracy(
  startDate, endDate
);
console.log(`MLI Accuracy: ${accuracy}%`);
if (accuracy >= 65) {
  console.log('✅ MLI is ready for veto power');
}
```

---

## Testing

Run demo:
```bash
npx ts-node backend/src/modules/api/services/decision-audit.demo.ts
```

Run tests:
```bash
npm test -- decision-audit.service.spec.ts
```

All 10 tests should PASS ✅

---

## Security Notes

- ❌ **Never** store credentials in audit trail
- ❌ **Never** log API keys or passwords
- ✅ **Always** sanitize user inputs before storing
- ✅ **Always** use timestamps in UTC
- ✅ **Cleanup** old records periodically:

```typescript
// Delete records older than 90 days
await this.auditService.cleanupOldRecords(90);
```

---

## Performance Considerations

- **Indexes:** Created on (timestamp, symbol, decision)
- **Retention:** Keep 90 days of data max
- **Cleanup:** Run `cleanupOldRecords(90)` daily
- **Queries:** Use date ranges to limit result sets
- **JSONB:** Efficient for nested market data

---

## Next Steps (S57 Forensic Audit)

1. ✅ Audit Trail infrastructure ready
2. 🔄 Integrate with Tito's decision pipeline
3. 🔄 Record all Friday 2026-09-05 decisions retroactively
4. 🔄 Run forensic analysis (5-step method)
5. 🔄 Generate accuracy report
6. 🔄 Propose MLI improvements

---

**Status:** Implementation Phase 1 complete. Ready for integration testing.

**Tests:** 10/10 PASS ✅

**Next:** Integrate recordDecision() calls into Tito's execution pipeline.
