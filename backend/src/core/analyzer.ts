import { DataEngine } from '../engines/dataEngine';
import { RulesEngine } from '../engines/rulesEngine';
import { ReportEngine } from '../engines/reportEngine';
import { OpportunityReport, OperationPlan, MarketContext } from '../types';

/**
 * Coordinador principal que orquesta los tres motores
 */
export class TitoMetralletaAnalyzer {
  private dataEngine: DataEngine;
  private rulesEngine: RulesEngine;
  private reportEngine: ReportEngine;

  constructor(
    alphaVantageKey: string = '',
    finnhubKey: string = ''
  ) {
    this.dataEngine = new DataEngine(alphaVantageKey, finnhubKey);
    this.rulesEngine = new RulesEngine();
    this.reportEngine = new ReportEngine();
  }

  /**
   * Analiza una oportunidad de trading completa
   */
  async analyzeOpportunity(
    symbol: string,
    strategy: string,
    plan: OperationPlan
  ): Promise<OpportunityReport | null> {
    try {
      console.log(`\n🔍 Analizando ${symbol} con estrategia: ${strategy}`);

      // Paso 1: Obtener contexto de mercado general
      console.log('📡 Obteniendo contexto de mercado...');
      const marketContext = await this.dataEngine.getMarketContext();
      if (!marketContext) {
        console.error('❌ No se pudo obtener contexto de mercado');
        return null;
      }

      // Paso 2: Obtener datos específicos del símbolo
      console.log(`📊 Obteniendo datos de ${symbol}...`);
      const marketData = await this.dataEngine.getMarketData(symbol);
      if (!marketData) {
        console.error(`❌ No se pudo obtener datos de ${symbol}`);
        return null;
      }

      // Paso 3: Verificar si se necesita revisión manual
      if (marketData.price === 0 || marketData.volume === 0) {
        console.log(`⚠️  ${symbol} requiere revisión manual - datos incompletos`);
        const missingData: string[] = [];
        if (marketData.price === 0) missingData.push('Precio');
        if (marketData.volume === 0) missingData.push('Volumen');

        return this.reportEngine.generateManualReviewReport(
          symbol,
          strategy,
          missingData
        );
      }

      // Paso 4: Evaluar reglas
      console.log('⚙️  Evaluando reglas...');
      const analysis = this.rulesEngine.analyzeData(
        marketData,
        marketContext,
        strategy
      );

      // Paso 5: Generar reporte
      console.log('📄 Generando reporte...');
      const report = this.reportEngine.generateReport(
        analysis,
        strategy,
        plan
      );

      return report;
    } catch (error) {
      console.error('❌ Error durante el análisis:', error);
      return null;
    }
  }

  /**
   * Analiza múltiples símbolos en paralelo
   */
  async analyzeMultiple(
    opportunities: Array<{
      symbol: string;
      strategy: string;
      plan: OperationPlan;
    }>
  ): Promise<OpportunityReport[]> {
    const promises = opportunities.map((opp) =>
      this.analyzeOpportunity(opp.symbol, opp.strategy, opp.plan)
    );

    const results = await Promise.all(promises);
    return results.filter((r): r is OpportunityReport => r !== null);
  }

  /**
   * Obtiene acceso directo a los motores para configuración avanzada
   */
  getDataEngine(): DataEngine {
    return this.dataEngine;
  }

  getRulesEngine(): RulesEngine {
    return this.rulesEngine;
  }

  getReportEngine(): ReportEngine {
    return this.reportEngine;
  }

  /**
   * Personaliza el peso de una regla
   */
  setRuleWeight(ruleId: string, weight: number): void {
    this.rulesEngine.setRuleWeight(ruleId, weight);
    console.log(`✅ Regla "${ruleId}" actualizada a ${weight} puntos`);
  }

  /**
   * Deshabilita una regla específica
   */
  disableRule(ruleId: string): void {
    this.rulesEngine.disableRule(ruleId);
    console.log(`✅ Regla "${ruleId}" deshabilitada`);
  }

  /**
   * Habilita una regla específica
   */
  enableRule(ruleId: string): void {
    this.rulesEngine.enableRule(ruleId);
    console.log(`✅ Regla "${ruleId}" habilitada`);
  }

  /**
   * Lista todas las reglas disponibles
   */
  listRules(): void {
    console.log('\n📋 REGLAS DISPONIBLES:');
    const rules = this.rulesEngine.getAllRules();
    rules.forEach((rule) => {
      const status = rule.enabled ? '✅' : '❌';
      console.log(
        `${status} ${rule.id}: ${rule.name} (${rule.weight} puntos)`
      );
      console.log(`   ${rule.description}\n`);
    });
  }

  /**
   * Obtiene las estadísticas del contexto de mercado
   */
  async getMarketStatus(): Promise<void> {
    const context = await this.dataEngine.getMarketContext();
    if (!context) {
      console.log('❌ No se pudo obtener contexto de mercado');
      return;
    }

    console.log('\n📊 ESTADO DEL MERCADO:');
    console.log(`SPY: $${context.spy.price} - Tendencia: ${context.spy.trend}`);
    console.log(`QQQ: $${context.qqq.price} - Tendencia: ${context.qqq.trend}`);
    console.log(`VIX: ${context.vix.price} - Volatilidad`);
    console.log(
      `Mercado: ${context.marketIsOpen ? '🟢 ABIERTO' : '🔴 CERRADO'}`
    );
    if (context.timeUntilClose) {
      console.log(`Minutos al cierre: ${context.timeUntilClose}`);
    }
  }
}
