/**
 * BaseStrategy - Clase abstracta para todas las estrategias
 * Define el contrato que debe implementar cada estrategia
 *
 * Patrón: Template Method
 * - evaluate() es el flujo template
 * - Subclases implementan: scoreFactors(), validateRules(), getRiskParameters(), getExplanation()
 */

import {
  MarketData,
  StrategyName,
  StrategySignal,
  SignalRecommendation,
  SignalScoreComponents,
  StrategyConfig,
} from "../types/Strategy";
import { SignalScoreCalculator } from "../evaluators/SignalScoreCalculator";
import { VolumeConfirmation } from "../evaluators/VolumeConfirmation";
import { VolatilityFilter } from "../evaluators/VolatilityFilter";

// ============================================================================
// TIPOS INTERNOS
// ============================================================================

interface ScoreFactorInput {
  marketData: MarketData;
  config: StrategyConfig;
}

interface ScoreFactor {
  name: string;
  value: number;
  weight: number;
  explanation: string;
}

interface RiskParameters {
  stopLossPct: number;
  takeProfitPcts: number[];
  positionSizePct: number;
  riskPercentage: number;
  trailingEnabled: boolean;
  trailingDistancePct: number;
  maxReentries: number;
}

// ============================================================================
// BASE STRATEGY
// ============================================================================

export abstract class BaseStrategy {
  // Propiedades requeridas (implementar en subclases)
  abstract name: StrategyName;
  abstract minSignalScore: number;
  abstract maxSimultaneousTrades: number;
  abstract defaultPositionSizePct: number;
  abstract defaultRiskPct: number;

  // Dependencias
  protected scoreCalculator: SignalScoreCalculator;
  protected volumeConfirmation: VolumeConfirmation;
  protected volatilityFilter: VolatilityFilter;

  constructor() {
    this.scoreCalculator = new SignalScoreCalculator();
    this.volumeConfirmation = new VolumeConfirmation();
    this.volatilityFilter = new VolatilityFilter();
  }

  /**
   * MÉTODO PRINCIPAL: Evalúa la estrategia contra datos de mercado
   *
   * Flujo:
   * 1. Validar entrada (datos completos, símbolo soportado)
   * 2. Validar reglas específicas de estrategia
   * 3. Calcular score de señal (0-100)
   * 4. Validar volumen (4 capas)
   * 5. Aplicar filtro de volatilidad
   * 6. Decidir: ENTER, HOLD, BLOCKED
   * 7. Generar explicación en lenguaje natural
   * 8. Retornar StrategySignal completa
   */
  public async evaluate(
    marketData: MarketData,
    config: StrategyConfig
  ): Promise<StrategySignal> {
    const timestamp = new Date();

    try {
      // 1. Validar datos de entrada
      this.validateMarketData(marketData);

      // 2. Validar reglas específicas de la estrategia
      const rulesValidation = this.validateRules(marketData);
      if (!rulesValidation.isValid) {
        return this.createBlockedSignal(
          timestamp,
          marketData,
          rulesValidation.reason
        );
      }

      // 3. Calcular componentes de score
      const scoreFactors = this.calculateScoreFactors({
        marketData,
        config,
      });
      const scoreComponents = this.scoreCalculator.calculateComposite(
        scoreFactors
      );

      // 4. Validar volumen (4 capas)
      const volumeAnalysis = await this.volumeConfirmation.analyze(
        marketData,
        this.name
      );

      // 5. Aplicar filtro de volatilidad
      const volatilityAnalysis = this.volatilityFilter.apply(
        marketData,
        this.getRiskParameters()
      );

      // 6. Decidir recomendación
      const recommendation = this.makeRecommendation(
        scoreComponents.finalScore,
        volumeAnalysis.isConfirmed,
        volatilityAnalysis.isBlocked,
        rulesValidation
      );

      // 7. Generar explicación
      const explanation = this.getExplanation(
        marketData,
        scoreComponents,
        volumeAnalysis,
        volatilityAnalysis,
        recommendation
      );

      // 8. Construir señal de estrategia
      const signal: StrategySignal = {
        strategy: this.name,
        timestamp,
        symbol: marketData.symbol,

        signalScore: scoreComponents.finalScore,
        recommendation,

        volumeConfirmed: volumeAnalysis.isConfirmed,
        volumeRatio:
          marketData.volume / (marketData.volumeAvg30 || marketData.volume),

        volatilityAdjustment: volatilityAnalysis.adjustedPositionSizePct,

        entryPrice: marketData.close,
        entryQuantity: this.calculateQuantity(
          marketData,
          config,
          volatilityAnalysis
        ),

        stopLossPrice: this.calculateStopLoss(
          marketData,
          volatilityAnalysis
        ),

        takeProfitTargets: this.calculateTakeProfits(marketData),

        explanation,

        evaluationDetails: {
          scoreComponents,
          volumeAnalysis,
          volatilityAnalysis,
          rulesValidation,
        },
      };

      return signal;
    } catch (error) {
      throw new Error(
        `Strategy evaluation failed for ${this.name}: ${error.message}`
      );
    }
  }

