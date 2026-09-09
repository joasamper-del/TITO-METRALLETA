# S60: Validación Controlada del Módulo Cripto — Auditoría de Datos + Protocolo Bi-Etapa

**Fecha:** 2026-09-06 (Labor Day — mercado acciones CERRADO)  
**Status:** 🟡 PLAN PARA APROBACIÓN (Sin cambios en código aún)  
**Autorización pendiente:** Sí  
**Scope:** BTC/USD y ETH/USD solamente (Alpaca Paper ONLY)

---

## FASE 0: AUDITORÍA DE FUENTES DE DATOS

### ¿Qué datos reales recibe Tito HOY?

**Alpaca Paper Trading:**
- ✅ **Disponible:** Quotes (bid/ask), historical bars, posiciones abiertas
- ✅ **Símbolos soportados:** BTCUSD, ETHUSD (crypto 24/5)
- ✅ **Latencia:** Real-time (~100ms)
- ✅ **Verificado:** Session 51 ✅ y Session 52 ✅
- ❌ **NO soportado:** OCO, bracket orders, STOP (manual monitoring requerido)

**TradingView Context:**
- ❌ **NO integrado aún** en backend (solo en frontend para alerts)
- ❌ **No hay fuente de datos TV** en `dataEngine.ts`
- 🟡 **Posible futuro:** API webhook para alerts RSI/ADX/SuperTrend

**MarketSnacks (Massive):**
- ❌ **Crypto:** No datos verificables (solo equities)
- ❓ **Estado:** Revisar si `/v2/aggs` retorna BTCUSD/ETHUSD

**Alpha Vantage + Finnhub:**
- ❓ **Crypto support:** Alpha Vantage = NO; Finnhub = limitado
- 🟡 **Fallback:** Si Alpaca falla, no hay backup confiable para crypto

---

## AUDITORÍA ESPECÍFICA: ¿QUÉ ES "DATOS REALES" PARA CRYPTO?

### Categorías de Datos

| Categoría | Fuente | Temporalidad | Frescura | Status |
|-----------|--------|--------------|----------|--------|
| **PRICE (Entrada/TP/SL)** | Alpaca /v2/account | Real-time | ~100ms | ✅ REAL |
| **VOLUME (Intraday)** | Alpaca /v2/bars | 1-min bars | ~1min delay | ✅ REAL |
| **TREND (MA50/MA200)** | Alpaca /v2/bars | Histórico | Últimas 200 barras | ✅ REAL |
| **RSI (Momentum)** | NO INTEGRADO | — | — | ❌ FALTA |
| **ATR (Volatility)** | NO INTEGRADO | — | — | ❌ FALTA |
| **VIX Proxy** | FRED /VIXCLS | Diario | EOD | ✅ REAL (equities only) |
| **Signal (Buy/Sell)** | TVContext alerts | Webhook | Variable | 🟡 PARTIAL |

### Datos FALTANTES hoy para validación cripto:

```
🔴 CRÍTICO:
   ❌ RSI (necesario para confirmation engine)
   ❌ ATR (necesario para stop-loss inteligente)
   ❌ Patrón de entrada (TVContext no integrado en backend)

🟡 IMPORTANTE pero no bloqueante:
   ❌ Correlación SPY/BTC (para regime check)
   ❌ IV Rank (no existe para crypto)
```

---

## PROTOCOLO DE VALIDACIÓN: DOS ETAPAS

### ETAPA 1️⃣: OBSERVACIÓN (Sin órdenes)

**Duración:** Lunes 09-06 de 00:00 a 23:59 UTC (24 horas, mercado acciones cerrado)

**Objetivo:** Registrar qué datos reales recibe Tito del Alpaca Paper Trading sin ejecutar nada.

**Qué observar cada 10 minutos:**

