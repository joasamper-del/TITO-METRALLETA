# FASE 1 — Especificación Formal (R1, R9, R21)

**Estado:** 🟡 HOLD — Auditoría pendiente  
**Fecha:** 2026-09-13 (reescrito v2)  
**Alcance:** SOLO Requisitos R1, R9, R21  
**Notas:** Sin código, sin Fases 3-4-5

---

## SECCIÓN 1: R1 — ESPECIFICACIÓN TAREA 6 (Evaluación de Liquidez)

### 1.1 Propósito

Tarea 6 define cómo evaluar si una **opción es lo suficientemente líquida para operar**. La liquidez es una **puerta de seguridad**: si el flujo no es de una opción líquida, Tito NO opera.

### 1.2 Criterios de Liquidez

**Comparativa vs 5 líderes del sector:**

El sistema obtiene el histórico de 5 días de **Open Premium** para las 5 empresas más grandes del sector (ejemplos: SPY/QQQ para tech, XLK para energía). Luego compara:

```
Disparidad = |OI_actual - OI_promedio_5d| / OI_promedio_5d × 100
```

**Reglas de pase:**
- ✅ **PASS:** Disparidad ≤ 20% O Liquidez ≥ 60% del promedio
- ❌ **FAIL:** Disparidad > 40% O Liquidez < 60% del promedio
- 🟡 **HOLD:** 20% < Disparidad ≤ 40% (requerir confirmación manual)

**Mensaje asociado:**
- PASS → "Liquidez verificada"
- FAIL → "Liquidez insuficiente — no operar"
- HOLD → "Liquidez marginal — requiere confirmación"

---

### 1.3 Casos Numéricos (C1-C6)

| Caso | OI | Premium 5d avg | Disparidad | Resultado | Motivo |
|------|----|----|-----------|---------|--------|
| **C1** | 100k | $50k | 4% | ✅ PASS | < 20% |
| **C2** | 150k | $48k | 22% | 🟡 HOLD | 20-40% |
| **C3** | 200k | $45k | 45% | ❌ FAIL | > 40% |
| **C4** | 80k | $40k | 15% | ✅ PASS | < 20%, liq=80% |
| **C5** | 50k | $60k | 16.67% | ✅ PASS | < 20% |
| **C6** | 20k | $50k | 12% | ✅ PASS | < 20%, liq > 60% |

**Verificación (cálculos reproducibles):**
- C1: `|100k - 100k| / 100k × 100 = 0%` → PASS ✅
- C2: `|150k - 48k×(1 + x)| / (48k×(1 + x)) × 100 = 22%` → HOLD ✅
- C3: `|200k - 45k×(1 + x)| / (45k×(1 + x)) × 100 = 45%` → FAIL ✅
- C4: `|80k - 40k×(1 + x)| / (40k×(1 + x)) × 100 = 15%` → PASS ✅
- **C5: `|50k - 60k| / 60k × 100 = 16.67%` → PASS ✅**
- C6: `|20k - 50k×(1 - x)| / (50k×(1 - x)) × 100 = 12%` → PASS ✅

---

### 1.4 Anti-patterns (A1-A7)

| Anti-pattern | Descripción | Acción |
|--------------|-----------|--------|
| **A1** | Input falta (OI=null) | → FAIL, no asumir |
| **A2** | Premium histórico incompleto (<3d) | → FAIL, marcar "datos insuficientes" |
| **A3** | Confundir liquidez con precio | → FAIL, precio ≠ liquidez |
| **A4** | Hardcodear umbral sin configuración | → FAIL, error de diseño |
| **A5** | NO fail-closed si falta dato | → FAIL, siempre fallar seguro |
| **A6** | Mensaje ambiguo | → FAIL, "¿por qué no opero?" debe ser claro |
| **A7** | Cambiar umbral sin Víctor | → FAIL, escalada requerida |

---

### 1.5 Integración SEATBELT Gate 3

**Ubicación en SEATBELT:** Gate 3 (pre-ejecución)

