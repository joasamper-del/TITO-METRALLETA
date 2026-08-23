/**
 * Ejemplo de demostración con datos simulados
 * Útil para entender cómo funciona el sistema sin necesidad de API keys
 */

import { TitoMetralletaAnalyzer } from '../core/analyzer';
import { MarketData, MarketContext, OperationPlan, RuleConfig } from '../types';

/**
 * Crea datos de mercado simulados para demostración
 */
function createDemoMarketData(
  symbol: string,
  options?: Partial<MarketData>
): MarketData {
  return {
    symbol,
    price: 150.5,
    volume: 2500000,
    liquidity: 250000,
    trend: 'alcista',
    rsi: 65,
    gex: 500,
    premiumDiscount: 'premium',
    support: 145.0,
    resistance: 155.0,
    timestamp: new Date(),
    dataSource: 'simulado',
    ...options,
  };
}

/**
 * Crea contexto de mercado simulado
 */
function createDemoMarketContext(): MarketContext {
  return {
    spy: createDemoMarketData('SPY', { price: 450.0, trend: 'alcista' }),
    qqq: createDemoMarketData('QQQ', { price: 350.0, trend: 'alcista' }),
    vix: createDemoMarketData('VIX', { price: 15.0, trend: 'bajista' }),
    marketIsOpen: true,
    timeUntilClose: 120,
  };
}

/**
 * Ejecuta demostración interactiva
 */
