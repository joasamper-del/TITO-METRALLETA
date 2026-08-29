# Backtesting — Validar antes de Live

## Qué testear

1. **Decision Engine** → Genera `DecisionDetails` consistentes
2. **Specialists Block** → 4 especialistas votean y generan `SpecialistsAnalysis`
3. **Operation Builder** → Convierte en salida accionable (`Operation`)
4. **Prediction 5min** → Predice rango, compara con real, genera `Prediction5minResult`

## Estructura de backtesting

```
lib/tito-core/
  ├── decisionEngine.test.ts       ← tests unitarios de Decision Engine
  ├── specialistsEngine.test.ts    ← tests de especialistas
  ├── operationBuilder.test.ts     ← tests de Operation
  ├── predictionModule5min.test.ts ← tests de predicción
  └── backtest-runner.ts           ← orquestador de backtesting histórico
```

## Escenarios de prueba

### Scenario 1: Datos de buena calidad + Reglas duras pasan
**Setup:**
```typescript
const snapshot = {
  dataQuality: "alta",
  rules: [
    { category: "gex", passed: true },
    { category: "tape", passed: true },
    { category: "liquidez", passed: true },
    { category: "candle", passed: true },
  ]
};
```

**Expected:**
- `status` = "operar"
- `confidence` ≥ 70
- `stopLoss` < `spot`
- `takeProfit` > `spot`
- `recommendation` = "call" | "put"

### Scenario 2: Datos bajos
**Setup:**
```typescript
const snapshot = { dataQuality: "baja" };
```

**Expected:**
- `status` = "revisar manualmente"
- `confidence` = 0
- `recommendation` = "no operar"

### Scenario 3: Regla dura rota
**Setup:**
```typescript
const snapshot = {
  dataQuality: "alta",
  rules: [
    { category: "liquidez", passed: false } // HARD RULE roto
  ]
};
```

**Expected:**
- `status` = "no operar"
- `confidence` = 5
- `stopLoss` = null

### Scenario 4: Falta candle
**Setup:**
```typescript
const snapshot = {
  dataQuality: "alta",
  rules: [
    { category: "gex", passed: true },
    { category: "tape", passed: true },
    { category: "candle", passed: false } // Falta patrón
  ]
};
```

**Expected:**
- `status` = "esperar"
- `confidence` = 50-70 (depende de cuántas pasaron)
- `stopLoss` = -2%
- `takeProfit` = +3%

### Scenario 5: Devil's Advocate veta
**Setup:**
```typescript
const specialists = analyzeDevilsAdvocate({
  liquidityRatio: 0.2, // < 0.3 = veto
  spreadBps: 20,
  skewFlags: ["disaster"],
  timeToExpiry: 30,
  ivRank: 95
});
```

**Expected:**
- `specialists.veto` = true
- `operation.recommendation` = "no operar"
- Razón clara: "VETO: Liquidez crítica"

## Test de Prediction 5min

```typescript
// Paso 1: Generar predicción
const pred = generatePrediction5min(
  "SPY",
  450.00,
  0.18, // IV
  +45, // momentum alcista
  { high: 451, low: 449 } // swings recientes
);

expect(pred.predictedHigh).toBeGreaterThan(pred.currentPrice);
expect(pred.predictedLow).toBeLessThan(pred.currentPrice);
expect(pred.confidence).toBeGreaterThan(50);

// Paso 2: Esperar 5 minutos (en test: simulado)
const result = validatePrediction5min(
  pred,
  449.50, // actualLow
  451.75, // actualHigh (tocó predicted high)
  451.00  // actualClose (cerró alcista)
);

// Verificaciones
expect(result.hitHigh).toBe(true);
expect(result.directionCorrect).toBe(true);
expect(result.accuracyScore).toBeGreaterThan(60);
```

## Backtesting histórico (papel)