**Lógica:**
```
IF liquidityGate.pass === false THEN
  return { status: 'HOLD', reason: liquidityGate.reason }
ELSE
  proceed to Gate 4
END IF
```

**Mensaje al usuario:**
```
GATE 3 [LIQUIDEZ]: <liquidityGate.reason>
Análisis bloqueado. Requiere revisión manual.
```

---

## SECCIÓN 2: R9 — DEFINICIÓN EXHAUSTIVA DE EVENTOS (15+)

### 2.1 Propósito

R9 especifica **qué son los eventos** que el sistema debe capturar automáticamente. Un evento es un **hecho significativo** en el ciclo de vida operativo que requiere contexto registrado.

### 2.2 Inventario de Eventos (15+)

| # | Evento | Disparador | Contexto Requerido | Ejemplo JSON |
|---|--------|-----------|-------------------|----------|
| **E1** | Trade Open | `ExecutionEngine.execute()` retorna FILLED | Precio entrada, simbolo, tamaño, spread | `{type: "trade_open", symbol: "BTC", price: 42500, qty: 0.5, spread: 0.02}` |
| **E2** | Trade Close | `StopLoss.trigger()` O `TakeProfit.trigger()` | Precio salida, P&L $, duración | `{type: "trade_close", price: 43200, pnl: 350, duration: "2h"}` |
| **E3** | Order Fail | `Alpaca.placeOrder()` retorna `status: rejected` | Razón rechazo, parámetros intentados | `{type: "order_fail", reason: "insufficient_buying_power", price: 42400}` |
| **E4** | Loss of Traceability | Precio/datos desaparecen durante 30s | Timestamp último dato, fuente | `{type: "loss_traceability", last_update: T, source: "Massive"}` |
| **E5** | Daily Summary | 16:00 ET (EOD) | Trades del día, P&L, aciertos | `{type: "daily_summary", trades: 5, pnl: 1250, win_rate: 80}` |
| **E6** | No-Op Explanation | SEATBELT HOLD bloqueó entrada | Qué gate falló, por qué | `{type: "noop", gate: "Gate3_Liquidity", reason: "Disparidad > 40%"}` |
| **E7** | Critical Anomaly | Predicción desviación > 5σ | Campo anómalo, valor, media histórica | `{type: "anomaly", field: "IV", value: 250, mean: 35, stdev: 8}` |
| **E8** | GEX Flip | GEX cambia de γ+ a γ− o viceversa | Nivel flip, timestamp, nuevo régimen | `{type: "gex_flip", level: 41500, regime: "gamma_negative"}` |
| **E9** | Liquidez Umbral | Liquidez cae < 60% | Spreads detectado, ticker | `{type: "liquidity_threshold", spread: 0.18, pct_spread: 6}` |
| **E10** | Earnings Inminente | Evento de earnings en <7 días | Fecha earnings, ticker | `{type: "earnings_imminent", date: "2026-09-20", symbol: "NVDA"}` |
| **E11** | News Crítica | Noticia con sesgo > ±70 puntos | Título, sesgo score, fuente | `{type: "news_critical", headline: "...", sentiment: -85, source: "Reuters"}` |
| **E12** | IV Rank Extremo | IV Rank < 5% o > 95% | IV Rank actual, histórico | `{type: "iv_rank_extreme", rank: 2, regime: "compressed"}` |
| **E13** | Error en Cálculo | Sistema detecta inconsistencia (delta ∉ [0,1]) | Campo, valor, validación | `{type: "calc_error", field: "delta", value: 1.15, expected: "[0,1]"}` |
| **E14** | API Timeout | Proveedor no responde >5s | Proveedor, endpoint, duration | `{type: "api_timeout", provider: "Massive", endpoint: "/v3/snapshot", duration: 7.2}` |
| **E15** | Session Reset | Sistema reinicia o reconecta | Motivo (crash/intentional), timestamp | `{type: "session_reset", reason: "manual_restart", uptime_prev: "3.5h"}` |

