/**
 * LongStrangleStrategy - Long Strangle (6.5/10 confidence)
 * Comprar call OTM + put OTM (strikes diferentes). Más barato que straddle.
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

export class LongStrangleStrategy extends BaseStrategy {
  name: StrategyName = StrategyName.LONG_STRANGLE;
  minSignalScore: number = 55;
  maxSimultaneousTrades: number = 3;
  defaultPositionSizePct: number = 100;
  defaultRiskPct: number = 2.5;

  protected calculateScoreFactors(
    input: ScoreFactorInput
  ): ScoreFactor[] {
    const { marketData } = input;
    const factors: ScoreFactor[] = [];

    // 1. IV RANK (30%)
    let ivValue = 0;
    if (marketData.vix > 22) {
      ivValue = 100;
    } else if (marketData.vix > 18) {
      ivValue = 80;
    } else if (marketData.vix > 14) {
      ivValue = 60;
    } else {
      ivValue = 40;
    }
    factors.push({
      name: "IV Rank",
      value: ivValue,
      weight: 0.3,
      explanation: `VIX ${marketData.vix.toFixed(1)}`,
    });

    // 2. ATR (20%)
    const atrPct = (marketData.atr / marketData.close) * 100;
    let atrValue = atrPct > 1.8 ? 100 : atrPct > 1.2 ? 80 : 50;
    factors.push({
      name: "ATR",
      value: atrValue,
      weight: 0.2,
      explanation: `ATR ${atrPct.toFixed(2)}%`,
    });

    // 3. EVENTO PRÓXIMO (20%)
    const eventScore = !marketData.hasEarningsToday ? 100 : 30;
    factors.push({
      name: "Evento",
      value: eventScore,
      weight: 0.2,
      explanation: marketData.hasEarningsToday ? "⚠️ Earnings" : "✅ Normal",
    });

    // 4. RSI (15%)
    let rsiValue = 0;
    if (marketData.rsi >= 35 && marketData.rsi <= 65) {
      rsiValue = 100;
    } else if (marketData.rsi > 25 && marketData.rsi < 75) {
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
    let liquidityValue = spread < 0.03 * marketData.close ? 100 : 60;
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
    if (marketData.vix < 10) {
      return {
        isValid: false,
        reason: "VIX muy bajo",
      };
    }

    return { isValid: true };
  }

  protected getRiskParameters(): RiskParameters {
    return {
      stopLossPct: 100,
      takeProfitPcts: [35, 60],
      positionSizePct: 100,
      riskPercentage: 2.5,
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
      return "Long Strangle BLOQUEADA.";
    }

    if (recommendation === SignalRecommendation.ENTER) {
      return `Long Strangle: Comprar call OTM + put OTM. Movimiento > strikes = ganancia. VIX ${marketData.vix.toFixed(1)}.`;
    }

    return "";
  }
}