```typescript
interface CryptoObservation {
  timestamp: Date;           // Hora exacta
  symbol: 'BTCUSD' | 'ETHUSD';
  
  // DATOS REALES (de Alpaca)
  currentPrice: number;      // Último precio de Alpaca /v2/account
  priceTimestamp: Date;      // Cuándo Alpaca envió este precio
  priceFreshness: 'REAL' | 'STALE' | 'UNAVAILABLE';
  
  // VOLUMEN INTRADAY (de Alpaca)
  dayVolume: number;         // Volumen del día actual
  volumeTimestamp: Date;     // Cuándo se obtuvo
  volumeFreshness: 'REAL' | 'STALE' | 'UNAVAILABLE';
  
  // TENDENCIA (MA50/MA200 de Alpaca bars)
  ma50: number | null;       // Media móvil 50 barras
  ma200: number | null;      // Media móvil 200 barras
  trend: 'UPTREND' | 'DOWNTREND' | 'UNKNOWN';
  trendConfidence: number;   // 0-100%
  
  // INDICADORES NO DISPONIBLES (registrar como MISSING)
  rsi: 'MISSING' | null;
  atr: 'MISSING' | null;
  
  // SEÑAL DE ENTRADA (hipotética, basada en datos disponibles)
  proposedSignal: 'ENTER' | 'WAIT' | 'REJECT';
  proposedConfidence: number; // 0-100%
  proposedReason: string;    // "MA50 > MA200 & Price > MA50 & Vol > 5M"
  
  // PROTECCIÓN
  proposedStop: number | null; // Entrada - 1%
  proposedTarget: number | null; // Entrada + 2%
  
  // METADATA
  dataAvailability: {
    alpacaPrice: 'REAL' | 'CACHED' | 'MISSING';
    alpacaVolume: 'REAL' | 'CACHED' | 'MISSING';
    alpacaTrend: 'REAL' | 'STALE' | 'MISSING';
    tvContext: 'NOT_INTEGRATED';
    warnings: string[]; // ["Price > 5min old", "Volume data incomplete", ...]
  };
}
```

**Almacenamiento:** Archivo JSON en `backend/audit/s60-observation-{symbol}-{date}.json`

**Ejemplo esperado:**

```json
[
  {
    "timestamp": "2026-09-06T10:00:00Z",
    "symbol": "BTCUSD",
    "currentPrice": 43250.50,
    "priceTimestamp": "2026-09-06T10:00:00Z",
    "priceFreshness": "REAL",
    "dayVolume": 1250000000,
    "volumeFreshness": "REAL",
    "ma50": 43100,
    "ma200": 42800,
    "trend": "UPTREND",
    "trendConfidence": 85,
    "rsi": "MISSING",
    "atr": "MISSING",
    "proposedSignal": "ENTER",
    "proposedConfidence": 75,
    "proposedReason": "MA50 > MA200 (uptrend) & Price > MA50 & DayVolume > 5M",
    "proposedStop": 42817.50,
    "proposedTarget": 44115.01,
    "dataAvailability": {
      "alpacaPrice": "REAL",
      "alpacaVolume": "REAL",
      "alpacaTrend": "REAL",
      "tvContext": "NOT_INTEGRATED",
      "warnings": []
    }
  }
  // ... más observaciones cada 10 minutos
]
```

**Outputs esperados:**
- ✅ Archivo de observaciones BTC (144 registros = 24h cada 10 min)
- ✅ Archivo de observaciones ETH (144 registros)
- ✅ Reporte: "¿Con qué frecuencia Alpaca proporciona datos frescos?"
- ✅ Reporte: "¿Cuántos datos faltan (RSI, ATR, etc.)?"
- ✅ Reporte: "¿Es confiable la detección de tendencia?"

---

### ETAPA 2️⃣: OPERACIÓN PAPER CONTROLADA (Solo después de aprobación + análisis E1)

**Condiciones previas:**
1. ✅ He mostrado y confirmado el análisis de E1
2. ✅ Usuario aprueba procedimiento explícitamente
3. ✅ Plan de emergencia está en lugar
4. ✅ Alpaca Paper está verificado (no Live)

**Duración:** Máximo 2-3 operaciones

**Procedimiento:**

