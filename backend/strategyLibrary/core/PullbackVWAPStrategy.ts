/**
 * PullbackVWAPStrategy - Pullback a VWAP (7/10 confidence)
 * Operar retroceso a VWAP en tendencia alcista
 */

import { MarketData, StrategyName, SignalScoreComponents, StrategyConfig, SignalRecommendation } from "../types/Strategy";
import { BaseStrategy } from "../base/BaseStrategy";

interface ScoreFactorInput { marketData: MarketData; config: StrategyConfig; }
interface ScoreFactor { name: string; value: number; weight: number; explanation: string; }
interface RiskParameters {
  stopLossPct: number; takeProfitPcts: number[]; positionSizePct: number;
  riskPercentage: number; trailingEnabled: boolean; trailingDistancePct: number; maxReentries: number;
}

export class PullbackVWAPStrategy extends BaseStrategy {
  name: StrategyName = StrategyName.PULLBACK_VWAP;
  minSignalScore: number = 65;
  maxSimultaneousTrades: number = 3;
  defaultPositionSizePct: number = 100;
  defaultRiskPct: number = 1.5;

  protected calculateScoreFactors(input: ScoreFactorInput): ScoreFactor[] {
    const { marketData } = input;
    return [
      { name: "Tendencia", value: marketData.ma50 > marketData.ma200 ? 100 : 0, weight: 0.30, explanation: "Alcista/Bajista" },
      { name: "Retroceso", value: Math.abs(marketData.close - marketData.ma20) < 1.5 ? 100 : 50, weight: 0.30, explanation: "Pullback a MA20" },
      { name: "Volumen", value: marketData.volume / marketData.volumeAvg30 > 0.8 ? 80 : 40, weight: 0.20, explanation: "Vol OK" },
      { name: "RSI", value: marketData.rsi > 40 && marketData.rsi < 70 ? 100 : 50, weight: 0.15, explanation: `RSI ${marketData.rsi.toFixed(1)}` },
      { name: "Liquidez", value: 80, weight: 0.05, explanation: "OK" },
    ];
  }

  protected validateRules(marketData: MarketData): { isValid: boolean; reason?: string; } {
    if (marketData.ma50 <= marketData.ma200) return { isValid: false, reason: "Tendencia bajista" };
    if (Math.abs(marketData.close - marketData.ma20) > 2.5) return { isValid: false, reason: "Retroceso insuficiente" };
    if (marketData.hasEarningsToday) return { isValid: false, reason: "Earnings" };
    return { isValid: true };
  }

  protected getRiskParameters(): RiskParameters {
    return { stopLossPct: 1.5, takeProfitPcts: [2.5, 3.5, 5.0], positionSizePct: 100, riskPercentage: 1.5, trailingEnabled: true, trailingDistancePct: 1.0, maxReentries: 1 };
  }

  protected buildNaturalLanguageExplanation(marketData: MarketData, scoreComponents: SignalScoreComponents, volumeAnalysis: any, volatilityAnalysis: any, recommendation: SignalRecommendation): string {
    if (recommendation === SignalRecommendation.BLOCKED) return "Pullback VWAP bloqueada.";
    if (recommendation === SignalRecommendation.ENTER) return `Pullback a VWAP en tendencia. Entry ${marketData.close.toFixed(2)}.`;
    return "";
  }
}
