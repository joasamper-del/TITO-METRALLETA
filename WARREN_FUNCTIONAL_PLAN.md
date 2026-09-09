# 🎯 Warren Buffett Jr. — Plan Funcional Completo

**Status:** DISEÑO EN REVISIÓN (Sin código implementado aún)  
**Objetivo:** Sistema independiente de inversión en valor a largo plazo  
**No es:** "Tito Metralleta lento"  
**Es:** Sistema con cerebro completamente diferente

---

## 📊 1. MISIÓN Y HORIZONTE TEMPORAL

### Misión de Mediano/Largo Plazo
**Identificar y acumular posiciones en empresas de calidad a precios atractivos, manteniendo a través de ciclos de mercado para capturar crecimiento fundamental y retornos compuestos.**

### Horizonte Temporal
- **Análisis:** Trimestral a anual (fundamentals actualizados regularmente)
- **Hold:** 1-5+ años (típicamente)
- **Rebalance:** Trimestral (revisión, no rotación)
- **Decisión:** Lenta y deliberada (NO intradía, NO momentum)

---

## 🧠 2. CRITERIOS FUNDAMENTALES (El "Cerebro" de Warren)

### A. Valoración (Price vs Value)
```
Métrica Clave: Price-to-Book (P/B), Price-to-Earnings (P/E), PEG
Umbral de Entrada: P/E < 15x (20x si crecimiento > 20%)
Margen de Seguridad: 30%+ descuento vs valor intrínseco calculado

Método de Cálculo:
- DCF (Discounted Cash Flow) con tasa descuento 10%
- Terminal growth = 3% (GDP growth)
- Si precio < DCF * 0.7: COMPRA POTENCIAL
```

### B. Calidad de Empresa
```
Criterios Técnicos:
- ROE > 15% (Return on Equity - rentabilidad)
- ROIC > WACC (Capital Efficiency)
- Debt/Equity < 0.5 (Balance sheet health)
- Free Cash Flow positivo (últimos 3+ años)
- Dividend history > 10 años (si aplica)

Señales Cualitativas:
- Competitive Advantage (Moat) - marca, tecnología, network
- Management quality (insider ownership, track record)
- Industry position (market leader vs follower)
- Earnings quality (recurring, predictable)
```

### C. Crecimiento
```
Métricas:
- Earnings CAGR 5+ años: 7-15% (ideal)
- Revenue growth: 5%+ (consistente)
- Market growth prospects: 3-10% (sector tailwind)

NO buscamos: Growth stocks (50%+ growth) — demasiado riesgo/precio
SÍ buscamos: Calidad con crecimiento modesto y predecible
```

### D. Contexto Macro
```
Indicadores para Ajustar Agresividad:
- Tasas de interés (Fed Rate): ↑ tasas = reducir posiciones nuevas
- Inflación (CPI): > 4% = evitar empresas con bajo pricing power
- Ciclo económico: Expansión = OK | Contracción = esperar cash
- Valuaciones de mercado (S&P 500 P/E): > 20x = reducir, < 15x = agredir
- VIX/Volatilidad: > 25 = selectivo, < 15 = normal

Regla: Si 3+ indicadores rojo → modo "observación", no compras nuevas
```

---

## 🎯 3. SISTEMA DE PUNTUACIÓN (0-100)

Cada empresa recibe score compuesto:

```
VALORACIÓN (30 puntos):
  P/B Ratio (15): P/B < 1.0 = 15pts | 1.0-2.0 = 10pts | 2.0-3.0 = 5pts | >3.0 = 0pts
  P/E vs Histórico (15): <0.8x = 15pts | 0.8-1.0x = 10pts | 1.0-1.3x = 5pts | >1.3x = 0pts

CALIDAD (35 puntos):
  ROE (10): >20% = 10pts | 15-20% = 7pts | 10-15% = 4pts | <10% = 0pts
  Debt/Equity (10): <0.3 = 10pts | 0.3-0.5 = 7pts | 0.5-0.8 = 4pts | >0.8 = 0pts
  FCF Quality (8): Creciente = 8pts | Estable = 5pts | Decreciente = 2pts | Negativo = 0pts
  Dividend/Stability (7): 15+ años de div = 7pts | 5-15 años = 5pts | <5 años = 2pts | None = 0pts

CRECIMIENTO (20 puntos):
  5-Year CAGR (10): >15% = 10pts | 10-15% = 7pts | 5-10% = 4pts | <5% = 2pts
  Revenue Growth (10): >10% = 10pts | 5-10% = 7pts | 2-5% = 4pts | <2% = 0pts

CONTEXTO MACRO (15 puntos):
  Industry Tailwind (10): Strong = 10pts | Normal = 7pts | Headwind = 4pts | Severe = 0pts
  Market Valuation Adjustment (-5 a +5): VIX/Fed rate adjustments

SCORE FINAL:
  85+: COMPRA FUERTE
  70-84: COMPRA NORMAL
  50-69: WATCH (seguir, evaluar)
  <50: EVITAR
```

---

## 📥 4. CONDICIONES DE ACCIÓN

### Comprar (Entry Rules)
```
REQUISITOS ACUMULATIVOS:
1. Score >= 70
2. Price < DCF * 0.7 (margin of safety)
3. Macro context NO rojo
4. Posición new position < 5% cartera
5. Sector no over-concentrated (max 3 posiciones por sector)
6. Cash position permite (min 20% cash reserve)

TAMAÑO INICIAL:
- Score 85+: 5% cartera
- Score 70-84: 3% cartera
- Compra en escalones: 1/3 + 1/3 + 1/3 en días diferentes
```

### Mantener (Hold Rules)
```
CONTINUAR SOSTENIENDO SI:
1. Tesis fundamental INTACTA (revisión trimestral)
2. Score aún >= 60 (no ha colapsado)
3. Precio < 1.5x fair value

TRIGGERS PARA REDUCIR (vender 50%):
- Score cae < 50 (fundamentals deterioran)
- Precio > 2.0x fair value (sobre-valuado)
- Mejor oportunidad detected (capital más mejor utilizado)
- Cambio macro severe (ej: sector destruction)
```

### Reducir (Trim Rules)
```
VENDER 20-30% SI:
- Posición > 8% cartera (rebalance)
- Sector sobre-concentrado (>3 posiciones)
- Profit-taking (>50% ganancia acumulada)
- Rebalance trimestral
```

### Salir (Exit Rules)
```
VENDER 100% SI:
- Score < 30 (fundamentals colapso)
- Deuda explota (Debt/Equity > 1.0, trending worse)
- FCF negativo 2+ trimestres consecutivos
- Loss > 30% (cut losses, capital para mejor uso)
- Tesis original demostrada ERRÓNEA (pivot management)
```

---

## 💾 5. FUENTES DE DATOS

### Datos Fundamentales (Trimestral)
```
Proveedor: Alpha Vantage / Finnhub / MarketStack
- 10-Q/10-K filings (SEC)
- Earnings estimates vs actual
- Guidance changes
- Insider buying/selling
```

### Datos de Mercado (Tiempo Real)
```
Proveedor: Alpaca / Massive / Yahoo Finance
- Price (cierre diario)
- Volume (detector de interés)
- Dividend announcements
- Stock split adjustments
```

### Datos Macro (Semanal)
```
Proveedor: FRED (Federal Reserve)
- Federal Funds Rate (tasas)
- CPI (inflación)
- GDP growth (economic health)
- VIX (market stress)

Proveedor: CME Futures
- Bond yields (2-10 year)
- Credit spreads (default risk)
```

### Datos de Valuación (Calculado)
```
Método Interno:
- DCF modeling (anual cuando hay cambios)
- Comparable company analysis
- Historical price ranges
- Analyst consensus (ej: Bloomberg, Seeking Alpha)
```