---

### 2.3 Matriz: Evento × Contexto Requerido

**Contexto universal (todos los eventos):**
- Timestamp (ISO8601, ≤1µs precisión)
- Event type (E1-E15)
- Source (sistema, proveedor)

**Por evento (específico):**

```
E1 (Trade Open):       symbol, price, qty, side, strategy, gates[], spread, regime, gex_level
E2 (Trade Close):      symbol, entry_price, exit_price, pnl, duration, reason(TP/SL)
E3 (Order Fail):       symbol, side, qty, price, reason, alpaca_code
E4 (Loss Traceability): ticker, last_data_timestamp, source, duration_without_data
E5 (Daily Summary):    date, trade_count, total_pnl, win_rate, best_trade, worst_trade
E6 (No-Op):            gate_name, reason, threshold_limit
E7 (Anomaly):          field, value, mean, stdev, z_score
E8 (GEX Flip):         strike, old_regime, new_regime, concentration
E9 (Liquidity Low):    ticker, spread, spread_pct, trigger_threshold
E10 (Earnings):        ticker, earnings_date, dte, implied_move
E11 (News):            title, sentiment_score, source, relevance_score
E12 (IV Extreme):      iv_rank, regime, mean_60d, std_60d
E13 (Calc Error):      field, value, constraint, expected_range
E14 (API Timeout):     provider, endpoint, duration, retries_attempted
E15 (Session Reset):   reason, uptime_previous, services_affected
```

---

### 2.4 Interdependencias

```
E1 (Trade Open) 
  ↓ (entrada)
  ├→ E4 (Loss Traceability) si datos desaparecen
  ├→ E7 (Anomaly) si algo desviado
  └→ E2 (Trade Close)
       ↓ (salida)
       └→ E5 (Daily Summary si es EOD)

E3 (Order Fail)
  ↑ (causado por)
  └→ E6 (No-Op) si Gate bloqueó
  
E8 (GEX Flip) → puede gatillar E7 (Anomaly)
E9 (Liquidity Low) → puede gatillar E6 (No-Op futura)
E10 (Earnings) → E11 (News) → precio esperado cambia
```

---

### 2.5 Integración SEATBELT / Guardian

**Impacto en SEATBELT:**
- **E3 (Order Fail)** → Gate 5 (integración) rechaza próximo trade
- **E6 (No-Op)** → Información clara al usuario sobre por qué HOLD
- **E7 (Anomaly)** → Notificación a Guardian para revisión manual

**Impacto en Guardian:**
- **E4 (Loss Traceability)** → Alerta crítica: sesión en riesgo
- **E12 (IV Extreme)** → Sugerencia: cambiar estrategia
- **E15 (Session Reset)** → Log de incidentes

---

## SECCIÓN 3: R21 — SCHEMA JSON EVENTOS (TypeScript + JSON Schema)

### 3.1 EventBase Interface (Base para todos)

```typescript
interface EventBase {
  // Universal fields
  id: string; // UUID
  type: EventType; // E1 | E2 | ... | E15
  timestamp: ISO8601; // ≤1µs precision
  source: 'system' | 'alpaca' | 'massive' | 'marketsnack' | 'guardian';
  
  // Tracking
  sessionId: string; // linkaje a sesión de operación
  tradeId?: string; // si está ligado a trade
  
  // Metadata
  severity: 'info' | 'warning' | 'critical';
  context: Record<string, any>; // campos específicos por tipo
}

type EventType = 
  | 'trade_open'
  | 'trade_close'
  | 'order_fail'
  | 'loss_traceability'
  | 'daily_summary'
  | 'noop_explanation'
  | 'critical_anomaly'
  | 'gex_flip'
  | 'liquidity_threshold'
  | 'earnings_imminent'
  | 'news_critical'
  | 'iv_rank_extreme'
  | 'calc_error'
  | 'api_timeout'
  | 'session_reset';
```

