/**
 * MeanReversionStrategy - Operar en reverting a media (7.5/10 confidence)
 *
 * Filosofía:
 * - Operar cuando precio se desvía > 2σ del MA20 (oversold/overbought)
 * - RSI < 30 (oversold extremo) o > 70 (overbought extremo)
 * - Apoyo cercano validando no caer más
 * - Reverting hacia MA20 como target
 *
 * Factores de Score (6):
 * 1. Desviación (25%): Qué tan lejos está del MA20 (2σ+)
 * 2. RSI (20%): < 30 o > 70 (extremos)
 * 3. Volume (15%): Confirmación de movimiento
 * 4. Soporte (20%): Cercano (no caer más)
 * 5. Liquidez (10%): Tight spreads
 * 6. Régimen (10%): No earnings/evento
 *
 * Reglas de Validación:
 * - Precio > 2σ lejos del MA20
 * - RSI < 30 (para reversion alcista) O > 70 (para bajista)
 * - Soporte identificado cercano
 * - NO earnings hoy
 *
 * Risk Parameters:
 * - Stop Loss: 2.5% (reverting puede fallar)
 * - Target: Ma20 reversion (típicamente 1.5-3%)
 * - Max Reentries: 1 (menos reentradasque trailing exit)
 */

import {
  MarketData,
  StrategyName,
  SignalScoreComponents,
  StrategyConfig,
  SignalRecommendation,
} from "../types/Strategy";
import { BaseStrategy } from "../base/BaseStrategy";

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
// IMPLEMENTATION
// ============================================================================

export class MeanReversionStrategy extends BaseStrategy {
  // Propiedades requeridas
  name: StrategyName = StrategyName.MEAN_REVERSION;
  minSignalScore: number = 65; // Menos estricto que Trailing Exit
  maxSimultaneousTrades: number = 3; // Menos simultáneas (reverting es más riesgoso)
  defaultPositionSizePct: number = 100;
  defaultRiskPct: number = 2.0; // Riesgo más alto

