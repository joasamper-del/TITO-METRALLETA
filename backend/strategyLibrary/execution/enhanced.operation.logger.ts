/**
 * Enhanced Operation Logger
 * Captures complete trade context: entry reason, exit reason, confidence, decision analysis
 */

import * as fs from "fs";
import * as path from "path";

export interface TradeEntry {
  id: string;
  timestamp: string;
  ticker: string;
  instrumentType: "EQUITY" | "CRYPTO" | "OPTION";
  optionType?: "CALL" | "PUT";

  // Entry Details
  entryPrice: number;
  entryQuantity: number;
  entryTime: string;
  entryReason: string; // WHY did Tito enter?
  entryConfidence: number; // 0-100%

  // Exit Details
  exitPrice?: number;
  exitTime?: string;
  exitReason?: string; // WHY did Tito exit?
  exitType?: "SL" | "TP" | "MANUAL"; // How did it exit?

  // Risk Management
  stopLoss: number;
  takeProfit: number;
  riskPercentage: number;

  // Results
  pnl?: number;
  pnlPercentage?: number;

  // Post-Trade Analysis
  analysis?: {
    whatWentWell: string;
    whatWentWrong: string;
    whatCouldBeBetter: string;
    ruleAdjustment: string;
  };
}

export class EnhancedOperationLogger {
  private logFile: string;
  private trades: TradeEntry[] = [];
  private sessionId: string;

