# ETAPA 2: TRAZABILIDAD OPERATIVA — ESPECIFICACIÓN FORMAL
**Fecha Especificación:** 2026-09-12  
**Estado:** 🟡 PENDIENTE REVISIÓN Y AUTORIZACIÓN  
**Precondición:** Etapa 1 corregida (Foreign Keys + migraciones aplicadas)

---

## 📌 OBJETIVO

Cerrar la trazabilidad completa: **Decisión → Ejecución → Resultado**

Implementar vinculación automática, bidireccional e inequívoca entre:
- **Decisión** registrada en `DecisionAuditTrail`
- **Órdenes** colocadas en Alpaca (y futuros brokers)
- **Fills** y reintentos de ejecución
- **Resultado final** (entrada, salida, P&L, outcome)

**Criterio de éxito:** Cada decisión `ENTER`/`SALIR` tiene un `tradeId` único que correlaciona todos los eventos (decisión, órdenes iniciales, fills, cancellations, reintentos, cierre) sin crear trades duplicados.

---

## 🎯 PRINCIPIOS RECTORES

### 1. **Bidireccionalidad**
- `DecisionAuditTrail` → `TradeExecution` (decisión vinculada a órdenes)
- `TradeExecution` → `DecisionAuditTrail` (órdenes vinculadas a decisión)

### 2. **Trazabilidad Inequívoca**
- `tradeId`: identificador lógico del trade (único por decisión)
- `orderId`: ID de orden individual del broker
- `executionId`: ID único de cada intento de ejecución (con reintentos)
- Cada componente es **rastreable independientemente**

### 3. **Deduplicación Garantizada**
- No crear trades duplicados por reintentos fallidos
- No duplicar fills si el broker retorna el mismo orderId
- Usar `clientOrderId` como llave deduplicación

### 4. **Salvaguarda de Evidencia**
- Broker timestamps y órdenes del broker conservados **verbatim**
- Nunca sobrescribir campos de ejecución histórica
- Crear registros de auditoria para cada cambio de estado

### 5. **No Modificación de Decisiones**
- Decisión original **inmutable** (timestamps, proposedEntry/Stop/Target)
- Solo `executionStatus` y `outcome` pueden cambiar (después del cierre)
- Ningún cambio de decisión retroactivo

### 6. **Modo PAPER/LIVE/SIMULADO Inequívoco**
- Cada trade registra su modo en creación
- No puede cambiar modo retrospectivamente
- UI/reporting filtra por modo

---

## 📐 ARQUITECTURA — NUEVAS ENTIDADES

### Entidad 1: `TradeExecution`
**Tabla:** `trade_executions`  
**Propósito:** Vincular `DecisionAuditTrail` con órdenes del broker

