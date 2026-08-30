# 📋 MAPEO DE FUNCIONES REUTILIZABLES DE VICTOR

**Objetivo:** Identificar exactamente qué funciones/clases podemos copiar de Victor  
**Resultado:** Lista de "copy-paste ready" + adaptaciones necesarias

---

## ✅ FUNCIONES LISTA PARA COPIAR (SIN CAMBIOS)

### 1. BLACK-SCHOLES (Crítico para opciones)

**Archivo:** `web/lib/blackScholes.ts`

```typescript
// COPY-PASTE READY
export const RISK_FREE = 0.04;

export function bsPrice(
  spot: number, strike: number, T: number, iv: number,
  type: "call" | "put", r = RISK_FREE,
): number

export function bsDelta(
  spot: number, strike: number, T: number, iv: number,
  type: "call" | "put", r = RISK_FREE,
): number

export function bsGamma(
  spot: number, strike: number, T: number, iv: number
): number

export function impliedVol(
  price: number, spot: number, strike: number, T: number,
  type: "call" | "put", r = RISK_FREE,
): number | null
```

**Uso en nuestro código:**
```typescript
// BullCallSpreadStrategy
import { bsPrice, bsDelta } from "@victor/lib/blackScholes";

const callPrice = bsPrice(554.32, 560, 30/365, 0.18, "call");
const delta = bsDelta(554.32, 560, 30/365, 0.18, "call");
```

**Esfuerzo:** 0 (copy-paste)  
**Tests en Victor:** ✅ 100% coverage (`blackScholes.test.ts`)

---

### 2. EXPECTED MOVE (Reemplaza Bollinger Bands)

**Archivo:** `web/lib/expectedMove.ts`

```typescript
// COPY-PASTE READY
export function normCdf(x: number): number  // Normal acumulada

export interface ExpectedMove {
  spot: number;
  iv: number;
  days: number;
  sigma: number;        // desviación en $
  sigmaPct: number;     // desviación en %
  upper1: number; lower1: number;  // 1σ
  upper2: number; lower2: number;  // 2σ
}

export function expectedMove(
  spot: number, 
  iv: number, 
  days: number
): ExpectedMove
```

**Uso en nuestro código:**
```typescript
// VolatilityFilter
import { expectedMove } from "@victor/lib/expectedMove";

const move = expectedMove(554.32, 0.18, 30);
const upper1 = move.upper1;  // +1σ
const lower1 = move.lower1;  // -1σ
```

**Vs nuestro Bollinger:** Victor es más preciso (lognormal) y testeado. **REEMPLAZAR.**

**Esfuerzo:** Bajo (cambiar 1 función)  
**Tests en Victor:** ✅ 100% coverage

---

### 3. EARNINGS (Calendario de earnings)

**Archivo:** `web/lib/earnings.ts`

```typescript
// COPY-PASTE READY
export function estimateNextEarnings(
  filingDates: string[], 
  now: Date
): string | null

export function earningsFlag(input: {
  filingDates: string[];
  now: Date;
  expirationDate: string;
}): {
  hasEarnings: boolean;
  daysUntil: number | null;
  alarmDays: number;
}
```

**Uso en nuestro código:**
```typescript
// BaseStrategy.validateRules()
import { earningsFlag } from "@victor/lib/earnings";

const flag = earningsFlag({
  filingDates: historicalFilingDates,
  now: new Date(),
  expirationDate: "2026-09-20"
});

if (flag.hasEarnings && flag.daysUntil! < 5) {
  return { isValid: false, reason: "Earnings próximo" };
}
```

**Esfuerzo:** Bajo (import + 1 check)  
**Tests en Victor:** ✅ 100% coverage

---

## ⚠️ FUNCIONES PARA ADAPTAR (NECESITA CAMBIOS)

### 1. NIVELES (Soportes/Resistencias)

**Archivo:** `web/lib/levels.ts`

