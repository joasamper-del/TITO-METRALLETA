---
name: fase_1_especificacion_formal
description: "FASE 1 FORMAL: R1, R9, R21 — Especificación exacta de alcance, archivos, criterios, rollback"
metadata:
  type: project
  status: 🟡 ESPECIFICACIÓN PARA AUDITORÍA PREVIA A AUTORIZACIÓN
  date: 2026-09-13
  author: Claude Haiku 4.5
  baseline: commit 44d4086 (Tarea 5 CLOSED)
---

# FASE 1: ESPECIFICACIÓN FORMAL

**Status:** 🟡 PARA AUDITORÍA VÍCTOR ANTES DE IMPLEMENTACIÓN  
**Baseline:** Commit `44d4086`  
**Requisitos a cubrir:** R1 (Spec Tarea 6) + R9 (Definición eventos) + R21 (Schema JSON)  
**Duración estimada:** 6-8 horas  
**Autorización requerida:** Víctor (ANTES de tocar código)

---

## I. ALCANCE EXACTO DE FASE 1

### Objetivo
Documentar especificaciones de Tarea 6, eventos automáticos y schema JSON **ANTES** de implementar código. Esto establece el "contrato" que guiará Fases 2-5.

### Lo que SÍ se hace en Fase 1
✅ **Documentación pura** (Markdown/TS types, sin generar código ejecutable)
✅ Crear 3 documentos especificados abajo
✅ Validar contra requisitos R1, R9, R21
✅ Presentar para auditoría Víctor

### Lo que NO se hace en Fase 1
❌ **Sin código funcional** (sin .service.ts implementando lógica)
❌ Sin tests (esos vienen Fases 2-5)
❌ Sin cambios a archivos existentes CP1/CP2/CP3/Tarea 4/SEATBELT
❌ Sin commit, push, merge, PR
❌ Sin Base de Datos (documentación no toca BD)

---

## II. ARCHIVOS PERMITIDOS EN FASE 1

### Crear (nuevos):

| Archivo | Directorio | Propósito | Líneas est. | Estatus |
|---------|-----------|----------|-----------|---------|
| **S70_TAREA6_SPECIFICATION.md** | Raíz `/` | Spec formal Tarea 6 | 100-150 | 🟡 A crear |
| **DEFINICION_EVENTOS_CAJA_NEGRA.md** | Raíz `/` | Enumeración eventos R9 | 80-120 | 🟡 A crear |
| **event.types.ts** | `backend/src/types/` | TypeScript interfaces (tipos puros) | 150-200 | 🟡 A crear |
| **event.schema.json** | `backend/src/schemas/` | JSON Schema (validación) | 100-150 | 🟡 A crear |

**Total: 4 archivos, 430-620 líneas de documentación/tipos**

### Modificar (existentes):
❌ **NINGUNO** — Fase 1 no toca archivos existentes

### Prohibidos absolutamente:
❌ `backend/src/modules/` (reservado para Fase 2+)
❌ `backend/src/config/` (SEATBELT/integración, Fase 2.6)
❌ `backend/src/services/` (lógica operativa, Fases 2-5)
❌ `backend/src/entity/` / `migrations/` (BD, Fases 2-5)
❌ Cualquier archivo fuera del scope R1, R9, R21

---

## III. ESPECIFICACIÓN DETALLADA POR REQUISITO

### R1: Especificación formal Tarea 6
**Archivo:** `S70_TAREA6_SPECIFICATION.md`

**Contenido (secciones requeridas):**

#### 1.1 Resumen ejecutivo
- Propósito: "Evaluar si cadena opciones es líquida"
- Fórmulas exactas: disparidad OI/premium vs 5d histórico, umbral 40%, liquidez < 60%
- Integración: Gate 3 SEATBELT (bloquea si falla)

#### 1.2 Definición de "liquidez"
- Parámetro 1: Disparidad vs líderes del sector (5d histórico)
- Parámetro 2: Promedio 5d vs datos actuales
- Cálculo: `disparidad% = abs(actual - avg5d) / avg5d * 100`
- Umbrales: ≤ 40% = OK, > 40% = "datos no fiables"
- Liquidez: ≥ 60% del promedio 5d = OK, < 60% = "no fiable"

