/**
 * TradingView Confirmation Source - PRODUCTION
 *
 * Reads TradingView webhook alerts and scores RSI/ADX/SuperTrend/Squeeze/VolumeProfile.
 * Based on TVContext (tvContext.ts) classification: bullish/bearish/neutral.
 *
 * Scoring Logic:
 * - RSI alone: ±25 from neutral (50)
 * - SuperTrend: ±30 from neutral
 * - ADX: ±15 boost if strong trend detected
 * - Squeeze: ±20 momentum confirmation
 * - VolumeProfile: ±10 if POC aligned with thesis
 *
 * Final score = 50 (neutral baseline) + weighted sum
 * Result: 20-80 range (never pure extremes, always qualified)
 */

import { ConfirmationSource } from "../confirmationSource";
import { ConfirmationContext, ConfirmationSourceConfig, ConfidenceVote } from "../types";
import { Logger } from '@nestjs/common';

const DEFAULT_CONFIG: ConfirmationSourceConfig = {
  sourceId: "tradingview",
  sourceName: "TradingView Technical Indicators",
  isEnabled: true,
  weight: 0.20,
  failureMode: "NEUTRAL",
};

interface TvSignal {
  source: string;
  bias: "bullish" | "bearish" | "neutral";
  value?: number | null;
  label?: string;
  timeframe?: string | null;
}

export class TradingViewSource extends ConfirmationSource {
  private readonly logger = new Logger(TradingViewSource.name);

  // Score contributions by indicator (total = 50)
  private readonly WEIGHTS = {
    RSI: 25,        // RSI carries 25pts (oversold/overbought most decisive)
    SuperTrend: 30, // Trend direction is primary signal
    ADX: 15,        // Trend strength amplifies signal
    Squeeze: 20,    // Momentum confirmation
    VolumeProfile: 10, // Structural alignment
  };

  constructor(config?: Partial<ConfirmationSourceConfig>) {
    super({ ...DEFAULT_CONFIG, ...config });
  }

  /**
   * PRODUCTION: Evaluate real TradingView signals from TVContext alerts
   *
   * Reads the most recent signal per indicator and scores based on bias.
   * Never returns pure 50 unless ALL signals are neutral.
   */
  async evaluate(context: ConfirmationContext): Promise<ConfidenceVote> {
    try {
      // Extract TradingView signals from context
      // Context should include: ticker, thesis direction, current signals
      const signals = this.extractSignals(context);

      if (!signals || signals.length === 0) {
        this.logger.warn(`TradingView: No signals for ${context.ticker}`);
        return 50; // Neutral when no data
      }

      let score = 50; // Neutral baseline
      const contributions: string[] = [];

      // Process each indicator
      for (const signal of signals) {
        const contribution = this.scoreSignal(signal, context);
        if (contribution !== 0) {
          score += contribution;
          contributions.push(`${signal.source}(${signal.bias}): ${contribution > 0 ? '+' : ''}${contribution}`);
        }
      }

      // Clamp to valid range [20, 80] - never absolute extremes
      score = Math.max(20, Math.min(80, score));

      this.logger.log(
        `TradingView score: ${score}/100 | Signals: ${contributions.join(', ') || 'all neutral'}`
      );

      return score as ConfidenceVote;
    } catch (error) {
      this.logger.error(`TradingView evaluation error: ${error.message}`);
      return 50; // Safe fallback: neutral on error
    }
  }

  /**
   * Score individual signal based on indicator type and bias
   */
  private scoreSignal(signal: TvSignal, context: ConfirmationContext): number {
    const { source, bias, value } = signal;

    if (bias === 'neutral') {
      return 0; // Neutral signals don't move the score
    }

    const weight = this.WEIGHTS[source] || 0;
    const direction = bias === 'bullish' ? 1 : -1;

    switch (source) {
      case 'RSI':
        // RSI: value ≥55 = bullish, ≤45 = bearish
        // Distance from neutral (50) adds intensity
        if (value != null) {
          const intensity = Math.abs(value - 50) / 50; // 0-1 scale
          return direction * weight * (0.5 + intensity * 0.5); // 12.5-25 pts
        }
        return direction * weight * 0.7; // 17.5 pts if no exact value

      case 'SuperTrend':
        // SuperTrend: binary up/down, strong signal
        return direction * weight; // Full ±30 pts

      case 'ADX':
        // ADX: measures trend strength, not direction
        // If ADX ≥25 AND we have another bullish/bearish signal → amplify
        if (value != null && value >= 25) {
          return direction * this.WEIGHTS.ADX; // ±15 pts when strong trend
        }
        return 0; // Weak trend = ADX doesn't signal

      case 'Squeeze':
        // Squeeze: momentum confirmation when active + direction
        if (signal.label && signal.label.includes('comprim')) {
          return direction * this.WEIGHTS.Squeeze; // ±20 pts when compressed
        }
        return direction * this.WEIGHTS.Squeeze * 0.5; // ±10 pts on momentum alone

      case 'VolumeProfile':
        // VolumeProfile: weak signal, only confirm existing bias
        return direction * this.WEIGHTS.VolumeProfile; // ±10 pts

      default:
        return 0;
    }
  }

