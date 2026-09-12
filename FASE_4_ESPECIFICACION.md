# 🔧 FASE 4 — ESPECIFICACIÓN FORMAL (Sin Implementación)

**Timestamp:** 2026-09-12  
**Status:** 📋 ESPECIFICACIÓN SOLAMENTE — NO HAY CÓDIGO MODIFICADO  
**Precondición:** Fase 3 ✅ (Migraciones ejecutadas, tablas + índices + FKs en BD)

---

## 🎯 QUÉ ES FASE 4

**Resumen:** Implementar los **servicios de aplicación** que usan las tablas creadas en Fase 3 para cerrar la cadena **Decisión → Ejecución → Resultado**.

**Relación con Etapa 2:**
- Etapa 2 = Especificación de trazabilidad (4 entidades, FKs, flujos)
- Fase 3 (completada) = Migraciones de BD + índices + correcciones
- **Fase 4 (pendiente) = Servicios de lógica de aplicación** que usan esas tablas

---

## 📊 ALCANCE EXACTO DE FASE 4

### Archivos a CREAR (5 archivos, ~670 líneas)

| Archivo | Líneas Est. | Propósito |
|---------|------------|-----------|
| `backend/src/modules/database/services/trade-execution.service.ts` | 280+ | Crear/actualizar/cerrar trades; vincular a decisiones; calcular P&L |
| `backend/src/modules/database/services/trade-execution.service.spec.ts` | 200+ | Unit tests (30+) |
| `backend/src/modules/database/services/execution-event.service.ts` | 140+ | Registrar eventos (FILL, RETRY, SL_HIT, etc.) |
| `backend/src/modules/database/services/execution-event.service.spec.ts` | 80+ | Unit tests (15+) |
| `backend/src/modules/database/database.module.ts` (UPDATE) | 20+ | Registrar servicios en módulo NestJS |

### Archivos a MODIFICAR (3 archivos, ~80 líneas de cambios)

| Archivo | Cambios | Propósito |
|---------|---------|-----------|
| `backend/src/modules/execution/executionEngine.ts` | +30 líneas | Integrar con TradeExecutionService en `executeOrder()` |
| `backend/src/modules/alpaca/executors/alpaca-paper-executor.ts` | +30 líneas | Registrar fills + eventos en ExecutionEventService |
| `backend/src/modules/decision-audit/decision-audit.service.ts` | +20 líneas | Método `linkExecutionToDecision()` + outcome updates |

---

## 📋 SERVICIOS A IMPLEMENTAR

### 1. TradeExecutionService

**Responsabilidades:**
- Crear `TradeExecution` cuando se inicia ejecución desde DecisionAuditTrail
- Vincular automáticamente `decisionAuditTrailId` (FK)
- Asignar `clientOrderId` único (uuid)
- Actualizar estado: PENDING → FILLED → CLOSED
- Calcular `profitLoss` al cierre
- Deduplicación de reintentos (detectar `clientOrderId` existente)
- Incrementar `attemptCount` en reintentos

**Métodos Públicos (8):**
```
1. create(decisionId, tradeId, mode) → TradeExecution
   └─ Validar decisionId existe + status=ENTER
   └─ Asignar uuid como clientOrderId
   └─ Crear registro con status=PENDING

2. linkBrokerOrder(tradeExecutionId, brokerOrderId, brokerResponse)
   └─ Update status=PENDING_FILL
   └─ Guardar brokerResponse (JSONB)

3. recordFill(tradeExecutionId, filledQty, filledPrice, brokerTimestamp)
   └─ Update filledQty, filledPrice
   └─ Update status=FILLED

4. recordPartialFill(tradeExecutionId, filledQty, filledPrice)
   └─ Increment existente filledQty

5. close(tradeExecutionId, exitPrice, closeReason)
   └─ Calculate profitLoss = (exitPrice - entryPrice) * filledQty
   └─ Update status=CLOSED, outcome

6. recordRetry(tradeExecutionId)
   └─ Increment attemptCount
   └─ Keep status=PENDING (reutilizar clientOrderId)

7. getByDecisionId(decisionId) → TradeExecution[]
   └─ Query por FK + return todos (reintentos = 1 trade)

8. getByClientOrderId(clientOrderId) → TradeExecution | null
   └─ Dedup check — devuelve existente si ya hay

Validaciones Críticas:
- clientOrderId único globalmente (constraint DB)
- filledPrice NOT NULL antes de calcular P&L
- status nunca retrocede (PENDING → FILLED → CLOSED)
- profitLoss = null hasta cierre
- intentCount ≥ 1
```

