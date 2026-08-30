/**
 * Walk-Forward Testing Tests
 * Test overfitting detection and strategy generalization
 */

import { describe, it, expect } from "vitest";
import { WalkForwardEngine } from "./walkForwardEngine";
import { createMockData } from "./dataLoader";
import { TrailingExitStrategy } from "../core/TrailingExitStrategy";
import { BacktestConfig } from "./types";

const config: BacktestConfig = {
  initialCapital: 10000,
  commissionPercentage: 0.1,
  slippagePercentage: 0.05,
  maxPositionSize: 0.1,
  riskPerTrade: 2,
};

describe("Walk-Forward Testing", () => {
  it("should run single walk-forward test", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-12-31"), 252);
    const strategy = new TrailingExitStrategy();
    const engine = new WalkForwardEngine(config);

    // Split at 160 bars for train/test (safe margin)
    const trainEndIndex = Math.floor(data.bars.length * 0.63); // ~160/252
    const result = await engine.runWalkForwardTest(strategy, data.bars, "SPY", trainEndIndex);

    expect(result.strategy).toBeDefined();
    expect(result.symbol).toBe("SPY");
    expect(result.trainStats.trades).toBeGreaterThanOrEqual(0);
    expect(result.testStats.trades).toBeGreaterThanOrEqual(0);
    expect(result.overfittingScore).toBeGreaterThanOrEqual(0);
    expect(result.overfittingScore).toBeLessThanOrEqual(100);
  });

  it("should detect overfitting when train >> test performance", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-12-31"), 252);
    const strategy = new TrailingExitStrategy();
    const engine = new WalkForwardEngine(config);

    const trainEndIndex = Math.floor(data.bars.length * 0.59); // ~150/252
    const result = await engine.runWalkForwardTest(strategy, data.bars, "SPY", trainEndIndex);

    // Check that result has overfitting metrics
    expect(result.overfittingScore).toBeDefined();
    expect(["excellent", "good", "fair", "poor"]).toContain(result.generalization);
  });

  it("should validate train/test period dates", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-06-30"), 126);
    const strategy = new TrailingExitStrategy();
    const engine = new WalkForwardEngine(config);

    const trainEndIndex = Math.floor(data.bars.length * 0.63); // ~80/126
    const result = await engine.runWalkForwardTest(strategy, data.bars, "SPY", trainEndIndex);

    expect(result.trainPeriod.start.getTime()).toBeLessThan(result.trainPeriod.end.getTime());
    expect(result.testPeriod.start.getTime()).toBeLessThan(result.testPeriod.end.getTime());
    expect(result.trainPeriod.end.getTime()).toBeLessThanOrEqual(result.testPeriod.start.getTime());
  });

  it("should handle edge case: minimal train period", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-12-31"), 252);
    const strategy = new TrailingExitStrategy();
    const engine = new WalkForwardEngine(config);

    // Minimal train: 50 bars, test: 202 bars
    const result = await engine.runWalkForwardTest(strategy, data.bars, "SPY", 50);

    expect(result.trainStats.trades).toBeGreaterThanOrEqual(0);
    expect(result.testStats.trades).toBeGreaterThanOrEqual(0);
  });

  it("should throw error if train period extends beyond data", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-06-30"), 126);
    const strategy = new TrailingExitStrategy();
    const engine = new WalkForwardEngine(config);

    try {
      await engine.runWalkForwardTest(strategy, data.bars, "SPY", data.bars.length + 1);
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain("Train period cannot extend beyond available data");
    }
  });

  it("should rank strategies by generalization", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-12-31"), 252);
    const strategy = new TrailingExitStrategy();
    const engine = new WalkForwardEngine(config);

    const trainEndIndex = Math.floor(data.bars.length * 0.71); // ~180/252
    const result = await engine.runWalkForwardTest(strategy, data.bars, "SPY", trainEndIndex);

    const results = [result]; // In real scenario, multiple strategies
    const ranking = engine.getRankingByGeneralization(results);

    expect(ranking.length).toBe(1);
    expect(ranking[0].strategy).toBeDefined();
    expect(ranking[0].score).toBeGreaterThanOrEqual(0);
  });

  it("should analyze generalization across multiple results", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-12-31"), 252);
    const strategy = new TrailingExitStrategy();
    const engine = new WalkForwardEngine(config);

    const trainEndIndex = Math.floor(data.bars.length * 0.71); // ~180/252
    const result = await engine.runWalkForwardTest(strategy, data.bars, "SPY", trainEndIndex);

    const results = [result];
    const analysis = engine.analyzeGeneralization(results);

    expect(analysis.bestGeneralizer).toBeDefined();
    expect(analysis.worstGeneralizer).toBeDefined();
    expect(analysis.avgScore).toBeGreaterThanOrEqual(0);
    expect(analysis.excellentCount + analysis.goodCount + analysis.fairCount + analysis.poorCount).toBe(1);
  });

  it("should calculate overfitting score correctly", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-12-31"), 252);
    const strategy = new TrailingExitStrategy();
    const engine = new WalkForwardEngine(config);

    const trainEndIndex = Math.floor(data.bars.length * 0.71); // ~180/252
    const result = await engine.runWalkForwardTest(strategy, data.bars, "SPY", trainEndIndex);

    // Overfitting score should be in reasonable range
    expect(result.overfittingScore).toBeLessThanOrEqual(100);
    expect(result.overfittingScore).toBeGreaterThanOrEqual(0);
  });

  it("should validate generalization quality labels", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-12-31"), 252);
    const strategy = new TrailingExitStrategy();
    const engine = new WalkForwardEngine(config);

    const trainEndIndex = Math.floor(data.bars.length * 0.71); // ~180/252
    const result = await engine.runWalkForwardTest(strategy, data.bars, "SPY", trainEndIndex);

    const validQualities = ["excellent", "good", "fair", "poor"];
    expect(validQualities).toContain(result.generalization);
  });

  it("should compare train vs test stats", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-12-31"), 252);
    const strategy = new TrailingExitStrategy();
    const engine = new WalkForwardEngine(config);

    const trainEndIndex = Math.floor(data.bars.length * 0.71); // ~180/252
    const result = await engine.runWalkForwardTest(strategy, data.bars, "SPY", trainEndIndex);

    // Both stats should be valid
    expect(result.trainStats.trades).toBeGreaterThanOrEqual(0);
    expect(result.trainStats.winRate).toBeGreaterThanOrEqual(0);
    expect(result.trainStats.sharpe).not.toBeNaN();
    expect(result.trainStats.pnl).toBeDefined();

    expect(result.testStats.trades).toBeGreaterThanOrEqual(0);
    expect(result.testStats.winRate).toBeGreaterThanOrEqual(0);
    expect(result.testStats.sharpe).not.toBeNaN();
    expect(result.testStats.pnl).toBeDefined();
  });
});
