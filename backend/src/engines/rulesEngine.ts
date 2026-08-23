import { RuleConfig, RuleEvaluation, MarketData, MarketContext, AnalysisResult } from '../types';

export class RulesEngine {
  private rules: Map<string, RuleConfig> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Inicializa las reglas por defecto
   */
  private initializeDefaultRules(): void {
    // Regla 1: Tendencia alcista
    this.addRule({
      id: 'trend_bullish',
      name: 'Tendencia Alcista',
      enabled: true,
      weight: 25,
      condition: (data: MarketData) => data.trend === 'alcista',
      description: 'Verifica si el activo está en tendencia alcista',
    });

    // Regla 2: Zona Premium (buena para compras)
    this.addRule({
      id: 'zone_premium',
      name: 'Zona Premium',
      enabled: true,
      weight: 25,
      condition: (data: MarketData) => data.premiumDiscount === 'premium',
      description: 'Verifica si el activo está en zona premium',
    });

    // Regla 3: Volumen alto
    this.addRule({
      id: 'volume_high',
      name: 'Volumen Alto',
      enabled: true,
      weight: 20,
      condition: (data: MarketData) => data.volume > 1000000,
      description: 'Verifica si el volumen es superior a 1M',
    });

    // Regla 4: GEX positivo
    this.addRule({
      id: 'gex_positive',
      name: 'GEX Positivo',
      enabled: true,
      weight: 20,
      condition: (data: MarketData) => data.gex !== null && data.gex > 0,
      description: 'Verifica si el GEX (Gamma Exposure) es positivo',
    });

    // Regla 5: RSI no sobrecomprado
    this.addRule({
      id: 'rsi_not_overbought',
      name: 'RSI No Sobrecomprado',
      enabled: true,
      weight: 10,
      condition: (data: MarketData) => data.rsi === null || data.rsi < 70,
      description: 'Verifica que RSI no esté en territorio de sobrecompra (>70)',
    });

    // Regla 6: Contexto de mercado alcista (SPY)
    this.addRule({
      id: 'market_context_bullish',
      name: 'Contexto de Mercado Alcista',
      enabled: true,
      weight: 15,
      condition: (data: MarketData, context: MarketContext) =>
        context.spy.trend === 'alcista',
      description: 'Verifica si SPY está en tendencia alcista (contexto general)',
    });

    // Regla 7: VIX bajo (menos volatilidad general)
    this.addRule({
      id: 'vix_low',
      name: 'VIX Bajo',
      enabled: true,
      weight: 10,
      condition: (data: MarketData, context: MarketContext) =>
        context.vix.price < 20,
      description: 'Verifica si el VIX está por debajo de 20 (baja volatilidad)',
    });

    // Regla 8: Liquidez suficiente
    this.addRule({
      id: 'liquidity_sufficient',
      name: 'Liquidez Suficiente',
      enabled: true,
      weight: 10,
      condition: (data: MarketData) => data.liquidity > 100000,
      description: 'Verifica que haya liquidez suficiente (>100k)',
    });

    // Regla 9: Tiempo al cierre (preferible tarde)
    this.addRule({
      id: 'time_to_close_late',
      name: 'Tiempo Tarde (Próximo a Cierre)',
      enabled: true,
      weight: 5,
      condition: (data: MarketData, context: MarketContext) =>
        context.timeUntilClose !== null && context.timeUntilClose > 30,
      description: 'Verifica que haya al menos 30 minutos para cierre',
    });

    // Regla 10: Confirmación por precio en soporte/resistencia
    this.addRule({
      id: 'price_at_level',
      name: 'Precio en Nivel Importante',
      enabled: true,
      weight: 15,
      condition: (data: MarketData) => {
        if (!data.support || !data.resistance) return false;
        const range = (data.resistance - data.support) * 0.1;
        return (
          (Math.abs(data.price - data.support) < range ||
            Math.abs(data.price - data.resistance) < range) &&
          data.price > data.support &&
          data.price < data.resistance
        );
      },
      description: 'Verifica si el precio está cerca de soportes/resistencias',
    });
  }

  /**
   * Agrega una nueva regla o actualiza una existente
   */
  addRule(rule: RuleConfig): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Obtiene una regla específica
   */
  getRule(id: string): RuleConfig | undefined {
    return this.rules.get(id);
  }

  /**
   * Obtiene todas las reglas
   */
  getAllRules(): RuleConfig[] {
    return Array.from(this.rules.values());
  }

  /**
   * Habilita una regla
   */
  enableRule(id: string): void {
    const rule = this.rules.get(id);
    if (rule) rule.enabled = true;
  }

  /**
   * Deshabilita una regla
   */
  disableRule(id: string): void {
    const rule = this.rules.get(id);
    if (rule) rule.enabled = false;
  }

  /**
   * Actualiza el peso de una regla
   */
  setRuleWeight(id: string, weight: number): void {
    const rule = this.rules.get(id);
    if (rule) rule.weight = weight;
  }

  /**
   * Evalúa todos los datos contra todas las reglas habilitadas
   */
  evaluate(data: MarketData, context: MarketContext): RuleEvaluation[] {
    const evaluations: RuleEvaluation[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const passed = rule.condition(data, context);
      const points = passed ? rule.weight : 0;

      evaluations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        passed,
        points,
        reason: passed
          ? `✓ ${rule.description}`
          : `✗ ${rule.description}`,
      });
    }

    return evaluations;
  }

  /**
   * Calcula el análisis completo
   */
  analyzeData(
    data: MarketData,
    context: MarketContext,
    strategy: string
  ): AnalysisResult {
    const ruleEvaluations = this.evaluate(data, context);
    const totalScore = ruleEvaluations.reduce((sum, r) => sum + r.points, 0);
    const maxScore = Array.from(this.rules.values())
      .filter((r) => r.enabled)
      .reduce((sum, r) => sum + r.weight, 0);

    const percentageScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Determina decisión basada en el porcentaje
    let decision: 'operar' | 'esperar' | 'no_operar' = 'no_operar';
    if (percentageScore >= 85) decision = 'operar';
    else if (percentageScore >= 65) decision = 'esperar';

    const confidence = percentageScore;

    // Determina nivel de riesgo
    let riskLevel: 'bajo' | 'medio' | 'alto' = 'medio';
    if (percentageScore >= 85) riskLevel = 'bajo';
    else if (percentageScore < 50) riskLevel = 'alto';

    // Razones principales (reglas que pasaron)
    const mainReasons = ruleEvaluations
      .filter((r) => r.passed)
      .map((r) => r.ruleName);

    // Condiciones de invalidación (reglas que fallaron)
    const invalidationConditions = ruleEvaluations
      .filter((r) => !r.passed)
      .map((r) => r.ruleName);

    const manualReviewNeeded =
      data.price === 0 || data.volume === 0 || data.rsi === null;
    const manualReviewReasons: string[] = [];
    if (data.price === 0) manualReviewReasons.push('Precio no disponible');
    if (data.volume === 0) manualReviewReasons.push('Volumen no disponible');
    if (data.rsi === null) manualReviewReasons.push('RSI no disponible');
    if (data.gex === null) manualReviewReasons.push('GEX no disponible');

    return {
      symbol: data.symbol,
      strategy,
      marketData: data,
      marketContext: context,
      ruleEvaluations,
      totalScore,
      maxScore,
      percentageScore,
      decision,
      confidence,
      riskLevel,
      mainReasons,
      invalidationConditions,
      manualReviewNeeded,
      manualReviewReasons,
      timestamp: new Date(),
    };
  }
}
