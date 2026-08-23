# 🏗️ ARQUITECTURA TÉCNICA - TITO METRALLETA

## Visión General

Tito Metralleta es un sistema de análisis de trading construido con **arquitectura modular en capas**. El sistema está diseñado para ser:

- **Independiente**: Cada motor funciona por sí solo
- **Extensible**: Fácil de agregar nuevos componentes
- **Configurable**: Personalizable sin modificar código core
- **Testeable**: Componentes aislados facilitan pruebas

## Capas Arquitectónicas

```
┌─────────────────────────────────────────────────┐
│         INTERFAZ WEB (Próximo)                  │
│  ┌─────────────────────────────────────────────┐│
│  │   Componentes React / HTML / Dashboard      ││
│  └─────────────────────────────────────────────┘│
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│       COORDINADOR (Analyzer)                    │
│  ┌─────────────────────────────────────────────┐│
│  │ TitoMetralletaAnalyzer (src/core/analyzer) ││
│  │ - Orquesta los 3 motores                   ││
│  │ - Gestiona flujo de datos                  ││
│  │ - Expone API pública                       ││
│  └─────────────────────────────────────────────┘│
└───┬──────────────┬──────────────┬───────────────┘
    │              │              │
    ▼              ▼              ▼
┌─────────────┬──────────────┬──────────────┐
│   MOTOR 1   │    MOTOR 2   │   MOTOR 3    │
│   DATOS     │    REGLAS    │   REPORTE    │
└─────────────┴──────────────┴──────────────┘
    │              │              │
    ▼              ▼              ▼
 [APIs]        [Lógica]      [Formatos]
 
```

## Tres Motores Desacoplados

### 1. DATA ENGINE (Motor de Datos)

**Responsabilidad**: Obtener datos de mercado

```
DataEngine
├── getMarketData(symbol)        → MarketData
├── getMarketContext()           → MarketContext (SPY, QQQ, VIX)
├── fetchAlphaVantageData()      → (privado)
├── fetchFinnhubData()           → (privado)
├── fetchRSI()                   → (privado)
├── fetchTrend()                 → (privado)
├── isMarketOpen()               → boolean
├── getTimeUntilClose()          → number | null
├── calculateLiquidity()         → number
└── determinePremiumDiscount()   → string
```

**Datos que obtiene**:
- Precio actual
- Volumen
- Liquidez (calculada)
- Tendencia (alcista/bajista/lateral)
- RSI (14 períodos)
- GEX (Gamma Exposure)
- Premium/Discount
- Soportes y resistencias
- Estado del mercado (abierto/cerrado)
- Tiempo hasta cierre

**APIs soportadas**:
- Alpha Vantage (históricos, RSI, SMA)
- Finnhub (quotes, datos generales)
- Extensible: fácil agregar más

**Característica clave**: Si no hay datos confiables, marca para revisión manual en lugar de inventar números.

### 2. RULES ENGINE (Motor de Reglas)

**Responsabilidad**: Evaluar datos contra reglas y calcular puntuación

```
RulesEngine
├── addRule(rule)                → void
├── getRule(id)                  → RuleConfig | undefined
├── getAllRules()                → RuleConfig[]
├── enableRule(id)               → void
├── disableRule(id)              → void
├── setRuleWeight(id, weight)    → void
├── evaluate(data, context)      → RuleEvaluation[]
└── analyzeData(data, context)   → AnalysisResult
```

**Reglas Incluidas** (10 reglas configurables por defecto):
1. `trend_bullish` - Tendencia alcista (25 pts)
2. `zone_premium` - Zona Premium (25 pts)
3. `volume_high` - Volumen > 1M (20 pts)
4. `gex_positive` - GEX positivo (20 pts)
5. `rsi_not_overbought` - RSI < 70 (10 pts)
6. `market_context_bullish` - SPY alcista (15 pts)
7. `vix_low` - VIX < 20 (10 pts)
8. `liquidity_sufficient` - Liquidez > 100k (10 pts)
9. `time_to_close_late` - >30 min al cierre (5 pts)
10. `price_at_level` - Precio en nivel importante (15 pts)

**Sistema de Puntuación**:
- Cada regla que se cumple suma sus puntos
- Puntuación máxima = suma de todos los pesos
- Resultado = (puntos / máximo) * 100 = 0-100%