#### 1.3 Casos numéricos (6 casos, C1-C6)
**C1: SPY liquidez OK**
- OI: 100,000 contratos
- Premium actual: $50,000
- Premium 5d avg: $48,000
- Disparidad: (50k-48k)/48k = 4.17% → ✅ PASS (< 40%)
- Liquidez: 50k/48k = 104% → ✅ PASS (> 60%)
- Resultado: `{pass: true, reason: "Liquidez normal"}`

**C2: SPY liquidez NO FIABLE (disparidad alta)**
- OI: 100,000 contratos
- Premium actual: $30,000
- Premium 5d avg: $50,000
- Disparidad: (30k-50k)/50k = -40% → ❌ FAIL (| | > 40%)
- Resultado: `{pass: false, reason: "Liquidez insuficiente (disparidad 40%)"}`

**C3-C6: Casos adicionales** (QQQ, TSLA, con distintos escenarios)

#### 1.4 Anti-patterns (5+)
- **A1:** Confundir liquidez con precio (no validar disparidad)
- **A2:** Usar ask en vez bid (Massive solo da bid)
- **A3:** Asumir histórico 5d sin verificar disponibilidad
- **A4:** No fail-closed si histórico falta
- **A5:** Hardcodear umbral 40% sin configurabilidad

#### 1.5 Integración SEATBELT Gate 3
- Precondición: `evaluateLiquidity(segmentationData) → {pass, reason}`
- En Gate 3: `if (!liquidityGate.pass) return HOLD`
- Mensaje: "Liquidez insuficiente: [reason]"
- Bloquea operación completamente

#### 1.6 Criterio de cierre (R1)
✅ **PASS si:**
- Documento > 2 páginas
- 6 casos numéricos con resultados exactos
- 5+ anti-patterns documentados
- Integración SEATBELT clara
- Aprobado por Víctor

❌ **FAIL si:**
- Fórmulas contradictorias
- Casos numéricos inexactos (±0.01% tolerancia máximo)
- Falta integración SEATBELT
- Ambigüedad en definición "liquidez"

---

### R9: Definición exhaustiva de eventos
**Archivo:** `DEFINICION_EVENTOS_CAJA_NEGRA.md`

**Contenido (secciones requeridas):**

#### 9.1 Enumeración de eventos (15+ total)
**Evento 1: Trade Close**
- Disparador: `position.status = CLOSED`
- Contexto requerido: entry_price, entry_time, exit_price, exit_time, P&L, reason_close, final_greeks
- Timestamp: EN el cierre, µs preciso
- Ejemplo JSON: {event_type: "trade_close", symbol: "SPY", entry_price: 420.50, …}

**Evento 2: Order Fail**
- Disparador: `order.status = REJECTED || CANCELLED`
- Contexto: order_id, reason_code, price_intent, timestamp, market_state
- Timestamp: EN el rechazo
- Ejemplo: {event_type: "order_fail", order_id: "123", reason: "INSUFFICIENT_LIQUIDITY"}

**Evento 3: Loss of Traceability**
- Disparador: `data_critical MISSING` (precio, griegos, OI desaparece)
- Contexto: last_known_values, time_data_lost, system_action (HOLD)
- Timestamp: EN la pérdida
- Ejemplo: {event_type: "loss_of_traceability", missing_field: "implied_volatility", …}

**Evento 4: Daily Summary**
- Disparador: `EOD (16:00 ET)`
- Contexto: posiciones_activas, trades_realizados, P&L_diario, eventos_contabilizados
- Timestamp: EOD exacto
- Ejemplo: {event_type: "daily_summary", date: "2026-09-13", total_PnL: "$1234", …}

**Evento 5: No-Op Explanation**
- Disparador: `HOLD decision` (operación NO ocurre)
- Contexto: razón_HOLD, contexto_mercado, timestamp
- Timestamp: EN la decisión HOLD
- Ejemplo: {event_type: "no_op", reason: "LIQUIDITY_GATE_FAIL", …}

**Evento 6: Critical Anomaly**
- Disparador: `IV > 500% || precio jump > 10% || OI inverse súbita`
- Contexto: anomaly_type, values, threshold, system_response (FAIL/HOLD)
- Timestamp: EN la detección
- Ejemplo: {event_type: "anomaly", type: "IV_SPIKE", current_IV: 550%, threshold: 500%, …}

