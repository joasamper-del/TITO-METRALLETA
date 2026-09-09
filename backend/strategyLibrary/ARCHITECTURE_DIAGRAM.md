# 📊 Strategy Library - Diagrama de Arquitectura

## Flujo de Ejecución Completo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MARKET DATA INCOMING                              │
│              (Price, Volume, Indicators, Liquidez, Events)              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      1. REGIME DETECTION                                 │
│  RegimeDetector (pendiente)                                             │
│  - MA50 vs MA200 → Tendencia                                            │
│  - RSI → Momentum                                                        │
│  - VIX / σ → Volatilidad                                                │
│  - Earnings calendar → Eventos                                          │
│  OUTPUT: { regime: "BULLISH_STRONG" | "LATERAL" | "HIGH_VOL", ... }   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              2. STRATEGY SELECTION (StrategyRegistry)                    │
│  selectForRegime(regime) → [Estrategia1, Estrategia2, ...]            │
│                                                                          │
│  Ejemplo: regime=BULLISH_STRONG                                         │
│  → Retorna: [TrailingExit, Breakout, BullCallSpread]                   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┬─────────────┐
                    │                     │             │
                    ▼                     ▼             ▼
        ┌─────────────────────┐ ┌──────────────┐ ┌──────────────┐
        │ TrailingExit        │ │ Breakout     │ │ BullCall     │
        │ Strategy            │ │ Strategy     │ │ Spread       │
        └──────────┬──────────┘ └──────┬───────┘ └──────┬───────┘
                   │                  │              │
                   └──────────────────┼──────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│         3. STRATEGY EVALUATION (cada estrategia en paralelo)             │