  /**
   * MÉTODOS A IMPLEMENTAR POR SUBCLASES
   */

  /**
   * Calcula los factores específicos de score para esta estrategia
   * Ejemplo para Trailing Exit:
   *   - Tendencia (MA50 > MA200): 25 puntos
   *   - RSI (50-70): 20 puntos
   *   - SuperTrend (BULLISH): 20 puntos
   *   - etc.
   */
  protected abstract calculateScoreFactors(
    input: ScoreFactorInput
  ): ScoreFactor[];

  /**
   * Valida las reglas de entrada específicas de la estrategia
   * Retorna { isValid, reason }
   *
   * Ejemplo para Mean Reversion:
   *   - ¿Precio desviado > 2σ de MA20?
   *   - ¿RSI < 30?
   *   - ¿NO hay earnings hoy?
   */
  protected abstract validateRules(marketData: MarketData): {
    isValid: boolean;
    reason?: string;
  };

  /**
   * Retorna los parámetros de riesgo específicos de la estrategia
   */
  protected abstract getRiskParameters(): RiskParameters;

  /**
   * Genera una explicación en lenguaje natural
   * Puede usar los análisis (score, volumen, volatilidad) para narrativa
   */
  protected abstract buildNaturalLanguageExplanation(
    marketData: MarketData,
    scoreComponents: SignalScoreComponents,
    volumeAnalysis: any,
    volatilityAnalysis: any,
    recommendation: SignalRecommendation
  ): string;

  /**
   * MÉTODOS AUXILIARES (implementados aquí, pueden ser overrideados)
   */

  protected validateMarketData(marketData: MarketData): void {
    if (!marketData.close || marketData.close <= 0) {
      throw new Error("Invalid market data: missing or invalid close price");
    }
    if (!marketData.volume || marketData.volume <= 0) {
      throw new Error("Invalid market data: missing or invalid volume");
    }
  }

  protected makeRecommendation(
    signalScore: number,
    volumeConfirmed: boolean,
    isBlocked: boolean,
    rulesValidation: any
  ): SignalRecommendation {
    if (isBlocked) return SignalRecommendation.BLOCKED;
    if (!rulesValidation.isValid) return SignalRecommendation.BLOCKED;
    if (signalScore >= this.minSignalScore && volumeConfirmed) {
      return SignalRecommendation.ENTER;
    }
    if (signalScore >= this.minSignalScore * 0.8) {
      return SignalRecommendation.HOLD; // Esperar confirmación
    }
    return SignalRecommendation.BLOCKED;
  }

  protected calculateQuantity(
    marketData: MarketData,
    config: StrategyConfig,
    volatilityAnalysis: any
  ): number {
    // Usar config y volatility adjustment
    // Ejemplo: 100 shares base, pero reducir si volatilidad es alta
    const baseQuantity = 100;
    const adjustedQuantity = Math.floor(
      baseQuantity * volatilityAnalysis.adjustedPositionSizePct
    );
    return adjustedQuantity;
  }

