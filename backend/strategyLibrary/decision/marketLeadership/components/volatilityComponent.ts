import { ComponentScore, ComponentVerdict } from "../types";

export interface VolatilityData {
  vix: number;
  vixMA20?: number;
  ivrankEquities?: number; // IV Rank proxy for equities
  historicalVolatilityBTC?: number; // For crypto
}

export class VolatilityComponent {
  /**
   * Evaluates market volatility using VIX
   * High VIX = fear, often bullish for safe trades
   * Low VIX = complacency, markets stretched
   */
  evaluate(data: VolatilityData): ComponentScore {
    const vix = data.vix;
    let score: number;
    let verdict: ComponentVerdict;
    let reasoning: string;

    // VIX ranges: <15 complacency, 15-20 normal, 20-30 elevated, >30 fear
    if (vix < 15) {
      verdict = "NEUTRAL";
      score = 45;
      reasoning = `VIX ${vix.toFixed(2)} very low, market complacent, limited hedging, less premium available`;
    } else if (vix < 20) {
      verdict = "BULLISH";
      score = 70;
      reasoning = `VIX ${vix.toFixed(2)} normal range, good balance of risk/reward, options premium reasonable`;
    } else if (vix < 25) {
      verdict = "BULLISH";
      score = 75;
      reasoning = `VIX ${vix.toFixed(2)} elevated, decent fear premium, trading environment favorable`;
    } else if (vix < 30) {
      verdict = "NEUTRAL";
      score = 55;
      reasoning = `VIX ${vix.toFixed(2)} high volatility, uncertainty, caution warranted`;
    } else {
      verdict = "BEARISH";
      score = 35;
      reasoning = `VIX ${vix.toFixed(2)} extreme fear, market dislocated, wait for stabilization`;
    }

    // If VIX MA20 available, check trend
    if (data.vixMA20 !== undefined) {
      const vixTrend = vix > data.vixMA20 ? "rising" : "falling";
      reasoning += ` (trend: ${vixTrend})`;
      if (vixTrend === "falling" && vix > 20) {
        score += 5; // Improving from fear
      } else if (vixTrend === "rising" && vix < 25) {
        score -= 5; // Deteriorating from calm
      }
    }

    return {
      name: "Volatility (VIX)",
      verdict,
      score: Math.min(score, 100),
      weight: 0.2,
      contribution: Math.min(score, 100) * 0.2,
      reasoning,
      dataAvailability: data.vix > 0 ? "REAL" : "UNAVAILABLE",
      dataPoints: [
        `VIX: ${vix.toFixed(2)}`,
        ...(data.vixMA20 ? [`VIX MA20: ${data.vixMA20.toFixed(2)}`] : []),
      ],
      isHealthy: data.vix > 0,
    };
  }
}
