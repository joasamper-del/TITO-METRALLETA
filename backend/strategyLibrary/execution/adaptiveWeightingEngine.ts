/**
 * Adaptive Weighting Engine
 * Auto-adjusts confirmation source weights based on historical performance
 * With strict statistical validation to prevent overfitting
 */

import { SourceReliability } from "./performanceAnalyzer";

export interface SourceWeight {
  sourceName: string;
  currentWeight: number;
  historicalWeight: number;
  lastAdjustedAt: Date;
  adjustmentCount: number;
  tradesCount: number;
  winRate: number;
  reliability: number;
}

export interface WeightAdjustmentCriteria {
  minTradesPerSource: number; // >= this many trades before considering adjustment
  minWinRateShift: number; // Win rate must shift by >= this % to trigger change
  pValueThreshold: number; // Statistical significance (< 0.05 = 95% confidence)
  maxWeightChangePercent: number; // Max adjustment per cycle
  rebalanceFrequency: number; // Every N trades, not per trade
  allowNegativeWeights: boolean; // Never go below 0.1
}

export interface WeightAdjustmentDecision {
  sourceName: string;
  shouldAdjust: boolean;
  reason: string;
  oldWeight: number;
  newWeight: number;
  changePercent: number;
  evidence: {
    tradesCount: number;
    historicalWinRate: number;
    recentWinRate: number;
    pValue: number;
    minTradesMetric: boolean;
    winRateShiftMetric: boolean;
    significanceMetric: boolean;
  };
}

export class AdaptiveWeightingEngine {
  private sourceWeights: Map<string, SourceWeight> = new Map();
  private criteria: WeightAdjustmentCriteria;
  private totalTradesProcessed: number = 0;
  private lastRebalanceAt: number = 0;

  constructor(criteria?: Partial<WeightAdjustmentCriteria>) {
    this.criteria = {
      minTradesPerSource: 10,
      minWinRateShift: 5, // 5% shift required
      pValueThreshold: 0.05, // 95% confidence
      maxWeightChangePercent: 10, // Max 10% change per adjustment
      rebalanceFrequency: 50, // Every 50 trades
      allowNegativeWeights: false,
      ...criteria,
    };
  }

  /**
   * Initialize source weights from reliability scores
   */
  initializeWeights(reliabilities: SourceReliability[]): void {
    for (const rel of reliabilities) {
      const weight = Math.max(0.1, Math.min(1.0, rel.overallScore / 100));

      this.sourceWeights.set(rel.sourceName, {
        sourceName: rel.sourceName,
        currentWeight: weight,
        historicalWeight: weight,
        lastAdjustedAt: new Date(),
        adjustmentCount: 0,
        tradesCount: rel.totalVotes,
        winRate: rel.confirmAccuracy,
        reliability: rel.overallScore,
      });
    }
  }

  /**
   * Evaluate if a source's weight should be adjusted
   */
  evaluateAdjustment(
    sourceName: string,
    recentTradesCount: number,
    historicalWinRate: number,
    recentWinRate: number
  ): WeightAdjustmentDecision {
    const sourceWeight = this.sourceWeights.get(sourceName);
    if (!sourceWeight) {
      return {
        sourceName,
        shouldAdjust: false,
        reason: "Source not found in weights map",
        oldWeight: 0,
        newWeight: 0,
        changePercent: 0,
        evidence: {
          tradesCount: 0,
          historicalWinRate: 0,
          recentWinRate: 0,
          pValue: 1,
          minTradesMetric: false,
          winRateShiftMetric: false,
          significanceMetric: false,
        },
      };
    }

    // Criterion 1: Minimum trades
    const minTradesMetric = recentTradesCount >= this.criteria.minTradesPerSource;
    if (!minTradesMetric) {
      return {
        sourceName,
        shouldAdjust: false,
        reason: `Insufficient trades (${recentTradesCount}/${this.criteria.minTradesPerSource})`,
        oldWeight: sourceWeight.currentWeight,
        newWeight: sourceWeight.currentWeight,
        changePercent: 0,
        evidence: {
          tradesCount: recentTradesCount,
          historicalWinRate,
          recentWinRate,
          pValue: 1,
          minTradesMetric,
          winRateShiftMetric: false,
          significanceMetric: false,
        },
      };
    }

    // Criterion 2: Win rate shift significance
    const winRateShift = Math.abs(recentWinRate - historicalWinRate);
    const winRateShiftMetric = winRateShift >= this.criteria.minWinRateShift;
    if (!winRateShiftMetric) {
      return {
        sourceName,
        shouldAdjust: false,
        reason: `Win rate shift too small (${winRateShift.toFixed(1)}% < ${this.criteria.minWinRateShift}%)`,
        oldWeight: sourceWeight.currentWeight,
        newWeight: sourceWeight.currentWeight,
        changePercent: 0,
        evidence: {
          tradesCount: recentTradesCount,
          historicalWinRate,
          recentWinRate,
          pValue: 1,
          minTradesMetric,
          winRateShiftMetric,
          significanceMetric: false,
        },
      };
    }

    // Criterion 3: Statistical significance (binomial test)
    const pValue = this.calculateBinomialPValue(recentTradesCount, recentWinRate, historicalWinRate);
    const significanceMetric = pValue < this.criteria.pValueThreshold;
    if (!significanceMetric) {
      return {
        sourceName,
        shouldAdjust: false,
        reason: `Not statistically significant (p=${pValue.toFixed(3)} >= ${this.criteria.pValueThreshold})`,
        oldWeight: sourceWeight.currentWeight,
        newWeight: sourceWeight.currentWeight,
        changePercent: 0,
        evidence: {
          tradesCount: recentTradesCount,
          historicalWinRate,
          recentWinRate,
          pValue,
          minTradesMetric,
          winRateShiftMetric,
          significanceMetric,
        },
      };
    }

    // All criteria met: calculate new weight
    const oldWeight = sourceWeight.currentWeight;
    const newWeight = this.calculateNewWeight(oldWeight, recentWinRate, historicalWinRate);
    const changePercent = ((newWeight - oldWeight) / oldWeight) * 100;

    return {
      sourceName,
      shouldAdjust: true,
      reason: "All criteria met: sufficient trades, significant shift, p-value < 0.05",
      oldWeight,
      newWeight,
      changePercent,
      evidence: {
        tradesCount: recentTradesCount,
        historicalWinRate,
        recentWinRate,
        pValue,
        minTradesMetric,
        winRateShiftMetric,
        significanceMetric,
      },
    };
  }