  /**
   * Calcula los 6 factores de score para Mean Reversion
   *
   * Factores:
   * 1. Desviación (25%): Qué tan lejos del MA20
   * 2. RSI (20%): < 30 o > 70 extremos
   * 3. Volumen (15%): Confirma el movimiento
   * 4. Soporte (20%): Cercano para delimitar riesgo
   * 5. Liquidez (10%): Tight spreads
   * 6. Régimen (10%): No earnings
   */
  protected calculateScoreFactors(
    input: ScoreFactorInput
  ): ScoreFactor[] {
    const { marketData } = input;

    const factors: ScoreFactor[] = [];

    // 1. DESVIACIÓN: Qué tan lejos del MA20 (25%)
    // Escala 0-100: 100 si > 2.5σ, 50 si > 2σ, 0 si < 2σ
    const deviationPct = Math.abs(
      (marketData.close - marketData.ma20) / marketData.ma20
    ) * 100;
    const sigmaPct = 0.8; // Aproximado: 1σ ≈ 0.8% en mercados normales
    const sigmaDeviation = deviationPct / sigmaPct;

    let deviationValue = 0;
    let deviationExplanation = `Desviación: ${sigmaDeviation.toFixed(1)}σ`;
    if (sigmaDeviation > 2.5) {
      deviationValue = 100;
      deviationExplanation += " ✅ Extrema (>2.5σ)";
    } else if (sigmaDeviation > 2.0) {
      deviationValue = 80;
      deviationExplanation += " ✅ Fuerte (>2σ)";
    } else if (sigmaDeviation > 1.5) {
      deviationValue = 50;
      deviationExplanation += " ⚠️ Moderada (1.5-2σ)";
    } else {
      deviationValue = 0;
      deviationExplanation += " ❌ Débil (<1.5σ)";
    }
    factors.push({
      name: "Desviación",
      value: Math.min(100, deviationValue),
      weight: 0.25,
      explanation: deviationExplanation,
    });

    // 2. RSI: < 30 (oversold) o > 70 (overbought) (20%)
    // Escala 0-100 inversamente relacionada a normalidad
    let rsiValue = 0;
    let rsiExplanation = `RSI ${marketData.rsi.toFixed(1)}`;
    if (marketData.rsi < 30) {
      rsiValue = ((30 - marketData.rsi) / 30) * 100; // Escalar 0-30 a 0-100
      rsiExplanation += " ✅ Oversold (<30)";
    } else if (marketData.rsi > 70) {
      rsiValue = ((marketData.rsi - 70) / 30) * 100; // Escalar 70-100 a 0-100
      rsiExplanation += " ✅ Overbought (>70)";
    } else if (marketData.rsi < 40 || marketData.rsi > 60) {
      rsiValue = 30;
      rsiExplanation += " ⚠️ Moderadamente extremo";
    } else {
      rsiValue = 0;
      rsiExplanation += " ❌ Normal, sin reverting";
    }
    factors.push({
      name: "RSI",
      value: Math.min(100, Math.max(0, rsiValue)),
      weight: 0.2,
      explanation: rsiExplanation,
    });

    // 3. VOLUMEN: Confirmación del movimiento extremo (15%)
    // Escala 0-100: 100 si >1.5x, 50 si >1.0x, 0 si <1.0x
    const volumeRatio = marketData.volume / marketData.volumeAvg30;
    let volumeValue = 0;
    let volumeExplanation = `Vol ${volumeRatio.toFixed(2)}x`;
    if (volumeRatio >= 1.5) {
      volumeValue = 100;
      volumeExplanation += " ✅ Alto (>50%)";
    } else if (volumeRatio >= 1.2) {
      volumeValue = 75;
      volumeExplanation += " ✅ Moderado (>20%)";
    } else if (volumeRatio >= 1.0) {
      volumeValue = 50;
      volumeExplanation += " ⚠️ Normal";
    } else {
      volumeValue = 0;
      volumeExplanation += " ❌ Bajo";
    }
    factors.push({
      name: "Volumen",
      value: volumeValue,
      weight: 0.15,
      explanation: volumeExplanation,
    });

    // 4. SOPORTE: Cercano para limitar riesgo (20%)
    // Proxy: Distancia del low al MA20
    // 100 si low > MA20*0.98 (soporte cercano), 0 si low < MA20*0.96
    const supportLevel = marketData.ma20 * 0.98;
    const supportDistance = Math.abs(marketData.low - supportLevel);
    const supportGap = (supportDistance / marketData.ma20) * 100;

    let supportValue = 0;
    let supportExplanation = `Soporte gap ${supportGap.toFixed(2)}%`;
    if (supportGap < 1.0) {
      supportValue = 100;
      supportExplanation += " ✅ Muy cercano";
    } else if (supportGap < 2.0) {
      supportValue = 75;
      supportExplanation += " ✅ Cercano";
    } else if (supportGap < 3.0) {
      supportValue = 50;
      supportExplanation += " ⚠️ Moderado";
    } else {
      supportValue = 0;
      supportExplanation += " ❌ Lejano";
    }
    factors.push({
      name: "Soporte",
      value: supportValue,
      weight: 0.2,
      explanation: supportExplanation,
    });

    // 5. LIQUIDEZ: Spreads tight (10%)
    const spread = marketData.askPrice - marketData.bidPrice;
    const spreadPct = (spread / marketData.close) * 100;
    let liquidityValue = 0;
    let liquidityExplanation = `Spread ${spreadPct.toFixed(3)}%`;
    if (spreadPct < 0.02) {
      liquidityValue = 100;
      liquidityExplanation += " ✅ Muy líquido";
    } else if (spreadPct < 0.05) {
      liquidityValue = 75;
      liquidityExplanation += " ✅ Líquido";
    } else if (spreadPct < 0.1) {
      liquidityValue = 50;
      liquidityExplanation += " ⚠️ Aceptable";
    } else {
      liquidityValue = 0;
      liquidityExplanation += " ❌ Bajo líquido";
    }
    factors.push({
      name: "Liquidez",
      value: liquidityValue,
      weight: 0.1,
      explanation: liquidityExplanation,
    });

    // 6. RÉGIMEN: No earnings (10%)
    const regimeNormal = !marketData.hasEarningsToday;
    const regimeValue = regimeNormal ? 100 : 0;
    factors.push({
      name: "Régimen",
      value: regimeValue,
      weight: 0.1,
      explanation: regimeNormal
        ? "✅ Régimen normal (no earnings)"
        : "❌ Earnings hoy, alto riesgo",
    });

    return factors;
  }

