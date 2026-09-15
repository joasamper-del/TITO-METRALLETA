# S70 SEATBELT — Plan de Implementación EXACTO

**Clasificación:** 🟡 OPCIÓN B (HOLD) — Plan detallado para revisión ANTES de implementar  
**Fecha:** 2026-09-12  
**Aprobación Requerida:** Víctor y Jay  
**Status:** CERO CÓDIGO modificado — SIN AUTORIZACIÓN

---

## 📋 RESUMEN EJECUTIVO

- **Archivos NUEVOS:** 11
- **Archivos MODIFICADOS:** 3
- **Líneas NUEVAS:** +1,799
- **Líneas ELIMINADAS:** -25
- **Entities NUEVAS:** 1 (PreExecutionEvidence)
- **Servicios NUEVOS:** 6
- **Tests NUEVOS:** 64
- **Tiempo estimado:** 10-12 días
- **Bloqueo operacional:** Tito NO opera hasta todas inspecciones ✅

---

## 🔒 BLOQUEO OPERACIONAL DURANTE S70

**Garantía Víctor:**

```
MIENTRAS S70 IMPLEMENTACIÓN:
  ✅ SEATBELT_ENABLED = false (en .env.local)
  ✅ Tito NO ejecuta órdenes
  ✅ Supervisor watchdog activo (alerta si alguien intenta)
  ✅ Pre-ejecución checks BLOQUEADOS
  
DESPUÉS de S70 completado:
  ✅ 64 tests PASS (100%)
  ✅ Inspección código completada
  ✅ Inspección BD (migration tested)
  ✅ Inspección integración (ExecutionEngine + BrokerAdapter)
  ✅ Inspección seguridad (5 puntos críticos auditados)
  ✅ Inspección E2E (Paper Trading 1 semana)
  ✅ Aprobación explícita ANTES de cada etapa
  
ENTONCES (y SOLO ENTONCES):
  → SEATBELT_ENABLED = true
  → Tito arranca con SEATBELT activo
```

---

## 📂 ARCHIVOS — Desglose Completo

### **NUEVOS ARCHIVOS (11)**

#### **Backend Services (6 servicios)**

1. **`backend/src/modules/seatbelt/services/seatbelt.service.ts`** (+250 líneas)
   - Orquestador de los 5 gates
   - Método: `validate(order): SeatbeltResult`
   - Retorna: `{ allGatesPass, gates: [...], reason }`

2. **`backend/src/modules/seatbelt/services/gate1-market-health.service.ts`** (+180 líneas)
   - Valida: Mercado disponible, quote fresca, spread OK
   - Llamadas: Alpaca API getQuote()
   - Timeout: 5 segundos máximo

3. **`backend/src/modules/seatbelt/services/gate2-risk-boundary.service.ts`** (+200 líneas)
   - Valida: Size límite, risk $, drawdown, balance
   - Cálculos: Puros (sin BD)
   - Input: order.qty, order.price, account.balance, account.positions

4. **`backend/src/modules/seatbelt/services/gate3-decision-audit.service.ts`** (+150 líneas)
   - Valida: DecisionAuditTrail existe, confidence >= 60%, mercado matches
   - BD: Lee decision_audit_trail
   - Comparación: Timestamp, price ±2%, VIX ±10%

5. **`backend/src/modules/seatbelt/services/gate4-execution-engine.service.ts`** (+100 líneas)
   - Valida: Contrato válido, precio razonable, orderType soportado
   - Llamada: ExecutionEngine.validate(order)
   - Resultado: Booleano + errorList

6. **`backend/src/modules/seatbelt/services/gate5-broker-connectivity.service.ts`** (+200 líneas)
   - Valida: Broker en línea, quote actual, dry-run OK
   - Llamadas: Alpaca (quote + dryRun)
   - Retry: 3x con backoff exponencial

#### **Unit Tests (6 test files)**

7. **`backend/src/modules/seatbelt/services/seatbelt.service.spec.ts`** (+150 líneas)
   - 12 tests: orquestación, gate pass/fail, bypass detection