│                                                                          │
│  Para cada estrategia: await strategy.evaluate(marketData, config)     │
│                                                                          │
│  BaseStrategy.evaluate() pipeline:                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 3a. Validate Rules (subclass-specific)                         │   │
│  │     ✓ Tendencia OK? ✓ RSI rango? ✓ Volumen participado?       │   │
│  │     ✓ No earnings? → DECISION: Continuar o BLOCKED            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│           ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 3b. Calculate Score Factors (subclass-specific)                │   │
│  │     calculateScoreFactors() → [Factor1, Factor2, ...]          │   │
│  │     {name, value 0-100, weight, explanation}                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│           ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 3c. Signal Score Calculator                                    │   │
│  │     Score = Σ(factor.value × factor.weight)                    │   │
│  │     Result: 0-100                                              │   │
│  │                                                                  │   │
│  │     Ejemplo: Trailing Exit                                     │   │
│  │     Tendencia:  25 × 0.25 = 6.25                               │   │
│  │     RSI:        20 × 0.20 = 4.0                                │   │
│  │     SuperTrend: 20 × 0.20 = 4.0                                │   │
│  │     Volumen:    15 × 0.15 = 2.25                               │   │
│  │     Liquidez:   10 × 0.10 = 1.0                                │   │
│  │     Régimen:    10 × 0.10 = 1.0                                │   │
│  │     ─────────────────────────────                              │   │
│  │     TOTAL:                  = 18.5/100                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│           ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 3d. Volume Confirmation (4 capas)                              │   │
│  │     Layer1: Vol absoluto > promedio × 1.2                      │   │
│  │     Layer2: Vol en precio > percentil 75                       │   │
│  │     Layer3: Aceleración volumen (último 30min acelerado)       │   │
│  │     Layer4: Volumen en breakout participado                    │   │
│  │                                                                  │   │
│  │     LÓGICA: Layer1 ✅ Y (Layer2 ✅ O Layer3 ✅) = Confirmado   │   │
│  │     Result: { isConfirmed: true/false, confidence: 0-100 }     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│           ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 3e. Volatility Filter                                          │   │
│  │     Detecta nivel: LOW / MEDIUM / HIGH / EXTREME               │   │
│  │     Aplica multipliers:                                         │   │
│  │     - stopLossMultiplier (0.75-2.0x)                           │   │
│  │     - trailingMultiplier (0.67-2.0x)                           │   │
│  │     - positionSizeMultiplier (0.5-1.1x)                        │   │
│  │     - minSignalScoreRequired (70-85)                           │   │
│  │     - isBlocked (true si EXTREME)                              │   │
│  │                                                                  │   │
│  │     Ejemplo: Si EXTREME (>75p)                                 │   │
│  │     SL: 1.5% → 3.0%, Trailing: 1.5% → 3.0%, Size: -50%        │   │
│  │     Score requerido: 85+ (muy selectivo)                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│           ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 3f. Make Recommendation                                        │   │
│  │     IF isBlocked → BLOCKED                                     │   │
│  │     IF score ≥ minScore AND volumeConfirmed → ENTER            │   │
│  │     IF score ≥ minScore × 0.8 → HOLD (esperar confirmación)   │   │
│  │     ELSE → BLOCKED                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│           ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 3g. Build Natural Language Explanation                         │   │
│  │     buildNaturalLanguageExplanation() → string                 │   │
│  │                                                                  │   │
│  │     Ejemplo output:                                            │   │
│  │     "Buenos días. SPY está rompiendo al alza con:              │   │
│  │      - Tendencia clara (MA50 558 > MA200 545): Alcista ✅     │   │
│  │      - RSI en 62 (50-70): Bullish sin sobrecompra ✅           │   │
│  │      - SuperTrend: BULLISH ✅                                  │   │
│  │      - Volumen: 89M vs media 75M (18% arriba) ✅              │   │
│  │      - VIX: 18 (bajo) ✅                                       │   │
│  │      PUNTUACIÓN TOTAL: 84/100 (ENTRADA FUERTE)                 │   │
│  │      → Entrando en SPY a 554.32 con stop 543.72 (2% riesgo)"   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│           ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 3h. Return StrategySignal                                      │   │
│  │     {                                                           │   │
│  │       strategy: "TRAILING_EXIT",                               │   │
│  │       signalScore: 84,                                         │   │
│  │       recommendation: "ENTER",                                 │   │
│  │       volumeConfirmed: true,                                   │   │
│  │       volatilityAdjustment: 1.0,                               │   │
│  │       entryPrice: 554.32,                                      │   │
│  │       entryQuantity: 100,                                      │   │
│  │       stopLossPrice: 543.72,                                   │   │
│  │       takeProfitTargets: [565.90, 577.48],                     │   │
│  │       explanation: "Buenos días...",                           │   │
│  │       evaluationDetails: { ... }                               │   │
│  │     }                                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬──────────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
        ┌─────────────────────┐ ┌──────────────────┐
        │ ENTER (score 84)    │ │ BLOCKED (score   │
        │ Signal #1           │ │ 45) Signal #2    │
        └──────────┬──────────┘ └────────┬─────────┘
                   │                    │
                   ▼                    │ (Descartada)
┌─────────────────────────────────────────────────────────────────────────┐
│        4. OPERATION MANAGER (Ejecutar señales ENTER)                    │
│  OperationManager.executeAndManage(signal)                             │
│                                                                          │
│  Crea Position: {                                                       │
│    positionId: "SPY_20260830_001",                                      │
│    strategy: "TRAILING_EXIT",                                           │
│    entryPrice: 554.32,                                                  │
│    stopLossPrice: 543.72,                                               │
│    trailingActive: true,                                                │
│    reentryCount: 0,                                                     │
│    maxReentries: 2,                                                     │
│    ...                                                                   │
│  }                                                                       │
│                                                                          │
│  Inicia 5 Managers (paralelo):                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 4a. TrailingStopManager                                         │  │
│  │     - Mantiene trailing stop dinámico                           │  │
│  │     - Cada minuto: si price > max, actualizar trailing price    │  │
│  │     - Si price cae a trailing stop → Cierra posición           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 4b. ProfitProtectionManager                                     │  │
│  │     - Si ganancia ≥ 1%, activa stop a breakeven                 │  │
│  │     - Si ganancia ≥ 2%, mueve stop a +1%                        │  │
│  │     - Protege ganancias mientras trailing sigue subiendo        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 4c. ReentryManager                                              │  │
│  │     - Monitorea si se cierra por Trailing Stop                  │  │
│  │     - Si reentryCount < 2:                                      │  │
│  │       1. Espera 5 minutos (confirmación de pullback)           │  │
│  │       2. Re-evalúa estrategia (recalcula score)                │  │
│  │       3. Si score ≥ threshold, ejecuta reentrada               │  │
│  │     - Registra learnings de cada reentrada                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 4d. ExitManager                                                 │  │
│  │     - Monitorea targets (TP1, TP2, TP3)                         │  │
│  │     - Cierra posiciones si:                                     │  │
│  │       × Price toca TP1 → Cierra 33% con ganancia               │  │
│  │       × Price toca TP2 → Cierra otro 33% con ganancia          │  │
│  │       × Price toca TP3 o trailing → Cierra último 34%          │  │
│  │     - Cierra por SL, patrón, régimen, earnings, etc.          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 4e. PositionTracker                                             │  │
│  │     - Actualiza cada segundo: currentPrice, P&L, max/min        │  │
│  │     - Registra cada evento (entry, exit, reentrada)            │  │
│  │     - Genera learning log con decisiones y outcomes            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              5. LEARNING & LOGGING (StrategyLogger)                     │
│                                                                          │
│  TradeLog {                                                              │
│    entries: [                                                            │
│      {timestamp, price, qty, signalScore, volumeConfirmed, explanation}│
│    ],                                                                    │
│    exits: [                                                              │
│      {timestamp, price, reason, P&L%, duration}                         │
│    ],                                                                    │
│    reentries: [                                                          │
│      {number, timestamp, price, success, reasoning}                     │
│    ],                                                                    │
│    learnings: [                                                          │
│      "Reentradas funcionan bien cuando volumen acelera",                │
│      "Score 76 es suficiente si volumen está en Level 2",              │
│      "Trailing en volatilidad media es mejor que en baja"               │
│    ]                                                                     │
│  }                                                                       │
│                                                                          │
│  PerformanceStats {                                                      │
│    totalTrades: 47,                                                     │
│    winningTrades: 41,                                                   │
│    winRate: 87.2%,                                                      │
│    netProfit: $3,240,                                                   │
│    profitFactor: 2.1,                                                   │
│    byStrategy: {                                                         │
│      "TRAILING_EXIT": {trades: 24, winRate: 92%, netProfit: $2100},    │
│      "BREAKOUT": {trades: 15, winRate: 80%, netProfit: $900},          │
│      "MEAN_REVERSION": {trades: 8, winRate: 75%, netProfit: $240}      │
│    }                                                                     │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Organización Modular (DRY Principle)

```
ESTRATEGIAS (10)                     MANAGERS (5, Compartidos)
────────────────                     ──────────────────────────
1. TrailingExit                      TrailingStopManager
   ├─ calculateScoreFactors()           (comparte código)
   ├─ validateRules()              
   └─ getRiskParameters()           

2. MeanReversion                      ProfitProtectionManager
   ├─ calculateScoreFactors()           (comparte código)
   ├─ validateRules()              
   └─ getRiskParameters()           

3. Breakout                          ReentryManager
   ├─ calculateScoreFactors()           (comparte código)
   ├─ validateRules()              
   └─ getRiskParameters()           

... (7 más)                          ExitManager
                                        (comparte código)

                                     PositionTracker
                                        (comparte código)


RESULTADO: 
- Cada estrategia: ~200-300 líneas (específica)
- Cada manager: ~300-400 líneas (compartido)
- Total: ~3500 líneas de código, NO 10,000+
```

---

## Flujo de Selección de Estrategia (Matriz de Regímenes)

```
Régimen                   → Estrategias Recomendadas

BULLISH_STRONG:
  ✅ Trailing Exit, Trend Continuation, Breakout
  ✅ Bull Call Spread
  ❌ Mean Reversion (sin dips en tendencia fuerte)

BULLISH_WEAK:
  ✅ Mean Reversion, Trend Continuation, Breakout, Wheel
  ❌ Trailing Exit (poco movimiento)

BEARISH_STRONG:
  ✅ Trailing Exit (SHORT), Bear Put Spread
  ❌ Bull Call Spread

BEARISH_WEAK:
  ✅ Bear Put Spread, Mean Reversion (SHORT)
  ✅ Pullback VWAP (SHORT)

LATERAL:
  ✅ Mean Reversion, Pullback VWAP
  ✅ Bull Call Spread, Bear Put Spread, Wheel
  ❌ Trailing Exit (sin dirección)

HIGH_VOLATILITY:
  ✅ Volatility Expansion, Long Straddle, Long Strangle
  ⚠️ Reduce Trailing Exit (-20% size, +20% SL)
  ❌ Mean Reversion, Wheel

EARNINGS_EVENT:
  ✅ Long Straddle, Long Strangle
  ❌ TODO LO DEMÁS (riesgo overnight)
```

---

## Arquitectura de Carpetas (Implementación)

```
backend/strategyLibrary/
│
├── ARCHITECTURE.md                  ← Este documento
├── IMPLEMENTATION_STATUS.md
│
├── types/
│   ├── Strategy.ts                  ✅ CREADO
│   └── index.ts
│
├── base/
│   ├── BaseStrategy.ts              ✅ CREADO
│   ├── StrategyRegistry.ts          ✅ CREADO
│   └── index.ts
│
├── evaluators/
│   ├── SignalScoreCalculator.ts     ✅ CREADO
│   ├── VolumeConfirmation.ts        ✅ CREADO
│   ├── VolatilityFilter.ts          ✅ CREADO
│   ├── RegimeDetector.ts            (Pendiente)
│   └── index.ts
│
├── core/                             (Estrategias CORE)
│   ├── TrailingExitStrategy.ts      (Sesión 41)
│   ├── TrendContinuationStrategy.ts (Sesión 42)
│   ├── MeanReversionStrategy.ts     (Sesión 42)
│   ├── BreakoutStrategy.ts          (Sesión 42)
│   └── index.ts
│
├── options/                          (Estrategias OPTIONS)
│   ├── BullCallSpreadStrategy.ts    (Sesión 43)
│   ├── BearPutSpreadStrategy.ts     (Sesión 43)
│   ├── LongStraddleStrategy.ts      (Sesión 43)
│   ├── LongStrangleStrategy.ts      (Sesión 43)
│   └── index.ts
│
├── special/                          (Estrategias SPECIAL)
│   ├── WheelStrategy.ts             (Sesión 43)
│   ├── PullbackVWAPStrategy.ts      (Sesión 43)
│   ├── VolatilityExpansionStrategy.ts (Sesión 43)
│   └── index.ts
│
├── operationManager/                 (Managers compartidos)
│   ├── OperationManager.ts          (Sesión 44)
│   ├── managers/
│   │   ├── TrailingStopManager.ts    (Sesión 44)
│   │   ├── ProfitProtectionManager.ts (Sesión 44)
│   │   ├── ReentryManager.ts         (Sesión 44)
│   │   ├── ExitManager.ts            (Sesión 44)
│   │   └── PositionTracker.ts        (Sesión 44)
│   └── index.ts
│
├── learning/                         (Logging & Analytics)
│   ├── StrategyLogger.ts            (Sesión 45)
│   ├── PerformanceTracker.ts        (Sesión 45)
│   └── index.ts
│
└── index.ts                          (Exports públicos)
```

---

## Integración con Tito Core

```
Tito Core DecisionEngine
        ↓
    StrategyLibrary
        ↓
   RegimeDetector → Detecta mercado
        ↓
   StrategyRegistry → Selecciona estrategias
        ↓
   Para cada estrategia:
    - BaseStrategy.evaluate()
    - SignalScoreCalculator
    - VolumeConfirmation
    - VolatilityFilter
        ↓
   StrategySignals [] (recomendaciones)
        ↓
   OperationManager → Ejecuta posiciones
    - TrailingStopManager
    - ProfitProtectionManager
    - ReentryManager
    - ExitManager
    - PositionTracker
        ↓
   StrategyLogger → Learning + Stats
        ↓
   Tito UI Dashboard (visualizar trades, learnings, stats)
```

---

## Key Takeaways

1. **DRY Principle:** 1 implementación de trailing stop para 10 estrategias
2. **Template Method:** BaseStrategy.evaluate() define el flujo, subclases implementan específicos
3. **Composable Scoring:** Score = Σ(factor × weight), pesos varían por estrategia
4. **Multi-layer Validation:** Score + Volumen + Volatilidad + Reglas específicas
5. **Intelligent Selection:** Régimen → Estrategias recomendadas (matriz de "mejor en")
6. **Learning System:** Cada trade registra decisión, outcome, lección para futuro
7. **No Duplication:** OperationManager comparte lógica crítica, estrategias son thin wrappers