  /**
   * Valida las reglas específicas de Mean Reversion
   *
   * Reglas:
   * 1. Precio > 2σ lejos del MA20
   * 2. RSI < 30 O > 70 (extremo)
   * 3. Soporte identificado (low cercano a MA20)
   * 4. NO earnings hoy
   */
  protected validateRules(marketData: MarketData): {
    isValid: boolean;
    reason?: string;
  } {
    // 1. Desviación > 2σ del MA20
    const deviationPct = Math.abs(
      (marketData.close - marketData.ma20) / marketData.ma20
    ) * 100;
    const sigmaPct = 0.8;
    const sigmaDeviation = deviationPct / sigmaPct;

    if (sigmaDeviation < 1.5) {
      return {
        isValid: false,
        reason: `Desviación insuficiente: ${sigmaDeviation.toFixed(1)}σ (mínimo 1.5σ)`,
      };
    }

    // 2. RSI < 30 O > 70
    if (marketData.rsi >= 30 && marketData.rsi <= 70) {
      return {
        isValid: false,
        reason: `RSI ${marketData.rsi.toFixed(1)} sin extremo, esperando < 30 o > 70`,
      };
    }

    // 3. Soporte cercano (low > MA20 - 2%)
    const supportLevel = marketData.ma20 * 0.98;
    if (marketData.low < supportLevel * 0.95) {
      return {
        isValid: false,
        reason: `Soporte violado: low ${marketData.low.toFixed(2)} < nivel ${supportLevel.toFixed(2)}`,
      };
    }

    // 4. NO earnings hoy
    if (marketData.hasEarningsToday) {
      return {
        isValid: false,
        reason: "Earnings event hoy, riesgo extremo para reverting",
      };
    }

    return { isValid: true };
  }

  /**
   * Parámetros de riesgo para Mean Reversion
   *
   * - Stop Loss: 2.5% (reverting puede fallar, necesitamos más espacio)
   * - Take Profits: 1.5%, 2.5%, 3% (hacia MA20)
   * - Trailing: disabled (reversions son rápidas, no queremos trailing)
   * - Max Reentries: 1 (menos reentradas que trending strategies)
   */
  protected getRiskParameters(): RiskParameters {
    return {
      stopLossPct: 2.5,
      takeProfitPcts: [1.5, 2.5, 3.0],
      positionSizePct: 100,
      riskPercentage: 2.0,
      trailingEnabled: false, // Reversions son rápidas
      trailingDistancePct: 0,
      maxReentries: 1,
    };
  }

  /**
   * Explicación en lenguaje natural
   */
  protected buildNaturalLanguageExplanation(
    marketData: MarketData,
    scoreComponents: SignalScoreComponents,
    volumeAnalysis: any,
    volatilityAnalysis: any,
    recommendation: SignalRecommendation
  ): string {
    let explanation = "";

    if (recommendation === SignalRecommendation.BLOCKED) {
      explanation += "Señal BLOQUEADA por reglas de entrada.";
      return explanation;
    }

    if (recommendation === SignalRecommendation.ENTER) {
      const direction =
        marketData.rsi < 30
          ? "Oversold (RSI <30), reverting alcista"
          : "Overbought (RSI >70), reverting bajista";
      const deviationPct = Math.abs(
        (marketData.close - marketData.ma20) / marketData.ma20
      ) * 100;

      explanation += `${direction}. `;
      explanation += `Desviación ${deviationPct.toFixed(2)}% del MA20. `;
      explanation += `Target reverting hacia MA20 (${marketData.ma20.toFixed(2)}). `;
      explanation += `SL 2.5% / TP1 1.5% / TP2 2.5% / TP3 3%.`;
    }

    return explanation;
  }
}