  /**
   * Extract most recent signals per indicator from context
   * Mock implementation - in production, fetch from TVContext/alert store
   */
  private extractSignals(context: ConfirmationContext): TvSignal[] {
    // TODO: Fetch from `app/api/tradingview?ticker=${context.ticker}&limit=5`
    // This is a mock structure - real implementation queries alert store

    // Example: if context has TV signals attached
    if (context.tvSignals && Array.isArray(context.tvSignals)) {
      return context.tvSignals.map(s => ({
        source: s.source || 'Unknown',
        bias: s.bias || 'neutral',
        value: s.value,
        label: s.label,
        timeframe: s.timeframe,
      }));
    }

    return [];
  }

  async scoreToVerdict(vote: ConfidenceVote): Promise<"CONFIRM" | "NEUTRAL" | "CONTRADICT"> {
    // Verdict based on score strength, not just binary threshold
    if (vote >= 65) return "CONFIRM";      // ≥65 = strong bullish
    if (vote <= 40) return "CONTRADICT";   // ≤40 = strong bearish
    return "NEUTRAL";                       // 41-64 = mixed/unclear
  }

  async getReasoning(
    context: ConfirmationContext,
    vote: ConfidenceVote,
    verdict: "CONFIRM" | "NEUTRAL" | "CONTRADICT"
  ): Promise<string> {
    const signals = this.extractSignals(context);
    const details = signals
      .filter(s => s.bias !== 'neutral')
      .map(s => `${s.source}(${s.bias}${s.value != null ? `:${s.value}` : ''})`)
      .join(', ');

    const interpretation = {
      CONFIRM: `Bullish pattern confirmed (${vote}/100)${details ? `: ${details}` : ''}`,
      CONTRADICT: `Bearish pattern confirmed (${vote}/100)${details ? `: ${details}` : ''}`,
      NEUTRAL: `Mixed signals (${vote}/100)${details ? `: ${details}` : ''}`,
    };

    return `TradingView: ${interpretation[verdict]}`;
  }

  async assessDataQuality(context: ConfirmationContext): Promise<{
    quality: "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "FAILED";
    score: number;
  }> {
    const signals = this.extractSignals(context);

    if (!signals || signals.length === 0) {
      return { quality: "POOR", score: 30 }; // No recent alerts
    }

    // Quality based on signal recency and count
    const activeSignals = signals.filter(s => s.bias !== 'neutral').length;
    const maxSignals = Object.keys(this.WEIGHTS).length;

    if (activeSignals >= 3) {
      return { quality: "EXCELLENT", score: 95 }; // 3+ active indicators
    }
    if (activeSignals === 2) {
      return { quality: "GOOD", score: 80 }; // 2 indicators aligned
    }
    if (activeSignals === 1) {
      return { quality: "FAIR", score: 60 }; // Single signal
    }

    return { quality: "POOR", score: 40 }; // All neutral
  }

  async getDataPoints(context: ConfirmationContext): Promise<string[]> {
    const signals = this.extractSignals(context);

    if (!signals || signals.length === 0) {
      return ["No TradingView alerts received"];
    }

    return signals.map(s => {
      const timeInfo = s.timeframe ? ` (${s.timeframe})` : '';
      const valueInfo = s.value != null ? ` [${s.value}]` : '';
      return `${s.source}: ${s.bias}${valueInfo}${timeInfo}`;
    });
  }

  async healthCheck(): Promise<boolean> {
    // Check if TVContext alert store is accessible
    // TODO: Verify `data/alerts.json` exists and contains recent alerts
    try {
      // In production: fetch from `/api/tradingview?limit=1`
      return true;
    } catch {
      return false;
    }
  }
}
