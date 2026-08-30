/**
 * Backtest Engine
 * Orchestrates bar-by-bar simulation of trading strategies
 */

import { BaseStrategy } from "../base/BaseStrategy";
import { Bar, BacktestConfig, BacktestResult, Trade } from "./types";
import { TradeExecutor } from "./tradeExecutor";
import { calculateStats } from "./metricsCalculator";

export class BacktestEngine {
  private executor: TradeExecutor;
  private config: BacktestConfig;
  private trades: Trade[] = [];
  private activeTrade: Trade | null = null;

  constructor(config: BacktestConfig) {
    this.config = config;
    this.executor = new TradeExecutor(config);
  }

  async runBacktest(strategy: BaseStrategy, bars: Bar[], symbol: string): Promise<BacktestResult> {
    this.trades = [];
    this.activeTrade = null;

    // Skip warm-up period (first 200 bars for MA200)
    const startIndex = 200;

    for (let i = startIndex; i < bars.length; i++) {
      const currentBar = bars[i];

      // Check if we need to exit active trade
      if (this.activeTrade) {
        this.updateTradeDrawdown(this.activeTrade, currentBar);

        const exitSignal = this.executor.simulateExit(this.activeTrade, currentBar, {
          stopLossPercent: 2,
          takeProfitPercent: 3,
          trailingStopPercent: 1,
          maxHoldDays: 10,
        });

        if (exitSignal) {
          const pnl = this.executor.calculatePnL(this.activeTrade, exitSignal.exitPrice);
          this.activeTrade.exitDate = currentBar.timestamp;
          this.activeTrade.exitPrice = exitSignal.exitPrice;
          this.activeTrade.exitReason = exitSignal.reason;
          this.activeTrade.pnl = pnl.pnl;
          this.activeTrade.pnlPercent = pnl.pnlPercent;

          this.trades.push(this.activeTrade);
          this.activeTrade = null;
        }
      }

      // Check for entry signal if no active trade
      if (!this.activeTrade) {
        const signal = await strategy.evaluate({
          timestamp: currentBar.timestamp,
          open: currentBar.open,
          high: currentBar.high,
          low: currentBar.low,
          close: currentBar.close,
          volume: currentBar.volume,
          bars: bars.slice(Math.max(0, i - 100), i + 1),
          symbol,
        });

        if (signal.recommendation === "BUY" && signal.confidence > 0.6) {
          const trade = this.executor.simulateEntry(currentBar, currentBar.close, 2, symbol, strategy.getName());
          if (trade) {
            this.activeTrade = trade;
          }
        }
      }
    }

    // Close any remaining open trade at last bar
    if (this.activeTrade && bars.length > 0) {
      const lastBar = bars[bars.length - 1];
      const pnl = this.executor.calculatePnL(this.activeTrade, lastBar.close);
      this.activeTrade.exitDate = lastBar.timestamp;
      this.activeTrade.exitPrice = lastBar.close;
      this.activeTrade.exitReason = "Expiration";
      this.activeTrade.pnl = pnl.pnl;
      this.activeTrade.pnlPercent = pnl.pnlPercent;
      this.trades.push(this.activeTrade);
    }

    const stats = calculateStats(this.trades);

    return {
      trades: this.trades,
      stats,
    };
  }

  private updateTradeDrawdown(trade: Trade, bar: Bar): void {
    this.executor.updateMaxDrawdown(trade, bar);
  }

  getTrades(): Trade[] {
    return this.trades;
  }
}