8. **`backend/src/modules/seatbelt/services/gate1-market-health.service.spec.ts`** (+180 líneas)
   - 15 tests: quote fresca, spread alto, mercado cerrado, timeout, retry

9. **`backend/src/modules/seatbelt/services/gate2-risk-boundary.service.spec.ts`** (+200 líneas)
   - 15 tests: size límite, drawdown, balance, edge cases

10. **`backend/src/modules/seatbelt/services/gate3-decision-audit.service.spec.ts`** (+120 líneas)
    - 10 tests: decision existe, confidence, mismatch, vieja

11. **`backend/src/modules/seatbelt/services/gate4-execution-engine.service.spec.ts`** (+80 líneas)
    - 8 tests: tipo válido, precio typo, orderType soportado

#### **Integration Tests**

12. **`backend/src/modules/seatbelt/seatbelt.integration.spec.ts`** (+200 líneas)
    - 9 tests: flujo completo, fail scenarios, bypass detection, PreExecutionEvidence

#### **Archivos Config**

13. **`backend/src/modules/seatbelt/seatbelt.module.ts`** (+80 líneas)
    - Registro de módulo
    - Inyección de servicios y dependencias

14. **`backend/src/modules/seatbelt/seatbelt.types.ts`** (+120 líneas)
    - TypeScript types/interfaces:
      - `SeatbeltGate { name, valid, reason }`
      - `SeatbeltResult { allGatesPass, gates[], reason }`
      - `GateFailure { gate, reason, timestamp }`

15. **`backend/src/modules/seatbelt/seatbelt.controller.ts`** (+80 líneas)
    - Endpoint DEBUG (admin only): POST /api/seatbelt/validate
    - Endpoint admin: GET /api/seatbelt/status

16. **`backend/src/modules/seatbelt/config/seatbelt.config.ts`** (+60 líneas)
    ```typescript
    export const SEATBELT_CONFIG = {
      ENABLED: process.env.SEATBELT_ENABLED === 'true',
      MAX_RISK_PER_TRADE: parseFloat(process.env.SEATBELT_MAX_RISK_PER_TRADE || '500'),
      MAX_ACCOUNT_RISK_PCT: parseFloat(process.env.SEATBELT_MAX_ACCOUNT_RISK_PCT || '2'),
      MAX_DRAWDOWN_PCT: parseFloat(process.env.SEATBELT_MAX_DRAWDOWN_PCT || '5'),
      MAX_POSITION_SIZE_CRYPTO: parseInt(process.env.SEATBELT_MAX_POSITION_SIZE_CRYPTO || '20'),
      // ... más parámetros
    };
    ```

17. **`backend/src/modules/seatbelt/migrations/CreatePreExecutionEvidenceTable.ts`** (+100 líneas)
    - Migration TypeORM
    - Crea tabla `pre_execution_evidence`
    - Índices: tradeId, timestamp, allGatesPass

---

### **ARCHIVOS MODIFICADOS (3)**

#### **1. ExecutionEngine Integration**

**Archivo:** `backend/src/modules/execution/execution.service.ts`

```typescript
// LÍNEA ~150 (dentro de execute() method):

async execute(order: Order): Promise<ExecutionResult> {
  
  // ← NUEVO: Validar SEATBELT ANTES de broker
  if (SEATBELT_CONFIG.ENABLED) {
    const seatbelt = await this.seatbeltService.validate(order);
    
    if (!seatbelt.allGatesPass) {
      throw new SeatbeltViolationError(seatbelt);
      // ← BLOQUEA orden, no ejecuta
    }
    
    // Guardar evidencia PRE-ejecución
    await this.evidenceService.save(order.tradeId, seatbelt);
  }
  
  // ← EXISTENTE: Ejecutar en broker (solo llega si SEATBELT OK)
  return await this.broker.placeOrder(order);
}
```

**Cambio:** +15 líneas de integración (dentro método existente)

---

