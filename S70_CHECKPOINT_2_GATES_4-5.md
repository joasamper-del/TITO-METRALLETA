# S70 CHECKPOINT 2: Gates 4-5 + ExecutionEngine Integration

**Timeline:** Days 4-6  
**Depends on:** Checkpoint 1 PASS  
**Status:** 🟡 PENDING CHECKPOINT 1  
**Authorized by:** Víctor (solo documentación)  
**For decision:** Jay  

---

## 📋 OBJETIVO

Implementar **Gates 4-5** y **integración con ExecutionEngine:**
- **Gate 4 (Execution Engine):** ¿Contrato válido? ¿Precio razonable?
- **Gate 5 (Broker Connectivity):** ¿Alpaca online? ¿Quote actual? ¿Dry-run OK?
- **Integration:** Llamar validateCheckpoint2() ANTES de broker.placeOrder()
- **Bypass Detection:** Verificar PreExecutionEvidence existe

**Líneas totales:** +780 líneas nuevas

---

## 📂 ARCHIVOS A MODIFICAR

### NUEVOS (3 servicios)

**1. `backend/src/modules/seatbelt/services/gate4-execution-engine.service.ts`** (+100 líneas)

```typescript
// NUEVA CLASE: Validar que contrato es ejecutable por el ExecutionEngine
export class Gate4ExecutionEngineService {
  async validate(order: Order): Promise<GateResult> {
    // 1. Validar tipo de orden soportado
    if (!['buy', 'sell'].includes(order.side)) {
      return { valid: false, reason: 'Order side not supported', gate: 'gate4' };
    }

    // 2. Validar que ejecutionEngine.validate() pasa
    try {
      const engineValidation = await this.executionEngine.validate(order);
      if (!engineValidation.valid) {
        return { 
          valid: false, 
          reason: `ExecutionEngine rejected: ${engineValidation.errors.join(', ')}`, 
          gate: 'gate4' 
        };
      }
    } catch (error) {
      return { valid: false, reason: `Engine check failed: ${error.message}`, gate: 'gate4' };
    }

    // 3. Validar precio razonable (no typo: < 1% from market)
    const marketPrice = await this.getMarketPrice(order.symbol);
    const priceDeviation = Math.abs((order.price - marketPrice) / marketPrice) * 100;
    if (priceDeviation > 1) {
      return { 
        valid: false, 
        reason: `Price typo detected: ${priceDeviation}% from market`, 
        gate: 'gate4' 
      };
    }

    return { valid: true, reason: 'Execution engine ready', gate: 'gate4' };
  }
}
```

---

**2. `backend/src/modules/seatbelt/services/gate5-broker-connectivity.service.ts`** (+200 líneas)

```typescript
// NUEVA CLASE: Validar que broker está online y responsive
export class Gate5BrokerConnectivityService {
  async validate(symbol: string, order: Order): Promise<GateResult> {
    // 1. Intento 1: Get quote (validar Alpaca está online)
    for (let i = 0; i < 3; i++) {
      try {
        const quote = await this.getQuoteWithTimeout(symbol, 5000);
        if (!quote) {
          if (i === 2) {
            return { valid: false, reason: 'Alpaca quote unavailable after 3 retries', gate: 'gate5' };
          }
          await this.backoffWait(i);
          continue;
        }
        break;
      } catch (error) {
        if (i === 2) {
          return { valid: false, reason: `Alpaca connection failed: ${error.message}`, gate: 'gate5' };
        }
        await this.backoffWait(i);
      }
    }

    // 2. Validar quote es fresco
    const quote = await this.alpaca.getQuote(symbol);
    if (this.isQuoteStale(quote, 3000)) {
      return { valid: false, reason: 'Alpaca quote stale', gate: 'gate5' };
    }

    // 3. Dry-run: simular orden sin ejecutar
    try {
      const dryRun = await this.alpaca.previewOrder(order);
      if (!dryRun.valid) {
        return { valid: false, reason: `Dry-run failed: ${dryRun.reason}`, gate: 'gate5' };
      }
    } catch (error) {
      return { valid: false, reason: `Dry-run error: ${error.message}`, gate: 'gate5' };
    }

    return { valid: true, reason: 'Broker ready, dry-run passed', gate: 'gate5' };
  }

  private async backoffWait(attempt: number): Promise<void> {
    const ms = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
    return new Promise(r => setTimeout(r, ms));
  }
}
```

---

### MODIFICADOS (2 archivos, +40 líneas)

