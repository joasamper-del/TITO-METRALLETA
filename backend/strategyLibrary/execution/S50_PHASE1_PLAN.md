# S50 Phase 1 Plan — Execution Engine Core

## Objective
Connect Strategy Selector → Confirmation Engine → ExecutionEngine → Alpaca Paper Trading

**No breaking changes. Tito core frozen. Execution layer NEW.**

---

## Current State

```
Market Data (real-time)
    ↓
Strategy Selector
  └─ returns: SelectionResult {status, strategy, confidence}
    ↓
Confirmation Engine
  └─ returns: ConfirmationResult {score 0-100, verdict breakdown}
    ↓
Decision History Logger (LOGS everything)
    ↓
❌ STOPS HERE (no execution yet)
```

---

## Target State (S50 Phase 1)

```
Market Data (real-time)
    ↓
Strategy Selector → SelectionResult
    ↓
Confirmation Engine → ConfirmationResult
    ↓
Decision History Logger (audit trail)
    ↓
✅ ExecutionEngine (NEW)
  ├─ Step 1: Validate both signals (selector + confirmation)
  ├─ Step 2: Run Supervisor v4 (5 gates)
  ├─ Step 3: Calculate position size
  ├─ Step 4: Place order on Alpaca
  └─ Step 5: Monitor fill + P&L
    ↓
Trade Execution Log
    ↓
📊 Dashboard (real-time)
```

---

## New Files to Create (S50 Phase 1)

### 1. **executionEngine.ts** (200 lines)
- Orchestrates: Selector → Confirmation → Alpaca
- Implements unified decision logic
- Handles both OPERATE and DO_NOT_OPERATE flows

### 2. **alpacaAdapter.ts** (250 lines)
- Connects to Alpaca Paper Trading API
- Places OCO orders (entry + stop + profit)
- Monitors fills + P&L
- Handles partial fills, rejections

### 3. **supervisorGate.ts** (180 lines)
- Gate 1: Max daily loss (-2% account)
- Gate 2: Max open positions (3 concurrent)
- Gate 3: Correlation check (no 2+ correlated)
- Gate 4: Liquidity re-check (volume at entry time)
- Gate 5: News/earnings real-time veto

### 4. **tradeExecutor.ts** (ENHANCE existing)
- Add Alpaca execution (not just backtesting)
- Live quote fetching
- Order placement + monitoring
- Exit handling (TP/SL/trailing)

### 5. **executionEngine.test.ts** (200 lines, 25+ tests)
- End-to-end: Selector → Alpaca
- Supervisor gate validation
- Order placement scenarios
- Error handling + rollback

---

## Data Flow (S50 Phase 1)

### Input
```typescript
interface ExecutionContext {
  // From Strategy Selector
  selectionResult: SelectionResult;  // {status, strategy, confidence}
  
  // From Confirmation Engine
  confirmationResult: ConfirmationResult;  // {score, sourceBreakdown}
  
  // From Market
  marketData: {
    symbol: string;
    price: number;
    volume: number;
    bid: number;
    ask: number;
    vix: number;
    timestamp: Date;
  };
  
  // From Account
  accountData: {
    totalBalance: number;
    dailyPnL: number;
    openPositions: number;
    buyingPower: number;
  };
}
```

### Processing
```
Input → Validate → Supervise → Calculate → Execute → Monitor
  ↓       ↓         ↓          ↓         ↓         ↓
  ✓      5 checks  5 gates    position  OCO      fill+P&L
```

### Output
```typescript
interface ExecutionResult {
  status: "TRADE_PLACED" | "TRADE_REJECTED" | "DO_NOT_OPERATE";
  orderId?: string;
  reason: string;
  position?: {
    symbol: string;
    quantity: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    placedAt: Date;
  };
  supervisorDecision: SupervisorDecision;
}
```

---

## Execution Flow (Step-by-Step)

### Step 1: Receive Market Signal
```typescript
// Main loop (every minute)
const marketData = await getLatestMarketData();
const selectionResult = await strategySelector.selectStrategy(conditions);
const confirmationResult = await confirmationEngine.evaluate(conditions);

if (selectionResult.status !== "OPERATE") {
  logger.logDecision({...decision, outcome: "DO_NOT_OPERATE"});
  return; // Stop, don't trade
}
```

