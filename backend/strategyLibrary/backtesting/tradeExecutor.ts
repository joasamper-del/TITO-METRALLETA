/**
 * Trade Executor for Backtesting
 * Simulates entry/exit with slippage, commission, SL/TP
 */

import { Bar, Trade, BacktestConfig } from "./types";

export class TradeExecutor {
  private config: BacktestConfig;

  constructor(config: BacktestConfig) {
    this.config = config;
  }

  simulateEntry(
    bar: Bar,
    entryPrice: number,
    riskPercent: number,
    symbol: string,
    strategy: string
  ): Trade | null {
    // Apply slippage on entry
    const slippageCost = entryPrice * (this.config.slippagePercentage / 100);
    const actualEntryPrice = entryPrice + slippageCost;

    // Calculate position size based on risk
    const riskAmount = this.config.initialCapital * (riskPercent / 100);
    const stopDistance = entryPrice * 0.02; // 2% stop loss
    const positionSize = Math.floor(riskAmount / stopDistance);

    if (positionSize <= 0) return null;

    const trade: Trade = {
      entryDate: bar.timestamp,
      entryPrice: actualEntryPrice,
      entrySize: positionSize,
      strategy,
      symbol,
    };

    return trade;
  }

  simulateExit(
    trade: Trade,
    currentBar: Bar,
    config: {
      stopLossPercent: number;
      takeProfitPercent: number;
      trailingStopPercent?: number;
      maxHoldDays?: number;
    }
  ): { exitPrice: number; reason: "SL" | "TP" | "Trailing" | "Expiration" | "Manual" } | null {
    // Check stop loss
    const slPercent = (trade.entryPrice - currentBar.low) / trade.entryPrice;
    if (slPercent >= config.stopLossPercent / 100) {
      return {
        exitPrice: trade.entryPrice * (1 - config.stopLossPercent / 100),
        reason: "SL",
      };
    }

    // Check take profit
    const tpPercent = (currentBar.high - trade.entryPrice) / trade.entryPrice;
    if (tpPercent >= config.takeProfitPercent / 100) {
      return {
        exitPrice: trade.entryPrice * (1 + config.takeProfitPercent / 100),
        reason: "TP",
      };
    }

    // Check trailing stop
    if (config.trailingStopPercent && trade.maxProfit) {
      const profitDrawdown = (trade.maxProfit - (currentBar.close - trade.entryPrice)) / trade.maxProfit;
      if (profitDrawdown >= config.trailingStopPercent / 100) {
        return {
          exitPrice: currentBar.close,
          reason: "Trailing",
        };
      }
    }

    // Check max hold days
    if (config.maxHoldDays) {
      const holdDays = Math.floor((currentBar.timestamp.getTime() - trade.entryDate.getTime()) / (1000 * 60 * 60 * 24));
      if (holdDays >= config.maxHoldDays) {
        return {
          exitPrice: currentBar.close,
          reason: "Expiration",
        };
      }
    }

    return null;
  }

  calculatePnL(trade: Trade, exitPrice: number): { pnl: number; pnlPercent: number } {
    // Apply slippage on exit
    const slippageCost = exitPrice * (this.config.slippagePercentage / 100);
    const actualExitPrice = exitPrice - slippageCost;

    // Apply commission on entry and exit
    const commissionEntry = trade.entryPrice * trade.entrySize * (this.config.commissionPercentage / 100);
    const commissionExit = actualExitPrice * trade.entrySize * (this.config.commissionPercentage / 100);

    const grossPnL = (actualExitPrice - trade.entryPrice) * trade.entrySize;
    const netPnL = grossPnL - commissionEntry - commissionExit;

    return {
      pnl: netPnL,
      pnlPercent: (netPnL / (trade.entryPrice * trade.entrySize)) * 100,
    };
  }

  updateMaxDrawdown(trade: Trade, currentBar: Bar): void {
    const unrealizedPnL = (currentBar.close - trade.entryPrice) * trade.entrySize;
    if (trade.maxProfit === undefined || unrealizedPnL > trade.maxProfit) {
      trade.maxProfit = unrealizedPnL;
    }
    if (trade.maxLoss === undefined || unrealizedPnL < trade.maxLoss) {
      trade.maxLoss = unrealizedPnL;
    }
  }
}
