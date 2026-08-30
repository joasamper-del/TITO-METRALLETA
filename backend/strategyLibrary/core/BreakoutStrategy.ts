/**
 * BreakoutStrategy - Breakout con confirmación de volumen (8/10 confidence)
 *
 * Filosofía:
 * - Operar cuando price rompe nivel clave (Bollinger Upper) con volumen
 * - Tendencia alcista establecida (MA50 > MA200)
 * - Seguir el movimiento hasta target 2-3% arriba del breakout
 * - NO es trailing exit, es movimiento directional fuerte
 *
 * Factores de Score (6):
 * 1. Breakout (25%): Close > Bollinger Upper
 * 2. Tendencia (25%): MA50 > MA200
 * 3. Volumen (20%): Confirmación del breakout
 * 4. RSI (15%): No sobrecomprado al entrada
 * 5. Liquidez (10%): Para ejecutar sin slippage
 * 6. Régimen (5%): No earnings
 *
 * Reglas de Validación:
 * - Close > Bollinger Upper
 * - MA50 > MA200 (tendencia alcista)
 * - Volumen > 1.2x promedio
 * - RSI 50-80 (alcista, no extremo sobrecompra)
 * - NO earnings hoy
 *
 * Risk Parameters:
 * - Stop Loss: 1.5% (breakouts deben ser rápidos, SL ajustado)
 * - Take Profits: 2%, 3%, 4% (targets arriba del breakout)
 * - Trailing: enabled (1% trailing para capturar movimientos continuos)
 * - Max Reentries: 1
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

export class BreakoutStrategy extends BaseStrategy {
  // Propiedades requeridas
  name: StrategyName = StrategyName.BREAKOUT;
  minSignalScore: number = 70; // Threshold similar a Trailing Exit
  maxSimultaneousTrades: number = 4; // Moderado
  defaultPositionSizePct: number = 100;
  defaultRiskPct: number = 1.5;

  /**
   * Calcula los 6 factores de score para Breakout
   *
   * Factores:
   * 1. Breakout (25%): Confirmación de ruptura
   * 2. Tendencia (25%): Alcista establecida
   * 3. Volumen (20%): Confirmación del movimiento
   * 4. RSI (15%): Momentum sin sobrecompra
   * 5. Liquidez (10%): Ejecución limpia
   * 6. Régimen (5%): Sin eventos bloqueantes
   */
  protected calculateScoreFactors(
    input: ScoreFactorInput
  ): ScoreFactor[] {
    const { marketData } = input;

    const factors: ScoreFactor[] = [];

    // 1. BREAKOUT: Close > Bollinger Upper (25%)
    // Escala 0-100: 100 si bien por encima, 50 si en el borde
    const breakoutDistance =
      marketData.close - marketData.bollingerUpper;
    const breakoutPct =
      (breakoutDistance / marketData.close) * 100;

    let breakoutValue = 0;
    let breakoutExplanation = `Distancia breakout: ${breakoutPct.toFixed(3)}%`;
    if (breakoutPct > 0.5) {
      breakoutValue = 100;
      breakoutExplanation += " ✅ Fuerte (>0.5%)";
    } else if (breakoutPct > 0.2) {
      breakoutValue = 80;
      breakoutExplanation += " ✅ Claro (>0.2%)";
    } else if (breakoutPct > 0) {
      breakoutValue = 50;
      breakoutExplanation += " ⚠️ Marginal";
    } else {
      breakoutValue = 0;
      breakoutExplanation += " ❌ Sin breakout aún";
    }
    factors.push({
      name: "Breakout",
      value: breakoutValue,
      weight: 0.25,
      explanation: breakoutExplanation,
    });

    // 2. TENDENCIA: MA50 > MA200 (25%)
    const trendValue =
      marketData.ma50 > marketData.ma200 ? 100 : 0;
    const trendStrength =
      marketData.ma50 > marketData.ma200
        ? `MA50 (${marketData.ma50.toFixed(2)}) > MA200 (${marketData.ma200.toFixed(2)})`
        : `Tendencia bajista: MA50 < MA200`;
    factors.push({
      name: "Tendencia",
      value: trendValue,
      weight: 0.25,
      explanation: trendStrength,
    });

    // 3. VOLUMEN: Confirmación del breakout (20%)
    const volumeRatio = marketData.volume / marketData.volumeAvg30;
    let volumeValue = 0;
    let volumeExplanation = `Vol ${volumeRatio.toFixed(2)}x`;
    if (volumeRatio >= 1.5) {
      volumeValue = 100;
      volumeExplanation += " ✅ Confirmación fuerte (>50%)";
    } else if (volumeRatio >= 1.2) {
      volumeValue = 80;
      volumeExplanation += " ✅ Confirmación (>20%)";
    } else if (volumeRatio >= 1.0) {
      volumeValue = 40;
      volumeExplanation += " ⚠️ Débil";
    } else {
      volumeValue = 0;
      volumeExplanation += " ❌ Bajo volumen";
    }
    factors.push({
      name: "Volumen",
      value: volumeValue,
      weight: 0.2,
      explanation: volumeExplanation,
    });

    // 4. RSI: 50-80 alcista sin extremo (15%)
    let rsiValue = 0;
    let rsiExplanation = `RSI ${marketData.rsi.toFixed(1)}`;
    if (marketData.rsi >= 50 && marketData.rsi < 80) {
      rsiValue = ((marketData.rsi - 50) / 30) * 100;
      rsiExplanation += " ✅ Alcista óptimo (50-80)";
    } else if (marketData.rsi >= 80) {
      rsiValue = 20;
      rsiExplanation += " ⚠️ Sobrecomprado (>80)";
    } else {
      rsiValue = 0;
      rsiExplanation += " ❌ Sin momentum alcista";
    }
    factors.push({
      name: "RSI",
      value: Math.min(100, Math.max(0, rsiValue)),
      weight: 0.15,
      explanation: rsiExplanation,
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
      liquidityValue = 80;
      liquidityExplanation += " ✅ Líquido";
    } else if (spreadPct < 0.1) {
      liquidityValue = 50;
      liquidityExplanation += " ⚠️ Aceptable";
    } else {
      liquidityValue = 0;
      liquidityExplanation += " ❌ Poco líquido";
    }
    factors.push({
      name: "Liquidez",
      value: liquidityValue,
      weight: 0.1,
      explanation: liquidityExplanation,
    });

    // 6. RÉGIMEN: No earnings (5%)
    const regimeNormal = !marketData.hasEarningsToday;
    const regimeValue = regimeNormal ? 100 : 0;
    factors.push({
      name: "Régimen",
      value: regimeValue,
      weight: 0.05,
      explanation: regimeNormal
        ? "✅ Régimen normal"
        : "⚠️ Earnings hoy",
    });

    return factors;
  }

  /**
   * Valida las reglas específicas de Breakout
   *
   * Reglas:
   * 1. Close > Bollinger Upper
   * 2. MA50 > MA200 (tendencia alcista)
   * 3. Volumen > 1.2x promedio
   * 4. RSI 50-80 (alcista, no extremo)
   * 5. NO earnings hoy
   */
  protected validateRules(marketData: MarketData): {
    isValid: boolean;
    reason?: string;
  } {
    // 1. Close > Bollinger Upper
    if (marketData.close <= marketData.bollingerUpper) {
      return {
        isValid: false,
        reason: `Sin breakout: close ${marketData.close.toFixed(2)} <= Bollinger ${marketData.bollingerUpper.toFixed(2)}`,
      };
    }

    // 2. MA50 > MA200
    if (marketData.ma50 <= marketData.ma200) {
      return {
        isValid: false,
        reason: "Tendencia bajista: MA50 <= MA200, breakout rechazado",
      };
    }

    // 3. Volumen > 1.2x promedio
    const volumeRatio = marketData.volume / marketData.volumeAvg30;
    if (volumeRatio < 1.2) {
      return {
        isValid: false,
        reason: `Volumen insuficiente: ${volumeRatio.toFixed(2)}x < 1.2x requerido`,
      };
    }

    // 4. RSI 50-80
    if (marketData.rsi < 50 || marketData.rsi > 85) {
      return {
        isValid: false,
        reason: `RSI ${marketData.rsi.toFixed(1)} fuera de rango óptimo (50-85)`,
      };
    }

    // 5. NO earnings hoy
    if (marketData.hasEarningsToday) {
      return {
        isValid: false,
        reason: "Earnings event hoy, operación bloqueada",
      };
    }

    return { isValid: true };
  }

  /**
   * Parámetros de riesgo para Breakout
   *
   * - Stop Loss: 1.5% (breakouts deben ser rápidos)
   * - Take Profits: 2%, 3%, 4% (targets arriba del breakout)
   * - Trailing: enabled (capturar movimientos continuos)
   * - Max Reentries: 1 (menos que trailing exit)
   */
  protected getRiskParameters(): RiskParameters {
    return {
      stopLossPct: 1.5,
      takeProfitPcts: [2.0, 3.0, 4.0],
      positionSizePct: 100,
      riskPercentage: 1.5,
      trailingEnabled: true,
      trailingDistancePct: 1.0, // Tighter trailing than Trailing Exit
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
      const breakoutHeight =
        marketData.close - marketData.bollingerUpper;
      const volumeRatio = marketData.volume / marketData.volumeAvg30;

      explanation += `Breakout de Bollinger Upper a ${marketData.close.toFixed(2)}. `;
      explanation += `Volumen ${volumeRatio.toFixed(2)}x (${((volumeRatio - 1) * 100).toFixed(0)}% encima). `;
      explanation += `Tendencia alcista confirmada (MA50 > MA200). `;
      explanation += `Target: 2% ($${(marketData.close * 1.02).toFixed(2)}) / `;
      explanation += `3% ($${(marketData.close * 1.03).toFixed(2)}) / `;
      explanation += `4% ($${(marketData.close * 1.04).toFixed(2)}). `;
      explanation += `SL 1.5% con trailing 1%.`;
    }

    return explanation;
  }
}
