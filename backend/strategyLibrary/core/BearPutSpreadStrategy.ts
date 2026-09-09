/**
 * BearPutSpreadStrategy - Bear Put Spread (7/10 confidence)
 * Vender put OTM, comprar put más OTM. Bullish on underlying (o neutral).
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

export class BearPutSpreadStrategy extends BaseStrategy {
  name: StrategyName = StrategyName.BEAR_PUT_SPREAD;
  minSignalScore: number = 60;
  maxSimultaneousTrades: number = 2;
  defaultPositionSizePct: number = 100;
  defaultRiskPct: number = 2.5;

  protected calculateScoreFactors(
    input: ScoreFactorInput
  ): ScoreFactor[] {
    const { marketData } = input;
    const factors: ScoreFactor[] = [];

    // 1. TENDENCIA O NEUTRAL (25%)
    const trendValue = marketData.ma50 > marketData.ma200 ? 100 : 50;
    factors.push({
      name: "Tendencia",
      value: trendValue,
      weight: 0.25,
      explanation: marketData.ma50 > marketData.ma200
        ? "✅ Alcista/Neutral"
        : "⚠️ Neutral/Bajista",
    });

    // 2. IV RANK (20%)
    let ivValue = 0;
    if (marketData.vix < 15) {
      ivValue = 80;
    } else if (marketData.vix < 20) {
      ivValue = 100;
    } else if (marketData.vix < 25) {
      ivValue = 70;
    } else {
      ivValue = 40;
    }
    factors.push({
      name: "IV Rank",
      value: ivValue,
      weight: 0.2,
      explanation: `VIX ${marketData.vix.toFixed(1)}`,
    });

    // 3. SOPORTE (20%)
    const supportGap = Math.abs(
      marketData.close - marketData.bollingerLower
    );
    const supportPct = (supportGap / marketData.close) * 100;
    let supportValue = supportPct > 2.0 ? 100 : 50;
    factors.push({
      name: "Soporte",
      value: supportValue,
      weight: 0.2,
      explanation: `Distancia soporte ${supportPct.toFixed(2)}%`,
    });

    // 4. RSI (15%)
    let rsiValue = 0;
    if (marketData.rsi >= 40 && marketData.rsi < 70) {
      rsiValue = 100;
    } else if (marketData.rsi < 40) {
      rsiValue = 50;
    } else {
      rsiValue = 30;
    }
    factors.push({
      name: "RSI",
      value: rsiValue,
      weight: 0.15,
      explanation: `RSI ${marketData.rsi.toFixed(1)}`,
    });

    // 5. LIQUIDEZ (10%)
    const spread = marketData.askPrice - marketData.bidPrice;
    const spreadPct = (spread / marketData.close) * 100;
    let liquidityValue = spreadPct < 0.05 ? 100 : 60;
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
      explanation: marketData.hasEarningsToday ? "⚠️ Earnings" : "✅ Normal",
    });

    return factors;
  }

  protected validateRules(marketData: MarketData): {
    isValid: boolean;
    reason?: string;
  } {
    if (marketData.vix > 40) {
      return {
        isValid: false,
        reason: "VIX extremo",
      };
    }

    if (marketData.rsi > 80) {
      return {
        isValid: false,
        reason: "RSI sobrecomprado",
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
      stopLossPct: 50,
      takeProfitPcts: [75, 80],
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
      return "Bear Put Spread BLOQUEADA.";
    }

    if (recommendation === SignalRecommendation.ENTER) {
      return `Bear Put Spread: Vender put OTM, Comprar put -2% OTM. `;
    }

    return "";
  }
}
