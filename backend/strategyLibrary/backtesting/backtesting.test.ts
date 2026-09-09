/**
 * Backtesting Framework Tests
 */

import { describe, it, expect } from "vitest";
import { computeMA, computeRSI, computeATR, computeBollingerBands, createMockData } from "./dataLoader";
import { calculateStats, validateStats } from "./metricsCalculator";
import { Trade } from "./types";

describe("Data Loader", () => {
  it("should compute moving average correctly", () => {
    const data = [
      { timestamp: new Date(), open: 100, high: 101, low: 99, close: 100, volume: 1000 },
      { timestamp: new Date(), open: 101, high: 102, low: 100, close: 101, volume: 1000 },
      { timestamp: new Date(), open: 102, high: 103, low: 101, close: 102, volume: 1000 },
    ];
    const ma = computeMA(data, 2);
    expect(ma[0]).toBeNaN();
    expect(ma[1]).toBeCloseTo(100.5);
    expect(ma[2]).toBeCloseTo(101.5);
  });

  it("should compute RSI with correct bounds", () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(),
      open: 100 + i,
      high: 101 + i,
      low: 99 + i,
      close: 100 + i,
      volume: 1000,
    }));
    const rsi = computeRSI(data, 14);
    const validRSI = rsi.filter((r) => !isNaN(r));
    validRSI.forEach((r) => {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(100);
    });
  });

  it("should compute ATR correctly", () => {
    const data = Array.from({ length: 20 }, (_, i) => ({
      timestamp: new Date(),
      open: 100,
      high: 102,
      low: 98,
      close: 100 + i * 0.5,
      volume: 1000,
    }));
    const atr = computeATR(data, 14);
    const validATR = atr.filter((a) => !isNaN(a));
    validATR.forEach((a) => {
      expect(a).toBeGreaterThan(0);
    });
  });

  it("should compute Bollinger Bands correctly", () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(),
      open: 100,
      high: 102,
      low: 98,
      close: 100 + (i % 2 === 0 ? 1 : -1),
      volume: 1000,
    }));
    const { upper, mid, lower } = computeBollingerBands(data, 20, 2);
    const validIdx = upper.findIndex((u) => !isNaN(u));
    if (validIdx >= 0) {
      expect(upper[validIdx]).toBeGreaterThan(mid[validIdx]);
      expect(mid[validIdx]).toBeGreaterThan(lower[validIdx]);
    }
  });

  it("should create mock data with valid bars", () => {
    const data = createMockData("SPY", new Date("2024-01-01"), new Date("2024-12-31"), 252);
    expect(data.symbol).toBe("SPY");
    expect(data.bars.length).toBeGreaterThan(0);
    expect(data.bars[0].ma50).toBeDefined();
    expect(data.bars[0].rsi).toBeDefined();
  });

  it("mock data should have proper technical indicators", () => {
    const data = createMockData("QQQ", new Date("2024-01-01"), new Date("2024-12-31"), 100);
    const lastBar = data.bars[data.bars.length - 1];
    expect(lastBar.ma50).toBeDefined();
    expect(lastBar.ma200).toBeDefined();
    expect(lastBar.rsi).toBeDefined();
    expect(lastBar.atr).toBeDefined();
  });
});