```typescript
// ADAPTAR
export function findPivots(
  bars: LvlBar[],  // ← Necesitamos formato compatible
  k = 3
): Pivot[]

export function clusterPivots(
  pivots: Pivot[],
  tolerancePct = 1
): PivotCluster[]

export function computeLevels(
  pivots: PivotCluster[],
  bars: LvlBar[],
  spot: number,
  chain?: ChainData,  // ← Opcional, depende de datos
  flow?: FlowData
): Level[]
```

**Cambios necesarios:**
```typescript
// Victor espera LvlBar[] (formato TradingView)
// Nosotros tenemos MarketData

interface LvlBar {
  time: string;      // YYYY-MM-DD
  high: number;
  low: number;
  close: number;
}

// Adaptador
const toBars = (data: MarketData[]): LvlBar[] =>
  data.map(d => ({
    time: d.timestamp.toISOString().split('T')[0],
    high: d.high,
    low: d.low,
    close: d.close
  }));
```

**Uso en nuestro código:**
```typescript
// BreakoutStrategy
import { findPivots, computeLevels } from "@victor/lib/levels";

const bars = toBars(marketDataHistory);
const pivots = findPivots(bars, 3);
const levels = computeLevels(pivots, bars, currentPrice);

const r1 = levels.find(l => l.kind === "resistencia")?.price;
```

**Esfuerzo:** Medio (adapter + testear)  
**Tests en Victor:** ✅ 100% coverage

---

### 2. GEX (Greeks Exposure Mapping)

**Archivo:** `web/lib/gex.ts`

```typescript
// ADAPTAR
export interface GexNode {
  // Demasiado específico para GEX visual
  // Pero la LÓGICA de cálculo de gamma es reutilizable
}

export function computeGex(
  chain: ChainData,
  spot: number
): GexNode[]

export interface GexHeatmap {
  // Matriz de strikes × vencimientos
}
```

**Por qué adaptar:**
- Victor calcula GEX para VISUALIZAR (heatmap)
- Nosotros necesitamos GEX para DECISIÓN (¿gamma positiva = volatilidad?)

**Uso simplificado:**
```typescript
// VolatilityExpansionStrategy
// En lugar de usar toda la matriz, solo nos importa:
// "¿Hay gamma positiva en este strike?"

const netGamma = calculateNetGamma(chain, currentStrike);
if (netGamma > 0) {
  // Dealers están largos gamma → volatilidad comprimida
  // Expansión es oportunidad
}
```

**Esfuerzo:** Alto (extraer core logic, descartar UI)  
**Recommendation:** **Usar después de Sesión 45**, no es crítico

---

### 3. IV CONTEXT (IV Ranking & Bands)

**Archivo:** `web/lib/ivcontext.ts`

```typescript
// ADAPTAR
export interface IvBand {
  rank: number;      // 0-100
  percentile: number;
}

export function ivPoints(ivPct: number): IvBand

export function ivRankPoints(rank: number): IvBand
```

**Cambios:**
- Victor usa "puntos" (0-10) para scoring de opciones
- Nosotros usamos percentil directo (0-100)

**Simple mapping:**
```typescript
// Nuestro VolatilityFilter vs Victor IvContext
// Ambos llegan al mismo lugar (ajustar por volatilidad)

const ourApproach = volatilityPercentile;  // 0-100
const victorApproach = ivRankPoints(ivPercent);  // 0-10 puntos

// Converger a: multiplicadores de riesgo basados en percentil
```

**Esfuerzo:** Bajo (verificar convergencia)

---

## ❌ FUNCIONES QUE NO COPIAMOS (Y POR QUÉ)

### 1. PREDICTION PRO (6 sub-agentes)

**Archivo:** `web/lib/prediction.ts`

**Por qué NO:**
- ❌ Es análisis (bear/base/bull scenarios), no operación
- ❌ Nuestras estrategias son prescriptivas (entry/exit definido)
- ❌ Aumentaría complejidad sin beneficio