#### **2. BrokerAdapter (ÚLTIMA FRONTERA)**

**Archivo:** `backend/src/config/adapters/broker.adapter.ts`

```typescript
// LÍNEA ~200 (dentro de placeOrder() method):

async placeOrder(order: Order): Promise<BrokerResult> {
  
  // ← NUEVO: Validar SEATBELT en última frontera (bypass detection)
  if (SEATBELT_CONFIG.ENABLED) {
    const evidence = await this.evidenceService.find(order.tradeId);
    
    if (!evidence) {
      throw new SeatbeltBypassError(
        "SEATBELT evidence missing", 
        { tradeId: order.tradeId }
      );
    }
    
    if (!evidence.allGatesPass) {
      throw new SeatbeltBypassError(
        "SEATBELT evidence not passed",
        { tradeId: order.tradeId }
      );
    }
    
    if (evidence.isExpired()) {
      throw new SeatbeltBypassError(
        "SEATBELT evidence expired (> 5 min)",
        { tradeId: order.tradeId }
      );
    }
    
    evidence.markConsumed(); // ← Anti-replay
  }
  
  // ← EXISTENTE: Llamar broker Alpaca
  return await this.alpacaClient.placeOrder(order);
}
```

**Cambio:** +25 líneas de validación bypass detection

---

#### **3. Database Entity (PreExecutionEvidence)**

**Archivo:** `backend/src/modules/database/entities/pre-execution-evidence.entity.ts`

**NUEVA ENTITY:**
```typescript
@Entity('pre_execution_evidence')
@Index(['tradeId'])
@Index(['allGatesPass'])
@Index(['createdAt'])
export class PreExecutionEvidence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 50 })
  tradeId!: string;

  @Column('varchar', { length: 100, nullable: true })
  orderIntentId?: string; // ← Anti-replay hash

  @Column('jsonb')
  gate1Result!: GateResult; // { healthy, reason, ... }

  @Column('jsonb')
  gate2Result!: GateResult; // { valid, violations, ... }

  @Column('jsonb')
  gate3Result!: GateResult; // { valid, confidence, ... }

  @Column('jsonb')
  gate4Result!: GateResult; // { valid, ... }

  @Column('jsonb')
  gate5Result!: GateResult; // { online, dryRunAccepted, ... }

  @Column('boolean')
  allGatesPass!: boolean; // ← Key field

  @Column('timestamp')
  validUntil!: Date; // ← Expiración 5 min

  @Column('boolean', { default: false })
  consumed!: boolean; // ← Anti-replay flag

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

---

### **MIGRATIONS (1)**

**Archivo:** `backend/src/migrations/1726229200000-CreatePreExecutionEvidenceTable.ts`

```typescript
export class CreatePreExecutionEvidenceTable implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pre_execution_evidence',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid' },
          { name: 'trade_id', type: 'varchar', length: 50 },
          { name: 'order_intent_id', type: 'varchar', length: 100, isNullable: true },
          { name: 'gate1_result', type: 'jsonb' },
          { name: 'gate2_result', type: 'jsonb' },
          { name: 'gate3_result', type: 'jsonb' },
          { name: 'gate4_result', type: 'jsonb' },
          { name: 'gate5_result', type: 'jsonb' },
          { name: 'all_gates_pass', type: 'boolean' },
          { name: 'valid_until', type: 'timestamp' },
          { name: 'consumed', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
        indices: [
          { columnNames: ['trade_id'] },
          { columnNames: ['all_gates_pass'] },
          { columnNames: ['created_at'] },
        ],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pre_execution_evidence');
  }
}
```

---

## 📊 RESUMEN DE CAMBIOS

| Categoría | Archivos | LOC Nuevas | LOC Borradas | Impacto |
|-----------|----------|-----------|--------------|---------|
| Servicios SEATBELT | 6 | +950 | 0 | Core |
| Tests | 6 | +750 | 0 | QA |
| Integración ExecutionEngine | 1 | +15 | 0 | Minimal |
| Integración BrokerAdapter | 1 | +25 | 0 | Minimal |
| Entity + Migration | 2 | +100 | 0 | DB |
| Config/Types | 3 | +260 | 0 | Setup |
| **TOTAL** | **17** | **+1,799** | **-25** | **Conservador** |

---

## 🔍 ARCHIVOS A AUDITAR

**Pre-GO Inspección Checklist:**

- [ ] `gate1-market-health.service.ts` — ¿Timeout < 5s? ¿Retry logic OK?
- [ ] `gate2-risk-boundary.service.ts` — ¿Fórmulas correctas? ¿Edge cases?
- [ ] `gate3-decision-audit.service.ts` — ¿BD queries correctas? ¿Comparación OK?
- [ ] `gate4-execution-engine.service.ts` — ¿Validaciones suficientes?
- [ ] `gate5-broker-connectivity.service.ts` — ¿Retry backoff OK?
- [ ] `execution.service.ts` (modificado) — ¿Integración correcta?
- [ ] `broker.adapter.ts` (modificado) — ¿Bypass detection airtight?
- [ ] `pre-execution-evidence.entity.ts` — ¿Schema correcto? ¿Índices?
- [ ] Migration — ¿Tested en staging?
- [ ] Tests (64 total) — ¿Todos PASS? ¿Coverage > 90%?

---

## 🚫 GARANTÍAS DE BLOQUEO

**Durante S70 implementación:**

```
Tito ESTÁ BLOQUEADO para operar:
  ├─ .env.local: SEATBELT_ENABLED = false
  ├─ Supervisor watchdog: Alerta si intenta ejecutar
  ├─ ExecutionEngine: Cheque hardcoded si SEATBELT=false
  └─ BrokerAdapter: NUNCA llama Alpaca sin SEATBELT OK