export async function runDemoAnalysis() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     🎯 DEMOSTRACIÓN - TITO METRALLETA - SISTEMA MOTOR       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const analyzer = new TitoMetralletaAnalyzer('', '');

  // ============================================================
  // 1. MOSTRAR REGLAS DISPONIBLES
  // ============================================================
  console.log('1️⃣  REGLAS DISPONIBLES EN EL SISTEMA');
  console.log('─────────────────────────────────────');
  analyzer.listRules();

  // ============================================================
  // 2. DEMO: ANÁLISIS CON DATOS SIMULADOS (CASO FAVORABLE)
  // ============================================================
  console.log('\n2️⃣  DEMO: ANÁLISIS FAVORABLE');
  console.log('─────────────────────────────────────');
  console.log('Simulando análisis de AAPL con condiciones favorables...\n');

  const rulesEngine = analyzer.getRulesEngine();
  const reportEngine = analyzer.getReportEngine();

  // Datos favorables: tendencia alcista, volumen alto, RSI no sobrecomprado
  const favorableData = createDemoMarketData('AAPL', {
    price: 175.0,
    volume: 3500000,
    trend: 'alcista',
    rsi: 62,
    gex: 800,
    premiumDiscount: 'premium',
  });

  const context = createDemoMarketContext();
  const favorableAnalysis = rulesEngine.analyzeData(
    favorableData,
    context,
    'Momentum Intraday'
  );

  console.log(`📊 Símbolo: ${favorableAnalysis.symbol}`);
  console.log(`📈 Tendencia: ${favorableAnalysis.marketData.trend}`);
  console.log(`🔊 Volumen: ${(favorableAnalysis.marketData.volume / 1000000).toFixed(1)}M`);
  console.log(`📌 RSI: ${favorableAnalysis.marketData.rsi}`);
  console.log(`\n📋 Evaluación de Reglas:`);

  favorableAnalysis.ruleEvaluations.forEach((eval) => {
    const status = eval.passed ? '✅' : '❌';
    console.log(`  ${status} ${eval.ruleName}: ${eval.points} puntos`);
  });

  console.log(
    `\n📊 Puntuación: ${favorableAnalysis.totalScore}/${favorableAnalysis.maxScore} (${favorableAnalysis.percentageScore.toFixed(0)}%)`
  );
  console.log(
    `🎯 Decisión: ${favorableAnalysis.decision.toUpperCase()}`
  );
  console.log(`💪 Confianza: ${favorableAnalysis.confidence.toFixed(0)}%`);
  console.log(`⚠️  Riesgo: ${favorableAnalysis.riskLevel}`);

  // Genera reporte formal
  const favorablePlan: OperationPlan = {
    entry: 175.0,
    target: 180.0,
    stop: 172.0,
    notes: 'Ruptura de resistencia con confirmación en volumen',
  };

  const favorableReport = reportEngine.generateReport(
    favorableAnalysis,
    'Momentum Intraday',
    favorablePlan
  );

  console.log('\n' + reportEngine.formatReportForDisplay(favorableReport));

  // ============================================================
  // 3. DEMO: ANÁLISIS CON DATOS SIMULADOS (CASO DESFAVORABLE)
  // ============================================================
  console.log('\n3️⃣  DEMO: ANÁLISIS DESFAVORABLE');
  console.log('─────────────────────────────────────');
  console.log('Simulando análisis de TSLA con condiciones desfavorables...\n');

  const unfavorableData = createDemoMarketData('TSLA', {
    price: 200.0,
    volume: 500000, // volumen bajo
    trend: 'bajista',
    rsi: 25, // sobrevendido
    gex: -300, // GEX negativo
    premiumDiscount: 'discount',
  });

  const unfavorableAnalysis = rulesEngine.analyzeData(
    unfavorableData,
    context,
    'Mean Reversion'
  );

  console.log(`📊 Símbolo: ${unfavorableAnalysis.symbol}`);
  console.log(`📈 Tendencia: ${unfavorableAnalysis.marketData.trend}`);
  console.log(`🔊 Volumen: ${(unfavorableAnalysis.marketData.volume / 1000000).toFixed(1)}M`);
  console.log(`📌 RSI: ${unfavorableAnalysis.marketData.rsi}`);
  console.log(`\n📋 Evaluación de Reglas:`);

  unfavorableAnalysis.ruleEvaluations.forEach((eval) => {
    const status = eval.passed ? '✅' : '❌';
    console.log(`  ${status} ${eval.ruleName}: ${eval.points} puntos`);
  });

  console.log(
    `\n📊 Puntuación: ${unfavorableAnalysis.totalScore}/${unfavorableAnalysis.maxScore} (${unfavorableAnalysis.percentageScore.toFixed(0)}%)`
  );
  console.log(
    `🎯 Decisión: ${unfavorableAnalysis.decision.toUpperCase()}`
  );
  console.log(`💪 Confianza: ${unfavorableAnalysis.confidence.toFixed(0)}%`);
  console.log(`⚠️  Riesgo: ${unfavorableAnalysis.riskLevel}`);

  // ============================================================
  // 4. DEMO: PERSONALIZACIÓN DE REGLAS
  // ============================================================
  console.log('\n4️⃣  DEMO: PERSONALIZACIÓN DE REGLAS');
  console.log('─────────────────────────────────────');

  console.log('Aumentando peso de tendencia de 25 a 40 puntos...');
  analyzer.setRuleWeight('trend_bullish', 40);

  console.log('Deshabilitando regla de VIX bajo...');
  analyzer.disableRule('vix_low');

  console.log('Re-analizando AAPL con reglas personalizadas...\n');

  const customAnalysis = rulesEngine.analyzeData(
    favorableData,
    context,
    'Momentum Intraday'
  );

  console.log(
    `Puntuación anterior: ${favorableAnalysis.percentageScore.toFixed(0)}%`
  );
  console.log(`Puntuación nueva: ${customAnalysis.percentageScore.toFixed(0)}%`);
  console.log(`Cambio: ${(customAnalysis.percentageScore - favorableAnalysis.percentageScore).toFixed(0)} puntos`);

  // ============================================================
  // 5. DEMO: AGREGAR REGLA PERSONALIZADA
  // ============================================================
  console.log('\n5️⃣  DEMO: AGREGAR REGLA PERSONALIZADA');
  console.log('─────────────────────────────────────');

  const customRule: RuleConfig = {
    id: 'precio_alto',
    name: 'Precio Arriba de 170',
    enabled: true,
    weight: 20,
    condition: (data) => data.price > 170,
    description: 'Verifica que el precio esté por encima de 170',
  };

  rulesEngine.addRule(customRule);
  console.log('✅ Regla personalizada agregada: "Precio Arriba de 170" (20 puntos)\n');

  const customAnalysis2 = rulesEngine.analyzeData(
    favorableData,
    context,
    'Momentum Intraday'
  );

  console.log(`Puntuación con nueva regla: ${customAnalysis2.percentageScore.toFixed(0)}%`);

  // ============================================================
  // 6. DEMO: REGISTRO DE RESULTADOS
  // ============================================================
  console.log('\n6️⃣  DEMO: REGISTRO DE RESULTADOS (PAPER TRADING)');
  console.log('─────────────────────────────────────────────────');

  const tradeResult = reportEngine.recordTradeResult(
    favorableReport,
    'ganancia',
    ['Confirmación de volumen', 'Ruptura limpia de resistencia'],
    [],
    [
      'La confirmación de volumen es fundamental para rupturas',
      'El GEX positivo ayuda a mantener la tendencia',
    ]
  );

  console.log(`Resultado: ${tradeResult.result.toUpperCase()}`);
  console.log(`Puntos obtenidos: ${tradeResult.points.toFixed(0)}`);
  console.log(`Razones de éxito:`);
  tradeResult.successReasons.forEach((r) => console.log(`  • ${r}`));
  console.log(`Lecciones aprendidas:`);
  tradeResult.lessons.forEach((l) => console.log(`  • ${l}`));

  // ============================================================
  // 7. DEMO: ANÁLISIS DE EFECTIVIDAD DE REGLAS
  // ============================================================
  console.log('\n7️⃣  DEMO: ANÁLISIS DE EFECTIVIDAD DE REGLAS');
  console.log('────────────────────────────────────────────');
  console.log('En un sistema real, esto analizaría el historial...\n');

  console.log('📊 Esto permite:');
  console.log('  1. Identificar qué reglas realmente funcionan');
  console.log('  2. Ajustar pesos basado en rendimiento histórico');
  console.log('  3. Eliminar reglas que no aportan');
  console.log('  4. Descubrir nuevas reglas efectivas');

  // ============================================================
  // RESUMEN
  // ============================================================
  console.log('\n╔═════════════════════════════════════════════════════════╗');
  console.log('║               ✨ FIN DE LA DEMOSTRACIÓN ✨               ║');
  console.log('╚═════════════════════════════════════════════════════════╝\n');

  console.log('📚 Motor completado. Próximos pasos:');
  console.log('   1. ✅ Motor de Datos - obtiene datos desde APIs');
  console.log('   2. ✅ Motor de Reglas - evalúa datos configurables');
  console.log('   3. ✅ Motor de Reporte - genera reportes inteligentes');
  console.log('   4. ⏳ Interfaz Web - visualización y control');
  console.log('   5. ⏳ Almacenamiento - historial y análisis');
  console.log(
    '\n💡 El motor está listo para ser integrado con una interfaz web.'
  );
  console.log(
    '🔧 Todos los componentes son modulares y fáciles de extender.\n'
  );
}

// Ejecuta la demostración
runDemoAnalysis().catch(console.error);