---

## 📊 6. INFORMACIÓN COMPARTIDA CON TITO

### QUÉ COMPARTIR (Interfaz Read-Only)
```
DATOS QUE TITO PUEDE LEER:
1. Warren's fundamental scores (0-100 por empresa)
2. Warren's valuation status (Attractive/Fair/Expensive)
3. Warren's sector signals (strong/normal/weak)
4. Macro context signals (bullish/neutral/bearish)
5. Cash position of Warren (% available)

FORMATO:
{
  "warren_fundamentals": {
    "symbol": "AAPL",
    "score": 75,
    "valuation": "attractive",
    "margin_of_safety": 0.35,
    "sector_signal": "strong"
  },
  "warren_macro": {
    "fed_rate": 5.25,
    "inflation": 3.2,
    "vix": 18,
    "market_valuation": "fair",
    "context_signal": "neutral"
  }
}
```

### QUÉ NO COMPARTIR (Aislado)
```
TITO NUNCA VE:
- Warren's decision logic
- Warren's entry/exit algorithms
- Warren's position sizing
- Warren's portfolio composition
- Warren's cash deployment strategy
- Warren's risk gates

Esto asegura:
✅ Independencia de sistemas
✅ No contamination de lógica
✅ Ambos operan en su universo
```

---

## 🏗️ 7. ARQUITECTURA DE MÓDULOS

### A. Decision Pipeline (Flujo de Decisión)

```
INPUT: Market Data (diario) + Fundamental Data (trimestral)
  ↓
[1] FUNDAMENTAL SCORER
    - Calcula ROE, ROIC, FCF, P/B, P/E, CAGR
    - Output: Score 0-100 por empresa
  ↓
[2] VALUATION ENGINE  
    - DCF modeling
    - Compara precio vs fair value
    - Margen de seguridad
    - Output: Valuation status + Entry opportunity
  ↓
[3] MACRO CONTEXT ANALYZER
    - Fed rates, inflation, VIX, market P/E
    - Ajusta agresividad
    - Output: Context signal (bullish/neutral/bearish)
  ↓
[4] DECISION GATE
    - Aplica reglas de compra/mantener/reducir/salir
    - Verifica posición sizing, concentration
    - Verifica cash disponible
    - Output: Acción recomendada (BUY x% | HOLD | TRIM x% | SELL 100%)
  ↓
[5] EXECUTION ENGINE (Sólo Análisis, NO Órdenes)
    - Genera RECOMENDACIÓN de orden
    - Espera aprobación manual
    - Output: "RECOMENDACIÓN: COMPRAR 5% en AAPL @ limit $150"
  ↓
OUTPUT: Warren Assessment (readable por Tito, acción aún manual o pendiente Jay)
```

### B. Módulos a Implementar (En Orden)

```
FASE 1: Fundamentals (Semana 1-2)
└── fundamental-scorer.ts
    - ROE, ROIC, Debt/Equity calculators
    - FCF analysis
    - Dividend history check
    - Output: Fundamental score

FASE 2: Valuation (Semana 2-3)
└── dcf-engine.ts
    - DCF model (terminal value, discount rate)
    - P/B, P/E ratios
    - Margin of safety calc
    - Output: Fair value + valuation status

FASE 3: Macro Analysis (Semana 3-4)
└── macro-context.ts
    - Fed rates, inflation, VIX reader
    - Market P/E signal
    - Context scoring
    - Output: Macro signal + aggressiveness adjustment

FASE 4: Decision Logic (Semana 4-5)
└── warren-decision-engine.ts
    - Buy/Hold/Trim/Sell rules
    - Position sizing
    - Concentration checks
    - Output: Recomendación de acción

FASE 5: Execution (Semana 5+)
└── warren-executor.ts
    - Generate recommended orders (NO auto-execute)
    - Manual approval required
    - Logging & audit trail
    - Output: Order recommendation pending approval

FASE 6: API & Integration (Semana 6+)
└── warren.controller.ts
    - /warren/assessment (overall score)
    - /warren/opportunities (buy list)
    - /warren/positions (current holdings)
    - /warren/macro (context signals)
```

