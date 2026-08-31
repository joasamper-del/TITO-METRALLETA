/**
 * Operation Logger
 * Records all trades, SL triggers, TP fills, errors, reconnections
 */

import * as fs from "fs";
import * as path from "path";

export interface TradeLog {
  timestamp: string;
  type: "ENTRY" | "SL_TRIGGERED" | "TP_TRIGGERED" | "EXIT" | "ERROR" | "RECONNECT" | "HEALTH_CHECK";
  symbol?: string;
  quantity?: number;
  entryPrice?: number;
  currentPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  message: string;
  orderId?: string;
  errorCode?: string;
}

export class OperationLogger {
  private logFile: string;
  private trades: TradeLog[] = [];

  constructor(sessionName: string = "tito-paper-trading") {
    const logDir = path.resolve(__dirname, "../../logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.logFile = path.join(logDir, `${sessionName}_${timestamp}.log.json`);

    // Initialize log file
    fs.writeFileSync(this.logFile, JSON.stringify({ startTime: new Date().toISOString(), trades: [] }, null, 2));
  }

  logTrade(trade: TradeLog) {
    this.trades.push(trade);
    this.writeTrade(trade);

    // Console output
    const icon = this.getIcon(trade.type);
    console.log(`${icon} [${trade.timestamp}] ${trade.message}`);

    if (trade.profitLoss !== undefined) {
      const pnlSign = trade.profitLoss >= 0 ? "+" : "";
      const pnlIcon = trade.profitLoss >= 0 ? "📈" : "📉";
      console.log(
        `  ${pnlIcon} P&L: ${pnlSign}$${trade.profitLoss.toFixed(2)} (${pnlSign}${trade.profitLossPercent?.toFixed(2)}%)`
      );
    }
  }

  logEntry(symbol: string, quantity: number, entryPrice: number, stopLoss: number, takeProfit: number) {
    this.logTrade({
      timestamp: new Date().toISOString(),
      type: "ENTRY",
      symbol,
      quantity,
      entryPrice,
      stopLoss,
      takeProfit,
      message: `📍 ENTRY: ${symbol} ${quantity} @ $${entryPrice.toFixed(2)} | SL: $${stopLoss.toFixed(2)} | TP: $${takeProfit.toFixed(2)}`,
    });
  }

  logSLTriggered(symbol: string, quantity: number, entryPrice: number, exitPrice: number, orderId: string) {
    const pnl = (exitPrice - entryPrice) * quantity;
    const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;

    this.logTrade({
      timestamp: new Date().toISOString(),
      type: "SL_TRIGGERED",
      symbol,
      quantity,
      entryPrice,
      currentPrice: exitPrice,
      profitLoss: pnl,
      profitLossPercent: pnlPercent,
      message: `🛑 STOP-LOSS: ${symbol} @ $${exitPrice.toFixed(2)} (SL executed)`,
      orderId,
    });
  }

  logTPTriggered(symbol: string, quantity: number, entryPrice: number, exitPrice: number, orderId: string) {
    const pnl = (exitPrice - entryPrice) * quantity;
    const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;

    this.logTrade({
      timestamp: new Date().toISOString(),
      type: "TP_TRIGGERED",
      symbol,
      quantity,
      entryPrice,
      currentPrice: exitPrice,
      profitLoss: pnl,
      profitLossPercent: pnlPercent,
      message: `🎯 TAKE-PROFIT: ${symbol} @ $${exitPrice.toFixed(2)} (TP filled)`,
      orderId,
    });
  }

  logError(message: string, errorCode?: string) {
    this.logTrade({
      timestamp: new Date().toISOString(),
      type: "ERROR",
      message: `❌ ERROR: ${message}`,
      errorCode,
    });
  }

  logReconnection() {
    this.logTrade({
      timestamp: new Date().toISOString(),
      type: "RECONNECT",
      message: `🔄 RECONNECTION: Connection restored after failure`,
    });
  }

  logHealthCheck(status: "ok" | "fail", details?: string) {
    if (status === "fail") {
      this.logTrade({
        timestamp: new Date().toISOString(),
        type: "HEALTH_CHECK",
        message: `⚠️  HEALTH CHECK FAILED: ${details || "Unknown error"}`,
      });
    }
  }

  private getIcon(type: string): string {
    switch (type) {
      case "ENTRY":
        return "📍";
      case "SL_TRIGGERED":
        return "🛑";
      case "TP_TRIGGERED":
        return "🎯";
      case "ERROR":
        return "❌";
      case "RECONNECT":
        return "🔄";
      default:
        return "📊";
    }
  }

  private writeTrade(trade: TradeLog) {
    try {
      const data = JSON.parse(fs.readFileSync(this.logFile, "utf8"));
      data.trades.push(trade);
      fs.writeFileSync(this.logFile, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Error writing to log file:", err);
    }
  }

  getReport(): {
    totalTrades: number;
    winners: number;
    losers: number;
    totalPnL: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
  } {
    const exitTrades = this.trades.filter((t) => t.type === "SL_TRIGGERED" || t.type === "TP_TRIGGERED");
    const pnlTrades = exitTrades.filter((t) => t.profitLoss !== undefined);

    const totalPnL = pnlTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const winners = pnlTrades.filter((t) => (t.profitLoss || 0) > 0).length;
    const losers = pnlTrades.filter((t) => (t.profitLoss || 0) <= 0).length;
    const winRate = pnlTrades.length > 0 ? (winners / pnlTrades.length) * 100 : 0;

    const winTrades = pnlTrades.filter((t) => (t.profitLoss || 0) > 0);
    const lossTrades = pnlTrades.filter((t) => (t.profitLoss || 0) <= 0);

    const averageWin = winTrades.length > 0 ? winTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0) / winTrades.length : 0;
    const averageLoss =
      lossTrades.length > 0 ? lossTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0) / lossTrades.length : 0;

    return {
      totalTrades: pnlTrades.length,
      winners,
      losers,
      totalPnL,
      winRate,
      averageWin,
      averageLoss,
    };
  }

  getLogFile(): string {
    return this.logFile;
  }
}