**3. `backend/src/modules/execution/execution.service.ts`** (Modificar línea ~150)

**ANTES:**
```typescript
async execute(order: Order): Promise<ExecutionResult> {
  // ... validation logic ...
  return await this.alpacaClient.placeOrder(order);
}
```

**DESPUÉS:**
```typescript
async execute(order: Order): Promise<ExecutionResult> {
  // ... validation logic ...

  // ← NUEVO: Checkpoint 2 validation (Gates 4-5)
  if (SEATBELT_CONFIG.ENABLED) {
    const seatbeltResult = await this.seatbeltService.validateCheckpoint2(
      order,
      this.account,
    );
    
    if (!seatbeltResult.allGatesPass) {
      throw new SeatbeltBlockedException(
        `Gates 4-5 failed: ${seatbeltResult.reason}`,
        seatbeltResult,
      );
    }
  }

  return await this.alpacaClient.placeOrder(order);
}
```

**Changes:** +15 líneas dentro del método existente.

---

**4. `backend/src/config/adapters/broker.adapter.ts`** (Modificar línea ~200)

**ANTES:**
```typescript
async placeOrder(order: Order): Promise<BrokerResult> {
  return await this.alpacaClient.placeOrder(order);
}
```

**DESPUÉS:**
```typescript
async placeOrder(order: Order): Promise<BrokerResult> {
  // ← NUEVO: Bypass detection (last frontier)
  if (SEATBELT_CONFIG.ENABLED) {
    // Verificar que PreExecutionEvidence existe
    // (será creada en Checkpoint 3, por ahora placeholder)
    const evidence = await this.evidenceService.getLatest(order.tradeId);
    
    if (!evidence) {
      throw new SeatbeltBypassError(
        'SEATBELT evidence missing — likely bypass attempt',
        { tradeId: order.tradeId },
      );
    }
    
    if (!evidence.allGatesPass) {
      throw new SeatbeltBypassError(
        'SEATBELT evidence shows gates failed',
        { tradeId: order.tradeId },
      );
    }
  }

  return await this.alpacaClient.placeOrder(order);
}
```

**Changes:** +25 líneas dentro del método existente.

---

### NUEVOS TESTS (2 files)

**5. `backend/src/modules/seatbelt/services/gate4-execution-engine.service.spec.ts`** (+80 líneas)

```typescript
describe('Gate4ExecutionEngineService', () => {
  // 8 tests:
  // - Valid order passes
  // - Invalid order side rejected
  // - ExecutionEngine validation fails
  // - Price typo detected (>1% from market)
  // - Price OK (within 1%)
  // - Timeout handling
});
```

---

**6. `backend/src/modules/seatbelt/services/gate5-broker-connectivity.service.spec.ts`** (+160 líneas)

```typescript
describe('Gate5BrokerConnectivityService', () => {
  // 20 tests:
  // - First try succeeds (quote fresh)
  // - Retry 1 succeeds (quote stale first, fresh second)
  // - All 3 retries fail
  // - Quote stale (timeout)
  // - Dry-run passes
  // - Dry-run fails (invalid order for broker)
  // - Backoff timing (1s, 2s, 4s)
  // - Alpaca connection error
  // - Alpaca timeout
});
```

---

**7. `backend/src/modules/seatbelt/services/seatbelt.service.ts`** (Agregar método)

```typescript
export class SeatbeltService {
  // Ya existe validateCheckpoint1()...
  
  /**
   * CHECKPOINT 2: Validar Gates 4-5 + integración
   */
  async validateCheckpoint2(order: Order, account: Account): Promise<SeatbeltResult> {
    const gates: GateResult[] = [];

    // Gate 4: Execution Engine
    const gate4 = await this.gate4.validate(order);
    gates.push(gate4);

    // Gate 5: Broker Connectivity
    const gate5 = await this.gate5.validate(order.symbol, order);
    gates.push(gate5);

    const allPass = gates.every(g => g.valid);
    return {
      allGatesPass: allPass,
      gates,
      reason: allPass ? 'Gates 4-5 pass' : `Failed: ${gates.filter(g => !g.valid).map(g => g.gate).join(', ')}`,
      timestamp: new Date(),
    };
  }
}
```

**8. `backend/src/modules/seatbelt/services/seatbelt.integration.spec.ts`** (+200 líneas)