```typescript
@Entity('trade_executions')
@Index(['tradeId'])  // Único por trade lógico
@Index(['decisionAuditTrailId'])  // FK a decisión
@Index(['status'])
@Index(['createdAt'])
export class TradeExecution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;  // executionId único

  // === Vínculos ===
  @ManyToOne(() => DecisionAuditTrail, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'decision_audit_trail_id' })
  decisionAuditTrail!: DecisionAuditTrail;

  @Column('varchar', { length: 50 })
  tradeId!: string;  // Identificador lógico (único por decisión)

  // === Broker Metadata ===
  @Column('varchar', { length: 100, nullable: true })
  brokerId?: string;  // broker name (alpaca, schwab, etc.)

  @Column('varchar', { length: 20 })
  side!: string;  // 'buy' | 'sell'

  @Column('varchar', { length: 10 })
  symbol!: string;

  @Column('decimal', { precision: 20, scale: 8 })
  quantity!: number;

  @Column('varchar', { length: 50 })
  orderType!: string;  // 'market' | 'limit'

  @Column('varchar', { length: 100, nullable: true })
  clientOrderId?: string;  // nuestro ID para deduplicación

  @Column('varchar', { length: 100, nullable: true })
  brokerOrderId?: string;  // ID que devolvió el broker

  // === Ejecución ===
  @Column('varchar', { length: 30 })
  status!: string;  // PENDING, PARTIAL, FILLED, CANCELLED, FAILED, EXPIRED

  @Column('varchar', { length: 20 })
  executionMode!: string;  // PAPER, LIVE, SIMULATOR — NOT NULL, set at creation

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  filledQty?: number;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  filledPrice?: number;  // Precio de ejecución (VWAP de fills)

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  avgFillPrice?: number;

  @Column('timestamp with time zone', { nullable: true })
  filledAt?: Date;

  // === Reintentos ===
  @Column('integer', { default: 0 })
  attemptCount!: number;  // Cuántos reintentos

  @Column('timestamp with time zone', { nullable: true })
  lastAttemptAt?: Date;

  @Column('varchar', { length: 500, nullable: true })
  lastError?: string;

  // === Stops & Targets (si aplican) ===
  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  stopLoss?: number;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  takeProfit?: number;

  @Column('varchar', { length: 100, nullable: true })
  tpOrderId?: string;  // ID de la orden TP si está activa

  @Column('varchar', { length: 100, nullable: true })
  slOrderId?: string;  // ID de la orden SL si está activa

  // === Cierre ===
  @Column('varchar', { length: 30, nullable: true })
  closeStatus?: string;  // HOW_CLOSED: TP_HIT, SL_HIT, MANUAL, EXPIRED, PARTIAL

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  exitPrice?: number;

  @Column('timestamp with time zone', { nullable: true })
  closedAt?: Date;

  // === P&L (calculado al cierre) ===
  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  profitLoss?: number;  // (exitPrice - entryPrice) * qty - commissions

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  profitLossPercent?: number;

  @Column('varchar', { length: 50, nullable: true })
  outcome?: string;  // PROFITABLE, LOSS, BREAKEVEN, PARTIAL, CANCELLED

  // === Evidencia & Auditoría ===
  @Column('jsonb', { nullable: true })
  brokerResponse?: Record<string, any>;  // JSON original del broker (verbatim) — WRITE-ONCE: set in create, never updated

  @Column('text', { nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column('timestamp with time zone', { nullable: true })
  brokerTimestamp?: Date;  // Timestamp del broker para este evento
}
```

---

### Entidad 2: `ExecutionEvent`
**Tabla:** `execution_events`  
**Propósito:** Registro detallado de cada evento (fill, reintenyo, cancelation)

```typescript
@Entity('execution_events')
@Index(['tradeExecutionId'])
@Index(['eventType'])
@Index(['createdAt'])
export class ExecutionEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => TradeExecution, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trade_execution_id' })
  tradeExecution!: TradeExecution;

  @Column('varchar', { length: 30 })
  eventType!: string;  
  // ORDER_PLACED, PARTIAL_FILL, FILL, RETRY, FAILED, CANCELLED, CLOSED, TP_HIT, SL_HIT

  @Column('varchar', { length: 100, nullable: true })
  brokerOrderId?: string;  // En caso de cambio de ID entre reintentos

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  filledQty?: number;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  filledPrice?: number;

  @Column('varchar', { length: 500, nullable: true })
  message?: string;  // Descripción legible: "Filled 10 shares at 150.25", "Retry attempt 2", etc.

  @Column('jsonb', { nullable: true })
  brokerData?: Record<string, any>;  // Payload del broker para este evento

  @Column('timestamp with time zone', { nullable: true })
  brokerTimestamp?: Date;  // Cuándo pasó en el broker

  @CreateDateColumn()
  recordedAt!: Date;  // Cuándo lo registramos nosotros
}
```

---

### Entidad 3: `PositionSnapshot` (ACTUALIZACIÓN)
**Ya existe**, pero necesita nueva FK a `TradeExecution`:

```typescript
@Entity('position_snapshots')
export class PositionSnapshot {
  // ... campos existentes ...

  // === Nuevo en Etapa 2 ===
  @ManyToOne(() => TradeExecution, { eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trade_execution_id' })
  tradeExecution?: TradeExecution;

  @RelationId((snapshot: PositionSnapshot) => snapshot.tradeExecution)
  tradeExecutionId?: string;
}
```

---

### Entidad 4: `DecisionAuditTrail` (ACTUALIZACIÓN)
**Ya existe**, nuevo campo FK reversa:

