/**
 * Performance Reporter
 * Generates reports comparing real vs mock backtesting results
 */

import { StrategyExecutionResult, ExecutionSummary } from "./walkForwardExecutor";
import { WalkForwardResult } from "../data/types";

export interface PerformanceComparison {
  strategy: string;
  mock: {
    winRate: number;
    sharpeRatio: number;
    totalPnL: number;
    trades: number;
  };
  real: {
    winRate: number;
    sharpeRatio: number;
    totalPnL: number;
    trades: number;
  };
  variance: {
    winRateDiff: number; // %
    sharpeDiff: number;
    pnlDiff: number; // %
  };
  reliable: boolean; // true if variance <20%
  assessment: "excellent" | "good" | "fair" | "caution" | "investigate";
}

export interface FinalReport {
  executedAt: Date;
  summary: ExecutionSummary;
  comparisons: PerformanceComparison[];
  bestPerformers: string[];
  overfittingSignatures: string[];
  recommendations: string[];
}

export class PerformanceReporter {
  generateComparisonReport(
    realResults: ExecutionSummary,
    mockResults: any[] // From S46 backtesting results
  ): PerformanceComparison[] {
    const comparisons: PerformanceComparison[] = [];

    for (const realResult of realResults.results.filter((r) => r.status === "success")) {
      const strategy = realResult.strategy;
      const mockData = mockResults.find((m) => m.strategy === strategy);

      if (mockData && realResult.result) {
        const testStats = realResult.result.testStats;

        const variances = {
          winRateDiff: Math.abs((testStats.winRate - (mockData.winRate || 0)) / (mockData.winRate || 1)) * 100,
          sharpeDiff: Math.abs(testStats.sharpe - (mockData.sharpe || 0)),
          pnlDiff: Math.abs((testStats.pnl - (mockData.pnl || 0)) / (mockData.pnl || 1)) * 100,
        };

        // Determine reliability and assessment
        const avgVariance = (variances.winRateDiff + variances.pnlDiff) / 2;
        const reliable = avgVariance < 20;

        let assessment: "excellent" | "good" | "fair" | "caution" | "investigate" = "good";
        if (avgVariance < 5) assessment = "excellent";
        else if (avgVariance < 15) assessment = "good";
        else if (avgVariance < 25) assessment = "fair";
        else if (avgVariance < 40) assessment = "caution";
        else assessment = "investigate";

        comparisons.push({
          strategy,
          mock: {
            winRate: mockData.winRate || 0,
            sharpeRatio: mockData.sharpe || 0,
            totalPnL: mockData.pnl || 0,
            trades: mockData.trades || 0,
          },
          real: {
            winRate: testStats.winRate,
            sharpeRatio: testStats.sharpe,
            totalPnL: testStats.pnl,
            trades: testStats.trades,
          },
          variance: variances,
          reliable,
          assessment,
        });
      }
    }

    return comparisons;
  }

  identifyOverfittingSignatures(summary: ExecutionSummary): string[] {
    const signatures: string[] = [];

    // Strategy has high train Sharpe but low test Sharpe
    for (const result of summary.results.filter((r) => r.status === "success")) {
      if (result.result?.overfittingScore && result.result.overfittingScore > 50) {
        signatures.push(
          `${result.strategy} shows poor generalization (overfitting score: ${result.result.overfittingScore.toFixed(1)}%)`
        );
      }
    }

    // Many strategies overfitting
    const overfit = summary.results.filter((r) => r.status === "success" && (r.result?.overfittingScore || 0) > 50).length;
    if (overfit > summary.successful / 2) {
      signatures.push("More than half of strategies show overfitting — consider parameter retuning");
    }

    // Low win rate in test period
    const lowWinRate = summary.results.filter((r) => r.status === "success" && (r.result?.testStats?.winRate || 0) < 40);
    if (lowWinRate.length > 0) {
      signatures.push(`${lowWinRate.length} strategies underperform on test data (win rate <40%)`);
    }

    return signatures;
  }

  generateRecommendations(comparisons: PerformanceComparison[], summary: ExecutionSummary): string[] {
    const recommendations: string[] = [];

    // Safe to trade strategies
    const safeStrategies = comparisons.filter((c) => c.assessment === "excellent" || c.assessment === "good");
    if (safeStrategies.length > 0) {
      recommendations.push(`✅ SAFE TO TRADE (${safeStrategies.length}): ${safeStrategies.map((c) => c.strategy).join(", ")}`);
    }

    // Strategies needing caution
    const cautionStrategies = comparisons.filter((c) => c.assessment === "caution" || c.assessment === "fair");
    if (cautionStrategies.length > 0) {
      recommendations.push(
        `⚠️ USE WITH CAUTION (${cautionStrategies.length}): ${cautionStrategies.map((c) => c.strategy).join(", ")} — Monitor closely`
      );
    }

    // Strategies to investigate
    const investigateStrategies = comparisons.filter((c) => c.assessment === "investigate");
    if (investigateStrategies.length > 0) {
      recommendations.push(
        `🔴 INVESTIGATE (${investigateStrategies.length}): ${investigateStrategies.map((c) => c.strategy).join(", ")} — High variance from mock data`
      );
    }

    // Best generalizer
    if (summary.bestGeneralizer) {
      recommendations.push(`⭐ BEST GENERALIZER: ${summary.bestGeneralizer} — Highest confidence for live trading`);
    }

    return recommendations;
  }

