/**
 * VolatilityExpansionStrategy - Operar expansión de volatilidad (7.5/10)
 * ATR > promedio histórico, breakout con volatilidad
 */

import { MarketData, StrategyName, SignalScoreComponents, StrategyConfig, SignalRecommendation } from "../types/Strategy";
import { BaseStrategy } from "../base/BaseStrategy";

interface ScoreFactorInput { marketData: MarketData; config: StrategyConfig; }
interface ScoreFactor { name: string; value: number; weight: number; explanation: string; }
interface RiskParameters {
  stopLossPct: number; takeProfitPcts: number[]; positionSizePct: number;
  riskPercentage: number; trailingEnabled: boolean; trailingDistancePct: number; maxReentries: number;
}

export class VolatilityExpansionStrategy extends BaseStrategy {
  name: StrategyName = StrategyName.VOLATILITY_EXPANSION;
  minSignalScore: number = 70;
  maxSimultaneousTrades: number = 2;
  defaultPositionSizePct: number = 100;
  defaultRiskPct: number = 2.0;

  protected calculateScoreFactors(input: ScoreFactorInput): ScoreFactor[] {
    const { marketData } = input;
    const atrPct = (marketData.atr / marketData.close) * 100;
    return [
      { name: "ATR Expansión", value: atrPct > 2.0 ? 100 : atrPct > 1.5 ? 80 : 50, weight: 0.35, explanation: `ATR ${atrPct.toFixed(2)}%` },
      { name: "VIX Nivel", value: marketData.vix > 20 ? 100 : marketData.vix > 15 ? 80 : 60, weight: 0.25, explanation: `VIX ${marketData.vix.toFixed(1)}` },
      { name: "Breakout", value: marketData.close > marketData.bollingerUpper ? 100 : 50, weight: 0.20, explanation: "Close > Bollinger" },
      { name: "Volumen", value: marketData.volume / marketData.volumeAvg30 > 1.3 ? 100 : 60, weight: 0.15, explanation: "Vol confirmado" },
      { name: "Liquidez", value: 80, weight: 0.05, explanation: "OK" },
    ];
  }

  protected validateRules(marketData: MarketData): { isValid: boolean; reason?: string; } {
    const atrPct = (marketData.atr / marketData.close) * 100;
    if (atrPct < 1.3) return { isValid: false, reason: "ATR bajo, sin expansión" };
    if (marketData.close <= marketData.bollingerUpper) return { isValid: false, reason: "Sin breakout" };
    if (marketData.hasEarningsToday) return { isValid: false, reason: "Earnings" };
    return { isValid: true };
  }

  protected getRiskParameters(): RiskParameters {
    return { stopLossPct: 2.0, takeProfitPcts: [3.0, 4.5, 6.0], positionSizePct: 100, riskPercentage: 2.0, trailingEnabled: true, trailingDistancePct: 1.5, maxReentries: 0 };
  }

  protected buildNaturalLanguageExplanation(marketData: MarketData, scoreComponents: SignalScoreComponents, volumeAnalysis: any, volatilityAnalysis: any, recommendation: SignalRecommendation): string {
    if (recommendation === SignalRecommendation.BLOCKED) return "Vol Expansion bloqueada.";
    if (recommendation === SignalRecommendation.ENTER) return `Vol Expansion: ATR ${((marketData.atr / marketData.close) * 100).toFixed(2)}% expansión.`;
    return "";
  }
}