### Step 2: Validate Combined Signal
```typescript
// Both selector AND confirmation must agree
const bothAgreed = 
  selectionResult.status === "OPERATE" && 
  confirmationResult.isConfirmed;  // score >= threshold

if (!bothAgreed) {
  logger.logDecision({outcome: "DO_NOT_OPERATE", reason: "CONFIDENCE_LOW"});
  return;
}
```

### Step 3: Run Supervisor Gates (NEW)
```typescript
const supervisorResult = await supervisor.validate({
  accountData,
  marketData,
  proposedTrade: {
    strategy: selectionResult.selectedStrategy,
    symbol: marketData.symbol,
    position_size: calculatePositionSize(accountData, marketData.symbol)
  }
});

if (!supervisorResult.allPassed) {
  logger.logDecision({
    outcome: "DO_NOT_OPERATE",
    reason: "MACRO_VETO",  // or MAX_LOSS, etc.
    supervisorFailures: supervisorResult.failures
  });
  return; // Supervisor blocked
}
```

### Step 4: Calculate Position Size
```typescript
const positionSize = calculatePositionSize({
  strategy: selectionResult.selectedStrategy,
  symbol: marketData.symbol,
  price: marketData.price,
  maxRisk: accountData.totalBalance * 0.02,  // 2% max risk
  stopLoss: calculateStopLoss(selectionResult, marketData),
  accountBalance: accountData.totalBalance
});

// Validate position size (never > 5% of account on one trade)
if ((positionSize * marketData.price) / accountData.totalBalance > 0.05) {
  positionSize = Math.floor((accountData.totalBalance * 0.05) / marketData.price);
}
```

### Step 5: Place Order on Alpaca
```typescript
const order = await alpacaAdapter.placeOCOOrder({
  symbol: marketData.symbol,
  quantity: positionSize,
  entry_price: marketData.price,  // Limit order
  stop_loss: calculateStopLoss(selectionResult, marketData),
  take_profit: calculateTakeProfit(selectionResult, marketData),
  client_order_id: `tito_${Date.now()}`
});

if (!order.id) {
  logger.logDecision({
    outcome: "DO_NOT_OPERATE",
    reason: "ORDER_REJECTED",
    alpacaError: order.error
  });
  return;
}

// Log execution
logger.logDecision({
  outcome: "OPERATE",
  executedTrade: order
});
```

### Step 6: Monitor & Update
```typescript
// Continuous monitoring (while position open)
const monitorLoop = setInterval(async () => {
  const position = await alpacaAdapter.getPosition(symbol);
  
  if (position.closed) {
    clearInterval(monitorLoop);
    logger.logTradeResult({
      orderId: order.id,
      exitPrice: position.exitPrice,
      pnlDollars: position.pnl,
      pnlPercent: (position.pnl / (position.entryPrice * position.quantity)) * 100
    });
  }
}, 30000);  // Check every 30 seconds
```

---

## Supervisor Gates (5 Mandatory Checks)

### Gate 1: Max Daily Loss
```
If daily_pnl < -2% of account:
  ❌ Block entire day
  Reason: "MAX_DAILY_LOSS"
```

### Gate 2: Max Open Positions
```
If open_positions >= 3:
  ❌ Block new trade
  Reason: "MAX_OPEN_POSITIONS"
```

### Gate 3: Correlation Check
```
If new_trade would create 2+ highly correlated positions:
  ❌ Block trade
  Reason: "CORRELATION_RISK"
  Example: SPY + QQQ (both tech-heavy)
```

### Gate 4: Liquidity Re-Check
```
If volume_at_entry_time < minimum_required:
  ❌ Block trade
  Reason: "LOW_LIQUIDITY"
  Example: SPY volume dropped from 65M to 8M (midday gap)
```

### Gate 5: Real-Time Macro Veto
```
If Red Pill source detected:
  - Fed decision announced
  - Major news broke
  - War alert
  ❌ Block trade immediately
  Reason: "MACRO_VETO"
```

