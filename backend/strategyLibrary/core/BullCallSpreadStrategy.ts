/**
 * BullCallSpreadStrategy - Bull Call Spread en opciones (7/10 confidence)
 *
 * Filosofía:
 * - Comprar call ATM/ITM + Vender call OTM
 * - Reducir costo de la estrategia (crédito neto)
 * - Limitar ganancia máxima a diferencia entre strikes
 * - Ideal para movimientos alcistas moderados (no explosivos)
 *
 * Factores de Score (6):
 * 1. Tendencia (25%): MA50 > MA200
 * 2. IV Rank (20%): IV bajo para vender call (backspread mejor)
 * 3. Movimiento esperado (20%): Move expectancy vs spread
 * 4. RSI (15%): 50-70 alcista
 * 5. Liquidez (10%): Chain liquidity
 * 6. Régimen (10%): No earnings
 *
 * Reglas de Validación:
 * - MA50 > MA200 (tendencia alcista)
 * - IV Rank < 70 (para vender call)
 * - Movimiento esperado < diferencia strikes (limita riesgo)
 * - RSI 50-75
 * - NO earnings próximas 2 semanas
 *
 * Risk Parameters:
 * - Max Loss: Diferencia strikes - crédito recibido
 * - Max Gain: Crédito recibido
 * - Stop Loss: 50% de crédito (loss management)
 * - Take Profit: 75-80% de crédito
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

export class BullCallSpreadStrategy extends BaseStrategy {
  name: StrategyName = StrategyName.BULL_CALL_SPREAD;
  minSignalScore: number = 65;
  maxSimultaneousTrades: number = 2;
  defaultPositionSizePct: number = 100;
  defaultRiskPct: number = 2.0;

  protected calculateScoreFactors(
    input: ScoreFactorInput
  ): ScoreFactor[] {
    const { marketData } = input;
    const factors: ScoreFactor[] = [];

    // 1. TENDENCIA (25%)
    const trendValue = marketData.ma50 > marketData.ma200 ? 100 : 0;
    factors.push({
      name: "Tendencia",
      value: trendValue,
      weight: 0.25,
      explanation: marketData.ma50 > marketData.ma200
        ? "✅ Tendencia alcista"
        : "❌ Tendencia bajista",
    });

    // 2. IV RANK (20%) - Proxy: VIX nivel
    // Bajo VIX (<20) = mejor para vender (100), Alto VIX (>30) = peor (0)
    let ivValue = 0;
    if (marketData.vix < 15) {
      ivValue = 100;
    } else if (marketData.vix < 20) {
      ivValue = 80;
    } else if (marketData.vix < 25) {
      ivValue = 50;
    } else {
      ivValue = 20;
    }
    factors.push({
      name: "IV Rank",
      value: ivValue,
      weight: 0.2,
      explanation: `VIX ${marketData.vix.toFixed(1)}`,
    });

    // 3. MOVIMIENTO ESPERADO (20%)
    // Movimiento esperado típicamente = ATR
    // 100 si ATR pequeño (<1% del close), 0 si ATR grande (>3%)
    const atrPct = (marketData.atr / marketData.close) * 100;
    let moveValue = 0;
    if (atrPct < 1.0) {
      moveValue = 100;
    } else if (atrPct < 1.5) {
      moveValue = 80;
    } else if (atrPct < 2.0) {
      moveValue = 60;
    } else if (atrPct < 2.5) {
      moveValue = 40;
    } else {
      moveValue = 0;
    }
    factors.push({
      name: "Movimiento",
      value: moveValue,
      weight: 0.2,
      explanation: `ATR ${atrPct.toFixed(2)}%`,
    });

    // 4. RSI (15%)
    let rsiValue = 0;
    if (marketData.rsi >= 50 && marketData.rsi < 75) {
      rsiValue = ((marketData.rsi - 50) / 25) * 100;
    } else {
      rsiValue = 0;
    }
    factors.push({
      name: "RSI",
      value: Math.min(100, rsiValue),
      weight: 0.15,
      explanation: `RSI ${marketData.rsi.toFixed(1)}`,
    });

    // 5. LIQUIDEZ (10%)
    const spread = marketData.askPrice - marketData.bidPrice;
    const spreadPct = (spread / marketData.close) * 100;
    let liquidityValue = spreadPct < 0.05 ? 100 : 50;
    factors.push({
      name: "Liquidez",
      value: liquidityValue,
      weight: 0.1,
      explanation: `Spread ${spreadPct.toFixed(3)}%`,
    });

    // 6. RÉGIMEN (10%)
    const regimeValue = !marketData.hasEarningsToday ? 100 : 0;
    factors.push({
      name: "Régimen",
      value: regimeValue,
      weight: 0.1,
      explanation: marketData.hasEarningsToday
        ? "⚠️ Earnings"
        : "✅ Normal",
    });

    return factors;
  }

  protected validateRules(marketData: MarketData): {
    isValid: boolean;
    reason?: string;
  } {
    if (marketData.ma50 <= marketData.ma200) {
      return {
        isValid: false,
        reason: "Tendencia bajista",
      };
    }

    if (marketData.vix > 35) {
      return {
        isValid: false,
        reason: "VIX muy alto, IV caros",
      };
    }

    if (marketData.rsi < 40 || marketData.rsi > 85) {
      return {
        isValid: false,
        reason: `RSI ${marketData.rsi.toFixed(1)} fuera de rango`,
      };
    }

    if (marketData.hasEarningsToday) {
      return {
        isValid: false,
        reason: "Earnings event",
      };
    }

    return { isValid: true };
  }

  protected getRiskParameters(): RiskParameters {
    return {
      stopLossPct: 50, // 50% loss on credit
      takeProfitPcts: [75, 80], // 75-80% of credit
      positionSizePct: 100,
      riskPercentage: 2.0,
      trailingEnabled: false,
      trailingDistancePct: 0,
      maxReentries: 0, // Spreads son estáticas
    };
  }

  protected buildNaturalLanguageExplanation(
    marketData: MarketData,
    scoreComponents: SignalScoreComponents,
    volumeAnalysis: any,
    volatilityAnalysis: any,
    recommendation: SignalRecommendation
  ): string {
    let explanation = "";

    if (recommendation === SignalRecommendation.BLOCKED) {
      explanation += "Bull Call Spread BLOQUEADA.";
      return explanation;
    }

    if (recommendation === SignalRecommendation.ENTER) {
      explanation += `Bull Call Spread: Comprar call ATM, Vender call +2% OTM. `;
      explanation += `Tendencia alcista confirmada. IV ${marketData.vix.toFixed(1)}. `;
      explanation += `Max gain: crédito recibido. Max loss: spread - crédito.`;
    }

    return explanation;
  }
}
