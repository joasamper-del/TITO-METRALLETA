/**
 * LongStraddleStrategy - Long Straddle (6.5/10 confidence)
 * Comprar call + put al mismo strike. Gana con movimiento fuerte.
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

export class LongStraddleStrategy extends BaseStrategy {
  name: StrategyName = StrategyName.LONG_STRADDLE;
  minSignalScore: number = 60;
  maxSimultaneousTrades: number = 2;
  defaultPositionSizePct: number = 100;
  defaultRiskPct: number = 3.0;

  protected calculateScoreFactors(
    input: ScoreFactorInput
  ): ScoreFactor[] {
    const { marketData } = input;
    const factors: ScoreFactor[] = [];

    // 1. IV RANK (30%) - Straddle gana con volatilidad
    let ivValue = 0;
    if (marketData.vix > 25) {
      ivValue = 100;
    } else if (marketData.vix > 20) {
      ivValue = 80;
    } else if (marketData.vix > 15) {
      ivValue = 60;
    } else {
      ivValue = 30;
    }
    factors.push({
      name: "IV Rank",
      value: ivValue,
      weight: 0.3,
      explanation: `VIX ${marketData.vix.toFixed(1)} - movimiento esperado`,
    });

    // 2. ATR (20%) - Volatilidad realizada
    const atrPct = (marketData.atr / marketData.close) * 100;
    let atrValue = atrPct > 2.0 ? 100 : atrPct > 1.5 ? 80 : 50;
    factors.push({
      name: "ATR",
      value: atrValue,
      weight: 0.2,
      explanation: `ATR ${atrPct.toFixed(2)}%`,
    });

    // 3. PROXIMIDAD DE EVENTO (20%)
    const eventScore = !marketData.hasEarningsToday ? 100 : 0;
    factors.push({
      name: "Evento",
      value: eventScore,
      weight: 0.2,
      explanation: marketData.hasEarningsToday
        ? "⚠️ Earnings hoy"
        : "✅ Sin eventos",
    });

    // 4. RSI NEUTRAL (15%)
    let rsiValue = 0;
    if (marketData.rsi >= 40 && marketData.rsi <= 60) {
      rsiValue = 100;
    } else if (marketData.rsi > 30 && marketData.rsi < 70) {
      rsiValue = 70;
    } else {
      rsiValue = 40;
    }
    factors.push({
      name: "RSI",
      value: rsiValue,
      weight: 0.15,
      explanation: `RSI ${marketData.rsi.toFixed(1)}`,
    });

    // 5. LIQUIDEZ (15%)
    const spread = marketData.askPrice - marketData.bidPrice;
    let liquidityValue = spread < 0.02 * marketData.close ? 100 : 60;
    factors.push({
      name: "Liquidez",
      value: liquidityValue,
      weight: 0.15,
      explanation: `Spread ${((spread / marketData.close) * 100).toFixed(3)}%`,
    });

    return factors;
  }

  protected validateRules(marketData: MarketData): {
    isValid: boolean;
    reason?: string;
  } {
    if (marketData.vix < 12) {
      return {
        isValid: false,
        reason: "VIX muy bajo, movimiento insuficiente",
      };
    }

    if (marketData.hasEarningsToday) {
      return {
        isValid: false,
        reason: "Earnings hoy, especial riesgo",
      };
    }

    return { isValid: true };
  }

  protected getRiskParameters(): RiskParameters {
    return {
      stopLossPct: 100, // Max loss = prima pagada
      takeProfitPcts: [30, 50], // Take profit en 30-50% ganancia
      positionSizePct: 100,
      riskPercentage: 3.0,
      trailingEnabled: false,
      trailingDistancePct: 0,
      maxReentries: 0,
    };
  }

  protected buildNaturalLanguageExplanation(
    marketData: MarketData,
    scoreComponents: SignalScoreComponents,
    volumeAnalysis: any,
    volatilityAnalysis: any,
    recommendation: SignalRecommendation
  ): string {
    if (recommendation === SignalRecommendation.BLOCKED) {
      return "Long Straddle BLOQUEADA.";
    }

    if (recommendation === SignalRecommendation.ENTER) {
      return `Long Straddle: Comprar call + put ATM. Gana con movimiento fuerte. VIX ${marketData.vix.toFixed(1)}.`;
    }

    return "";
  }
}