**Alternativa:** Usar Prediction Pro como CONTEXTO
```typescript
// En BaseStrategy.validateRules()
// Si Prediction Pro dice "bear" scenario → evitar LONG
```

---

### 2. FLOW ANALYSIS (TradeScores, Aggression)

**Archivo:** `web/lib/flow.ts`

**Por qué NO:**
- ❌ Demasiado específico de orden flow
- ❌ Nuestras estrategias usan volumen aggregado, no trade-by-trade
- ❌ Duplicaría lógica de scoring

---

### 3. IDEAS SCAN + WATCHLIST

**Archivos:** `web/api/ideas/`, `web/lib/outboxStore.ts`

**Por qué NO:**
- ❌ Frontend-specific (React components)
- ❌ Scope diferente (scan mercado vs operar símbolo específico)
- ❌ Base de datos local (localStorage)

---

## 📊 RESUMEN: QUÉ COPIAR CUÁNDO

| Función | Archivo | Copy-Paste | Adaptar | Sesión |
|---|---|---|---|---|
| **bsPrice, bsDelta, bsGamma** | blackScholes.ts | ✅ | — | 43 |
| **normCdf, expectedMove** | expectedMove.ts | ✅ | — | 42 |
| **earningsFlag** | earnings.ts | ✅ | — | 41 |
| **findPivots, computeLevels** | levels.ts | — | ✅ | 45 |
| **computeGex (simplificado)** | gex.ts | — | ✅ | 46+ |
| **ivRankPoints** | ivcontext.ts | — | ✅ | 45 |
| Prediction Pro | prediction.ts | ❌ | — | — |
| Flow Analysis | flow.ts | ❌ | — | — |
| Ideas/Watchlist | ideas/*.ts | ❌ | — | — |

---

## 🔧 PROCESO DE INTEGRACIÓN

### Sesión 43 (Bull Call Spread): Copiar Black-Scholes

```bash
# Copiar archivos
cp /tmp/victor-repo/web/lib/blackScholes.ts backend/lib/pricing/
cp /tmp/victor-repo/web/lib/blackScholes.test.ts backend/lib/pricing/

# Cambiar imports
# import { normCdf } from "@victor/lib/expectedMove"
# → import { normCdf } from "./expectedMove"

# Ejecutar tests de Victor
npm test -- blackScholes
```

### Sesión 45 (Niveles + IV): Adaptar Levels

```bash
# Copiar core logic
cp /tmp/victor-repo/web/lib/levels.ts backend/lib/technical/

# Adaptar tipos
# LvlBar → Convertir de MarketData
# Level → Integrar con BreakoutStrategy

# Testear convergencia de niveles
npm test -- levels.integration
```

---

## ⚠️ NOTAS DE INTEGRACIÓN

1. **No copiar test files directamente** — Los tests de Victor usan fixtures específicas
2. **Verificar compatibilidad de tipos** — Victor usa tipos diferentes (ej: `LvlBar`)
3. **Mantener atribución** — Si copiamos código, comentar "Based on Victor's..."
4. **No incluir Next.js/React** — Solo la lógica pura (`.ts`, no `.tsx`)
5. **Ejecutar tests de Victor** — Antes de copiar, rodar los tests de Victor para asegurar que funcionan

---

## 📌 ARCHIVO PARA DESCARGAR

El archivo `web/lib/` de Victor que queremos:

```
✅ blackScholes.ts (con tests)
✅ expectedMove.ts (con tests)
✅ earnings.ts (con tests)
✅ levels.ts (con tests)
✅ gex.ts (solo lógica core, sin UI)
✅ ivcontext.ts (solo cálculos)
✅ conditions.ts (referencia)
✅ occ.ts (parsing de símbolos)
```

---

**Status:** 🟢 LISTO PARA CODIFICAR SESIÓN 43+ CON INTEGRACIÓN  
**Próximo:** Copiar Black-Scholes en Sesión 43, integrar niveles en Sesión 45