---

## ⚙️ 8. CRITERIOS TÉCNICOS DE IMPLEMENTACIÓN

### Por Empresa (Analizada Individualmente)

```
UPDATE FREQUENCY:
- Daily: Price, volume, VIX
- Weekly: Macro indicators
- Trimestral: Fundamentals (earnings, guidance)
- Anual: Deep valuation review

STORAGE:
Warren schema en PostgreSQL:
- warren_companies (metadata)
- warren_fundamentals (scores, trimestral)
- warren_valuations (DCF, P/B, Fair value)
- warren_positions (current holdings)
- warren_decisions (history de acciones)
- warren_assessments (daily reports)
```

### Risk Management
```
Position Limits:
- Max 5% por posición individual
- Max 3 por sector
- Min 20% cash reserve
- Max 10 posiciones simultaneously

Loss Management:
- Stop loss at -30% from entry
- Trim if position > 8% cartera
- Rebalance trim quarterly
```

---

## 📋 9. ORDEN DE IMPLEMENTACIÓN (Sin Código Aún)

**FASE A: Foundation (1 semana)**
- [ ] Diseño DB schema Warren
- [ ] Setup data fetchers (FRED, Alpaca, Finnhub)
- [ ] Create warren.module.ts structure

**FASE B: Core Engines (2-3 semanas)**
- [ ] Fundamental Scorer (ROE, Debt, FCF, etc.)
- [ ] DCF Valuation Engine
- [ ] Macro Context Analyzer
- [ ] Decision Logic Engine

**FASE C: Execution & API (1-2 semanas)**
- [ ] Warren Executor (recommendation, no auto-trade)
- [ ] Controllers & API endpoints
- [ ] Integration with shared data

**FASE D: Validation & Hardening (1 semana)**
- [ ] Test isolation from Tito
- [ ] Backtest decision logic
- [ ] Manual trading validation

---

## 🔒 10. GARANTÍAS DE AISLAMIENTO

```
✅ Warren NUNCA puede:
  - Access Tito's ExecutionEngine
  - Modify Tito's risk gates
  - Affect Tito's strategy selection
  - Share decision logic (only data signals)

✅ Tito NUNCA es:
  - Blockeado por Warren
  - Lentificado por Warren
  - Afectado por cambios Warren

✅ Shared Resources:
  - PostgreSQL: Separate schemas (warren_*, tito_*)
  - Data Fetchers: Read-only interfaces
  - Audit Trail: Separate entries
  - API: Separate endpoints (/tito/* vs /warren/*)
```

---

## 📈 11. SUCCESS METRICS (Post-Implementation)

```
FUNDAMENTALS:
- Beating benchmark (S&P 500) over 3+ year periods
- Win rate > 60% (profitable positions)
- Sharpe ratio > 1.0
- Max drawdown < 20%

OPERATIONAL:
- Zero impact on Tito performance
- Complete isolation verified
- Data quality: 99.9% accuracy
- Update latency < 5 sec
```

---

## ✅ READINESS CHECKLIST

- [ ] Mission & horizon: CLEAR
- [ ] Fundamental criteria: DEFINED
- [ ] Scoring system: SPECIFIED (0-100)
- [ ] Decision rules: DOCUMENTED
- [ ] Data sources: IDENTIFIED
- [ ] Shared/isolated info: SEPARATED
- [ ] Module architecture: PLANNED
- [ ] Implementation order: SEQUENCED
- [ ] Isolation guarantees: CONFIRMED

**STATUS: READY FOR APPROVAL**

---

**Next Step:** ¿Aprobado este plan? ¿Ajustes antes de implementar módulos?