**Eventos 7-15: [Adicionales, especificados similarmente]**

#### 9.2 Matriz eventos vs contexto
| Evento | Timestamp requerido | Precio | Griegos | OI | Razón | Integración |
|--------|---|---|---|---|---|---|
| Trade Close | ✅ µs | ✅ | ✅ | ✅ | ✅ | Execution |
| Order Fail | ✅ µs | ✅ | - | - | ✅ | Alpaca API |
| Loss of Traceability | ✅ µs | - | - | - | ✅ | Guardian |
| Daily Summary | ✅ µs | ✅ | ✅ | ✅ | - | EOD schedule |
| No-Op | ✅ µs | ✅ | ✅ | ✅ | ✅ | SEATBELT |
| Anomaly | ✅ µs | ✅ | ✅ | ✅ | ✅ | Guardian |

#### 9.3 Criterio de cierre (R9)
✅ **PASS si:**
- 15+ eventos enumerados
- Cada evento: disparador, contexto, timestamp, ejemplo JSON
- Integración clara (sistemas existentes: Execution, Guardian, SEATBELT, etc.)
- Matriz completa eventos vs contexto
- Aprobado por Víctor

❌ **FAIL si:**
- Menos de 15 eventos
- Evento sin contexto claro
- Falta integración con sistemas existentes
- Ambigüedad en disparadores

---

### R21: Schema JSON para eventos
**Archivos:** `event.types.ts` + `event.schema.json`

**event.types.ts (TypeScript):**

```typescript
// Base interfaces (types puros, sin lógica)

export interface EventTimestamp {
  datetime: string; // ISO 8601
  microseconds: number; // 0-999999
  verifiable_vs_market: boolean; // marcado si ±1µs validado
}

export interface EventContext {
  timestamp: EventTimestamp;
  symbol: string;
  market_state?: {
    spot_price?: number;
    implied_volatility?: number;
    open_interest?: number;
  };
  action_taken?: string; // descripción operación
  reason?: string;
}

export interface EventBase {
  event_type: 'trade_close' | 'order_fail' | 'loss_of_traceability' | 'daily_summary' | 'no_op' | 'anomaly';
  context: EventContext;
}

export interface TradeCloseEvent extends EventBase {
  event_type: 'trade_close';
  entry: { price: number; time: EventTimestamp };
  exit: { price: number; time: EventTimestamp };
  pnl: number;
  reason_close: string;
  final_greeks?: { delta: number; gamma: number; theta: number; vega: number };
}

export interface OrderFailEvent extends EventBase {
  event_type: 'order_fail';
  order_id: string;
  reason_code: string; // "INSUFFICIENT_LIQUIDITY", "PRICE_MOVE", etc.
  price_intended: number;
}

// [Interfaces similares para otros eventos]

export type CajaNegrEvent = TradeCloseEvent | OrderFailEvent | /* ... */;
```