Tito recibe:
  ├─ DecisionAuditTrail normal ✅
  ├─ Análisis normal ✅
  ├─ Propuestas normales ✅
  └─ Pero: ZERO órdenes ejecutadas 🛑
```

---

## 🔓 DESBLOQUEO — 5 Inspecciones

**ANTES de `SEATBELT_ENABLED = true`, TODAS estas deben PASAR:**

### **Inspección 1: Tests (64 total)**
```bash
npm test -- --run seatbelt
Resultado: PASS (100%) o HOLD
```

### **Inspección 2: Código Estático**
```bash
npm run lint
npm run type-check
Resultado: 0 errores o HOLD
```

### **Inspección 3: BD Migration**
```bash
# En staging:
npm run db:migrate
# Verificar tabla exists + índices
Resultado: OK o ROLLBACK
```

### **Inspección 4: Integración (Mock Tests)**
```bash
npm test -- --run seatbelt.integration.spec.ts
Resultado: 9/9 PASS o HOLD
```

### **Inspección 5: E2E (Paper Trading)**
```
1 semana en Alpaca PAPER mode:
- 10+ trades con SEATBELT activo
- 0 sorpresas, 0 fallas
Resultado: APPROVED o ROLLBACK
```

**SIN las 5 inspecciones PASS:** NO hay LIVE.

---

## 📋 Secuencia de Implementación (S70)

### **Days 1-3: Fase 1 (Gates 1-3)**

```
Day 1:
  ├─ Crear estructura módulo seatbelt
  ├─ Implementar gate1-market-health.service.ts
  ├─ Escribir 15 tests (gate 1)
  └─ Tests PASS o FIX

Day 2:
  ├─ Implementar gate2-risk-boundary.service.ts
  ├─ Escribir 15 tests (gate 2)
  └─ Tests PASS

Day 3:
  ├─ Implementar gate3-decision-audit.service.ts
  ├─ Escribir 10 tests (gate 3)
  └─ Inspección parcial: 40 tests PASS
```

### **Days 4-5: Fase 2 (Gates 4-5 + Integración)**

```
Day 4:
  ├─ Implementar gate4-execution-engine.service.ts
  ├─ Implementar gate5-broker-connectivity.service.ts
  ├─ Escribir 8 + 20 tests
  └─ Tests PASS: 68 total