**Key Properties:**
- ✅ Campos timestamp NUNCA cambian (`createdAt`, `updatedAt`)
- ✅ `decisionAuditTrailId` asignado una sola vez (NOT NULL, immutable)
- ✅ `clientOrderId` único (UNIQUE constraint en BD)
- ✅ Estado máquina de estados estricta

---

### 2. ExecutionEventService

**Responsabilidades:**
- Registrar eventos granulares de cada trade (FILL, RETRY, SL_HIT, CLOSED, etc.)
- Preservar timestamp del broker
- Guardar broker response completo (JSONB)
- Crear historial auditable de cada acción

**Métodos Públicos (6):**
```
1. recordEvent(tradeExecutionId, eventType, data)
   └─ Create ExecutionEvent con eventType
   └─ Guardar filledQty, filledPrice si aplica
   └─ Usar broker timestamp si disponible

2. recordOrderPlaced(tradeExecutionId, brokerOrderId)
   └─ Create eventType=ORDER_PLACED

3. recordFill(tradeExecutionId, filledQty, filledPrice, brokerTimestamp)
   └─ Create eventType=FILL

4. recordRetry(tradeExecutionId, reason, attemptNumber)
   └─ Create eventType=RETRY con reason

5. recordStopLoss(tradeExecutionId, triggerPrice, exitPrice)
   └─ Create eventType=SL_HIT

6. getTradeHistory(tradeExecutionId) → ExecutionEvent[]
   └─ Return cronológicamente ordenados
   └─ Include broker timestamps

Validaciones:
- eventType ENUM válido (ORDER_PLACED, FILL, RETRY, SL_HIT, TP_HIT, CLOSED, ERROR)
- tradeExecutionId FK válida
- timestamps del broker preservados exactamente
- brokerData JSONB verbatim
```

---

## 🔗 INTEGRACIONES (3 puntos de contacto)

### 1. ExecutionEngine (`executeOrder()` method)

**Ubicación:** `backend/src/modules/execution/executionEngine.ts:~150`

**Cambios:**
```typescript
async executeOrder(decision: DecisionAuditTrail) {
  // ANTES: solo crea orden en broker
  
  // NUEVO: crear TradeExecution ANTES de enviar a broker
  const tradeEx = await this.tradeExecService.create(
    decision.id,
    decision.proposedTrade.tradeId,
    decision.executionMode  // PAPER | LIVE
  );
  
  // Ejecutar orden
  const brokerOrder = await alpacaExecutor.placeOrder(...);
  
  // NUEVO: vincular con broker
  await this.tradeExecService.linkBrokerOrder(
    tradeEx.id,
    brokerOrder.id,
    brokerOrder  // broker response íntegro
  );
  
  // NUEVO: registrar evento
  await this.eventService.recordOrderPlaced(tradeEx.id, brokerOrder.id);
  
  // NUEVO: vincular ejecución a decisión
  await this.decisionAuditService.linkExecutionToDecision(
    decision.id,
    tradeEx.id,
    'EXECUTED'  // executionStatus
  );
}
```

**Estimación:** +30 líneas (4 llamadas de servicio)

---

### 2. AlpacaPaperExecutor (fill monitor)

**Ubicación:** `backend/src/modules/alpaca/executors/alpaca-paper-executor.ts:~200`