**Decisiones Automáticas**:
- ✅ OPERAR: ≥85%
- ⏳ ESPERAR: 65-84%
- ❌ NO OPERAR: <65%

**Niveles de Riesgo**:
- 🟢 Bajo: ≥85%
- 🟡 Medio: 50-84%
- 🔴 Alto: <50%

**Personalización**:
```typescript
// Cambiar peso
rulesEngine.setRuleWeight('trend_bullish', 35);

// Deshabilitar regla
rulesEngine.disableRule('vix_low');

// Agregar regla nueva
rulesEngine.addRule({
  id: 'custom_rule',
  name: 'Mi Regla',
  enabled: true,
  weight: 20,
  condition: (data, context) => {
    return data.price > 100;
  },
  description: 'Verifica algo específico'
});
```

### 3. REPORT ENGINE (Motor de Reporte)

**Responsabilidad**: Generar reportes y registrar resultados

```
ReportEngine
├── generateReport(analysis, plan)       → OpportunityReport
├── generateManualReviewReport(...)      → OpportunityReport
├── formatReportForDisplay(report)       → string
├── recordTradeResult(...)               → TradeResult
├── generatePerformanceStats(results)    → Stats
└── analyzeRuleEffectiveness(reports)    → Map
```

**Funcionalidades**:
- Genera reportes con decisión + explicación
- Formatea para visualización legible
- Registra resultados de operaciones (win/loss)
- Almacena razones de éxito/fracaso
- Registra lecciones aprendidas
- Analiza efectividad de reglas en historial

**Formato de Reporte**:
```
═════════════════════════════════════════
📊 REPORTE TITO METRALLETA - AAPL
═════════════════════════════════════════

🎯 DECISIÓN FINAL: ✅ OPERAR
📈 Confianza: 87%
⚠️  Riesgo: 🟢 Bajo

📋 ESTRATEGIA: Momentum Intraday

✅ RAZONES PRINCIPALES:
   • Tendencia Alcista
   • Zona Premium
   • Volumen Alto
   ...

❌ CONDICIONES DE INVALIDACIÓN:
   • VIX Bajo (deshabilitada)
   ...

📍 PLAN:
   Entrada: $175.00
   Objetivo: $180.00
   Stop: $172.00

═════════════════════════════════════════
```

## Flujo de Datos

### Análisis Simple

```
1. Usuario llama: analyzeOpportunity('AAPL', 'Momentum', plan)
                          ↓
2. Analyzer solicita contexto
   DataEngine.getMarketContext() → (SPY, QQQ, VIX)
                          ↓
3. Analyzer obtiene datos del símbolo
   DataEngine.getMarketData('AAPL') → MarketData
                          ↓
4. Analyzer evalúa datos
   RulesEngine.analyzeData(data, context) → AnalysisResult
                          ↓
5. Analyzer genera reporte
   ReportEngine.generateReport(analysis, plan) → OpportunityReport
                          ↓
6. Retorna reporte al usuario
```

### Con Registro de Resultados

```
OpportunityReport
      ↓
Usuario ejecuta operación y registra resultado
      ↓
ReportEngine.recordTradeResult(report, resultado, razones, lecciones)
      ↓
TradeResult guardado en histórico
      ↓
ReportEngine.analyzeRuleEffectiveness(histórico)
      ↓
Identifica qué reglas funcionan
      ↓
Usuario ajusta pesos/reglas basado en análisis
```

## Tipos de Datos Principales

### MarketData
```typescript
{
  symbol: string              // 'AAPL', 'SPY', etc
  price: number              // Precio actual
  volume: number             // Volumen de hoy
  liquidity: number          // Volumen / spread
  trend: 'alcista' | 'bajista' | 'lateral' | 'desconocido'
  rsi: number | null         // 0-100
  gex: number | null         // Gamma exposure
  premiumDiscount: string    // 'premium', 'discount', etc
  support: number | null     // Nivel de soporte
  resistance: number | null  // Nivel de resistencia
  timestamp: Date
  dataSource?: string
}
```

### AnalysisResult
```typescript
{
  symbol: string
  strategy: string
  marketData: MarketData
  marketContext: MarketContext
  ruleEvaluations: RuleEvaluation[]
  totalScore: number
  maxScore: number
  percentageScore: number    // 0-100
  decision: 'operar' | 'esperar' | 'no_operar'
  confidence: number         // porcentaje
  riskLevel: 'bajo' | 'medio' | 'alto'
  mainReasons: string[]      // Reglas que pasaron
  invalidationConditions: string[] // Reglas que fallaron
  manualReviewNeeded: boolean
  manualReviewReasons: string[]
  timestamp: Date
}
```