```
Ciclo 1: BTCUSD (uno solo)
├─ Paso 1: Mostrar análisis de E1 ("¿Entramos?")
├─ Paso 2: Esperar aprobación explícita
├─ Paso 3: Colocar orden MARKET en Alpaca Paper
│  ├─ Symbol: BTCUSD
│  ├─ Quantity: 0.001 BTC (~$43 USD, cantidad mínima)
│  ├─ Type: MARKET (ejecución inmediata)
│  └─ Time-in-force: GTC (buena para crypto)
├─ Paso 4: Verificar orden en Alpaca
│  ├─ Status = FILLED
│  ├─ Entry Price registrado
│  └─ OrderID almacenado
├─ Paso 5: Colocar TP y activar SL monitoring
│  ├─ TP LIMIT: Entrada × 1.02 (2% profit)
│  ├─ SL Monitor: Entrada × 0.99 (1% stop, manual)
│  └─ Verificar: TP visible en Alpaca
├─ Paso 6: Monitoreo cada 10s durante 5-10 minutos
│  ├─ ¿Precio actual vs SL?
│  ├─ ¿TP fue hit?
│  ├─ ¿Posición aún open?
│  └─ Log: cada ciclo en `audit/s60-execution-{symbol}.json`
└─ Paso 7: Cierre (manual o automático por TP/SL)
   ├─ Registrar: salida, P&L, razón
   └─ Guardar orden cerrada

Ciclo 2: ETHUSD (si Ciclo 1 exitoso)
└─ Repetir con misma cantidad (0.005-0.01 ETH)

Ciclo 3: BTC nuevamente (si Ciclos 1-2 exitosos)
└─ Repetir validación
```

**Logs detallados:**

```json
{
  "executionId": "s60-btc-001",
  "timestamp": "2026-09-06T12:00:00Z",
  "symbol": "BTCUSD",
  
  "entryPhase": {
    "signal": "ENTER",
    "confidence": 75,
    "reason": "MA50 > MA200 uptrend",
    "orderPlaced": "2026-09-06T12:00:05Z",
    "orderType": "MARKET",
    "quantity": 0.001,
    "entryPrice": 43250.50,
    "alpacaOrderId": "123456789",
    "alpacaStatus": "FILLED"
  },
  
  "protectionPhase": {
    "stopLoss": 42817.99,
    "takeProfit": 44115.01,
    "tpOrderId": "987654321",
    "tpStatus": "OPEN",
    "slMonitoringStarted": "2026-09-06T12:00:10Z"
  },
  
  "monitoringCycles": [
    {
      "cycleNum": 1,
      "time": "2026-09-06T12:00:20Z",
      "currentPrice": 43255.00,
      "priceVsSL": "ABOVE (+$37.01)",
      "priceVsTP": "BELOW (-$860.01)",
      "positionStatus": "OPEN",
      "action": "CONTINUE"
    },
    // ... más ciclos cada 10s
  ],
  
  "exitPhase": {
    "exitReason": "TP_HIT | SL_HIT | MANUAL | TIMEOUT",
    "exitPrice": 44115.01,
    "exitTime": "2026-09-06T12:05:30Z",
    "pnl": 86.50,
    "pnlPercent": 2.0,
    "alpacaOrderId": "987654321",
    "alpacaStatus": "FILLED"
  },
  
  "outcomes": {
    "success": true,
    "slWorked": true,
    "tpWorked": true,
    "alpacaConnected": true,
    "noErrors": true
  }
}
```

---

## PLAN DE EMERGENCIA: ¿QUÉ PASA SI FALLA SL EN ALPACA?

### Escenario 1: TP order desaparece de Alpaca

**Síntomas:**
- Colocamos TP LIMIT, vemos OrderID en Alpaca
- 5 minutos después, queryamos Alpaca y NO está
- Precio sigue subiendo, pero no se ejecuta

**Protocolo:**

