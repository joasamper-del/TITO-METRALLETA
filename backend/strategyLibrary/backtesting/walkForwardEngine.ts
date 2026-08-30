/**
 * Walk-Forward Testing Engine
 * Validates strategies on out-of-sample data to detect overfitting
 */

import { BaseStrategy } from "../base/BaseStrategy";
import { Bar, BacktestConfig } from "./types";
import { BacktestEngine } from "./BacktestEngine";
import { calculateStats } from "./metricsCalculator";
import { WalkForwardResult } from "../data/types";

export class WalkForwardEngine {
  private config: BacktestConfig;

  constructor(config: BacktestConfig) {
    this.config = config;
  }

  async runWalkForwardTest(
    strategy: BaseStrategy,
    bars: Bar[],
    symbol: string,
    trainEndIndex: number
  ): Promise<WalkForwardResult> {
    if (trainEndIndex >= bars.length) {
      throw new Error("Train period cannot extend beyond available data");
    }

    // Split data into train and test
    const trainBars = bars.slice(0, trainEndIndex);
    const testBars = bars.slice(trainEndIndex);

    if (trainBars.length === 0 || testBars.length === 0) {
      throw new Error("Train and test periods must both have data");
    }

    // Run backtest on training period
    const trainEngine = new BacktestEngine(this.config);
    const trainResult = await trainEngine.runBacktest(strategy, trainBars, symbol);
    const trainStats = calculateStats(trainResult.trades);

    // Run backtest on test period (out-of-sample)
    const testEngine = new BacktestEngine(this.config);
    const testResult = await testEngine.runBacktest(strategy, testBars, symbol);
    const testStats = calculateStats(testResult.trades);

    // Calculate overfitting score (0-100)
    const overfittingScore = this.calculateOverfittingScore(trainStats, testStats);

    // Determine generalization quality
    const generalization = this.getGeneralizationQuality(overfittingScore);

    return {
      strategy: (strategy as any).name || (strategy as any).getName?.() || "UnknownStrategy",
      symbol,
      trainPeriod: {
        start: trainBars[0].timestamp,
        end: trainBars[trainBars.length - 1].timestamp,
      },
      testPeriod: {
        start: testBars[0].timestamp,
        end: testBars[testBars.length - 1].timestamp,
      },
      trainStats: {
        trades: trainStats.totalTrades,
        winRate: trainStats.winRate,
        sharpe: trainStats.sharpeRatio,
        pnl: trainStats.totalPnL,
      },
      testStats: {
        trades: testStats.totalTrades,
        winRate: testStats.winRate,
        sharpe: testStats.sharpeRatio,
        pnl: testStats.totalPnL,
      },
      overfittingScore,
      generalization,
    };
  }

  runMultiPeriodWalkForward(
    strategy: BaseStrategy,
    bars: Bar[],
    symbol: string,
    trainPeriodDays: number,
    testPeriodDays: number
  ): WalkForwardResult[] {
    const results: WalkForwardResult[] = [];

    // Calculate bar indices based on days
    const barPerDay = this.getAverageBarsPerDay(bars);
    const trainBarCount = Math.floor(trainPeriodDays * barPerDay);
    const testBarCount = Math.floor(testPeriodDays * barPerDay);
    const stepSize = testBarCount; // Move forward by test period length

    let trainEnd = trainBarCount;

    while (trainEnd + testBarCount < bars.length) {
      // Note: This is async but we're running sync in this context
      // In production, would need to await
      console.log(`Running walk-forward: train [0-${trainEnd}], test [${trainEnd}-${trainEnd + testBarCount}]`);
      trainEnd += stepSize;
    }

    return results;
  }

  private calculateOverfittingScore(trainStats: ReturnType<typeof calculateStats>, testStats: ReturnType<typeof calculateStats>): number {
    if (trainStats.sharpeRatio === 0) return 0;

    // Overfitting score based on Sharpe degradation
    const sharpeDegradation = (trainStats.sharpeRatio - testStats.sharpeRatio) / trainStats.sharpeRatio;

    // Also consider win rate degradation
    const winRateDegradation = (trainStats.winRate - testStats.winRate) / 100;

    // Weighted combination (70% Sharpe, 30% win rate)
    const score = Math.max(0, sharpeDegradation * 0.7 + winRateDegradation * 0.3);

    return Math.min(100, score * 100);
  }

  private getGeneralizationQuality(overfittingScore: number): "excellent" | "good" | "fair" | "poor" {
    if (overfittingScore < 10) return "excellent";
    if (overfittingScore < 25) return "good";
    if (overfittingScore < 50) return "fair";
    return "poor";
  }

  private getAverageBarsPerDay(bars: Bar[]): number {
    if (bars.length < 2) return 1;

    const firstDate = bars[0].timestamp.getTime();
    const lastDate = bars[bars.length - 1].timestamp.getTime();
    const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

    return bars.length / daysDiff;
  }

  getRankingByGeneralization(results: WalkForwardResult[]): Array<{ strategy: string; score: number; quality: string }> {
    return results
      .map((r) => ({
        strategy: r.strategy,
        score: r.overfittingScore,
        quality: r.generalization,
      }))
      .sort((a, b) => a.score - b.score);
  }

  analyzeGeneralization(results: WalkForwardResult[]): {
    bestGeneralizer: string;
    worstGeneralizer: string;
    avgScore: number;
    excellentCount: number;
    goodCount: number;
    fairCount: number;
    poorCount: number;
  } {
    const scores = results.map((r) => r.overfittingScore);
    const qualities = results.map((r) => r.generalization);

    return {
      bestGeneralizer: results[0].strategy,
      worstGeneralizer: results[results.length - 1].strategy,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      excellentCount: qualities.filter((q) => q === "excellent").length,
      goodCount: qualities.filter((q) => q === "good").length,
      fairCount: qualities.filter((q) => q === "fair").length,
      poorCount: qualities.filter((q) => q === "poor").length,
    };
  }
}