describe("Metrics Calculator", () => {
  it("should calculate empty stats for no trades", () => {
    const stats = calculateStats([]);
    expect(stats.totalTrades).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.sharpeRatio).toBe(0);
  });

  it("should calculate stats for winning trades", () => {
    const trades: Trade[] = [
      {
        entryDate: new Date(),
        entryPrice: 100,
        entrySize: 10,
        exitPrice: 110,
        pnl: 100,
        pnlPercent: 10,
        strategy: "test",
        symbol: "SPY",
      },
      {
        entryDate: new Date(),
        entryPrice: 100,
        entrySize: 10,
        exitPrice: 105,
        pnl: 50,
        pnlPercent: 5,
        strategy: "test",
        symbol: "SPY",
      },
    ];
    const stats = calculateStats(trades);
    expect(stats.totalTrades).toBe(2);
    expect(stats.winningTrades).toBe(2);
    expect(stats.winRate).toBe(100);
    expect(stats.profitFactor).toBeGreaterThan(0);
  });

  it("should calculate stats with losing trades", () => {
    const trades: Trade[] = [
      {
        entryDate: new Date(),
        entryPrice: 100,
        entrySize: 10,
        exitPrice: 110,
        pnl: 100,
        pnlPercent: 10,
        strategy: "test",
        symbol: "SPY",
      },
      {
        entryDate: new Date(),
        entryPrice: 100,
        entrySize: 10,
        exitPrice: 95,
        pnl: -50,
        pnlPercent: -5,
        strategy: "test",
        symbol: "SPY",
      },
    ];
    const stats = calculateStats(trades);
    expect(stats.totalTrades).toBe(2);
    expect(stats.winningTrades).toBe(1);
    expect(stats.losingTrades).toBe(1);
    expect(stats.winRate).toBe(50);
  });

  it("should calculate max drawdown", () => {
    const trades: Trade[] = [
      {
        entryDate: new Date(),
        entryPrice: 100,
        entrySize: 10,
        exitPrice: 120,
        pnl: 200,
        pnlPercent: 20,
        strategy: "test",
        symbol: "SPY",
      },
      {
        entryDate: new Date(),
        entryPrice: 100,
        entrySize: 10,
        exitPrice: 80,
        pnl: -200,
        pnlPercent: -20,
        strategy: "test",
        symbol: "SPY",
      },
    ];
    const stats = calculateStats(trades);
    expect(stats.maxDrawdown).toBeGreaterThan(0);
  });

  it("should validate stats with issues", () => {
    const stats = calculateStats([]);
    const issues = validateStats(stats);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain("No completed trades");
  });

  it("should calculate Sharpe ratio", () => {
    const trades: Trade[] = Array.from({ length: 50 }, (_, i) => ({
      entryDate: new Date(),
      entryPrice: 100,
      entrySize: 10,
      exitPrice: 100 + (i % 3 === 0 ? 5 : i % 3 === 1 ? -3 : 2),
      pnl: (i % 3 === 0 ? 50 : i % 3 === 1 ? -30 : 20),
      pnlPercent: (i % 3 === 0 ? 5 : i % 3 === 1 ? -3 : 2),
      strategy: "test",
      symbol: "SPY",
    }));
    const stats = calculateStats(trades);
    expect(stats.sharpeRatio).toBeDefined();
    expect(stats.sharpeRatio).not.toBeNaN();
  });

  it("should calculate Sortino ratio", () => {
    const trades: Trade[] = Array.from({ length: 30 }, (_, i) => ({
      entryDate: new Date(),
      entryPrice: 100,
      entrySize: 10,
      exitPrice: 100 + (i % 2 === 0 ? 3 : -2),
      pnl: (i % 2 === 0 ? 30 : -20),
      pnlPercent: (i % 2 === 0 ? 3 : -2),
      strategy: "test",
      symbol: "SPY",
    }));
    const stats = calculateStats(trades);
    expect(stats.sortinoRatio).toBeDefined();
    expect(stats.sortinoRatio).not.toBeNaN();
  });

  it("should calculate profit factor", () => {
    const trades: Trade[] = [
      {
        entryDate: new Date(),
        entryPrice: 100,
        entrySize: 10,
        exitPrice: 110,
        pnl: 100,
        pnlPercent: 10,
        strategy: "test",
        symbol: "SPY",
      },
      {
        entryDate: new Date(),
        entryPrice: 100,
        entrySize: 10,
        exitPrice: 95,
        pnl: -50,
        pnlPercent: -5,
        strategy: "test",
        symbol: "SPY",
      },
    ];
    const stats = calculateStats(trades);
    expect(stats.profitFactor).toBeCloseTo(2, 1);
  });

  it("should calculate average win/loss", () => {
    const trades: Trade[] = [
      {
        entryDate: new Date(),
        entryPrice: 100,
        entrySize: 10,
        exitPrice: 120,
        pnl: 200,
        pnlPercent: 20,
        strategy: "test",
        symbol: "SPY",
      },
      {
        entryDate: new Date(),
        entryPrice: 100,
        entrySize: 10,
        exitPrice: 110,
        pnl: 100,
        pnlPercent: 10,
        strategy: "test",
        symbol: "SPY",
      },
      {
        entryDate: new Date(),
        entryPrice: 100,
        entrySize: 10,
        exitPrice: 80,
        pnl: -200,
        pnlPercent: -20,
        strategy: "test",
        symbol: "SPY",
      },
    ];
    const stats = calculateStats(trades);
    expect(stats.avgWin).toBeCloseTo(150, 1);
    expect(stats.avgLoss).toBeCloseTo(-200, 1);
  });
});
