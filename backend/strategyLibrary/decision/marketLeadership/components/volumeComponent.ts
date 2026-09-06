import { ComponentScore, ComponentVerdict } from "../types";

export interface VolumeData {
  currentVolume: number;
  averageVolume: number;
  spreadBPS?: number; // bid/ask spread in basis points (for liquidity)
}

export class VolumeComponent {
  /**
   * Evaluates volume strength and liquidity
   * High volume = conviction, good operability
   * Low volume = weak, risky
   */
  evaluate(data: VolumeData): ComponentScore {
    const volumeRatio = data.currentVolume / data.averageVolume;
    let score: number;
    let verdict: ComponentVerdict;
    let reasoning: string;

    if (volumeRatio >= 1.3) {
      verdict = "BULLISH";
      score = 80;
      reasoning = `Strong volume ${(volumeRatio * 100).toFixed(0)}% of average, high conviction`;
    } else if (volumeRatio >= 1.0) {
      verdict = "BULLISH";
      score = 70;
      reasoning = `Volume at or above average ${(volumeRatio * 100).toFixed(0)}%, solid participation`;
    } else if (volumeRatio >= 0.8) {
      verdict = "NEUTRAL";
      score = 50;
      reasoning = `Volume ${(volumeRatio * 100).toFixed(0)}% of average, weak conviction`;
    } else {
      verdict = "BEARISH";
      score = 30;
      reasoning = `Very low volume ${(volumeRatio * 100).toFixed(0)}% of average, questionable operability`;
    }

    // Adjust based on spread if available
    if (data.spreadBPS !== undefined) {
      if (data.spreadBPS < 2) {
        reasoning += ", excellent liquidity";
        score = Math.min(score + 5, 100);
      } else if (data.spreadBPS > 5) {
        reasoning += ", poor liquidity";
        score = Math.max(score - 10, 0);
      }
    }

    return {
      name: "Volume & Liquidity",
      verdict,
      score,
      weight: 0.15,
      contribution: score * 0.15,
      reasoning,
      dataAvailability: data.currentVolume > 0 ? "REAL" : "UNAVAILABLE",
      dataPoints: [
        `Current Volume: ${data.currentVolume.toLocaleString()}`,
        `Average Volume: ${data.averageVolume.toLocaleString()}`,
        `Ratio: ${(volumeRatio * 100).toFixed(0)}%`,
        ...(data.spreadBPS ? [`Spread: ${data.spreadBPS.toFixed(2)} bps`] : []),
      ],
      isHealthy: data.currentVolume > 0,
    };
  }
}