```
1. Detect: SL monitoring se da cuenta que TP no existe
   └─ Query: GET /v2/orders/{order_id}
   └─ Response: 404 NOT FOUND o status=CANCELLED

2. Log: Registrar desaparición con timestamp exacto
   └─ `audit/s60-emergency-{symbol}.json`
   └─ Incluir: OrderID, precio en momento desaparición, logs

3. Action: MANUAL INTERVENTION
   ├─ STOP SL monitoring
   ├─ Show position details
   ├─ Wait for user decision:
   │  ├─ A) Close position manually (MARKET sell)
   │  ├─ B) Replace TP order (new LIMIT)
   │  └─ C) Hold and wait (manual monitoring)
   └─ Execute chosen action

4. Never auto-retry without approval
```

### Escenario 2: SL monitoring detects SL hit pero no puede vender

**Síntomas:**
- Precio cruza SL threshold
- Intentamos MARKET sell → error 403 "insufficient balance"
- Posición aún open, pérdida creciente

**Protocolo:**

```
1. Detect: currentPrice <= SL threshold
2. Attempt sell: POST /v2/orders (MARKET, qty=full)
3. If 403 insufficient:
   ├─ Log error with exact reason
   ├─ Try reduced quantity (qty × 0.9)
   ├─ If still fails: ESCALATE
   │  ├─ Cancel TP order
   │  ├─ Lock position from new trades
   │  └─ Notify user: "Manual intervention required"
   └─ Never leave position unprotected

4. User action: Manual sell via Alpaca UI
```

### Escenario 3: Alpaca API down / no connectivity

**Síntomas:**
- GET /v2/account → timeout o 500 error
- Price data unavailable

**Protocolo:**

```
1. Detect: 3 consecutive API failures (30 seconds)
2. Action: LOCK TRADING
   ├─ Stop all SL monitoring
   ├─ Keep position as is (don't sell panic)
   ├─ Log: timestamp, error details
   └─ Alert user: "Alpaca unreachable"

3. Wait: Retry connection every 5s, max 10 retries
4. Fallback:
   ├─ If reconnected: Resume SL monitoring
   ├─ If persistent: User must manually close via Alpaca UI
```

---

## ARCHIVOS QUE NECESITAMOS CREAR

### 1. Observation Engine (`backend/src/modules/s60/cryptoObserver.ts`)

```typescript
/**
 * Observa datos cripto de Alpaca cada 10 minutos sin ejecutar órdenes
 */
export class CryptoObserver {
  private observations: CryptoObservation[] = [];
  private interval: NodeJS.Timeout | null = null;
  
  async observe(symbol: 'BTCUSD' | 'ETHUSD'): Promise<void>;
  async calculateTrend(symbol: string, bars: AlpacaBar[]): Promise<TrendAnalysis>;
  async proposedSignal(data: CryptoObservation): Promise<SignalResult>;
  async saveObservation(obs: CryptoObservation): Promise<void>;
  async generateReport(): Promise<AuditReport>;
}
```

**Lines:** ~300  
**Dependencies:** AlpacaClient, FileSystem  
**Tests:** 5 (observe, trend calc, signal, save, report)

### 2. Execution Monitor (`backend/src/modules/s60/cryptoExecutor.ts`)

```typescript
/**
 * Ejecuta operación Paper controlada con monitoreo SL manual
 */
export class CryptoExecutor {
  private execution: ExecutionResult | null = null;
  private monitoringActive = false;
  
  async executeMarketOrder(symbol: string, qty: number): Promise<OrderResult>;
  async placeTakeProfitOrder(entry: number, qty: number): Promise<OrderResult>;
  async startSLMonitoring(slPrice: number, entry: number): Promise<void>;
  async handleEmergency(scenario: EmergencyScenario): Promise<void>;
  async generateExecutionReport(): Promise<ExecutionReport>;
}
```

**Lines:** ~400  
**Dependencies:** AlpacaClient, Emergency handler  
**Tests:** 8 (order placement, TP placement, SL detect, emergency scenarios x3, report)

### 3. Emergency Handler (`backend/src/modules/s60/emergencyHandler.ts`)

```typescript
/**
 * Maneja los 3 escenarios de emergencia
 */
export class EmergencyHandler {
  async handleTPDisappearance(orderId: string): Promise<EmergencyAction>;
  async handleSLFailure(slPrice: number, currentPrice: number): Promise<EmergencyAction>;
  async handleAPIDown(retryCount: number): Promise<EmergencyAction>;
  async notifyUser(action: EmergencyAction): Promise<void>;
  async closePositionManually(symbol: string): Promise<CloseResult>;
}
```