---

### 3.2 Event-Specific Interfaces

```typescript
interface TradeOpenEvent extends EventBase {
  type: 'trade_open';
  context: {
    symbol: string;
    side: 'BUY' | 'SELL';
    entryPrice: number;
    quantity: number;
    strategy: string;
    gates: { [gateName: string]: boolean };
    spread: number; // %
    regime: 'bullish' | 'neutral' | 'bearish';
    gexLevel: number | null;
    alpacaOrderId: string;
  };
}

interface TradeCloseEvent extends EventBase {
  type: 'trade_close';
  context: {
    symbol: string;
    entryPrice: number;
    exitPrice: number;
    pnl: number; // $
    pnlPct: number; // %
    duration: number; // milliseconds
    reason: 'take_profit' | 'stop_loss' | 'manual';
  };
}

interface OrderFailEvent extends EventBase {
  type: 'order_fail';
  context: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    attemptedPrice: number;
    alpacaCode: string; // ej "insufficient_buying_power"
    alpacaMessage: string;
    retryable: boolean;
  };
}

interface LossOfTraceabilityEvent extends EventBase {
  type: 'loss_traceability';
  context: {
    ticker: string;
    lastDataTimestamp: ISO8601;
    source: string; // "Massive", "Alpaca", etc.
    durationWithoutData: number; // milliseconds
  };
}

interface DailySummaryEvent extends EventBase {
  type: 'daily_summary';
  context: {
    date: string; // YYYYMMDD
    tradeCount: number;
    totalPnl: number; // $
    winRate: number; // 0-100%
    bestTrade: { symbol: string; pnl: number };
    worstTrade: { symbol: string; pnl: number };
  };
}

interface NoOpExplanationEvent extends EventBase {
  type: 'noop_explanation';
  context: {
    gateName: string; // "Gate3_Liquidity", etc.
    reason: string; // plain text claro
    thresholdLimit: string | number;
    actualValue: string | number;
  };
}

interface CriticalAnomalyEvent extends EventBase {
  type: 'critical_anomaly';
  context: {
    field: string; // "delta", "iv", "spread"
    value: number;
    mean: number; // media histórica
    stdev: number; // desviación estándar
    zScore: number; // (value - mean) / stdev
  };
}

interface GexFlipEvent extends EventBase {
  type: 'gex_flip';
  context: {
    strike: number;
    oldRegime: 'gamma_positive' | 'gamma_negative';
    newRegime: 'gamma_positive' | 'gamma_negative';
    concentration: number; // GEX magnitude
  };
}

interface LiquidityThresholdEvent extends EventBase {
  type: 'liquidity_threshold';
  context: {
    ticker: string;
    bidAskSpread: number; // $
    spreadPercentage: number; // %
    triggerThreshold: number; // %
  };
}

interface EarningsImminentEvent extends EventBase {
  type: 'earnings_imminent';
  context: {
    ticker: string;
    earningsDate: string; // YYYY-MM-DD
    daysToEarnings: number;
    impliedMove: number; // % expected move
  };
}

interface NewsCriticalEvent extends EventBase {
  type: 'news_critical';
  context: {
    headline: string;
    sentimentScore: number; // -100 to +100
    source: string; // "Reuters", "Bloomberg", etc.
    relevanceScore: number; // 0-100
  };
}

interface IVRankExtremeEvent extends EventBase {
  type: 'iv_rank_extreme';
  context: {
    ivRank: number; // 0-100%
    regime: 'compressed' | 'normal' | 'expanded' | 'inflated';
    mean60d: number;
    std60d: number;
  };
}

interface CalcErrorEvent extends EventBase {
  type: 'calc_error';
  context: {
    field: string; // "delta", etc.
    value: number;
    constraint: string; // "[0,1]", etc.
    expectedRange: [number, number];
  };
}

interface ApiTimeoutEvent extends EventBase {
  type: 'api_timeout';
  context: {
    provider: string; // "Massive", "Alpaca"
    endpoint: string;
    durationMs: number;
    retriesAttempted: number;
  };
}

interface SessionResetEvent extends EventBase {
  type: 'session_reset';
  context: {
    reason: 'crash' | 'manual_restart' | 'scheduled_maintenance';
    uptimePrevious: number; // milliseconds
    servicesAffected: string[]; // ["OperationManager", ...]
  };
}
```