```typescript
describe('SeatbeltService - Full Flow Integration', () => {
  // 9 tests:
  // - Checkpoint 1 + Checkpoint 2 full flow
  // - ExecutionEngine.execute() calls validateCheckpoint2()
  // - BrokerAdapter.placeOrder() validates evidence exists
  // - Bypass detection: no evidence → BLOCK
  // - Bypass detection: evidence with gate fail → BLOCK
  // - All gates pass → order proceeds
  // - Timeout in gate5 → retry logic works
});
```

---

## ✅ LÍNEAS EXACTAS

| Componente | Líneas | Acumulado |
|-----------|--------|----------|
| Gate 4-5 Servicios | +300 | 300 |
| Tests (3 archivos) | +440 | 740 |
| ExecutionEngine integration | +15 | 755 |
| BrokerAdapter integration | +25 | 780 |
| **TOTAL CHECKPOINT 2** | **+780** | **+780** |

---

## 🔍 RIESGOS IDENTIFICADOS

| Riesgo | Probabilidad | Severidad | Mitigación |
|--------|---|---|---|
| Alpaca offline 5s+ | 0.5% | Crítica | Retry 3x con backoff exponencial |
| Gate 4 price typo detection too strict | 5% | Media | Configurable threshold (1% default) |
| Evidence table not yet created | 0% | Alta | Placeholder in Checkpoint 2, actual in Checkpoint 3 |
| Bypass detection false positive | 2% | Media | Log evidence lookup failures clearly |
| Dry-run fails but order would pass | 1% | Baja | Not our concern (Alpaca responsability) |

---

## ✅ PASS/FAIL CRITERIA

### ✅ CHECKPOINT 2 PASSES IF:

```bash
npm test -- --run gate4 gate5 seatbelt.integration
  → 20 tests PASS (100%)

# ExecutionEngine modify verified:
npm test -- --run execution.service.spec.ts
  → New integration tests PASS

# BrokerAdapter modify verified:
npm test -- --run broker.adapter.spec.ts
  → Bypass detection tests PASS
```

### ❌ CHECKPOINT 2 FAILS IF:

```
< 90% tests PASS
OR integration with ExecutionEngine breaks
OR bypass detection doesn't work
```

---

## 🔄 ROLLBACK STRATEGY

If Checkpoint 2 fails:

```bash
# Revert services + integrations
git revert [gate4-commit] [gate5-commit] [integration-commits]

# Remove test files
rm -rf backend/src/modules/seatbelt/services/gate4* gate5*

# Keep Checkpoint 1 (Gates 1-3 intact)
# Revert ExecutionEngine to pre-Checkpoint-2 state

# Timeline: 10-15 minutes max
```

---

## 📋 PRE-FLIGHT CONTROL

- [ ] **Integration Test:** ExecutionEngine calls validateCheckpoint2()
- [ ] **Bypass Detection:** Evidence lookup working (even if table empty)
- [ ] **Retry Logic:** Alpaca retry backoff validated (1s, 2s, 4s)
- [ ] **Performance:** Gate 5 timeout < 5s, no hung requests
- [ ] **Error Logging:** Each retry attempt logged
- [ ] **Documentation:** JSDoc for retry logic, bypass detection

---

## 📚 EVIDENCE JAY MUST REVIEW

1. **Retry Logic:** Backoff timing is exponential, not linear
2. **Bypass Detection:** Cannot circumvent SEATBELT by skipping evidence
3. **Integration Points:** ExecutionEngine + BrokerAdapter changes are minimal (+40 lines)
4. **Test Coverage:** Gate 4-5 + integration = 20+ tests
5. **Price Typo Check:** Threshold is 1%, reasonable for market conditions

---

## 🎯 NEXT STEPS (IF JAY APPROVES)

1. Claude implements Gate 4-5
2. Modify ExecutionEngine + BrokerAdapter
3. Run tests locally
4. Code review: Víctor + Jay approve
5. Merge to main (one commit)
6. PROCEED TO CHECKPOINT 3

---

## ⏹️ STATE AFTER CHECKPOINT 2

- ✅ Gates 1-5 code complete (but not active)
- ✅ ExecutionEngine + BrokerAdapter integration ready
- ✅ Bypass detection mechanism in place
- ✅ 60 tests passing (40 from Checkpoint 1 + 20 from Checkpoint 2)
- ❌ PreExecutionEvidence entity missing (created in Checkpoint 3)
- ❌ Tito still blocked (BD schema missing)

---

**Checkpoint 2 is the execution layer. Checkpoint 3 adds auditing.**

**Status: HOLD — Awaiting Checkpoint 1 PASS to proceed.**