  /**
   * Apply weight adjustment with safeguards
   */
  applyAdjustment(decision: WeightAdjustmentDecision): boolean {
    if (!decision.shouldAdjust) return false;

    const sourceWeight = this.sourceWeights.get(decision.sourceName);
    if (!sourceWeight) return false;

    // Double-check: max change allowed
    if (Math.abs(decision.changePercent) > this.criteria.maxWeightChangePercent) {
      // Cap the change
      const cappedWeight =
        decision.newWeight > sourceWeight.currentWeight
          ? sourceWeight.currentWeight * (1 + this.criteria.maxWeightChangePercent / 100)
          : sourceWeight.currentWeight * (1 - this.criteria.maxWeightChangePercent / 100);

      sourceWeight.currentWeight = Math.max(0.1, Math.min(1.0, cappedWeight));
    } else {
      sourceWeight.currentWeight = decision.newWeight;
    }

    sourceWeight.lastAdjustedAt = new Date();
    sourceWeight.adjustmentCount++;
    sourceWeight.historicalWeight = decision.oldWeight;

    return true;
  }

  /**
   * Get current weights for all sources
   */
  getCurrentWeights(): Record<string, number> {
    const weights: Record<string, number> = {};

    for (const [name, weight] of this.sourceWeights) {
      weights[name] = weight.currentWeight;
    }

    return weights;
  }

  /**
   * Get weight status report
   */
  getWeightStatus(): SourceWeight[] {
    return Array.from(this.sourceWeights.values());
  }

  /**
   * Batch process multiple adjustments (rebalance cycle)
   */
  rebalanceCycle(adjustments: WeightAdjustmentDecision[]): WeightAdjustmentDecision[] {
    const applied: WeightAdjustmentDecision[] = [];

    for (const decision of adjustments) {
      if (this.applyAdjustment(decision)) {
        applied.push(decision);
      }
    }

    this.totalTradesProcessed++;
    if (this.totalTradesProcessed % this.criteria.rebalanceFrequency === 0) {
      this.lastRebalanceAt = Date.now();
    }

    return applied;
  }

  /**
   * Generate audit report
   */
  generateAuditReport(): string {
    const weights = Array.from(this.sourceWeights.values());
    const adjusted = weights.filter((w) => w.adjustmentCount > 0);

    const lines: string[] = [
      `═══════════════════════════════════════════════════════════`,
      `ADAPTIVE WEIGHTING AUDIT REPORT`,
      `═══════════════════════════════════════════════════════════`,
      ``,
      `Total Trades Processed: ${this.totalTradesProcessed}`,
      `Rebalance Frequency: Every ${this.criteria.rebalanceFrequency} trades`,
      `Min Trades Per Source: ${this.criteria.minTradesPerSource}`,
      `Min Win Rate Shift: ${this.criteria.minWinRateShift}%`,
      `P-Value Threshold: ${this.criteria.pValueThreshold}`,
      ``,
      `WEIGHT STATUS (${weights.length} sources):`,
      ...weights.map(
        (w) =>
          `  ${w.sourceName.padEnd(18)} | Current: ${w.currentWeight.toFixed(2)} | Hist: ${w.historicalWeight.toFixed(2)} | Adjustments: ${w.adjustmentCount}`
      ),
      ``,
      `ADJUSTED SOURCES (${adjusted.length}):`,
      ...adjusted.map((w) => `  ✓ ${w.sourceName}: adjusted ${w.adjustmentCount}x (last: ${w.lastAdjustedAt.toISOString()})`),
      ``,
      `═══════════════════════════════════════════════════════════`,
    ];

    return lines.join("\n");
  }

  // ========== PRIVATE HELPERS ==========

  /**
   * Calculate binomial p-value to test if win rate shift is significant
   * Using normal approximation (fast, good for n > 5)
   */
  private calculateBinomialPValue(n: number, recentWinRate: number, historicalWinRate: number): number {
    if (n < 5) return 1; // Not enough samples

    // Convert to proportions
    const p = historicalWinRate / 100;
    const p_obs = recentWinRate / 100;

    // Standard error
    const se = Math.sqrt((p * (1 - p)) / n);

    // Z-score
    const z = Math.abs((p_obs - p) / se);

    // Two-tailed p-value (approximate using normal distribution)
    // Φ(z) = cumulative normal distribution
    const pValue = 2 * (1 - this.normalCDF(z));

    return pValue;
  }

  /**
   * Normal CDF approximation
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Calculate new weight based on performance
   */
  private calculateNewWeight(oldWeight: number, recentWinRate: number, historicalWinRate: number): number {
    // Adjust weight proportionally to win rate improvement
    const improvementRatio = recentWinRate / Math.max(historicalWinRate, 1);

    // Smooth adjustment: don't jump too hard
    const newWeight = oldWeight * Math.pow(improvementRatio, 0.5); // Square root to dampen swings

    // Clamp to [0.1, 1.0]
    return Math.max(0.1, Math.min(1.0, newWeight));
  }
}
