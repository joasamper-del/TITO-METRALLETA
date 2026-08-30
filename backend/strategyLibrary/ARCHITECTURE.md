# 🏗️ Estrategia Library Architecture

## Principios

1. **Separación de responsabilidades:**
   - Estrategias solo **recomiendan entrada** (signal score, timing)
   - `OperationManager` maneja **gestión de la operación** (trailing, protección, reentrada, salida)

2. **DRY (Don't Repeat Yourself):**
   - Trailing stop, profit protection, reentrada = código compartido
   - Evitar duplicación entre 10 estrategias

3. **Escalabilidad:**
   - Agregar nueva estrategia = crear 1 archivo, heredar de `BaseStrategy`
   - Automáticamente usa todos los managers

---

## Estructura de Carpetas

```
backend/
├── strategyLibrary/
│   ├── core/
│   │   ├── trailingExit.ts         ← Trailing Exit + Reentrada (9/10)
│   │   ├── trendContinuation.ts    ← Tendencia (variante de Trailing Exit)
│   │   ├── meanReversion.ts        ← Mean Reversion (7.5/10)
│   │   └── breakout.ts             ← Breakout Momentum (8/10)
│   │
│   ├── options/
│   │   ├── bullCallSpread.ts       ← Bull Call Spread (7.5/10)
│   │   ├── bearPutSpread.ts        ← Bear Put Spread (7.5/10)
│   │   ├── longStraddle.ts         ← Long Straddle (7/10)
│   │   └── longStrangle.ts         ← Long Strangle (6.5/10)
│   │
│   ├── special/
│   │   ├── wheel.ts                ← Wheel Strategy (8/10)
│   │   ├── pullbackVWAP.ts         ← Pullback a VWAP (7/10)
│   │   └── volatilityExpansion.ts  ← Volatility Expansion (7/10)
│   │
│   ├── base/
│   │   ├── BaseStrategy.ts         ← Clase abstracta para todas
│   │   ├── StrategyConfig.ts       ← Tipos y constantes
│   │   └── StrategyRegistry.ts     ← Catálogo + selector automático
│   │
│   └── index.ts                    ← Exports públicos
│
├── operationManager/
│   ├── OperationManager.ts         ← Orquestador central
│   ├── managers/
│   │   ├── TrailingStopManager.ts  ← Aplicar/mantener trailing stops
│   │   ├── ProfitProtectionManager.ts ← Proteger ganancias
│   │   ├── ReentryManager.ts       ← Validar y ejecutar reentradas
│   │   ├── ExitManager.ts          ← Cerrar posiciones
│   │   └── PositionTracker.ts      ← Rastrear estado de posiciones
│   │
│   └── index.ts                    ← Exports públicos
│
├── evaluators/
│   ├── SignalScoreCalculator.ts    ← Calcula puntaje 0-100
│   ├── VolumeConfirmation.ts       ← Valida volumen 4 capas
│   ├── VolatilityFilter.ts         ← Ajusta según volatilidad
│   ├── RegimeDetector.ts           ← Detecta régimen (alcista/bajista/lateral)
│   └── index.ts
│
├── learning/
│   ├── StrategyLogger.ts           ← Guarda learning logs
│   ├── PerformanceTracker.ts       ← Calcula ROI, hit rate
│   └── index.ts
│
└── types/
    ├── Strategy.ts                 ← TypeScript interfaces
    ├── Trade.ts                    ← Estructura de trade
    ├── MarketData.ts               ← Datos de mercado
    └── index.ts
```

---

## Flujo de Ejecución

### 1. Detección de Régimen (cada minuto)
```
RegimeDetector:
  - MA50 vs MA200 → Tendencia
  - RSI → Momentum
  - VIX / σ → Volatilidad
  - Earnings calendar → Eventos
  
Output: { regime: "BULLISH_STRONG" | "BEARISH" | "LATERAL" | "HIGH_VOL", ... }
```

### 2. Selección de Estrategias (basado en régimen)
```
StrategyRegistry.selectStrategies(regime):
  SI regime = "BULLISH_STRONG"
    → Retorna: [TrailingExit, Breakout, BullCallSpread]
  SI regime = "LATERAL"
    → Retorna: [MeanReversion, Pullback VWAP, BullCallSpread]
  ...
```

### 3. Evaluación de Señales (para cada estrategia seleccionada)
```
Cada estrategia evalúa:
  1. SignalScoreCalculator → 0-100
  2. VolumeConfirmation → 4 capas
  3. VolatilityFilter → Ajusta parámetros
  
Output: { strategy, signalScore: 78, volumeConfirmed: true, recommendation: "ENTER" }
```

### 4. Gestión de Operación (todas usan OperationManager)
```
OperationManager.executeAndManage({
  strategy: "TrailingExit",
  entry: { price: 554.32, quantity: 100, stopLoss: 543.72 },
  rules: { trailing: true, trailingDistance: 1.5%, reentryMax: 2 }
}):
  → TrailingStopManager: Mantiene trailing stop actualizado
  → ProfitProtectionManager: Protege ganancias parciales
  → ReentryManager: Valida reentradas según reglas
  → ExitManager: Cierra cuando cumple targets
  → PositionTracker: Registra estado en tiempo real
  → StrategyLogger: Guarda learning log con decisiones
```

---

## Interfaces Clave

### BaseStrategy (todas heredan)
```typescript
abstract class BaseStrategy {
  abstract name: string;
  abstract minSignalScore: number;
  abstract evaluate(marketData): Promise<StrategySignal>;
  abstract getRiskParameters(): RiskParameters;
  abstract getExplanation(): string; // "Buenos días, SPY está..."
}
```

### OperationManager (orquestador)
```typescript
class OperationManager {
  async executeAndManage(config: OperationConfig): Promise<void>;
  getActivePosition(symbol): Position | null;
  getAllPositions(): Position[];
  getPerformanceStats(): PerformanceStats;
}
```

### StrategyRegistry (catálogo + selector)
```typescript
class StrategyRegistry {
  registerStrategy(strategy: BaseStrategy): void;
  getStrategyByName(name: string): BaseStrategy;
  selectStrategies(regime: MarketRegime): BaseStrategy[];
  getAllStrategies(): BaseStrategy[];
}
```

---

## Ventajas de esta Arquitectura

✅ **DRY:** Trailing stop, reentrada, protección = 1 implementación para 10 estrategias  
✅ **Escalable:** Agregar estrategia = heredar BaseStrategy + registrar en StrategyRegistry  
✅ **Mantenible:** Cambiar lógica de trailing → cambio en 1 lugar  
✅ **Testeable:** Cada manager y estrategia tiene tests aislados  
✅ **Transparente:** Cada decisión se explica en lenguaje natural + learning log  

---

## Siguiente Fase

1. Crear `BaseStrategy` y tipos TypeScript
2. Implementar `OperationManager` con los 5 managers
3. Codificar estrategias CORE (Trailing Exit, Mean Reversion, Breakout)
4. Agregar evaluadores (SignalScore, VolumeConfirmation, etc.)
5. Integrar con decisioning pipeline existente de Tito Core

**Sin ejecutar nada.** Solo especificación + interfaces.