---

## Alpaca Integration Details

### Paper Trading Setup
```typescript
const alpaca = new AlpacaClient({
  apiKey: process.env.APCA_API_KEY_ID,
  secretKey: process.env.APCA_API_SECRET_KEY,
  baseUrl: "https://paper-api.alpaca.markets",  // PAPER, not live
  paper: true
});
```

### Order Types
```typescript
// Place OCO (One-Cancels-Other) order
const order = await alpaca.createOrder({
  symbol: "SPY",
  qty: 100,
  side: "buy",
  type: "limit",
  limit_price: 450.23,
  
  // Take profit leg
  trail_percent: 0.01,  // 1% trailing
  
  // Stop loss leg (separate order)
  // Cancelled if TP hits
});
```

### Monitoring
```typescript
// Get open positions
const positions = await alpaca.getPositions();

// Get order status
const order = await alpaca.getOrder(orderId);

// Get account P&L
const account = await alpaca.getAccount();
console.log(`Daily P&L: $${account.portfolio_value - account.last_equity}`);
```

---

## Error Handling & Rollback

### Order Rejected
```
If Alpaca rejects order:
  1. Log error with details
  2. Alert: "Order rejected: [reason]"
  3. No retry (manual review needed)
  4. Continue monitoring for next signal
```

### Partial Fill
```
If order partially filled:
  1. Accept partial fill (don't cancel)
  2. Adjust stop/profit for remaining quantity
  3. Log: "Partial fill: 75/100 shares"
  4. Continue monitoring
```

### Execution Exception
```
Try {
  Place order on Alpaca
} Catch (error) {
  Log error
  Alert: "Execution failure: [error]"
  Roll back: Cancel any pending orders
  Continue: Wait for next signal
}
```

---

## Testing Strategy (25+ Tests)

### Unit Tests
1. ✓ Position size calculation (various account sizes)
2. ✓ Stop/profit calculation (various strategies)
3. ✓ Gate logic (each gate individually)
4. ✓ Order validation (rejected, partial, filled)

### Integration Tests
1. ✓ Full flow: Selector → Confirmation → Execute
2. ✓ Supervisor blocks: Each gate tested
3. ✓ Alpaca mock: Order placement, monitoring
4. ✓ Decision logging: Full audit trail

### Scenario Tests
1. ✓ Happy path: Trade places, hits TP
2. ✓ Stop loss: Trade places, hits SL
3. ✓ Rejected: Alpaca rejects order
4. ✓ Supervisor veto: Macro gate blocks
5. ✓ Partial fill: Order partially fills
6. ✓ Connection error: Network fails gracefully

---

## Success Criteria (S50 Phase 1 Done)

- ✓ ExecutionEngine receives SelectionResult
- ✓ ExecutionEngine receives ConfirmationResult
- ✓ Supervisor Gates 1-5 implemented + tested
- ✓ Alpaca adapter places OCO orders
- ✓ Position monitoring works
- ✓ Decision History captures execution
- ✓ 25+ tests PASS
- ✓ Zero breaking changes to S49/S46-48
- ✓ Git clean + pushed

---

## Timeline

| Task | Duration | Owner |
|------|----------|-------|
| Design approval | 30 min | Review |
| ExecutionEngine code | 2 hours | Claude |
| AlpacaAdapter code | 2 hours | Claude |
| SupervisorGate code | 1.5 hours | Claude |
| Tests (25+) | 2 hours | Claude |
| Integration testing | 1.5 hours | Claude |
| Total | ~9 hours | This session |

---

## Rollback Strategy (If Needed)

If execution engine breaks:
1. Stop all trading immediately
2. Keep decision history intact
3. Revert executionEngine only
4. Strategies + confirmation still work
5. Re-test before next attempt

---

## Key Principles

✅ **Fail-Safe First** — Supervisor gates block before Alpaca
✅ **Log Everything** — Every decision, every gate, every order
✅ **No Surprises** — All flows defined, tested, documented
✅ **Graceful Degradation** — Core Tito works even if execution fails
✅ **PAPER ONLY** — Never real money (at least until S51+)

