/**
 * Strategy Validation Tests
 * Backtesting all 10 strategies against historical data
 */

import { describe, it, expect } from "vitest";
import { BacktestEngine } from "./BacktestEngine";
import { createMockData } from "./dataLoader";
import { BacktestConfig } from "./types";
import { TrailingExitStrategy } from "../core/TrailingExitStrategy";
import { MeanReversionStrategy } from "../core/MeanReversionStrategy";
import { BreakoutStrategy } from "../core/BreakoutStrategy";
import { BullCallSpreadStrategy } from "../core/BullCallSpreadStrategy";
import { BearPutSpreadStrategy } from "../core/BearPutSpreadStrategy";
import { LongStraddleStrategy } from "../core/LongStraddleStrategy";
import { LongStrangleStrategy } from "../core/LongStrangleStrategy";
import { WheelStrategy } from "../core/WheelStrategy";
import { PullbackVWAPStrategy } from "../core/PullbackVWAPStrategy";
import { VolatilityExpansionStrategy } from "../core/VolatilityExpansionStrategy";

const config: BacktestConfig = {
  initialCapital: 10000,
  commissionPercentage: 0.1,
  slippagePercentage: 0.05,
  maxPositionSize: 0.1,
  riskPerTrade: 2,
};

describe("Strategy Validation — Backtesting All 10 Strategies", () => {
  it("TrailingExitStrategy should backtest on SPY mock data", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-06-30"), 126);
    const strategy = new TrailingExitStrategy();
    const engine = new BacktestEngine(config);

    const result = await engine.runBacktest(strategy, data.bars, "SPY");

    expect(result.stats.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.stats.winRate).toBeGreaterThanOrEqual(0);
    expect(result.stats.sharpeRatio).not.toBeNaN();
    expect(result.stats.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it("MeanReversionStrategy should backtest on QQQ mock data", async () => {
    const data = createMockData("QQQ", new Date("2024-01-01"), new Date("2024-06-30"), 126);
    const strategy = new MeanReversionStrategy();
    const engine = new BacktestEngine(config);

    const result = await engine.runBacktest(strategy, data.bars, "QQQ");

    expect(result.stats.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.stats.profitFactor).toBeGreaterThanOrEqual(0);
    expect(result.stats.sortinoRatio).not.toBeNaN();
  });

  it("BreakoutStrategy should backtest on SPY mock data", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-06-30"), 126);
    const strategy = new BreakoutStrategy();
    const engine = new BacktestEngine(config);

    const result = await engine.runBacktest(strategy, data.bars, "SPY");

    expect(result.stats.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.stats.maxWin).toBeDefined();
    expect(result.stats.maxLoss).toBeDefined();
  });

  it("BullCallSpreadStrategy should backtest on QQQ mock data", async () => {
    const data = createMockData("QQQ", new Date("2024-01-01"), new Date("2024-06-30"), 126);
    const strategy = new BullCallSpreadStrategy();
    const engine = new BacktestEngine(config);

    const result = await engine.runBacktest(strategy, data.bars, "QQQ");

    expect(result.stats.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.trades).toBeDefined();
  });

  it("BearPutSpreadStrategy should backtest on SPY mock data", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-06-30"), 126);
    const strategy = new BearPutSpreadStrategy();
    const engine = new BacktestEngine(config);

    const result = await engine.runBacktest(strategy, data.bars, "SPY");

    expect(result.stats.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.stats.avgWin).toBeDefined();
  });

  it("LongStraddleStrategy should backtest on BTC mock data", async () => {
    const data = createMockData("BTC", new Date("2024-01-01"), new Date("2024-06-30"), 126);
    const strategy = new LongStraddleStrategy();
    const engine = new BacktestEngine(config);

    const result = await engine.runBacktest(strategy, data.bars, "BTC");

    expect(result.stats.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.stats.winningTrades).toBeGreaterThanOrEqual(0);
  });

  it("LongStrangleStrategy should backtest on QQQ mock data", async () => {
    const data = createMockData("QQQ", new Date("2024-01-01"), new Date("2024-06-30"), 126);
    const strategy = new LongStrangleStrategy();
    const engine = new BacktestEngine(config);

    const result = await engine.runBacktest(strategy, data.bars, "QQQ");

    expect(result.stats.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.stats.losingTrades).toBeGreaterThanOrEqual(0);
  });

  it("WheelStrategy should backtest on SPY mock data", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-06-30"), 126);
    const strategy = new WheelStrategy();
    const engine = new BacktestEngine(config);

    const result = await engine.runBacktest(strategy, data.bars, "SPY");

    expect(result.stats.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.stats.totalPnL).toBeDefined();
  });

  it("PullbackVWAPStrategy should backtest on QQQ mock data", async () => {
    const data = createMockData("QQQ", new Date("2024-01-01"), new Date("2024-06-30"), 126);
    const strategy = new PullbackVWAPStrategy();
    const engine = new BacktestEngine(config);

    const result = await engine.runBacktest(strategy, data.bars, "QQQ");

    expect(result.stats.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.stats.totalPnLPercent).toBeDefined();
  });

  it("VolatilityExpansionStrategy should backtest on BTC mock data", async () => {
    const data = createMockData("BTC", new Date("2024-01-01"), new Date("2024-06-30"), 126);
    const strategy = new VolatilityExpansionStrategy();
    const engine = new BacktestEngine(config);

    const result = await engine.runBacktest(strategy, data.bars, "BTC");

    expect(result.stats.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.stats.drawdownDuration).toBeGreaterThanOrEqual(0);
  });

  it("All strategies should complete without errors", async () => {
    const strategies = [
      new TrailingExitStrategy(),
      new MeanReversionStrategy(),
      new BreakoutStrategy(),
      new BullCallSpreadStrategy(),
      new BearPutSpreadStrategy(),
      new LongStraddleStrategy(),
      new LongStrangleStrategy(),
      new WheelStrategy(),
      new PullbackVWAPStrategy(),
      new VolatilityExpansionStrategy(),
    ];

    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-06-30"), 126);
    const engine = new BacktestEngine(config);

    for (const strategy of strategies) {
      const result = await engine.runBacktest(strategy, data.bars, "SPY");
      expect(result.stats).toBeDefined();
      expect(result.trades).toBeDefined();
      expect(result.stats.totalTrades).toBeGreaterThanOrEqual(0);
    }
  });

  it("should validate stats have realistic values", async () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-06-30"), 126);
    const strategy = new TrailingExitStrategy();
    const engine = new BacktestEngine(config);

    const result = await engine.runBacktest(strategy, data.bars, "SPY");

    if (result.stats.totalTrades > 0) {
      expect(result.stats.winRate).toBeGreaterThanOrEqual(0);
      expect(result.stats.winRate).toBeLessThanOrEqual(100);
      expect(result.stats.profitFactor).toBeGreaterThanOrEqual(0);
      expect(result.stats.sharpeRatio).not.toBeNaN();
      expect(result.stats.sortinoRatio).not.toBeNaN();
    }
  });

  it("should handle multiple assets correctly", async () => {
    const assets = ["SPY", "QQQ", "BTC"];
    const strategy = new BreakoutStrategy();

    for (const asset of assets) {
      const data = createMockData(asset, new Date("2024-01-01"), new Date("2024-06-30"), 126);
      const engine = new BacktestEngine(config);

      const result = await engine.runBacktest(strategy, data.bars, asset);

      expect(result.trades).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(result.stats.totalTrades).toBeGreaterThanOrEqual(0);
    }
  });
});