**Cambios:**
```typescript
// En el monitor que detecta fills...
onFillDetected(brokerOrderId, filledQty, filledPrice) {
  // NUEVO: resolver tradeExecution desde broker order
  const tradeEx = await this.tradeExecService.getByBrokerOrderId(brokerOrderId);
  
  // NUEVO: registrar fill
  await this.tradeExecService.recordFill(
    tradeEx.id,
    filledQty,
    filledPrice,
    Date.now()  // broker timestamp
  );
  
  // NUEVO: registrar evento
  await this.eventService.recordFill(
    tradeEx.id,
    filledQty,
    filledPrice,
    Date.now()
  );
}

onStopLossHit(brokerOrderId, triggerPrice, exitPrice) {
  const tradeEx = await this.tradeExecService.getByBrokerOrderId(brokerOrderId);
  
  // NUEVO: cerrar trade + calcular P&L
  await this.tradeExecService.close(
    tradeEx.id,
    exitPrice,
    'SL_HIT'
  );
  
  // NUEVO: registrar evento
  await this.eventService.recordStopLoss(
    tradeEx.id,
    triggerPrice,
    exitPrice
  );
}
```

**Estimación:** +30 líneas (3 puntos de integración)

---

### 3. DecisionAuditService

**Ubicación:** `backend/src/modules/decision-audit/decision-audit.service.ts:~300`

**Cambios:**
```typescript
// Nuevo método:
async linkExecutionToDecision(
  decisionId: string,
  tradeExecutionId: string,
  executionStatus: 'EXECUTED' | 'FAILED' | 'SKIPPED'
) {
  const decision = await this.decisionRepo.findOne(decisionId);
  decision.executionStatus = executionStatus;
  decision.executionId = tradeExecutionId;
  await this.decisionRepo.save(decision);
}

// Actualizar método existente:
async updateDecisionOutcome(
  decisionId: string,
  outcome: 'PROFITABLE' | 'BREAKEVEN' | 'LOSS' | 'INCOMPLETE',
  profitLoss: number | null
) {
  const decision = await this.decisionRepo.findOne(decisionId);
  decision.outcome = outcome;  // ← campos finales, NUNCA vuelven a cambiar
  decision.profitLoss = profitLoss;
  decision.completedAt = new Date();
  await this.decisionRepo.save(decision);
}
```

**Estimación:** +20 líneas (1 método nuevo + 1 actualización)

---

## 🧪 PRUEBAS REQUERIDAS (45+ tests)

### Unit Tests (30+)

**TradeExecutionService (20):**
- ✓ create() asigna clientOrderId único
- ✓ create() valida decisionId existe
- ✓ linkBrokerOrder() actualiza estado
- ✓ recordFill() calcula P&L correctamente
- ✓ recordPartialFill() acumula cantidad
- ✓ close() transiciona correctamente
- ✓ close() calcula profitLoss = (exit - entry) × qty
- ✓ recordRetry() incrementa attemptCount sin duplicar
- ✓ getByClientOrderId() retorna existente (dedup)
- ✓ Validaciones: clientOrderId unique
- ✓ Validaciones: filledPrice NOT NULL antes P&L
- ✓ Validaciones: status nunca retrocede
- ✓ Validaciones: createdAt immutable
- ✓ Validaciones: profitLoss es null hasta close
- ✓ getByDecisionId() retorna todos (reintentos = 1 trade)
- ✓ Error handling: decisionId no existe
- ✓ Error handling: tradeExecution no existe
- ✓ Estado máquina: PENDING → FILLED → CLOSED
- ✓ Modo PAPER/LIVE preservado
- ✓ Intentos: 10 reintentos = 1 record con attemptCount=10

**ExecutionEventService (10):**
- ✓ recordEvent() crea evento sin corromper
- ✓ recordOrderPlaced() asigna tipo correcto
- ✓ recordFill() preserva broker timestamp
- ✓ recordRetry() registra reason
- ✓ recordStopLoss() captura trigger + exit
- ✓ getTradeHistory() retorna cronológico
- ✓ Validaciones: eventType ENUM válido
- ✓ Validaciones: tradeExecutionId FK válida
- ✓ brokerData JSONB preservado verbatim
- ✓ Error: tradeExecution no existe

### Integration Tests (15+)

