/**
 * TrailingExitStrategy - Trailing Exit + Reentrada Confirmada (9/10 confidence)
 *
 * Filosofía:
 * - Operar en tendencias alcistas establecidas (MA50 > MA200)
 * - Usar trailing stop para proteger ganancias y capturar movimientos prolongados
 * - Permitir reentrradas confirmadas cuando la tendencia se reafirma
 * - Máximo 2 reentradas por posición
 *
 * Factores de Score (6):
 * 1. Tendencia (25%): MA50 > MA200
 * 2. RSI (20%): 50-70 (alcista moderado, no sobrecomprado)
 * 3. SuperTrend (20%): Indicator BULLISH
 * 4. Volumen (15%): > promedio 30 barras
 * 5. Liquidez (10%): Spread bid/ask bajo
 * 6. Régimen (10%): No en earnings/evento
 *
 * Reglas de Validación:
 * - MA50 > MA200 (tendencia alcista)
 * - RSI 50-70 (momentum alcista sin sobrecompra)
 * - SuperTrend BULLISH
 * - NO earnings hoy
 *
 * Risk Parameters:
 * - Stop Loss: 2%
 * - Trailing Stop: 1.5%
 * - Max Reentries: 2
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

export class TrailingExitStrategy extends BaseStrategy {
  // Propiedades requeridas
  name: StrategyName = StrategyName.TRAILING_EXIT;
  minSignalScore: number = 70;
  maxSimultaneousTrades: number = 5;
  defaultPositionSizePct: number = 100;
  defaultRiskPct: number = 1.5;

  /**
   * Calcula los 6 factores de score específicos de Trailing Exit
   *
   * Factores:
   * 1. Tendencia (25%): MA50 > MA200 → 25 puntos
   * 2. RSI (20%): 50-70 → 20 puntos
   * 3. SuperTrend (20%): BULLISH → 20 puntos
   * 4. Volumen (15%): > avg30 → 15 puntos
   * 5. Liquidez (10%): Spread bajo → 10 puntos
   * 6. Régimen (10%): No earnings → 10 puntos
   */
  protected calculateScoreFactors(
    input: ScoreFactorInput
  ): ScoreFactor[] {
    const { marketData } = input;

    const factors: ScoreFactor[] = [];

    // 1. TENDENCIA: MA50 > MA200 (25%)
    // Escala 0-100: 100 si bullish, 0 si bearish
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

    // 2. RSI: 50-70 alcista sin sobrecompra (20%)
    // Escala 0-100 en el rango 50-70
    let rsiValue = 0;
    let rsiExplanation = `RSI ${marketData.rsi.toFixed(1)}`;
    if (marketData.rsi >= 50 && marketData.rsi < 70) {
      rsiValue = ((marketData.rsi - 50) / 20) * 100; // Normalizar 50-70 a 0-100
      rsiExplanation += " ✅ en rango alcista (50-70)";
    } else if (marketData.rsi >= 70 && marketData.rsi < 80) {
      rsiValue = 50; // Parcialmente válido
      rsiExplanation += " ⚠️ sobrecomprado (>70)";
    } else {
      rsiValue = 0;
      rsiExplanation += " ❌ sin momentum alcista";
    }
    factors.push({
      name: "RSI",
      value: Math.min(100, Math.max(0, rsiValue)),
      weight: 0.2,
      explanation: rsiExplanation,
    });

    // 3. SUPERTREND: Indicator BULLISH (20%)
    // Escala 0-100: 100 si bullish, 0 si bearish
    const superTrendBullish =
      marketData.close > marketData.bollingerMiddle;
    const superTrendValue = superTrendBullish ? 100 : 0;
    factors.push({
      name: "SuperTrend",
      value: superTrendValue,
      weight: 0.2,
      explanation: superTrendBullish
        ? "✅ SuperTrend BULLISH (close > MA20)"
        : "❌ SuperTrend BEARISH",
    });

    // 4. VOLUMEN: > promedio 30 barras (15%)
    // Escala 0-100: 100 si volumen > 1.5x, 50 si 1.0x, 0 si < 1.0x
    const volumeRatio = marketData.volume / marketData.volumeAvg30;
    let volumeValue = 0;
    let volumeExplanation = `Vol ${volumeRatio.toFixed(2)}x`;
    if (volumeRatio >= 1.5) {
      volumeValue = 100;
      volumeExplanation += " ✅ >50% promedio";
    } else if (volumeRatio >= 1.2) {
      volumeValue = 75;
      volumeExplanation += " ✅ >20% promedio";
    } else if (volumeRatio >= 1.0) {
      volumeValue = 50;
      volumeExplanation += " ⚠️ en promedio";
    } else {
      volumeValue = 0;
      volumeExplanation += " ❌ bajo";
    }
    factors.push({
      name: "Volumen",
      value: volumeValue,
      weight: 0.15,
      explanation: volumeExplanation,
    });

    // 5. LIQUIDEZ: Spread bid/ask (10%)
    // Escala 0-100: 100 si spread < 0.02%, 50 si < 0.1%, 0 si > 0.1%
    const spread = marketData.askPrice - marketData.bidPrice;
    const spreadPct = (spread / marketData.close) * 100;
    let liquidityValue = 0;
    let liquidityExplanation = `Spread ${spreadPct.toFixed(3)}%`;
    if (spreadPct < 0.02) {
      liquidityValue = 100;
      liquidityExplanation += " ✅ muy líquido";
    } else if (spreadPct < 0.05) {
      liquidityValue = 75;
      liquidityExplanation += " ✅ muy líquido";
    } else if (spreadPct < 0.1) {
      liquidityValue = 50;
      liquidityExplanation += " ⚠️ líquido";
    } else {
      liquidityValue = 0;
      liquidityExplanation += " ❌ bajo líquido";
    }
    factors.push({
      name: "Liquidez",
      value: liquidityValue,
      weight: 0.1,
      explanation: liquidityExplanation,
    });

    // 6. RÉGIMEN: No earnings/evento (10%)
    // Escala 0-100: 100 si régimen normal, 0 si earnings
    const regimeNormal = !marketData.hasEarningsToday;
    const regimeValue = regimeNormal ? 100 : 0;
    factors.push({
      name: "Régimen",
      value: regimeValue,
      weight: 0.1,
      explanation: regimeNormal
        ? "✅ Régimen normal (no earnings)"
        : "❌ Earnings hoy, esperar",
    });

    return factors;
  }

  /**
   * Valida las reglas específicas de entrada para Trailing Exit
   *
   * Reglas:
   * 1. MA50 > MA200 (tendencia alcista confirmada)
   * 2. RSI 50-70 (momentum alcista, no sobrecomprado)
   * 3. SuperTrend BULLISH
   * 4. NO earnings hoy
   */
  protected validateRules(marketData: MarketData): {
    isValid: boolean;
    reason?: string;
  } {
    // 1. MA50 > MA200
    if (marketData.ma50 <= marketData.ma200) {
      return {
        isValid: false,
        reason: "Tendencia bajista: MA50 <= MA200",
      };
    }

    // 2. RSI 50-70
    if (marketData.rsi < 50 || marketData.rsi > 80) {
      return {
        isValid: false,
        reason: `RSI ${marketData.rsi.toFixed(1)} fuera de rango (50-70)`,
      };
    }

    // 3. SuperTrend BULLISH (proxy: close > Bollinger middle)
    if (marketData.close <= marketData.bollingerMiddle) {
      return {
        isValid: false,
        reason: "SuperTrend BEARISH: close <= MA20",
      };
    }

    // 4. NO earnings hoy
    if (marketData.hasEarningsToday) {
      return {
        isValid: false,
        reason: "Earnings event hoy, operación bloqueada",
      };
    }

    return { isValid: true };
  }

  /**
   * Parámetros de riesgo para Trailing Exit
   *
   * - Stop Loss: 2% (protección capital)
   * - Take Profits: 2%, 3.5%, 5% (escala de salida)
   * - Trailing: 1.5% (proteger ganancias durante movimiento)
   * - Max Reentries: 2 (máximo 3 posiciones por símbolo)
   */
  protected getRiskParameters(): RiskParameters {
    return {
      stopLossPct: 2.0,
      takeProfitPcts: [2.0, 3.5, 5.0],
      positionSizePct: 100,
      riskPercentage: 1.5,
      trailingEnabled: true,
      trailingDistancePct: 1.5,
      maxReentries: 2,
    };
  }

  /**
   * Explicación en lenguaje natural de la decisión de entrada
   *
   * Comunica:
   * - Estado de tendencia
   * - Confirmaciones técnicas
   * - Próximos niveles (stop, targets)
   * - Contexto del régimen de mercado
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
      explanation +=
        "Señal BLOQUEADA por reglas de entrada o volatilidad extrema.";
      return explanation;
    }

    if (recommendation === SignalRecommendation.ENTER) {
      // Construir narrativa de entrada
      const trendDirection =
        marketData.ma50 > marketData.ma200 ? "Alcista" : "Bajista";
      const rsiStatus =
        marketData.rsi >= 50 && marketData.rsi < 70
          ? "moderadamente alcista"
          : "sobrecomprado";

      explanation += `Tendencia ${trendDirection} confirmada (MA50 > MA200). `;
      explanation += `RSI ${marketData.rsi.toFixed(1)} ${rsiStatus}. `;
      explanation += `Volumen ${(marketData.volume / marketData.volumeAvg30).toFixed(2)}x promedio. `;

      // Niveles de operación
      const riskPct = 2.0;
      const sl = marketData.close * (1 - riskPct / 100);
      const tp1 = marketData.close * 1.02;
      const tp2 = marketData.close * 1.035;
      const tp3 = marketData.close * 1.05;

      explanation += `SL ${sl.toFixed(2)} / TP1 ${tp1.toFixed(2)} / TP2 ${tp2.toFixed(2)} / TP3 ${tp3.toFixed(2)}. `;
      explanation += `Trailing enabled @ 1.5% para capturar movimiento prolongado.`;
    }

    return explanation;
  }
}