  async generateFinalReport(
    realResults: ExecutionSummary,
    mockResults: any[]
  ): Promise<string> {
    const comparisons = this.generateComparisonReport(realResults, mockResults);
    const signatures = this.identifyOverfittingSignatures(realResults);
    const recommendations = this.generateRecommendations(comparisons, realResults);

    const report = `
╔════════════════════════════════════════════════════════════════════╗
║    SESSION 48 — COMPREHENSIVE BACKTESTING REPORT (PHASE 3)        ║
╚════════════════════════════════════════════════════════════════════╝

EXECUTIVE SUMMARY:
─────────────────────────────────────────────────────────────────────
Date: ${new Date().toISOString()}
Total Strategies Tested: ${realResults.totalStrategies}
Successful: ${realResults.successful} ✅
Failed: ${realResults.failed} ${realResults.failed > 0 ? "❌" : ""}
Average Overfitting Score: ${realResults.avgOverfittingScore.toFixed(1)}%
Best Generalizer: ${realResults.bestGeneralizer}
Worst Generalizer: ${realResults.worstGeneralizer}

REAL VS MOCK COMPARISON:
─────────────────────────────────────────────────────────────────────
Strategy              | Mock WR | Real WR | Δ WR  | Mock Sharpe | Real Sharpe | Δ Sharpe | Status
${comparisons
  .map(
    (c) => `
${c.strategy.padEnd(20)} | ${(c.mock.winRate.toFixed(1) + "%").padEnd(7)} | ${(c.real.winRate.toFixed(1) + "%").padEnd(7)} | ${(c.variance.winRateDiff.toFixed(1) + "%").padEnd(5)} | ${c.mock.sharpeRatio.toFixed(2).padEnd(11)} | ${c.real.sharpeRatio.toFixed(2).padEnd(11)} | ${c.variance.sharpeDiff.toFixed(2).padEnd(8)} | ${
      c.reliable ? "✅ RELIABLE" : "⚠️ CHECK"
    }`
  )
  .join("")}

OVERFITTING ANALYSIS:
─────────────────────────────────────────────────────────────────────
${signatures.length > 0 ? signatures.join("\n") : "No major overfitting issues detected ✅"}

RECOMMENDATIONS:
─────────────────────────────────────────────────────────────────────
${recommendations.join("\n")}

KEY METRICS:
─────────────────────────────────────────────────────────────────────
✅ Strategies Safe to Trade: ${comparisons.filter((c) => c.assessment === "excellent" || c.assessment === "good").length}
⚠️  Strategies Needing Caution: ${comparisons.filter((c) => c.assessment === "caution" || c.assessment === "fair").length}
🔴 Strategies to Investigate: ${comparisons.filter((c) => c.assessment === "investigate").length}

CONFIDENCE SCORE:
─────────────────────────────────────────────────────────────────────
${this.generateConfidenceScore(comparisons, realResults)}

═══════════════════════════════════════════════════════════════════════
Generated: ${new Date().toISOString()}
Report Status: READY FOR REVIEW AND ACTION
`;

    return report;
  }

  private generateConfidenceScore(comparisons: PerformanceComparison[], summary: ExecutionSummary): string {
    const reliable = comparisons.filter((c) => c.reliable).length;
    const totalReliable = comparisons.length > 0 ? (reliable / comparisons.length) * 100 : 0;

    const avgOverfitting = summary.avgOverfittingScore;

    let score = 75; // Base score

    // Adjust for overfitting
    if (avgOverfitting < 25) score += 15;
    else if (avgOverfitting < 40) score += 5;
    else if (avgOverfitting > 55) score -= 15;

    // Adjust for reliability
    if (totalReliable > 80) score += 10;
    else if (totalReliable < 50) score -= 10;

    const finalScore = Math.max(0, Math.min(100, score));

    return `Overall Confidence: ${finalScore.toFixed(0)}/100 - ${
      finalScore >= 80 ? "HIGH CONFIDENCE" : finalScore >= 60 ? "MODERATE CONFIDENCE" : "LOW CONFIDENCE"
    }
(Based on ${reliable}/${comparisons.length} reliable strategies, ${avgOverfitting.toFixed(1)}% avg overfitting)`;
  }
}