  protected calculateStopLoss(
    marketData: MarketData,
    volatilityAnalysis: any
  ): number {
    const riskPct = volatilityAnalysis.adjustedStopLossPct;
    return marketData.close * (1 - riskPct / 100);
  }

  protected calculateTakeProfits(marketData: MarketData): number[] {
    const riskParams = this.getRiskParameters();
    return riskParams.takeProfitPcts.map((tp) =>
      Number((marketData.close * (1 + tp / 100)).toFixed(2))
    );
  }

  protected getExplanation(
    marketData: MarketData,
    scoreComponents: SignalScoreComponents,
    volumeAnalysis: any,
    volatilityAnalysis: any,
    recommendation: SignalRecommendation
  ): string {
    let explanation = `[${this.name}] `;

    if (recommendation === SignalRecommendation.BLOCKED) {
      explanation += `Señal BLOQUEADA. `;
      if (volatilityAnalysis.isBlocked) {
        explanation += `Volatilidad extrema (${volatilityAnalysis.volatilityPercentile}p). `;
      }
      if (!volumeAnalysis.isConfirmed) {
        explanation += `Volumen insuficiente. `;
      }
    } else if (recommendation === SignalRecommendation.ENTER) {
      explanation += `Entrada CONFIRMADA. Score: ${scoreComponents.finalScore}/100. `;
      explanation += `Volumen: ${volumeAnalysis.isConfirmed ? "✅ Confirmado" : "⚠️ Parcial"}. `;
    }

    // Agregar explicación específica de la estrategia
    explanation += this.buildNaturalLanguageExplanation(
      marketData,
      scoreComponents,
      volumeAnalysis,
      volatilityAnalysis,
      recommendation
    );

    return explanation;
  }

  private createBlockedSignal(
    timestamp: Date,
    marketData: MarketData,
    reason: string
  ): StrategySignal {
    return {
      strategy: this.name,
      timestamp,
      symbol: marketData.symbol,
      signalScore: 0,
      recommendation: SignalRecommendation.BLOCKED,
      volumeConfirmed: false,
      volumeRatio: 0,
      volatilityAdjustment: 1,
      explanation: `Señal BLOQUEADA: ${reason}`,
      evaluationDetails: { reason },
    };
  }
}

/**
 * EJEMPLO: Cómo una subclase implementa BaseStrategy
 *
 * export class TrailingExitStrategy extends BaseStrategy {
 *   name = StrategyName.TRAILING_EXIT;
 *   minSignalScore = 70;
 *   maxSimultaneousTrades = 5;
 *   defaultPositionSizePct = 100;
 *   defaultRiskPct = 1.5;
 *
 *   protected calculateScoreFactors(input: ScoreFactorInput): ScoreFactor[] {
 *     const { marketData } = input;
 *     return [
 *       {
 *         name: "Tendencia",
 *         value: marketData.ma50 > marketData.ma200 ? 25 : 0,
 *         weight: 0.25,
 *         explanation: "MA50 > MA200"
 *       },
 *       {
 *         name: "RSI",
 *         value: marketData.rsi > 50 && marketData.rsi < 70 ? 20 : 0,
 *         weight: 0.20,
 *         explanation: "RSI 50-70"
 *       },
 *       // ... más factores
 *     ];
 *   }
 *
 *   protected validateRules(marketData: MarketData) {
 *     if (marketData.ma50 <= marketData.ma200) {
 *       return { isValid: false, reason: "Tendencia bajista" };
 *     }
 *     if (marketData.rsi <= 40) {
 *       return { isValid: false, reason: "RSI no en rango alcista" };
 *     }
 *     return { isValid: true };
 *   }
 *
 *   protected getRiskParameters(): RiskParameters {
 *     return { stopLossPct: 2, takeProfitPcts: [2, 3.5, 5], ... };
 *   }
 *
 *   protected buildNaturalLanguageExplanation(...) {
 *     return "Tendencia alcista confirmada, volumen en rango, esperando retest...";
 *   }
 * }
 */