### OpportunityReport
```typescript
{
  id: string                 // Identificador único
  symbol: string
  strategy: string
  state: 'operar' | 'esperar' | 'no_operar'
  confidence: number
  risk: 'bajo' | 'medio' | 'alto'
  mainReasons: string[]
  invalidationConditions: string[]
  plan: {
    entry: number | null
    target: number | null
    stop: number | null
    notes: string
  }
  analysis: AnalysisResult
  createdAt: Date
  
  // Después de ejecutar y registrar resultado:
  result?: 'ganancia' | 'pérdida'
  points?: number
  successReasons?: string[]
  failureReasons?: string[]
  lessons?: string[]
}
```

## Configuración y Extensibilidad

### Archivos de Configuración

**`src/config/defaultRules.ts`**:
- Pesos de reglas
- Umbrales de decisión
- Requisitos de datos
- Horarios de trading

Modificar este archivo es la forma más fácil de personalizar el sistema sin tocar el código de los motores.

### Agregar Nueva Regla

```typescript
rulesEngine.addRule({
  id: 'mi_regla_unica',
  name: 'Nombre Legible',
  enabled: true,
  weight: 20, // puntos si se cumple
  condition: (data: MarketData, context: MarketContext) => {
    // Tu lógica de evaluación
    return data.price > data.support && data.volume > 1000000;
  },
  description: 'Descripción para reportes'
});
```

### Conectar Nuevo Proveedor de Datos

En `DataEngine`, agregar nuevo método:

```typescript
async fetchNewSourceData(symbol: string): Promise<void> {
  // Obtener datos de nueva API
  // Actualizar marketData
}
```

### Cambiar Formato de Reporte

En `ReportEngine`, modificar o agregar nuevo método de formato.

## Flujo de Próxima Fase: Interfaz Web

La interfaz web (React/Node) usará esta arquitectura así:

```
Cliente (React)
    ↓
API REST (Node.js)
    ├── POST /analyze  → TitoMetralletaAnalyzer.analyzeOpportunity()
    ├── GET /rules → RulesEngine.getAllRules()
    ├── PUT /rules/:id → RulesEngine.setRuleWeight()
    ├── POST /results → ReportEngine.recordTradeResult()
    └── GET /stats → ReportEngine.generatePerformanceStats()
    ↓
Base de Datos (PostgreSQL/MongoDB)
    ├── Reportes
    ├── Resultados
    └── Histórico de operaciones
```

## Testing

Cada motor puede testearse independientemente:

```typescript
// Test de DataEngine
const dataEngine = new DataEngine(key1, key2);
const marketData = await dataEngine.getMarketData('AAPL');
expect(marketData.price).toBeGreaterThan(0);

// Test de RulesEngine
const rulesEngine = new RulesEngine();
const evals = rulesEngine.evaluate(mockData, mockContext);
expect(evals.length).toBeGreaterThan(0);

// Test de ReportEngine
const reportEngine = new ReportEngine();
const report = reportEngine.generateReport(mockAnalysis, mockPlan);
expect(report.decision).toBeDefined();
```

## Performance y Escalabilidad

### Optimizaciones Actuales
- Caché de datos de mercado (implementable)
- Reglas evaluadas en paralelo (implementable)
- Análisis de múltiples símbolos simultáneos

### Mejoras Futuras
- Caché distribuido (Redis)
- Base de datos para histórico
- WebSocket para datos en tiempo real
- Análisis ML de reglas
- Alertas automáticas

## Resumen

| Componente | Responsabilidad | Entrada | Salida |
|-----------|-----------------|---------|--------|
| Data Engine | Obtener datos de mercado | Símbolo | MarketData |
| Rules Engine | Evaluar datos vs reglas | MarketData + Context | AnalysisResult |
| Report Engine | Generar reportes + historial | AnalysisResult + Plan | OpportunityReport |
| Analyzer | Orquestar los 3 | Símbolo + Estrategia + Plan | OpportunityReport |

Cada motor es **independiente**, **testeable** y **extensible**. La arquitectura permite agregar nuevas funcionalidades sin modificar el core de los motores existentes.