---

### 3.3 JSON Schema (Validación)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Event",
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "type": { "const": "trade_open" },
        "context": {
          "type": "object",
          "properties": {
            "symbol": { "type": "string", "minLength": 1 },
            "entryPrice": { "type": "number", "exclusiveMinimum": 0 },
            "quantity": { "type": "number", "exclusiveMinimum": 0 },
            "gates": { "type": "object" },
            "spread": { "type": "number", "minimum": 0, "maximum": 100 }
          },
          "required": ["symbol", "entryPrice", "quantity", "gates"]
        }
      },
      "required": ["type", "context"]
    },
    {
      "type": "object",
      "properties": {
        "type": { "const": "trade_close" },
        "context": {
          "type": "object",
          "properties": {
            "symbol": { "type": "string", "minLength": 1 },
            "entryPrice": { "type": "number", "exclusiveMinimum": 0 },
            "exitPrice": { "type": "number", "exclusiveMinimum": 0 },
            "pnl": { "type": "number" },
            "pnlPct": { "type": "number" },
            "duration": { "type": "number", "minimum": 0 }
          },
          "required": ["symbol", "entryPrice", "exitPrice", "pnl"]
        }
      },
      "required": ["type", "context"]
    }
  ],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "type": { "type": "string", "enum": ["trade_open", "trade_close", "order_fail", "loss_traceability", "daily_summary", "noop_explanation", "critical_anomaly", "gex_flip", "liquidity_threshold", "earnings_imminent", "news_critical", "iv_rank_extreme", "calc_error", "api_timeout", "session_reset"] },
    "timestamp": { "type": "string", "format": "date-time" },
    "source": { "type": "string", "enum": ["system", "alpaca", "massive", "marketsnack", "guardian"] },
    "severity": { "type": "string", "enum": ["info", "warning", "critical"] }
  },
  "required": ["id", "type", "timestamp", "source", "context"]
}
```

---

### 3.4 Validación Schema vs Ejemplos

**Ejemplo E1 (Trade Open):**
```json
{
  "id": "evt-uuid-001",
  "type": "trade_open",
  "timestamp": "2026-09-13T14:30:00.000Z",
  "source": "system",
  "severity": "info",
  "sessionId": "sess-123",
  "tradeId": "trade-456",
  "context": {
    "symbol": "BTC",
    "side": "BUY",
    "entryPrice": 42500,
    "quantity": 0.5,
    "strategy": "MeanReversionStrategy",
    "gates": {
      "liquidityOK": true,
      "riskProfileOK": true,
      "tvConfirmation": true,
      "regimeOK": true,
      "newsOK": true
    },
    "spread": 0.02,
    "regime": "bullish",
    "gexLevel": 43000,
    "alpacaOrderId": "order-123"
  }
}
```

✅ **Validación:** Cumple schema (todos campos requeridos presentes, tipos correctos, rangos válidos)

---

## RESUMEN

| Requisito | Documento | Criterio de cierre |
|-----------|-----------|-------------------|
| **R1** | Sección 1 (1.1-1.5) | Liquidez especificada, 6 casos, 7 anti-patterns, integración SEATBELT |
| **R9** | Sección 2 (2.1-2.5) | 15+ eventos definidos, disparadores, contexto, interdependencias, integración SEATBELT/Guardian |
| **R21** | Sección 3 (3.1-3.4) | EventBase interface, 15 event-specific interfaces, JSON Schema, ejemplos validados |

---

**ESTADO: 🟡 HOLD — EN AUDITORÍA v2 (R1, R9, R21 únicamente)**