- ✓ Decisión → TradeExecution → Fill → Close → Outcome (happy path)
- ✓ Decisión → 10 reintentos = 1 trade + attemptCount=10
- ✓ ExecutionEngine integración (llama tradeExecService)
- ✓ AlpacaExecutor integración (registra fills + eventos)
- ✓ DecisionAuditService vinculación
- ✓ P&L exacto en escenarios: +, -, breakeven
- ✓ SL_HIT cierra trade automáticamente
- ✓ Partial fills acumulan correctamente
- ✓ Status máquina respetada en integración
- ✓ Broker response guardado íntegro
- ✓ clientOrderId dedup bajo alta concurrencia (race condition test)
- ✓ Timestamps preservados exactamente
- ✓ Modo PAPER/LIVE filtrable
- ✓ FKs válidas post-integración
- ✓ Cascada DELETE: cierre de trade → eventos borrados

---

## ✅ CRITERIOS GO/NO-GO

### GO si se cumplen:
- [ ] 5 archivos nuevos creados (services + specs)
- [ ] 3 archivos modificados (ExecutionEngine + AlpacaExecutor + DecisionAuditService)
- [ ] Todos los métodos públicos implementados (17 métodos)
- [ ] 45+ tests: 30 unit + 15 integration
- [ ] Build: EXIT 0 (TypeScript limpio)
- [ ] npm test: 100% PASS (tests unitarios)
- [ ] Integration tests: 100% PASS
- [ ] Validaciones críticas en lugar (P&L, dedup, state machine)
- [ ] FKs funcionan (queries inversas)
- [ ] Servicios registrados en DatabaseModule
- [ ] Documentación actualizada

### NO-GO si encontramos:
- [ ] ❌ clientOrderId NO es único → duplicados posibles
- [ ] ❌ P&L mal calculado
- [ ] ❌ Status retrocede (CLOSED → FILLED)
- [ ] ❌ createdAt/decisionId cambian después creación
- [ ] ❌ Eventos no se registran en SL_HIT
- [ ] ❌ Reintentos crean múltiples trades
- [ ] ❌ Modo PAPER/LIVE no preservado
- [ ] ❌ Broker response no guardado
- [ ] ❌ FKs rotas (orphaned records)
- [ ] ❌ TypeScript errors
- [ ] ❌ Tests fallando

---

## 📊 ESTIMACIÓN

| Tarea | Horas | Est. Líneas |
|-------|-------|------------|
| TradeExecutionService | 3h | 280 |
| TradeExecutionService tests | 2.5h | 200 |
| ExecutionEventService | 1.5h | 140 |
| ExecutionEventService tests | 1h | 80 |
| DatabaseModule update | 0.5h | 20 |
| ExecutionEngine integración | 1h | 30 |
| AlpacaExecutor integración | 1h | 30 |
| DecisionAuditService integración | 0.5h | 20 |
| Integration tests setup | 1h | — |
| Documentación | 1h | — |
| **TOTAL** | **~12.5h** | **~780** |

---

## 🚀 DEPENDENCIAS

**Precondición (COMPLETADA):**
- Fase 3 ✅ — Migraciones ejecutadas, tablas existentes, FKs en BD

**Bloquea:**
- Etapa 3 (Lessons, Learning Loop) — requiere Trade closed + P&L

---

## 📝 RESUMEN PARA REVISIÓN

**Fase 4 = Implementar los servicios de aplicación que usan las tablas de Fase 3**

### Lo que se hace:
1. ✅ Crear 2 servicios (TradeExecutionService, ExecutionEventService)
2. ✅ Integrar con 3 lugares existentes (ExecutionEngine, AlpacaExecutor, DecisionAudit)
3. ✅ 45+ tests (30 unit + 15 integration)
4. ✅ Documentación

### Lo que NO se toca:
- ❌ Lógica de trading
- ❌ Estrategias
- ❌ Órdenes/SL/TP
- ❌ Secretos/credenciales
- ❌ Etapa 1 (auditoría de decisiones)

### Riesgos mitigados:
- Deduplicación de reintentos (clientOrderId unique)
- P&L exacto (validaciones + tests)
- State machine estricta (status nunca retrocede)
- FKs con RESTRICT/CASCADE (integridad referencial)

---

**ESPECIFICACIÓN COMPLETADA - PENDIENTE REVISIÓN Y AUTORIZACIÓN**

Sin código modificado. Solo documento de plan.
