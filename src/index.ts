import { TitoMetralletaAnalyzer } from './core/analyzer';
import { OperationPlan } from './types';

/**
 * Ejemplo de uso del sistema Tito Metralleta
 */
async function main() {
  // Inicializa el analizador
  // Nota: Proporciona tus propias keys de API si deseas datos reales
  const analyzer = new TitoMetralletaAnalyzer(
    process.env.ALPHA_VANTAGE_KEY || '',
    process.env.FINNHUB_KEY || ''
  );

  console.log('🚀 TITO METRALLETA - SISTEMA DE ANÁLISIS DE OPORTUNIDADES');
  console.log('═════════════════════════════════════════════════════════');

  // Muestra estado del mercado
  await analyzer.getMarketStatus();

  // Lista las reglas disponibles
  analyzer.listRules();

  // Ejemplo 1: Analiza una oportunidad simple
  const plan1: OperationPlan = {
    entry: 150.5,
    target: 152.0,
    stop: 149.5,
    notes: 'Operación basada en ruptura de resistencia',
  };

  const report1 = await analyzer.analyzeOpportunity(
    'AAPL',
    'Momentum Intraday',
    plan1
  );

  if (report1) {
    console.log(analyzer.getReportEngine().formatReportForDisplay(report1));
  }

  // Ejemplo 2: Personaliza reglas
  console.log('\n⚙️  PERSONALIZANDO REGLAS...');
  analyzer.setRuleWeight('trend_bullish', 30); // Aumenta peso de tendencia
  analyzer.disableRule('vix_low'); // Deshabilita regla de VIX

  // Ejemplo 3: Analiza otra oportunidad con reglas personalizadas
  const plan2: OperationPlan = {
    entry: 380.0,
    target: 385.0,
    stop: 375.0,
    notes: 'Operación en tecnología',
  };

  const report2 = await analyzer.analyzeOpportunity(
    'TSLA',
    'Breakout Strategy',
    plan2
  );

  if (report2) {
    console.log(analyzer.getReportEngine().formatReportForDisplay(report2));
  }

  // Ejemplo 4: Analiza múltiples símbolos en paralelo
  console.log('\n🔄 ANALIZANDO MÚLTIPLES OPORTUNIDADES EN PARALELO...');
  const opportunities = [
    {
      symbol: 'SPY',
      strategy: 'Trend Following',
      plan: { entry: 450.0, target: 455.0, stop: 445.0, notes: '' },
    },
    {
      symbol: 'QQQ',
      strategy: 'Mean Reversion',
      plan: { entry: 350.0, target: 355.0, stop: 345.0, notes: '' },
    },
  ];

  const reports = await analyzer.analyzeMultiple(opportunities);
  console.log(`\n✅ Análisis completado para ${reports.length} oportunidades`);

  // Ejemplo 5: Registra resultado de operación paper
  if (report1) {
    console.log('\n📝 REGISTRANDO RESULTADO DE OPERACIÓN...');
    const tradeResult = analyzer
      .getReportEngine()
      .recordTradeResult(
        report1,
        'ganancia',
        ['Tendencia favorable', 'Volumen confirmó'],
        [],
        ['La confirmación en volumen es crucial']
      );

    console.log(`Operación registrada: ${tradeResult.result}`);
    console.log(`Puntos: ${tradeResult.points}`);
    console.log(`Lecciones: ${tradeResult.lessons.join(', ')}`);
  }

  console.log('\n✨ Sistema listo para usar. Puedes:');
  console.log('   1. Personalizar reglas (pesos, habilitar/deshabilitar)');
  console.log('   2. Agregar nuevas reglas personalizadas');
  console.log('   3. Conectar APIs reales para datos automáticos');
  console.log('   4. Construir una interfaz web encima');
  console.log('   5. Analizar el historial para optimizar reglas');
}

main().catch(console.error);