**Lines:** ~250  
**Dependencies:** Logger, UserNotifier  
**Tests:** 6 (one per scenario × 3 scenarios, plus recovery tests)

### 4. Data Audit Report (`backend/src/modules/s60/dataAuditReport.ts`)

```typescript
/**
 * Genera reporte de auditoría de fuentes de datos
 */
export class DataAuditReport {
  async analyzeObservations(obs: CryptoObservation[]): Promise<DataAuditResult>;
  async checkDataFreshness(): Promise<FreshnessReport>;
  async identifyMissingIndicators(): Promise<MissingIndicators>;
  async validateAlpacaIntegration(): Promise<ValidationResult>;
  async generateHTMLReport(): Promise<string>;
}
```

**Lines:** ~250  
**Dependencies:** Observations data  
**Tests:** 4 (freshness, missing, validation, HTML generation)

### 5. Test Suite (`backend/src/modules/s60/s60.test.ts`)

```typescript
/**
 * Suite completa: observación + ejecución + emergencias
 * NOTA: Sin ejecutar hasta recibir aprobación
 */
describe('S60: Validación Controlada Cripto', () => {
  describe('ETAPA 1: Observación', () => {
    test('Observa BTC cada 10 minutos durante 24h');
    test('Calcula MA50/MA200 correctamente');
    test('Propone señal ENTER/WAIT/REJECT basada en datos reales');
    test('Identifica datos faltantes (RSI, ATR)');
    test('Genera reporte de auditoría de datos');
  });
  
  describe('ETAPA 2: Operación Paper', () => {
    test.skip('Coloca orden MARKET en Alpaca Paper');
    test.skip('Verifica llenado de orden');
    test.skip('Coloca TP LIMIT correctamente');
    test.skip('Inicia SL monitoring y detecta crossing');
    test.skip('Cierra posición por TP/SL');
  });
  
  describe('PLAN DE EMERGENCIA', () => {
    test.skip('Detecta TP desaparición de Alpaca');
    test.skip('Maneja SL failure (insufficient balance)');
    test.skip('Recupera conexión después de API down');
  });
});
```

**Lines:** ~400  
**Tests:** 15 total (5 E1 + 5 E2 .skip + 3 emergency .skip + 2 integration)  
**Status:** E1 tests enabled; E2 + emergency tests SKIPPED (await approval)

---

## CRITERIOS DE ÉXITO: ETAPA 1 (OBSERVACIÓN)

### ✅ Validación de Datos

```
✅ Frescura de precio: Alpaca retorna datos < 2 segundos antiguos
✅ Frescura de volumen: Datos intraday disponibles cada 1 minuto
✅ Cálculo de tendencia: MA50/MA200 calculados correctamente
✅ Falta identificada: RSI y ATR registrados como MISSING
✅ Señal hipotética: ENTER/WAIT/REJECT tiene lógica consistente
✅ Protección: SL/TP pueden calcularse sin errores
✅ Advertencias claras: No hay datos silenciados
```

### ❌ Señales de STOP (no proceder a E2)

```
❌ Alpaca desconectado > 5% del tiempo
❌ Precio data stale > 2% de observaciones
❌ No hay volumen crypto en Alpaca
❌ Error en cálculo de MA50/MA200
❌ Alpaca no soporta ETHUSD/BTCUSD como esperado
```

---

## CHECKLIST PRE-APROBACIÓN

### Antes de ETAPA 1:

- [ ] ¿Alpaca credentials están en `.env.local`?
- [ ] ¿Alpaca Paper endpoint es `paper-api.alpaca.markets`?
- [ ] ¿Backend puede conectar a Alpaca?
  ```bash
  # Test rápido
  npm run test -- alpaca.client
  ```
- [ ] ¿Archivos audit/ existen y son writable?
  ```bash
  mkdir -p backend/audit/
  chmod 755 backend/audit/
  ```

### Antes de ETAPA 2:

