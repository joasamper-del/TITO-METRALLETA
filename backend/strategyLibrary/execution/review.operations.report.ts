/**
 * Review Operations Report
 * Generates a summary of all trades, P&L, and behavior analysis
 */

import * as fs from "fs";
import * as path from "path";

interface Trade {
  timestamp: string;
  type: string;
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
}

function generateReport() {
  const logsDir = path.resolve(__dirname, "../../logs");

  if (!fs.existsSync(logsDir)) {
    console.log("No logs directory found - Tito hasn't run yet");
    return;
  }

  const logFiles = fs.readdirSync(logsDir).filter((f) => f.endsWith(".log.json"));

  if (logFiles.length === 0) {
    console.log("No operation logs found");
    return;
  }

  // Read the most recent log file
  const latestLog = logFiles.sort().pop()!;
  const logPath = path.join(logsDir, latestLog);
  const logData = JSON.parse(fs.readFileSync(logPath, "utf8"));
  const trades: Trade[] = logData.trades;

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║          TITO PAPER TRADING - OPERATIONS REPORT            ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log(`📋 Log File: ${latestLog}`);
  console.log(`📅 Start Time: ${logData.startTime}`);
  console.log(`📊 Total Events: ${trades.length}\n`);

  // Analyze trades
  const entries = trades.filter((t) => t.type === "ENTRY");
  const exits = trades.filter((t) => t.type === "SL_TRIGGERED" || t.type === "TP_TRIGGERED");
  const slTriggers = trades.filter((t) => t.type === "SL_TRIGGERED");
  const tpTriggers = trades.filter((t) => t.type === "TP_TRIGGERED");
  const errors = trades.filter((t) => t.type === "ERROR");
  const reconnects = trades.filter((t) => t.type === "RECONNECT");

  console.log("━".repeat(60));
  console.log("ACTIVITY SUMMARY");
  console.log("━".repeat(60));
  console.log(`   Entries:           ${entries.length}`);
  console.log(`   Exits:             ${exits.length}`);
  console.log(`   SL Triggered:      ${slTriggers.length}`);
  console.log(`   TP Triggered:      ${tpTriggers.length}`);
  console.log(`   Errors:            ${errors.length}`);
  console.log(`   Reconnections:     ${reconnects.length}\n`);

  // P&L Analysis
  const exitTrades = exits.filter((t) => t.profitLoss !== undefined);
  if (exitTrades.length > 0) {
    const totalPnL = exitTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const winners = exitTrades.filter((t) => (t.profitLoss || 0) > 0).length;
    const losers = exitTrades.filter((t) => (t.profitLoss || 0) <= 0).length;
    const winRate = (winners / exitTrades.length) * 100;

    console.log("━".repeat(60));
    console.log("PROFITABILITY ANALYSIS");
    console.log("━".repeat(60));
    console.log(`   Total P&L:         $${totalPnL.toFixed(2)}`);
    console.log(`   Win Rate:          ${winRate.toFixed(1)}% (${winners}/${exitTrades.length})`);

    if (winners > 0) {
      const avgWin = exitTrades
        .filter((t) => (t.profitLoss || 0) > 0)
        .reduce((sum, t) => sum + (t.profitLoss || 0), 0);
      console.log(`   Average Win:       $${(avgWin / winners).toFixed(2)}`);
      console.log(`   Biggest Win:       $${Math.max(...exitTrades.filter((t) => (t.profitLoss || 0) > 0).map((t) => t.profitLoss || 0)).toFixed(2)}`);
    }

    if (losers > 0) {
      const avgLoss = exitTrades
        .filter((t) => (t.profitLoss || 0) <= 0)
        .reduce((sum, t) => sum + (t.profitLoss || 0), 0);
      console.log(`   Average Loss:      $${(avgLoss / losers).toFixed(2)}`);
      console.log(`   Biggest Loss:      $${Math.min(...exitTrades.filter((t) => (t.profitLoss || 0) <= 0).map((t) => t.profitLoss || 0)).toFixed(2)}`);
    }

    console.log("");
  }

  // Symbol Analysis
  console.log("━".repeat(60));
  console.log("SYMBOL ANALYSIS");
  console.log("━".repeat(60));

  const symbolExits = new Map<string, { count: number; pnl: number; wins: number }>();

  exitTrades.forEach((trade) => {
    if (trade.symbol) {
      const existing = symbolExits.get(trade.symbol) || { count: 0, pnl: 0, wins: 0 };
      existing.count++;
      existing.pnl += trade.profitLoss || 0;
      if ((trade.profitLoss || 0) > 0) existing.wins++;
      symbolExits.set(trade.symbol, existing);
    }
  });

  if (symbolExits.size > 0) {
    for (const [symbol, stats] of symbolExits) {
      const winRate = (stats.wins / stats.count) * 100;
      const icon = stats.pnl >= 0 ? "📈" : "📉";
      console.log(`   ${icon} ${symbol}: ${stats.count} trades | P&L: $${stats.pnl.toFixed(2)} | Win Rate: ${winRate.toFixed(0)}%`);
    }
    console.log("");
  }

  // SL/TP Compliance
  console.log("━".repeat(60));
  console.log("SL/TP COMPLIANCE");
  console.log("━".repeat(60));
  console.log(`   SL Executed:       ${slTriggers.length} trades`);
  console.log(`   TP Executed:       ${tpTriggers.length} trades`);

  if (slTriggers.length > 0) {
    const slPercentLoss = slTriggers
      .filter((t) => t.profitLossPercent !== undefined)
      .map((t) => t.profitLossPercent || 0)
      .reduce((a, b) => a + b, 0) / slTriggers.length;
    console.log(`   Avg SL Loss:       ${slPercentLoss.toFixed(2)}%`);
  }

  if (tpTriggers.length > 0) {
    const tpPercentGain = tpTriggers
      .filter((t) => t.profitLossPercent !== undefined)
      .map((t) => t.profitLossPercent || 0)
      .reduce((a, b) => a + b, 0) / tpTriggers.length;
    console.log(`   Avg TP Gain:       ${tpPercentGain.toFixed(2)}%`);
  }

  console.log("");

  // Behavior Analysis
  if (errors.length > 0) {
    console.log("━".repeat(60));
    console.log("ERRORS & ISSUES");
    console.log("━".repeat(60));
    errors.slice(-5).forEach((err) => {
      console.log(`   ❌ ${err.message}`);
    });
    if (errors.length > 5) {
      console.log(`   ... and ${errors.length - 5} more errors`);
    }
    console.log("");
  }

  if (reconnects.length > 0) {
    console.log("━".repeat(60));
    console.log("CONNECTION EVENTS");
    console.log("━".repeat(60));
    console.log(`   Reconnections: ${reconnects.length}`);
    console.log("");
  }

  // Trade Details
  if (exitTrades.length > 0) {
    console.log("━".repeat(60));
    console.log("RECENT TRADES (LATEST 10)");
    console.log("━".repeat(60));

    exitTrades.slice(-10).forEach((trade) => {
      const pnlSign = (trade.profitLoss || 0) >= 0 ? "+" : "";
      const icon = (trade.profitLoss || 0) >= 0 ? "✅" : "❌";
      console.log(
        `   ${icon} ${trade.timestamp.substring(11, 19)} | ${trade.symbol} | P&L: ${pnlSign}$${(trade.profitLoss || 0).toFixed(2)}`
      );
    });
    console.log("");
  }

  console.log("━".repeat(60));
  console.log("✅ REPORT COMPLETE");
  console.log("━".repeat(60));
  console.log(`\nFull log: ${logPath}\n`);
}

generateReport();