```typescript
@Entity('decision_audit_trail')
export class DecisionAuditTrail {
  // ... campos existentes ...

  // === Nuevo en Etapa 2: Relación reversa ===
  @OneToMany(() => TradeExecution, exec => exec.decisionAuditTrail, {
    lazy: true,
    cascade: false,  // NO borrar órdenes si se borra decisión
  })
  tradeExecutions?: TradeExecution[];

  // Helper: FK string para compatibilidad con Etapa 1
  @Column('varchar', { length: 50, nullable: true })
  executionId?: string;  // DEPRECATED: usar TradeExecution.id en su lugar
}
```

---

## 🔄 FLUJO DE DATOS: DECISIÓN → EJECUCIÓN → RESULTADO

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DECISIÓN (DecisionAuditTrail)                                │
│                                                                   │
│  timestamp: 2026-09-12T10:00:00Z                                │
│  decision: ENTER                                                 │
│  proposedEntry: 150.00                                          │
│  proposedStop: 149.00                                           │
│  proposedTarget: 152.00                                         │
│  executionStatus: PENDING                                       │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. CREAR TRADE EXECUTION (TradeExecution)                       │
│                                                                   │
│  tradeId: "trd_ETHUSD_20260912_001"        (único lógico)       │
│  decisionAuditTrailId: <FK>                                     │
│  symbol: ETHUSD                                                  │
│  side: buy                                                       │
│  quantity: 1.0                                                   │
│  orderType: market                                              │
│  clientOrderId: "cli_20260912_10000_1"     (deduplicación)      │
│  status: PENDING                                                │
│  executionMode: PAPER                                           │
│  attemptCount: 0                                                │
│  createdAt: <timestamp>                                         │
│                                                                   │
│  FK: decisionAuditTrailId = DecisionAuditTrail.id ✅            │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. COLOCAR ORDEN EN BROKER (ExecutionEngine)                    │
│                                                                   │
│  POST /v2/orders {                                              │
│    symbol: "ETHUSD",                                            │
│    side: "buy",                                                 │
│    qty: 1.0,                                                    │
│    type: "market",                                              │
│    client_order_id: "cli_20260912_10000_1"                     │
│  }                                                               │
│                                                                   │
│  ← Response: {                                                  │
│    id: "ord_alpaca_abc123",                                     │
│    status: "pending",                                           │
│    filled_qty: 0,                                               │
│    ...                                                           │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. REGISTRAR ORDEN EN BD (TradeExecution.update())             │
│                                                                   │
│  brokerOrderId: "ord_alpaca_abc123"       (← del broker)        │
│  status: PENDING → FILLED (cuando respuesta diga filled)        │
│  filledQty: 1.0                                                 │
│  filledPrice: 150.15 (precio real de ejecución)                │
│  attemptCount: 1                                                │
│  brokerResponse: { ... }  (JSON íntegro del broker)             │
│  filledAt: <timestamp>                                          │
│                                                                   │
│  + Crear ExecutionEvent:                                        │
│    eventType: "FILL"                                            │
│    filledQty: 1.0                                               │
│    filledPrice: 150.15                                          │
│    message: "Filled 1.0 ETHUSD at 150.15"                       │
│    brokerData: { ... }                                          │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. ACTUALIZAR DECISIÓN CON EJECUCIÓN (DecisionAuditTrail)      │
│                                                                   │
│  executionStatus: PENDING → EXECUTED                            │
│  executionId: TradeExecution.id  (↔ tradeId)                   │
│  updatedAt: <timestamp>                                         │
│                                                                   │
│  ⚠️  NO CAMBIAR:                                                │
│  - timestamp, decision, proposedEntry/Stop/Target               │
│  - confidence, riskLevel, marketData                            │
└─────────────────────────────────────────────────────────────────┘
                             ↓
        (Trade activo hasta SL/TP/manual close)
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. MONITOREO (PositionSnapshotService)                          │
│                                                                   │
│  Cada snapshot registra:                                        │
│  - tradeExecutionId: TradeExecution.id  (FK)                   │
│  - currentPrice, pnl, pnlPercent                               │
│  - trend, rsi, vix                                             │
│  - timestamp                                                    │
│                                                                   │
│  Si SL/TP tocado → Crear ExecutionEvent (SL_HIT / TP_HIT)      │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. CIERRE DE POSICIÓN                                           │
│                                                                   │
│  TradeExecution.update({                                        │
│    status: CLOSED                                               │
│    closeStatus: TP_HIT | SL_HIT | MANUAL | PARTIAL | ...       │
│    exitPrice: 150.50                                            │
│    closedAt: <timestamp>                                        │
│    profitLoss: (150.50 - 150.15) * 1.0 = +0.35                │
│    profitLossPercent: 0.23%                                     │
│    outcome: PROFITABLE                                          │
│  });                                                             │
│                                                                   │
│  + Crear ExecutionEvent:                                        │
│    eventType: "TP_HIT" | "SL_HIT" | "CLOSED"                  │
│    message: "Closed at 150.50 (TP hit)"                        │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. ACTUALIZAR RESULTADO EN DECISIÓN (DecisionAuditTrail)       │
│                                                                   │
│  outcome: PROFITABLE | LOSS | PARTIAL | ...                    │
│  profitLoss: +0.35 (USD)                                        │
│  profitLossPercent: +0.23%                                      │
│  updatedAt: <timestamp>                                         │
│                                                                   │
│  ⚠️  ESTOS SON LOS ÚNICOS CAMPOS QUE CAMBIAN DESPUÉS            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 ARCHIVOS A CREAR / MODIFICAR

### CREAR (nuevos)
1. ✅ `backend/src/modules/database/entities/trade-execution.entity.ts` (112 líneas)
2. ✅ `backend/src/modules/database/entities/execution-event.entity.ts` (60 líneas)
3. ✅ `backend/src/modules/trade-execution/trade-execution.service.ts` (250+ líneas)
4. ✅ `backend/src/modules/trade-execution/trade-execution.service.spec.ts` (200+ líneas)
5. ✅ `backend/src/modules/trade-execution/execution-event.service.ts` (150+ líneas)
6. ✅ `backend/src/database/migrations/1726170700000-AddTradeExecutionTables.ts` (120+ líneas)

### MODIFICAR (existentes)
1. 🔧 `backend/src/modules/database/entities/decision-audit-trail.entity.ts`
   - Agregar `@OneToMany(() => TradeExecution, ...)`
   - (Backward compatible: solo lectura)

2. 🔧 `backend/src/modules/database/entities/position-snapshot.entity.ts`
   - Agregar FK a `TradeExecution`
   - (Backward compatible)

3. 🔧 `backend/src/core/executionEngine.ts`
   - Integración con `TradeExecutionService` tras `executeOrder()`
   - Registrar `brokerOrderId` automáticamente
   - Manejar reintentos conservando `tradeId`

4. 🔧 `backend/src/modules/api/services/decision-audit.service.ts`
   - Método `linkExecutionToDecision()` para vincular tras ejecución exitosa
   - NO modificar `recordDecision()` ni `updateDecisionOutcome()`

5. 🔧 `backend/src/modules/research/services/alpaca-paper-executor.ts`
   - Integración con `TradeExecutionService` tras `executeOrder()`

---

## 🔀 FLUJO DE IMPLEMENTACIÓN: DECISIÓN → ORDEN

### Caso 1: Decisión `ENTER` → Colocar Orden

```
1. Decision Audit Service recibe decisión ENTER
   ↓
2. Crear TradeExecution(
   decisionAuditTrailId = decision.id,
   tradeId = "trd_" + symbol + "_" + timestamp (único),
   status = "PENDING",
   clientOrderId = generar UUID único
   )
   ↓
3. Execution Engine coge clientOrderId y coloca orden en Alpaca
   ↓
4. Broker devuelve orderId
   ↓
5. TradeExecution.update(
   brokerOrderId = orderId,
   status = "PENDING" | "FILLED",
   filledQty, filledPrice, etc.
   brokerResponse = respuesta íntegra
   )
   ↓
6. Crear ExecutionEvent(
   tradeExecutionId = tradeExecution.id,
   eventType = "ORDER_PLACED" | "FILL",
   brokerData = respuesta
   )
   ↓
7. Decision Audit.update(
   executionStatus = "EXECUTED",
   executionId = tradeExecution.id
   )
```

### Caso 2: Reintentos (429, timeout, etc.)

```
1. ExecutionEngine.executeOrder() falla (429)
   ↓
2. Esperar backoff exponencial
   ↓
3. REINTENTAR con mismo clientOrderId
   ↓
4. En TradeExecution:
   - Incrementar attemptCount
   - Actualizar lastAttemptAt
   - Actualizar lastError
   ↓
5. Crear ExecutionEvent(
   eventType = "RETRY",
   message = "Retry attempt 2 after 2000ms delay",
   brokerData = null (sin respuesta nueva)
   )
   ↓
6. Si eventual FILLED:
   - Deduplicación: detectar orderId existente (via clientOrderId)
   - NO crear trade duplicado
   - Solo actualizar existing TradeExecution
```

### Caso 3: Monitoreo → Cierre (SL/TP)

```
1. PositionSnapshotService ejecuta cada 10s
   ↓
2. Verifica: currentPrice vs stopLoss / takeProfit
   ↓
3. Si SL tocado:
   - Crear ExecutionEvent(eventType = "SL_HIT")
   - TradeExecution.update(closeStatus = "SL_HIT", closedAt = now)
   ↓
4. Calcular P&L:
   profitLoss = (exitPrice - entryPrice) * quantity - commissions
   outcome = P&L > 0 ? "PROFITABLE" : "LOSS"
   ↓
5. Decision Audit.updateDecisionOutcome({
   outcome,
   profitLoss,
   profitLossPercent
   })
```

---

## 🛟 ERROR HANDLING & RECOVERY

### Escenario: `linkExecutionToDecision()` Falla

**Caso:** DecisionAuditTrail.ENTER registrado, pero TradeExecution.create() falla (BD timeout, FK constraint, etc.)

**Comportamiento Requerido:**

1. **Retry Automático:**
   ```
   - Intento 1: Falló
   - Esperar 1s → Intento 2
   - Esperar 2s → Intento 3
   - Si 3/3 fallan → marcar como SKIPPED
   ```

2. **Timeout 24h:**
   ```
   - Si DecisionAuditTrail.executionStatus = PENDING
   - Y no existe TradeExecution vinculado
   - Y han pasado >24 horas
   → Marcar decisión como SKIPPED con razón: "No ejecución tras 24h"
   ```

3. **Logging (no en BD operativa):**
   ```
   - Error registrado en bitácora (data/errors.jsonl)
   - Nunca en DecisionAuditTrail (eso rompería integridad)
   - AlertaGuardian: si consecutivos >3 fallos, notificar operador
   ```

4. **Impacto en Tito:**
   ```
   - ✅ Tito continúa operando (fallos de Caja Negra no lo bloquean)
   - ✅ Decisión SKIPPED, no reintentos de orden
   - ✅ Próxima decisión procesa normalmente
   ```

---

## ⚠️ RIESGOS IDENTIFICADOS

| # | Riesgo | Severidad | Mitigación |
|---|--------|-----------|-----------|
| R1 | Trades duplicados si reintentos fallidos crean múltiples tradesIds | ALTA | Usar `clientOrderId` como llave deduplicación global |
| R2 | `brokerOrderId` nulo si Alpaca falla antes de devolver ID | MEDIA | Campo nullable; `status=PENDING` indica order no confirmada |
| R3 | Fills parciales no manejadas | MEDIA | `filledQty` nullable; crear multiples ExecutionEvents (PARTIAL_FILL) |
| R4 | P&L calculado incorrectamente si falta `filledPrice` | MEDIA | Validar `filledPrice NOT NULL` antes de calcular P&L |
| R5 | Race condition: monitoreo TP/SL justo cuando broker cierra | MEDIA | Usar timestamp del broker como fuente única |
| R6 | Decisión "colgada" (PENDING) sin ejecución posterior | BAJA | Salvaguarda: timeout de 24h sin actualización → SKIPPED |
| R7 | Correlación perdida si DecisionAuditTrail se borra | MEDIA | FK: onDelete='RESTRICT' (no permitir borrar decisiones con trades) |
| R8 | Inconsistencia PAPER/LIVE si mismo código ejecuta ambos | ALTA | Campo `executionMode` + validación al crear tradeExecution |

---

## ✅ CRITERIOS DE ACEPTACIÓN

### Criterio 1: Vinculación Automática
- [ ] `DecisionAuditTrail.ENTER` → `TradeExecution.create()` en <100ms
- [ ] `TradeExecution.id` automáticamente puesto en `DecisionAuditTrail.executionId`
- [ ] No requiere API manual para vincular

### Criterio 2: Deduplicación & Idempotencia
- [ ] Dos intentos de orden con mismo `clientOrderId` → una sola `TradeExecution`
- [ ] Reintentos incrementan `attemptCount`, no crean trades nuevos
- [ ] 10+ reintentos = 1 `TradeExecution` con historial en `ExecutionEvent`
- [ ] Fill duplicado (mismo orderId + qty + price + timestamp): ignorado, NO crea ExecutionEvent duplicado
- [ ] P&L recalculado solo si filledQty total cambia (no si procesas mismo fill 2x)

### Criterio 3: Trazabilidad
- [ ] Cada acción visible: ORDER_PLACED, FILL, RETRY, SL_HIT, CLOSED
- [ ] Timestamps broker vs. nuestro sistema
- [ ] P&L auditable: entrada precio → salida precio → comisiones

### Criterio 4: Integridad Referencial
- [ ] FK `decision_audit_trail_id` NOT NULL + RESTRICT en delete
- [ ] FK `trade_execution_id` en PositionSnapshot (SET NULL)
- [ ] Queries reversa funciona: `decision.tradeExecutions`

### Criterio 5: Sin Modificación de Decisiones
- [ ] `DecisionAuditTrail.timestamp`, `decision`, `proposedEntry` inmutables ✅
- [ ] Solo `executionStatus`, `outcome`, `profitLoss` actualizados post-decisión
- [ ] Tests verifican: intento de UPDATE a otros campos → error o noop

### Criterio 6: Modo PAPER/LIVE Preservado
- [ ] `tradeExecution.executionMode` set en creación, no cambia
- [ ] Queries filtrables por modo: `where executionMode = 'PAPER'`
- [ ] UI claramente marca modo de cada trade

### Criterio 7: Cobertura de Pruebas
- [ ] 30+ tests unitarios (TradeExecutionService)
- [ ] 20+ tests integración (Decision → Ejecución → Resultado)
- [ ] Tests de reintentos (3x, 5x, 10x attempts)
- [ ] Tests de deduplicación
- [ ] Tests de P&L calculation

---

## 📚 DEPENDENCIAS

### Precondiciones (DEBE estar hecho)
- ✅ Etapa 1 completada (Foreign Keys en PositionSnapshot)
- ✅ Migraciones Etapa 1 ejecutadas en BD
- ✅ `DecisionAuditTrail` funcionando (lectura + escritura)
- ✅ `ExecutionEngine` colocando órdenes en Alpaca

### Nuevas dependencias de código
- TypeORM 0.3.16+ (relaciones `@OneToMany`)
- `decimal.js` para P&L calculations (evitar errores flotantes)
- NestJS Injectable + Repositories (ya presente)

### Nuevas dependencias externas
- **Ninguna** — solo TypeORM/NestJS ya en stack

---

## 🧪 PLAN DE PRUEBAS

### Fase 1: Unitarias (TradeExecutionService)
**Archivo:** `trade-execution.service.spec.ts`

```
✓ createTradeExecution() con decision válida → TradeExecution creado
✓ generateTradeId() es determinista e inequívoco
✓ linkDecisionToExecution() actualiza DecisionAuditTrail.executionId
✓ recordOrderPlacement() registra brokerOrderId + status
✓ recordFill() actualiza filledQty, filledPrice, status
✓ recordPartialFill() crea ExecutionEvent sin cambiar status
✓ recordRetry() incrementa attemptCount
✓ calculatePnL() devuelve correcto (exitPrice - entryPrice) * qty
✓ recordClose() con SL_HIT, TP_HIT, MANUAL
✓ deduplicateByClientOrderId() devuelve existing si existe
  ... +20 tests
```

### Fase 2: Integración (End-to-End)
**Archivo:** `trade-execution.integration.spec.ts`

```
✓ Decision ENTER → TradeExecution creado
✓ ExecutionEngine.executeOrder() → TradeExecution.brokerOrderId set
✓ Reintentos (3x) → 1 TradeExecution con attemptCount=3
✓ Fill → DecisionAuditTrail.executionStatus = EXECUTED
✓ SL hit → TradeExecution closed + P&L calculated
✓ TP hit → TradeExecution closed + Outcome = PROFITABLE
✓ Query by tradeId → find all related events
✓ Query by decisionId → find all executions
  ... +12 tests
```

### Fase 3: Migraciones
**Validar:**
- [ ] Migración up() crea tablas sin errores
- [ ] Migración down() revierte sin datos orfandos
- [ ] FKs validadas en BD física
- [ ] Índices creados correctamente

### Fase 4: Manual (en PAPER)
**Pasos:**
1. Crear decisión ENTER manualmente via API
2. Verificar TradeExecution.create()
3. Ejecutar orden en Alpaca
4. Verificar brokerOrderId + status
5. Esperar fill (10-30s en Alpaca)
6. Verificar P&L

### Fase 5: Idempotencia (nuevo)
**Tests específicos:**
```
✓ Procesar fill 2x con mismo (orderId, qty, price, timestamp) → 1 ExecutionEvent
✓ Procesar fill 5x → P&L no multiplicado
✓ Webhook retry: mismo evento enviado 3x → no duplica P&L
✓ brokerResponse immutable: intento update → error o noop
✓ executionMode NOT NULL: crear sin especificar → error validation
```

### Fase 6: Error Handling (nuevo)
**Escenarios:**
```
✓ linkExecutionToDecision() falla → retry 3x
✓ Tras 3 fallos → decision marcada SKIPPED
✓ Tras 24h sin ejecución → decision marcada SKIPPED (timeout)
✓ Fallo en Caja Negra NO detiene Tito (próxima decisión procesa)
✓ AlertaGuardian si >3 fallos consecutivos
```

---

## 📝 DOCUMENTACIÓN REQUERIDA

1. **README técnico:** Cómo TradeExecution vincula Decisión ↔ Broker ↔ Resultado
2. **Comentarios en código:** FKs, invariantes (tradeId único), salvaguardas
3. **Runbook:** "Cómo auditar un trade de punta a punta" (traceId → events)
4. **Schema diagram:** Relaciones Etapa 1 + Etapa 2

---

## ⏱️ ESTIMACIÓN ESFUERZO

| Tarea | Horas |
|-------|-------|
| Diseño + este documento | ✅ Hecho |
| 2 entidades + migrations | 2h |
| TradeExecutionService (250 líneas) | 3h |
| ExecutionEngine integration | 1.5h |
| AlpacaExecutor integration | 1h |
| Tests unitarios (30+) | 4h |
| Tests integración (20+) | 3h |
| Manual testing + debugging | 2h |
| Documentación + README | 1.5h |
| **TOTAL** | **~18h** |

---

## 🎯 CRITERIO DE GO / NO-GO

### ✅ GO si:
- [ ] Todos los tests pasan (50+ tests)
- [ ] FKs validadas en BD
- [ ] Reintentos deduplicados correctamente
- [ ] P&L calculado precisamente (verificar manual vs. Alpaca)
- [ ] Decisiones inmutables confirmadas (no pueden ser modificadas)

### 🔴 NO-GO si:
- [ ] Trades duplicados detectados
- [ ] FKs no creados correctamente
- [ ] Migraciones fallan en BD real
- [ ] P&L diverge de Alpaca
- [ ] Tests <90% pass rate

---

## 📞 PRÓXIMOS PASOS (ESPERAR AUTORIZACIÓN)

1. **Revisión especificación** — ¿Apruebas arquitectura?
2. **Confirmación precondiciones** — ¿Etapa 1 está completa?
3. **Autorización implementación** — ¿Procedo a código?
4. **Ejecución** — Crear entidades, servicios, migraciones, tests
5. **Validación** — Ejecutar manual testing en PAPER
6. **Etapa 3** — Apenas Etapa 2 cierre

---

**Estado:** 🟡 **AGUARDANDO REVISIÓN Y AUTORIZACIÓN**

**Fecha Especificación:** 2026-09-12  
**Especificado por:** Claude Haiku 4.5  
**Versión:** 1.0
