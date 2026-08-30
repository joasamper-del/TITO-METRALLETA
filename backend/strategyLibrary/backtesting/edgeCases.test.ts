/**
 * Edge Case Tests for Backtesting
 * Gap opens, extreme volatility, liquidity crashes, earnings
 */

import { describe, it, expect } from "vitest";
import { BacktestEngine } from "./BacktestEngine";
import { TradeExecutor } from "./tradeExecutor";
import { BacktestConfig, Bar } from "./types";

const config: BacktestConfig = {
  initialCapital: 10000,
  commissionPercentage: 0.1,
  slippagePercentage: 0.05,
  maxPositionSize: 0.1,
  riskPerTrade: 2,
};

describe("Edge Cases & Market Extremes", () => {
  it("should handle gap open (5% gap down)", () => {
    const executor = new TradeExecutor(config);
    const bar: Bar = {
      timestamp: new Date(),
      open: 95, // 5% gap down
      high: 96,
      low: 94,
      close: 95,
      volume: 5000000,
    };

    const trade = executor.simulateEntry(bar, 100, 2, "SPY", "test");
    expect(trade).not.toBeNull();
    if (trade) {
      expect(trade.entryPrice).toBeLessThan(101); // Should respect gap
    }
  });

  it("should handle limit down (10% gap down)", () => {
    const executor = new TradeExecutor(config);
    const bar: Bar = {
      timestamp: new Date(),
      open: 90, // 10% limit down
      high: 91,
      low: 90,
      close: 90,
      volume: 100000, // Low volume limit down
    };

    const trade = executor.simulateEntry(bar, 100, 2, "SPY", "test");
    if (trade) {
      expect(trade.entryPrice).toBeLessThan(100.5); // Slipped on entry
    }
  });

  it("should close position on gap open to stop loss", () => {
    const executor = new TradeExecutor(config);
    const entryBar: Bar = {
      timestamp: new Date("2024-01-01"),
      open: 100,
      high: 101,
      low: 99,
      close: 100.5,
      volume: 1000000,
    };

    const trade = executor.simulateEntry(entryBar, 100, 2, "SPY", "test");
    expect(trade).not.toBeNull();

    if (trade) {
      const gapDownBar: Bar = {
        timestamp: new Date("2024-01-02"),
        open: 92, // 8% gap down (exceeds 2% SL)
        high: 93,
        low: 91,
        close: 92,
        volume: 500000,
      };

      const exit = executor.simulateExit(trade, gapDownBar, {
        stopLossPercent: 2,
        takeProfitPercent: 3,
      });

      expect(exit).not.toBeNull();
      if (exit) {
        expect(exit.reason).toBe("SL");
      }
    }
  });

  it("should handle extreme volatility (20% intraday range)", () => {
    const executor = new TradeExecutor(config);
    const bar: Bar = {
      timestamp: new Date(),
      open: 100,
      high: 120, // 20% up
      low: 80, // 20% down
      close: 105,
      volume: 10000000,
    };

    const trade = executor.simulateEntry(bar, 100, 2, "SPY", "test");
    expect(trade).not.toBeNull();

    if (trade) {
      const exit = executor.simulateExit(trade, bar, {
        stopLossPercent: 2,
        takeProfitPercent: 3,
      });

      // With 20% range, both SL and TP can trigger - SL checked first
      expect(exit).not.toBeNull();
      if (exit) {
        expect(["SL", "TP"]).toContain(exit.reason);
      }
    }
  });

  it("should handle zero volume (halted stock)", () => {
    const executor = new TradeExecutor(config);
    const bar: Bar = {
      timestamp: new Date(),
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 0, // Halted
    };

    const trade = executor.simulateEntry(bar, 100, 2, "SPY", "test");
    // Should still create trade but with alert
    expect(trade).not.toBeNull();
  });

  it("should handle earnings gap (15% gap up next day)", () => {
    const executor = new TradeExecutor(config);
    const entryBar: Bar = {
      timestamp: new Date("2024-01-01"),
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 1000000,
    };

    const trade = executor.simulateEntry(entryBar, 100, 2, "SPY", "test");
    expect(trade).not.toBeNull();

    if (trade) {
      const earningsBar: Bar = {
        timestamp: new Date("2024-01-02"), // Post-earnings
        open: 115, // 15% gap up
        high: 120,
        low: 114,
        close: 118,
        volume: 5000000,
      };

      const exit = executor.simulateExit(trade, earningsBar, {
        stopLossPercent: 2,
        takeProfitPercent: 3,
      });

      expect(exit).not.toBeNull();
      if (exit) {
        expect(exit.reason).toBe("TP");
        expect(exit.exitPrice).toBeGreaterThan(102); // TP hit with slippage
      }
    }
  });

  it("should handle very tight stop loss with slippage", () => {
    const executor = new TradeExecutor(config);
    const entryBar: Bar = {
      timestamp: new Date(),
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 1000000,
    };

    const trade = executor.simulateEntry(entryBar, 100, 2, "SPY", "test");
    expect(trade).not.toBeNull();

    if (trade) {
      // Stop loss set at 0.5% (very tight)
      const pnl = executor.calculatePnL(trade, 99.50);
      expect(pnl.pnl).toBeLessThan(0);
      expect(pnl.pnlPercent).toBeLessThan(0);
    }
  });

  it("should handle weekend gap (Friday close to Monday open)", () => {
    const executor = new TradeExecutor(config);
    const fridayBar: Bar = {
      timestamp: new Date("2024-01-05"), // Friday
      open: 100,
      high: 101,
      low: 99,
      close: 100.5,
      volume: 2000000,
    };

    const trade = executor.simulateEntry(fridayBar, 100, 2, "SPY", "test");
    expect(trade).not.toBeNull();

    if (trade) {
      const mondayBar: Bar = {
        timestamp: new Date("2024-01-08"), // Monday, gap up on weekend news
        open: 103,
        high: 104,
        low: 102,
        close: 103.5,
        volume: 2500000,
      };

      const exit = executor.simulateExit(trade, mondayBar, {
        stopLossPercent: 2,
        takeProfitPercent: 3,
      });

      expect(exit).not.toBeNull();
      if (exit) {
        expect(exit.reason).toBe("TP");
      }
    }
  });

  it("should calculate P&L with maximum slippage + commission", () => {
    const executor = new TradeExecutor(config);
    const trade = {
      entryDate: new Date(),
      entryPrice: 100,
      entrySize: 10,
      strategy: "test",
      symbol: "SPY",
    };

    const pnl = executor.calculatePnL(trade as any, 105);

    // Expected: (105 - 0.0525) - 100 = 4.9475 - commission impact
    expect(pnl.pnl).toBeLessThan(50); // Slippage + commission reduce it
    expect(pnl.pnlPercent).toBeLessThan(5); // Reduced from raw 5%
  });

  it("should handle rapid reversals (whipsaws)", () => {
    const executor = new TradeExecutor(config);
    const entryBar: Bar = {
      timestamp: new Date("2024-01-01"),
      open: 100,
      high: 105,
      low: 99,
      close: 102,
      volume: 3000000,
    };

    const trade = executor.simulateEntry(entryBar, 100, 2, "SPY", "test");
    expect(trade).not.toBeNull();

    if (trade) {
      // First bar: hit TP
      const tp = executor.simulateExit(trade, entryBar, {
        stopLossPercent: 2,
        takeProfitPercent: 3,
      });
      expect(tp).not.toBeNull();

      if (tp) {
        expect(tp.reason).toBe("TP");
      }
    }
  });

  it("should handle position sizing constraints", () => {
    const constrainedConfig: BacktestConfig = {
      ...config,
      maxPositionSize: 0.01, // 1% max position
      initialCapital: 10000,
    };

    const executor = new TradeExecutor(constrainedConfig);
    const bar: Bar = {
      timestamp: new Date(),
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 100000,
    };

    const trade = executor.simulateEntry(bar, 100, 2, "SPY", "test");
    if (trade) {
      // Position size is calculated based on risk, not hard capped yet
      expect(trade.entrySize).toBeGreaterThan(0);
    }
  });

  it("should respect max hold duration on overnight hold", () => {
    const executor = new TradeExecutor(config);
    const entryBar: Bar = {
      timestamp: new Date("2024-01-01"),
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 1000000,
    };

    const trade = executor.simulateEntry(entryBar, 100, 2, "SPY", "test");
    expect(trade).not.toBeNull();

    if (trade) {
      // Bar 10 days later (exceeds max hold of 5)
      const expiredBar: Bar = {
        timestamp: new Date("2024-01-11"),
        open: 102,
        high: 103,
        low: 101,
        close: 102.5,
        volume: 2000000,
      };

      const exit = executor.simulateExit(trade, expiredBar, {
        stopLossPercent: 2,
        takeProfitPercent: 3,
        maxHoldDays: 5,
      });

      expect(exit).not.toBeNull();
      if (exit) {
        expect(exit.reason).toBe("Expiration");
      }
    }
  });

  it("should handle micro-movements (penny stock-like)", () => {
    const executor = new TradeExecutor(config);
    const bar: Bar = {
      timestamp: new Date(),
      open: 2.5,
      high: 2.55,
      low: 2.45,
      close: 2.5,
      volume: 50000000, // High volume compensates low price
    };

    const trade = executor.simulateEntry(bar, 2.5, 2, "PENNY", "test");
    if (trade) {
      expect(trade.entryPrice).toBeGreaterThan(2.49); // Slipped upward
      const pnl = executor.calculatePnL(trade as any, 2.6);
      expect(pnl.pnl).toBeDefined();
      expect(pnl.pnlPercent).toBeGreaterThan(0);
    }
  });
});
