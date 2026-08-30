/**
 * Confidence Calculator
 * Aggregates votes from multiple sources into a single confidence score
 * Supports weighted averages, veto logic, and failure modes
 */

import { SourceVerdictRaw, AggregatedConfidence, SourceBreakdown } from "./types";

export class ConfidenceCalculator {
  /**
   * Calculate weighted average confidence from multiple verdicts
   * Considers: vote (0-100) + data quality (0-100) + verdict (CONFIRM/NEUTRAL/CONTRADICT)
   * Each source has weight (0-1), final vote adjusted by data quality
   * Result: weighted average 0-100 with quality-adjusted weighting
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

    // Quality-adjusted weighting: poor data sources count less
    // e.g., if source A has 80% data quality and weight 0.20, effective weight = 0.20 * 0.80 = 0.16
    const qualityAdjustedVerdicts = verdicts.map((v) => ({
      ...v,
      qualityFactor: v.dataQualityScore / 100, // 0-1 scale
      adjustedWeight: v.weight * (v.dataQualityScore / 100), // Weight reduced if quality poor
    }));

    // Calculate normalized weights
    const totalAdjustedWeight = qualityAdjustedVerdicts.reduce((sum, v) => sum + v.adjustedWeight, 0);
    if (totalAdjustedWeight === 0) {
      // All sources have failed data quality
      return {
        finalScore: 50,
        votes: verdicts,
        scoreBreakdown: [],
        timestamp: new Date(),
        recommendation: "NEUTRAL",
      };
    }

    const normalizedVerdicts = qualityAdjustedVerdicts.map((v) => ({
      ...v,
      normalizedWeight: v.adjustedWeight / totalAdjustedWeight,
    }));

    // Calculate quality-adjusted weighted score
    const weightedScore = normalizedVerdicts.reduce((sum, v) => sum + v.vote * v.normalizedWeight, 0);

    // Build breakdown (showing original vote + quality impact)
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