```typescript
// backtest-runner.ts

export async function runBacktest(params: {
  symbol: string;
  startDate: Date;
  endDate: Date;
  candleSize: "1m" | "5m" | "1h"; // para generar predicciones
  dataSource: "mock" | "massive"; // datos históricos
}): Promise<BacktestResult> {
  // 1. Cargar barras históricas
  const bars = await loadHistoricalBars(params.symbol, params.startDate, params.endDate);

  // 2. Para cada barra: generar operación (sin ejecutarla)
  const operations: Array<Operation & { result: "win" | "loss" }> = [];

  for (let i = 0; i < bars.length - 1; i++) {
    const currentBar = bars[i];
    const nextBar = bars[i + 1]; // resultado real

    // Genera análisis como si fuera tiempo real
    const decision = buildDecision(evaluateRules(currentBar), currentBar.quality);
    const specialists = synthesizeSpecialists(
      analyzeGEX(currentBar),
      analyzeTAPE(currentBar),
      analyzeDELTA(currentBar),
      analyzeDevilsAdvocate(currentBar)
    );
    const operation = buildOperation(decision, specialists, currentBar.close, 30);

    // Valida contra barra siguiente
    if (operation.action !== "no operar") {
      const isWin = 
        (operation.action === "call" && nextBar.close > operation.entryPrice!) ||
        (operation.action === "put" && nextBar.close < operation.entryPrice!);

      operations.push({
        ...operation,
        result: isWin ? "win" : "loss"
      });
    }
  }

  // 3. Calcula estadísticas
  const stats = calculateBacktestStats(operations);

  return {
    symbol: params.symbol,
    period: { start: params.startDate, end: params.endDate },
    totalOperations: operations.length,
    wins: operations.filter(o => o.result === "win").length,
    losses: operations.filter(o => o.result === "loss").length,
    winRate: (operations.filter(o => o.result === "win").length / operations.length) * 100,
    avgConfidenceWinners: avg(operations.filter(o => o.result === "win").map(o => o.confidence)),
    avgConfidenceLosers: avg(operations.filter(o => o.result === "loss").map(o => o.confidence)),
    stats
  };
}
```

## Criterios de aceptación ANTES de live

| Métrica | Mínimo aceptable | Ideal |
|---------|-----------------|-------|
| Win rate | 55% | 60%+ |
| Confidence calibration | 10pts gap | 15pts+ |
| Avg accuracy (5min pred) | 55% | 65%+ |
| Direction hit rate (5min) | 52% | 58%+ |
| Operations con veto | 0 falsos positivos | 0 |

## Checklist antes de live

- [ ] Todos los tests unitarios pasan
- [ ] Backtesting en 30 días históricos → win rate ≥ 55%
- [ ] Decision Engine coherente (ningún estado contradictorio)
- [ ] Especialistas no tienen conflictos lógicos
- [ ] Operation Builder valida todas las operaciones
- [ ] 5min predictions calibradas (confianza vs. acierto)
- [ ] Documentación de cada módulo revisada
- [ ] Plan de monitoring en vivo escrito

## Ambiente de prueba (paper trading)

Cuando todo pase backtesting:

1. **Paper mode:** Genera operaciones reales pero NO LAS EJECUTA
2. **Log cada operación:** timestamp, decision, specialists, operation, resultado 5min después
3. **Monitorea 5 días en vivo** antes de activar ejecución

```typescript
// app/api/paper-trading/route.ts

export async function POST(req: Request) {
  const snapshot = await fetchLiveSnapshot();
  const decision = buildDecision(...);
  const operation = buildOperation(...);

  // Log sin ejecutar
  await savePaperTrade({
    timestamp: Date.now(),
    symbol: snapshot.symbol,
    operation,
    status: "simulated"
  });

  // Devuelve al UI para visualización
  return Response.json({ operation, message: "PAPER MODE - no ejecutada" });
}
```

## Errores comunes en backtesting

1. **Lookahead bias:** Usar datos del futuro (ej: cierre de día para generar operación intradía)
   - FIX: Usar SOLO datos disponibles en el momento de operación

2. **Overfitting:** Ajustar parámetros al histórico pasado
   - FIX: Validar en OUT-OF-SAMPLE period

3. **Ignoring slippage:** Asumir ejecución a precio exacto
   - FIX: Aplicar spread real (bid/ask)

4. **Survivor bias:** Solo testear tickers que existen hoy
   - FIX: Incluir delisted stocks o bankrupt companies si es posible

## Métricas avanzadas (futuro)

- Sharpe ratio (returns / volatilidad)
- Máximo drawdown
- Profit factor (ganancia total / pérdida total)
- CAGR (retorno anualizado)
- Sortino ratio

Por ahora: **Win rate + Confidence calibration + Direction accuracy**.