- [ ] ✅ Análisis E1 completo y mostrado
- [ ] ✅ Usuario aprueba "Proceder a operación Paper"
- [ ] ✅ `.env` tiene `ALPACA_ENABLED=true` (no Live Trading)
- [ ] ✅ SL monitoring implementado y testeado
- [ ] ✅ Emergency handler está en place
- [ ] ✅ Balance Alpaca Paper ≥ $100 USD

---

## TIMELINE PROPUESTO

| Hora | Tarea | Duración |
|------|-------|----------|
| 09:00 | Aprobación de este plan | 15 min |
| 09:15 | Crear observador cripto | 30 min |
| 09:45 | Tests E1 (disabled E2) | 30 min |
| 10:15 | Ejecutar observación (24h) | Async |
| 10:30 | Preparar executor + emergency | 45 min |
| 11:15 | Auditoría de datos (mientras observa) | 30 min |
| 11:45 | Generar reporte E1 | 15 min |
| 12:00 | Revisar reporte, user approval | 30 min |
| 12:30 | Ejecutar ETAPA 2 si aprobado | Variable |

**Nota:** Observación corre 24 horas (todo el día), podemos revisar a cualquier momento.

---

## REGLAS DE ORO (NUNCA VIOLAR)

```
🚨 REGLA 1: Alpaca Paper ONLY
   └─ Verificar endpoint = paper-api.alpaca.markets
   └─ Verificar trading_suspended_by_user = false

🚨 REGLA 2: Cantidades MÍNIMAS
   └─ BTCUSD: 0.001 máximo (~$43)
   └─ ETHUSD: 0.005 máximo (~$12)
   └─ Nunca usar apalancamiento

🚨 REGLA 3: SL SIEMPRE ACTIVO
   └─ Antes de entrada: SL debe estar calculado
   └─ Después de entrada: SL monitoring debe estar corriendo
   └─ Monitoreo cada 10 segundos, nunca menos

🚨 REGLA 4: STOP-LOSS = 1%, TAKE-PROFIT = 2%
   └─ No modificar durante la sesión
   └─ Congelados en código

🚨 REGLA 5: NO modificar estrategias
   └─ Tito Core se congela durante S60
   └─ Solo lectura de datos + ejecución Paper
   └─ Cero cambios en lógica de decisión

🚨 REGLA 6: Aprobación explícita antes de cada orden
   └─ ETAPA 1: "Mostrar análisis y esperar OK"
   └─ Antes de orden: "¿Entramos?"
   └─ Nunca auto-execute sin confirmación

🚨 REGLA 7: Registro completo de TODO
   └─ Cada observación → JSON
   └─ Cada orden → JSON con OrderID de Alpaca
   └─ Cada error → Emergency log
```

---

## PRÓXIMAS SESIONES (Post-S60)

- **S61:** Si S60 EXITOSA → Habilitar SPY/QQQ en Paper
- **S62:** Si S61 EXITOSA → Multi-símbolo simultáneo
- **S63:** Documentación operativa final
- **S64:** Handoff para operación 24/7 si autorizado

---

## ESTADO ACTUAL

| Componente | Status | Blocker |
|------------|--------|---------|
| Alpaca integration | ✅ LISTO | Ninguno |
| Posiciones BTC/ETH existentes | ✅ LISTO | Ninguno |
| SL monitoring (manual) | ✅ PROBADO S51-S52 | Ninguno |
| Observation engine | ⏳ A CREAR | E1 code |
| Execution monitor | ⏳ A CREAR | E2 code |
| Emergency handler | ⏳ A CREAR | E2 safety |
| Tests suite | ⏳ A CREAR | Validation |

---

**Status:** 🟡 PLAN LISTO PARA APROBACIÓN

**¿Procede?**
1. ¿Está claro el plan de dos etapas?
2. ¿Aprueba auditoría de datos mañana (09-06)?
3. ¿Aprueba procedimiento de operación Paper si datos son buenos?
4. ¿Hay cambios/preocupaciones al plan?

**Próximo paso:** User review + authorization para comenzar ETAPA 1