**event.schema.json (JSON Schema):**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Caja Negra Event",
  "type": "object",
  "properties": {
    "event_type": {
      "enum": ["trade_close", "order_fail", "loss_of_traceability", "daily_summary", "no_op", "anomaly"]
    },
    "context": {
      "type": "object",
      "properties": {
        "timestamp": {
          "type": "object",
          "properties": {
            "datetime": { "type": "string", "format": "date-time" },
            "microseconds": { "type": "integer", "minimum": 0, "maximum": 999999 }
          },
          "required": ["datetime", "microseconds"]
        },
        "symbol": { "type": "string" }
      },
      "required": ["timestamp"]
    }
  },
  "required": ["event_type", "context"],
  "additionalProperties": true
}
```

#### 21.3 Criterio de cierre (R21)
✅ **PASS si:**
- TypeScript interfaces compilables (npm build ✅)
- JSON Schema valida contra interfaces
- Ejemplo eventos válidos contra schema
- Sin errores TypeScript

❌ **FAIL si:**
- Errores TS en interfaces
- Schema incompatible con R9 contexto requerido
- Falta campo obligatorio

---

## IV. CRITERIOS PASS/FAIL/HOLD

### PASS (Fase 1 OK → Autorizar Fase 2)
✅ R1 = PASS (spec íntegra, 6 casos exactos, 5+ anti-patterns)
✅ R9 = PASS (15+ eventos, contexto claro, matriz completa)
✅ R21 = PASS (types TS + schema JSON compilables y válidos)
✅ Documentación completa, aprobada Víctor

**Acción:** Autorizar Fase 2 inmediatamente

---

### HOLD (Incompleto → Ajustes, re-auditoría)
⚠️ Uno o más requisitos incompletos:
- R1: casos numéricos inexactos, anti-patterns insuficientes
- R9: menos de 15 eventos, faltan contextos
- R21: errores TS, schema incompatible

**Acción:** Solicitar ajustes específicos, re-auditar, reiterar Fase 1

---

### FAIL (Defecto conceptual → No proceder)
❌ Concepto fundamental incorrecto:
- Definición "liquidez" contradictoria
- Eventos no identificables automáticamente
- Schema incompatible con infraestructura existente

**Acción:** Revertir a baseline 44d4086, redefinir concepto, re-hacer Fase 1

---

## V. PRUEBAS REQUERIDAS

**Validación Spec Tarea 6 (R1):**
- ✅ Casos C1-C6: validación manual aritmética exacta
- ✅ Anti-patterns A1-A5: verificar cada uno está documentado
- ✅ Integración SEATBELT: trazar cómo `liquidityGate.pass → Gate3`

**Validación Definición eventos (R9):**
- ✅ 15+ eventos enumerados
- ✅ Cada evento tiene disparador + contexto + ejemplo
- ✅ Matriz eventos vs contexto completa

**Validación Schema (R21):**
- ✅ `npm build` en `backend/src/types/` → sin errores TS
- ✅ `npm build` en `backend/src/schemas/` → JSON válido
- ✅ Schema valida ejemplo eventos (manual o con `json-schema` CLI)

**No se ejecutan tests** (esos vienen Fase 2+)

---

## VI. EVIDENCIA DE CIERRE

Cuando Fase 1 esté lista:

**Entregables:**
1. ✅ `S70_TAREA6_SPECIFICATION.md` (100-150 líneas, 6 casos, 5+ patterns)
2. ✅ `DEFINICION_EVENTOS_CAJA_NEGRA.md` (80-120 líneas, 15+ eventos, matriz)
3. ✅ `backend/src/types/event.types.ts` (150-200 líneas, compilables)
4. ✅ `backend/src/schemas/event.schema.json` (100-150 líneas, válido)

**Evidencia de validación:**
- ✅ npm build output: "✅ No errors in types/"
- ✅ Casos C1-C6 validados manualmente (aritmética)
- ✅ 15+ eventos listados (conteados)
- ✅ Comentario Víctor: "Aprobado" o "Ajustes menores"

**Estado VCS:**
- 4 archivos nuevos en staging
- NO commits ni pushes hasta Autorización Fase 2

---

## VII. ROLLBACK

**Si Fase 1 FAIL (concepto incorrecto):**

```bash
git reset --hard 44d4086
# Volver a estado limpio Tarea 5 CLOSED
# Re-definir concepto, re-hacer Fase 1
```

**Si Fase 1 HOLD (ajustes):**

```bash
# Mantener archivos en WD
# Solicitar ajustes específicos
# No revertir, no commit aún
```

---

## VIII. AUTORIZACIÓN REQUERIDA

**Antes de crear primer archivo:**
- ✅ Víctor aprueba esta especificación formal (FASE_1_ESPECIFICACION_FORMAL.md)
- ✅ Víctor confirma: "OK, procede con Fase 1"

**Antes de pasar a Fase 2:**
- ✅ R1, R9, R21 todos PASS
- ✅ Auditoría Víctor completa: "Aprobado, procede Fase 2"

---

## CONCLUSIÓN

Fase 1 es documentación pura, sin código ejecutable.
Establece el contrato que guiará Fases 2-5.
Requiere aprobación explícita Víctor antes y después.

**Status:** 🟡 ESPERANDO AUDITORÍA Y AUTORIZACIÓN VÍCTOR

---

**Permanece en HOLD: NO archivos creados, NO commits, hasta "OK, procede con Fase 1"**

