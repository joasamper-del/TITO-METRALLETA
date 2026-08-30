/**
 * Walk-Forward Test Executor
 * Executes walk-forward tests on all 10 strategies
 */

import { BaseStrategy } from "../base/BaseStrategy";
import { WalkForwardEngine } from "../backtesting/walkForwardEngine";
import { Bar, BacktestConfig } from "../backtesting/types";
import { WalkForwardResult } from "../data/types";

export interface StrategyExecutionResult {
  strategy: string;
  symbol: string;
  result: WalkForwardResult;
  status: "success" | "error";
  error?: string;
  executionTimeMs: number;
}

export interface ExecutionSummary {
  totalStrategies: number;
  successful: number;
  failed: number;
  bestGeneralizer: string;
  worstGeneralizer: string;
  avgOverfittingScore: number;
  results: StrategyExecutionResult[];
  executionTimeMs: number;
}

export class WalkForwardExecutor {
  constructor(private engine: WalkForwardEngine, private config: BacktestConfig) {}

  async executeAllStrategies(
    strategies: BaseStrategy[],
    bars: Bar[],
    symbols: string[]
  ): Promise<ExecutionSummary> {
    const startTime = Date.now();
    const results: StrategyExecutionResult[] = [];

    console.log(`[S48] Starting walk-forward execution for ${strategies.length} strategies...`);

    // Calculate split point: ~70% train, ~30% test
    const trainEndIndex = Math.floor(bars.length * 0.7);

    for (const strategy of strategies) {
      const stratStart = Date.now();

      try {
        console.log(`[S48] Testing ${strategy.getName?.() || "UnknownStrategy"}...`);

        // Run walk-forward test
        const result = await this.engine.runWalkForwardTest(strategy, bars, symbols[0] || "SPY", trainEndIndex);

        results.push({
          strategy: result.strategy,
          symbol: result.symbol,
          result,
          status: "success",
          executionTimeMs: Date.now() - stratStart,
        });

        console.log(`[S48] ✅ ${result.strategy}: Overfitting ${result.overfittingScore.toFixed(1)}% (${result.generalization})`);
      } catch (error: any) {
        console.error(`[S48] ❌ Strategy execution failed: ${error.message}`);

        results.push({
          strategy: (strategy as any).name || "UnknownStrategy",
          symbol: symbols[0] || "SPY",
          result: {} as any,
          status: "error",
          error: error.message,
          executionTimeMs: Date.now() - stratStart,
        });
      }
    }

    const totalTime = Date.now() - startTime;

    // Generate summary
    const successfulResults = results.filter((r) => r.status === "success");
    const walkForwardResults = successfulResults.map((r) => r.result);

    let bestGen = "";
    let worstGen = "";
    let avgScore = 0;

    if (walkForwardResults.length > 0) {
      const sorted = walkForwardResults.sort((a, b) => a.overfittingScore - b.overfittingScore);
      bestGen = sorted[0].strategy;
      worstGen = sorted[sorted.length - 1].strategy;
      avgScore = walkForwardResults.reduce((sum, r) => sum + r.overfittingScore, 0) / walkForwardResults.length;
    }

    return {
      totalStrategies: strategies.length,
      successful: successfulResults.length,
      failed: results.length - successfulResults.length,
      bestGeneralizer: bestGen,
      worstGeneralizer: worstGen,
      avgOverfittingScore: avgScore,
      results,
      executionTimeMs: totalTime,
    };
  }

  async generateExecutionReport(summary: ExecutionSummary): Promise<string> {
    const sortedByScore = [...summary.results]
      .filter((r) => r.status === "success")
      .sort((a, b) => (a.result?.overfittingScore || 100) - (b.result?.overfittingScore || 100));

    const report = `
╔════════════════════════════════════════════════════════════════════╗
║      SESSION 48 — WALK-FORWARD EXECUTION SUMMARY                  ║
╚════════════════════════════════════════════════════════════════════╝

EXECUTION STATS:
─────────────────────────────────────────────────────────────────────
Total Strategies: ${summary.totalStrategies}
Successful: ${summary.successful} ✅
Failed: ${summary.failed} ${summary.failed > 0 ? "❌" : ""}
Total Time: ${summary.executionTimeMs}ms (${(summary.executionTimeMs / 1000).toFixed(2)}s)

OVERFITTING ANALYSIS:
─────────────────────────────────────────────────────────────────────
Best Generalizer: ${summary.bestGeneralizer}
Worst Generalizer: ${summary.worstGeneralizer}
Average Overfitting: ${summary.avgOverfittingScore.toFixed(1)}%

DETAILED RANKINGS (by generalization quality):
─────────────────────────────────────────────────────────────────────
Rank | Strategy              | Overfitting | Quality      | Time (ms)
${sortedByScore
  .map(
    (result, idx) => `
${(idx + 1).toString().padEnd(4)} | ${result.strategy.padEnd(20)} | ${(result.result?.overfittingScore || 0)
      .toFixed(1)
      .padEnd(11)}% | ${(result.result?.generalization || "unknown").padEnd(12)} | ${result.executionTimeMs}`
  )
  .join("")}

═══════════════════════════════════════════════════════════════════════
`;

    return report;
  }

  async getGeneralizationRanking(summary: ExecutionSummary): Promise<
    Array<{
      rank: number;
      strategy: string;
      overfittingScore: number;
      generalization: string;
      recommendation: string;
    }>
  > {
    const successful = summary.results
      .filter((r) => r.status === "success")
      .sort((a, b) => (a.result?.overfittingScore || 100) - (b.result?.overfittingScore || 100));

    return successful.map((result, idx) => {
      const score = result.result?.overfittingScore || 0;
      let recommendation = "NOT RECOMMENDED";

      if (score < 25) recommendation = "Safe to trade - excellent generalization";
      else if (score < 40) recommendation = "Safe to trade - good generalization";
      else if (score < 55) recommendation = "Use with caution - fair generalization";
      else recommendation = "NOT RECOMMENDED - poor generalization";

      return {
        rank: idx + 1,
        strategy: result.strategy,
        overfittingScore: score,
        generalization: result.result?.generalization || "unknown",
        recommendation,
      };
    });
  }
}
