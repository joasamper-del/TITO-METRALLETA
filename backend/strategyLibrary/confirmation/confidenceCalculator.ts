/**
 * Confidence Calculator
 * Aggregates votes from multiple sources into a single confidence score
 * Supports weighted averages, veto logic, and failure modes
 */

import { SourceVerdictRaw, AggregatedConfidence, SourceBreakdown } from "./types";

export class ConfidenceCalculator {
  /**
   * Calculate weighted average confidence from multiple verdicts
   * Each source has a weight (0-1), vote is 0-100
   * Result: weighted average 0-100
   */
  static calculateWeightedConfidence(verdicts: SourceVerdictRaw[]): AggregatedConfidence {
    if (verdicts.length === 0) {
      return {
        finalScore: 50, // Default neutral
        votes: [],
        scoreBreakdown: [],
        timestamp: new Date(),
        recommendation: "NEUTRAL",
      };
    }

    // Calculate normalized weights (in case they don't sum to 1)
    const totalWeight = verdicts.reduce((sum, v) => sum + v.weight, 0);
    const normalizedVerdicts = verdicts.map((v) => ({
      ...v,
      normalizedWeight: v.weight / totalWeight,
    }));

    // Calculate weighted score
    const weightedScore = normalizedVerdicts.reduce((sum, v) => sum + v.vote * v.normalizedWeight, 0);

    // Build breakdown
    const scoreBreakdown: SourceBreakdown[] = normalizedVerdicts.map((v) => ({
      sourceName: v.sourceName,
      weight: v.normalizedWeight,
      vote: v.vote,
      contribution: v.vote * v.normalizedWeight,
    }));

    const finalScore = Math.round(weightedScore);
    const recommendation = this.scoreToRecommendation(finalScore);

    return {
      finalScore,
      votes: verdicts,
      scoreBreakdown,
      timestamp: new Date(),
      recommendation,
    };
  }

  /**
   * Convert confidence score to trading recommendation
   * 0-20: STRONG_SELL
   * 21-40: SELL
   * 41-60: NEUTRAL
   * 61-80: BUY
   * 81-100: STRONG_BUY
   */
  private static scoreToRecommendation(score: number): "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL" {
    if (score >= 81) return "STRONG_BUY";
    if (score >= 61) return "BUY";
    if (score >= 41) return "NEUTRAL";
    if (score >= 21) return "SELL";
    return "STRONG_SELL";
  }

  /**
   * Calculate consensus: what % of sources agree (vote > threshold)?
   */
  static calculateConsensus(verdicts: SourceVerdictRaw[], threshold: number = 60): number {
    if (verdicts.length === 0) return 0;
    const agreeing = verdicts.filter((v) => v.vote >= threshold).length;
    return (agreeing / verdicts.length) * 100;
  }

  /**
   * Detect vetoes: if any source has failureMode=VETO and failed, entire confidence is rejected
   * This is handled at ConfirmationEngine level, but utility available here
   */
  static detectVeto(verdicts: SourceVerdictRaw[]): boolean {
    // Veto detection happens at engine level (source throws error with failureMode=VETO)
    // This is here for reference/logging
    return false;
  }

  /**
   * Generate human-readable summary
   */
  static generateSummary(confidence: AggregatedConfidence): string {
    const lines: string[] = [
      `═══════════════════════════════════════════════════════`,
      `CONFIDENCE SCORE: ${confidence.finalScore}/100 — ${confidence.recommendation}`,
      `═══════════════════════════════════════════════════════`,
      ``,
      `Source Breakdown:`,
    ];

    confidence.scoreBreakdown.forEach((sb) => {
      const bar = "█".repeat(Math.round(sb.vote / 10));
      const empty = "░".repeat(10 - Math.round(sb.vote / 10));
      lines.push(`  ${sb.sourceName.padEnd(20)} ${bar}${empty} ${sb.vote.toFixed(0)}/100 (weight: ${(sb.weight * 100).toFixed(0)}%)`);
    });

    lines.push(``, `Final Score: ${confidence.finalScore}/100`, `Recommendation: ${confidence.recommendation}`);

    return lines.join("\n");
  }
}