Day 5:
  ├─ Crear seatbelt.service.ts (orquestador)
  ├─ Integrar ExecutionEngine (modify +15 líneas)
  ├─ Integrar BrokerAdapter (modify +25 líneas)
  ├─ Escribir 12 tests (orquestación)
  └─ Tests PASS: 80 total
```

### **Days 6-7: Fase 3 (Integration + E2E)**

```
Day 6:
  ├─ Crear PreExecutionEvidence entity
  ├─ Crear migration
  ├─ Test migration en staging
  ├─ Escribir integration tests (9)
  └─ Tests PASS: 89 total

Day 7:
  ├─ Inspección código (lint, type-check)
  ├─ Refactor según feedback
  ├─ Finalize docs
  └─ Estado: READY FOR PAPER TRADING
```

### **Days 8-10: E2E (Paper Trading — Inspección 5)**

```
Day 8-14 (1 semana):
  ├─ SEATBELT_ENABLED = true (solo en PAPER)
  ├─ Ejecutar 10+ trades en Alpaca PAPER
  ├─ Monitor: Cada gate pass/fail
  ├─ Alert: Cualquier anomalía
  └─ Resultado: APPROVED o ROLLBACK

Si APPROVED:
  → Inspecciones 1-5 PASS ✅
  → Listo LIVE
  
Si ROLLBACK:
  → Investigar, fijar, re-test
  → Repetir días 8-10
```

---

## 🚨 Criterios GO/HOLD/NO-GO (Revisado)

### **GO (S70 → S71 LIVE)**

✅ Tests: 64+ total, 100% PASS  
✅ Code: 0 lint errors, 0 type errors  
✅ DB: Migration tested, OK  
✅ Integration: 9/9 integration tests PASS  
✅ E2E: 1 semana Paper Trading APPROVED  
✅ Auditoría: 5 puntos críticos verificados  
✅ Documentación: 100%

### **HOLD**

⚠️ Tests < 90% PASS  
⚠️ Lint errors encontrados  
⚠️ Migration falla en staging  
⚠️ E2E encuentra anomalía  
⚠️ Necesita reparación

### **NO-GO**

❌ Tests < 80% PASS  
❌ Bug crítico (bypass, fail-open, etc.)  
❌ Cierres quedan bloqueados  
❌ PreExecutionEvidence corrupta  
❌ Rollback y start over

---

## 📞 Control de Víctor Durante S70

**Checkpoints Diarios (sugerido):**

```
Days 1-3: Tests 40/64 PASS? Si no, HOLD
Days 4-5: Tests 80/64 PASS? Si no, HOLD
Days 6-7: Integration 9/9 PASS? Si no, HOLD
Days 8-14: Paper Trading anomalías? Si sí, HOLD
```

**Víctor da GO/NO-GO en cada checkpoint.**

---

## 🔐 Garantía Final Víctor

```
SI se aprueba S70:

✅ Tito NO OPERA hasta S70 completado
✅ Cero código modificado sin aprobación checkpoint
✅ 5 inspecciones ANTES de LIVE
✅ Rollback en 5 minutos si falla
✅ Todas las 5 protecciones críticas auditadas
✅ Documentación 100% antes GO final
```

---

## 📋 Checklist HOLD (Antes de IR a S70)

- [ ] Víctor revisa plan exacto ← AQUÍ
- [ ] Víctor confirma archivos a modificar
- [ ] Víctor verifica bloqueo operacional
- [ ] Víctor autoriza inspecciones (checkpoints)
- [ ] Jay revisa y da GO oficial
- [ ] Momento 0: SEATBELT_ENABLED = false
- [ ] S70 inicia Fase 1

---

**OPCIÓN B (HOLD) — LISTO PARA REVISAR. Esperando aprobación de Víctor y Jay antes de proceder.** 🚚

*No se modifica código hasta que firmen ambos.* ✅