  constructor(sessionName: string = "tito-paper-trading") {
    this.sessionId = this.generateSessionId();

    const logDir = path.resolve(__dirname, "../../logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.logFile = path.join(logDir, `${sessionName}_${timestamp}.json`);

    // Initialize log file with session metadata
    const initialData = {
      sessionId: this.sessionId,
      startTime: new Date().toISOString(),
      mode: "PAPER_TRADING_ONLY",
      trades: [],
    };

    fs.writeFileSync(this.logFile, JSON.stringify(initialData, null, 2));
  }

  recordEntry(ticker: string, instrumentType: "EQUITY" | "CRYPTO" | "OPTION", options: {
    entryPrice: number;
    quantity: number;
    entryReason: string;
    confidence: number;
    stopLoss: number;
    takeProfit: number;
    riskPercentage: number;
    optionType?: "CALL" | "PUT";
  }): string {
    const tradeId = this.generateTradeId();

    const trade: TradeEntry = {
      id: tradeId,
      timestamp: new Date().toISOString(),
      ticker,
      instrumentType,
      optionType: options.optionType,
      entryPrice: options.entryPrice,
      entryQuantity: options.quantity,
      entryTime: new Date().toLocaleTimeString(),
      entryReason: options.entryReason,
      entryConfidence: options.confidence,
      stopLoss: options.stopLoss,
      takeProfit: options.takeProfit,
      riskPercentage: options.riskPercentage,
    };

    this.trades.push(trade);
    this.writeTrade(trade);

    const confIcon = options.confidence >= 75 ? "🟢" : options.confidence >= 50 ? "🟡" : "🔴";
    console.log(`\n📍 ENTRY: ${ticker} ${instrumentType}`);
    console.log(`   Price: $${options.entryPrice.toFixed(2)} | Qty: ${options.quantity}`);
    console.log(`   SL: $${options.stopLoss.toFixed(2)} | TP: $${options.takeProfit.toFixed(2)}`);
    console.log(`   Reason: ${options.entryReason}`);
    console.log(`   ${confIcon} Confidence: ${options.confidence}%`);

    return tradeId;
  }

  recordExit(tradeId: string, exitPrice: number, exitReason: string, exitType: "SL" | "TP" | "MANUAL") {
    const trade = this.trades.find((t) => t.id === tradeId);
    if (!trade) return;

    trade.exitPrice = exitPrice;
    trade.exitTime = new Date().toLocaleTimeString();
    trade.exitReason = exitReason;
    trade.exitType = exitType;

    // Calculate P&L
    trade.pnl = (exitPrice - trade.entryPrice) * trade.entryQuantity;
    trade.pnlPercentage = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;

    this.writeTrade(trade);

    const pnlIcon = (trade.pnl || 0) >= 0 ? "✅" : "❌";
    const pnlSign = (trade.pnl || 0) >= 0 ? "+" : "";
    console.log(`\n${exitType === "SL" ? "🛑" : "🎯"} EXIT: ${trade.ticker}`);
    console.log(`   ${exitType}: $${exitPrice.toFixed(2)}`);
    console.log(`   Reason: ${exitReason}`);
    console.log(`   ${pnlIcon} P&L: ${pnlSign}$${(trade.pnl || 0).toFixed(2)} (${pnlSign}${(trade.pnlPercentage || 0).toFixed(2)}%)`);
  }

  logTrade(trade: any) {
    // Generic trade log for automated logging
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${trade.message}`);

    // Write to file if it contains trade details
    if (trade.symbol && trade.type) {
      try {
        const data = JSON.parse(JSON.stringify(JSON.parse(require("fs").readFileSync(this.logFile, "utf8"))));
        if (!data.trades) data.trades = [];
        data.trades.push(trade);
        require("fs").writeFileSync(this.logFile, JSON.stringify(data, null, 2));
      } catch (err) {
        // Silent fail for automated logging
      }
    }
  }

  addAnalysis(tradeId: string, analysis: {
    whatWentWell: string;
    whatWentWrong: string;
    whatCouldBeBetter: string;
    ruleAdjustment: string;
  }) {
    const trade = this.trades.find((t) => t.id === tradeId);
    if (!trade) return;

    trade.analysis = analysis;
    this.writeTrade(trade);

    console.log(`\n📊 ANALYSIS: ${trade.ticker}`);
    console.log(`   ✅ Well: ${analysis.whatWentWell}`);
    console.log(`   ❌ Wrong: ${analysis.whatWentWrong}`);
    console.log(`   🔄 Better: ${analysis.whatCouldBeBetter}`);
    console.log(`   ⚙️  Adjust: ${analysis.ruleAdjustment}`);
  }

  private generateSessionId(): string {
    return "SESSION_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  }

  private generateTradeId(): string {
    return "TRADE_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  }

  private writeTrade(trade: TradeEntry) {
    try {
      const data = JSON.parse(fs.readFileSync(this.logFile, "utf8"));
      const existingIndex = data.trades.findIndex((t: TradeEntry) => t.id === trade.id);

      if (existingIndex >= 0) {
        data.trades[existingIndex] = trade;
      } else {
        data.trades.push(trade);
      }

      fs.writeFileSync(this.logFile, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Error writing to log file:", err);
    }
  }

  getLogFile(): string {
    return this.logFile;
  }

  generateSummaryReport(): {
    totalTrades: number;
    completedTrades: number;
    activeTrades: number;
    winners: number;
    losers: number;
    winRate: number;
    totalPnL: number;
    avgWin: number;
    avgLoss: number;
    slTradeCount: number;
    tpTradeCount: number;
  } {
    const completedTrades = this.trades.filter((t) => t.pnl !== undefined);
    const winners = completedTrades.filter((t) => (t.pnl || 0) > 0);
    const losers = completedTrades.filter((t) => (t.pnl || 0) <= 0);

    const totalPnL = completedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgWin = winners.length > 0 ? winners.reduce((sum, t) => sum + (t.pnl || 0), 0) / winners.length : 0;
    const avgLoss = losers.length > 0 ? losers.reduce((sum, t) => sum + (t.pnl || 0), 0) / losers.length : 0;

    const slTrades = completedTrades.filter((t) => t.exitType === "SL");
    const tpTrades = completedTrades.filter((t) => t.exitType === "TP");

    return {
      totalTrades: this.trades.length,
      completedTrades: completedTrades.length,
      activeTrades: this.trades.length - completedTrades.length,
      winners: winners.length,
      losers: losers.length,
      winRate: completedTrades.length > 0 ? (winners.length / completedTrades.length) * 100 : 0,
      totalPnL,
      avgWin,
      avgLoss,
      slTradeCount: slTrades.length,
      tpTradeCount: tpTrades.length,
    };
  }
}
