# 🎯 TITO METRALLETA - Sistema Inteligente de Análisis de Trading

Un sistema modular y extensible para analizar oportunidades de trading con reglas configurables, motor de datos automático y generación de reportes inteligentes.

## 🏗️ Arquitectura del Sistema

El sistema está dividido en **tres motores independientes y modulares**:

### 1. **Motor de Datos (Data Engine)**
- Obtiene automáticamente datos desde APIs (Alpha Vantage, Finnhub)
- Analiza: SPY, QQQ, VIX, precio, volumen, liquidez, zona Premium/Discount, GEX, RSI, soportes, resistencias, horario
- Solo pide intervención manual si algún dato no está disponible
- Totalmente independiente y reutilizable

### 2. **Motor de Reglas (Rules Engine)**
- Sistema de reglas **configurable** y extensible
- Reglas incluidas por defecto:
  - Tendencia alcista/bajista
  - Zona Premium/Discount
  - Volumen alto
  - GEX positivo
  - RSI no sobrecomprado
  - Contexto de mercado (SPY, QQQ)
  - VIX bajo
  - Liquidez suficiente
  - Tiempo al cierre
  - Precio en niveles importantes
- Permite: habilitar/deshabilitar reglas, ajustar pesos, agregar reglas nuevas
- Calcula automáticamente la puntuación (0-100)

### 3. **Motor de Reporte (Report Engine)**
- Genera reportes automáticos con decisión final y explicación
- Registra resultados de operaciones (paper trading)
- Analiza efectividad de reglas basado en historial
- Genera estadísticas de rendimiento
- Formato legible y estructurado

## 📋 Estructura de Carpetas

```
src/
├── types/
│   └── index.ts          # Tipos e interfaces compartidas
├── engines/
│   ├── dataEngine.ts     # Motor de obtención de datos
│   ├── rulesEngine.ts    # Motor de evaluación de reglas
│   └── reportEngine.ts   # Motor de generación de reportes
├── core/
│   └── analyzer.ts       # Coordinador que orquesta los motores
└── index.ts              # Punto de entrada y ejemplos
```

## 🚀 Instalación y Uso

### 1. Instalación

```bash
# Instala dependencias
npm install

# Crea tu archivo .env (copia de .env.example)
cp .env.example .env
```

### 2. Configuración de API Keys

Edita `.env` y añade tus keys:

```
ALPHA_VANTAGE_KEY=tu_key_aqui
FINNHUB_KEY=tu_key_aqui
```

Obtén keys gratuitas en:
- Alpha Vantage: https://www.alphavantage.co/
- Finnhub: https://finnhub.io/

### 3. Uso Básico

```typescript
import { TitoMetralletaAnalyzer } from './core/analyzer';

const analyzer = new TitoMetralletaAnalyzer(
  process.env.ALPHA_VANTAGE_KEY,
  process.env.FINNHUB_KEY
);

// Analizar una oportunidad
const report = await analyzer.analyzeOpportunity(
  'AAPL',
  'Momentum Intraday',
  {
    entry: 150.5,
    target: 152.0,
    stop: 149.5,
    notes: 'Ruptura de resistencia'
  }
);

// Mostrar reporte formateado
console.log(analyzer.getReportEngine().formatReportForDisplay(report));
```

## ⚙️ Personalización de Reglas

### Cambiar Peso de una Regla

```typescript
// Aumenta la importancia de la tendencia a 35 puntos
analyzer.setRuleWeight('trend_bullish', 35);
```

### Deshabilitar una Regla

```typescript
// Deshabilita la regla de VIX bajo
analyzer.disableRule('vix_low');
```

### Agregar Regla Personalizada

```typescript
const rulesEngine = analyzer.getRulesEngine();

rulesEngine.addRule({
  id: 'mi_regla',
  name: 'Mi Regla Personalizada',
  enabled: true,
  weight: 20,
  condition: (data, context) => {
    // Tu lógica aquí
    return data.price > 100;
  },
  description: 'Verifica si el precio es mayor a 100'
});
```

## 📊 Decisiones Automáticas

La puntuación se calcula automáticamente y determina:

- **✅ OPERAR** (≥85 puntos)
- **⏳ ESPERAR** (65-84 puntos)
- **❌ NO OPERAR** (<65 puntos)

El nivel de riesgo se determina así:
- **🟢 Bajo** (≥85 puntos)
- **🟡 Medio** (50-84 puntos)
- **🔴 Alto** (<50 puntos)

## 📝 Registro de Resultados (Paper Trading)

```typescript
// Registra resultado de la operación
const result = analyzer.getReportEngine().recordTradeResult(
  report,
  'ganancia', // o 'pérdida'
  ['Tendencia favorable', 'Volumen confirmó'], // razones de éxito
  [],                                            // razones de fallo
  ['La confirmación en volumen es crucial']   // lecciones
);
```

## 📈 Análisis de Efectividad de Reglas

```typescript
const reports = [...]; // Array de reportes con resultados

const effectiveness = analyzer
  .getReportEngine()
  .analyzeRuleEffectiveness(reports);

// Verifica qué reglas realmente funcionan
effectiveness.forEach((stats, ruleId) => {
  console.log(`${ruleId}: ${stats.effectivenessRate}%`);
});
```

## 🔄 Análisis Paralelo

```typescript
const opportunities = [
  { symbol: 'AAPL', strategy: 'Momentum', plan: {...} },
  { symbol: 'TSLA', strategy: 'Breakout', plan: {...} },
  { symbol: 'MSFT', strategy: 'Mean Reversion', plan: {...} },
];

const reports = await analyzer.analyzeMultiple(opportunities);
```

## 📊 Opciones de Reporte

### Mostrar Reporte Formateado

```typescript
console.log(
  analyzer.getReportEngine().formatReportForDisplay(report)
);
```

### Generar Estadísticas de Rendimiento

```typescript
const stats = analyzer.getReportEngine()
  .generatePerformanceStats(results);

console.log(`Win Rate: ${stats.winRate}`);
console.log(`Avg Points per Win: ${stats.avgPointsPerWin}`);
```

## 🔧 Acceso Directo a Motores

Para configuración avanzada, accede directamente a los motores:

```typescript
const dataEngine = analyzer.getDataEngine();
const rulesEngine = analyzer.getRulesEngine();
const reportEngine = analyzer.getReportEngine();

// Ejemplo: obtener datos específicos
const marketData = await dataEngine.getMarketData('AAPL');
const context = await dataEngine.getMarketContext();

// Ejemplo: obtener todas las reglas
const allRules = rulesEngine.getAllRules();
```

## 🌐 Próximo Paso: Interfaz Web

Este motor está listo para ser conectado a una **interfaz web** que permitirá:
- Crear reportes de forma visual
- Ver historial de operaciones
- Personalizar reglas con UI intuitiva
- Visualizar análisis y estadísticas
- Exportar reportes

## 🎓 Características Clave

✅ **Modular**: Motores independientes y reutilizables
✅ **Configurable**: Personaliza reglas, pesos y criterios
✅ **Automático**: Obtiene datos y genera reportes sin intervención
✅ **Inteligente**: Aprende del historial para optimizar
✅ **Escalable**: Fácil de extender con nuevas reglas
✅ **Español**: 100% en español para mejor comprensión

## 📞 Soporte

Para contribuir o reportar issues, contacta al equipo de desarrollo.

---

**Nota**: Este es el "motor" del sistema Tito Metralleta. La interfaz web se construirá encima de este motor.
