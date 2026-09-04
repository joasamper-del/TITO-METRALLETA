/**
 * Detailed Trade Analysis
 * Analyzes what Tito did well, wrong, and what to adjust
 */

import * as fs from "fs";
import * as path from "path";

interface TradeEntry {
  id: string;
  ticker: string;
  instrumentType: string;
  optionType?: string;
  entryPrice: number;
  entryQuantity: number;
  entryReason: string;
  entryConfidence: number;
  exitPrice?: number;
  exitReason?: string;
  exitType?: string;
  stopLoss: number;
  takeProfit: number;
  pnl?: number;
  pnlPercentage?: number;
  analysis?: {
    whatWentWell: string;
    whatWentWrong: string;
    whatCouldBeBetter: string;
    ruleAdjustment: string;
  };
}

function analyzeTrades() {
  const logsDir = path.resolve(__dirname, "../../logs");

  if (!fs.existsSync(logsDir)) {
    console.log("No logs directory found - No trades yet");
    return;
  }

  const logFiles = fs
    .readdirSync(logsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (logFiles.length === 0) {
    console.log("No operation logs found");
    return;
  }

  const latestLog = logFiles[logFiles.length - 1];
  const logPath = path.join(logsDir, latestLog);
  const logData = JSON.parse(fs.readFileSync(logPath, "utf8"));
  const trades: TradeEntry[] = logData.trades || [];

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║       TITO PAPER TRADING - DETAILED TRADE ANALYSIS        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log(`📋 Log: ${latestLog}`);
  console.log(`📊 Total Trades: ${trades.length}`);
  console.log(`✅ Completed: ${trades.filter((t) => t.pnl !== undefined).length}`);
  console.log(`⏳ Active: ${trades.filter((t) => t.pnl === undefined).length}\n`);

  const completedTrades = trades.filter((t) => t.pnl !== undefined);

  if (completedTrades.length === 0) {
    console.log("No completed trades yet - Check back later\n");
    return;
  }

  // Summary Stats
  console.log("━".repeat(60));
  console.log("SUMMARY STATISTICS");
  console.log("━".repeat(60));

  const winners = completedTrades.filter((t) => (t.pnl || 0) > 0);
  const losers = completedTrades.filter((t) => (t.pnl || 0) <= 0);
  const totalPnL = completedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winRate = (winners.length / completedTrades.length) * 100;
  const avgWin = winners.length > 0 ? winners.reduce((sum, t) => sum + (t.pnl || 0), 0) / winners.length : 0;
  const avgLoss = losers.length > 0 ? losers.reduce((sum, t) => sum + (t.pnl || 0), 0) / losers.length : 0;

  console.log(`   Total P&L:       $${totalPnL.toFixed(2)}`);
  console.log(`   Win Rate:        ${winRate.toFixed(1)}% (${winners.length}/${completedTrades.length})`);
  console.log(`   Avg Win:         $${avgWin.toFixed(2)}`);
  console.log(`   Avg Loss:        $${avgLoss.toFixed(2)}`);

  const slTrades = completedTrades.filter((t) => t.exitType === "SL");
  const tpTrades = completedTrades.filter((t) => t.exitType === "TP");

  console.log(`   SL Exits:        ${slTrades.length}`);
  console.log(`   TP Exits:        ${tpTrades.length}\n`);

  // Confidence Analysis
  console.log("━".repeat(60));
  console.log("CONFIDENCE ANALYSIS");
  console.log("━".repeat(60));

  const highConfidence = completedTrades.filter((t) => t.entryConfidence >= 75);
  const mediumConfidence = completedTrades.filter((t) => t.entryConfidence >= 50 && t.entryConfidence < 75);
  const lowConfidence = completedTrades.filter((t) => t.entryConfidence < 50);

  if (highConfidence.length > 0) {
    const hcWinRate = (highConfidence.filter((t) => (t.pnl || 0) > 0).length / highConfidence.length) * 100;
    const hcPnL = highConfidence.reduce((sum, t) => sum + (t.pnl || 0), 0);
    console.log(`   🟢 High (75%+): ${highConfidence.length} trades | Win: ${hcWinRate.toFixed(0)}% | P&L: $${hcPnL.toFixed(2)}`);
  }

  if (mediumConfidence.length > 0) {
    const mcWinRate = (mediumConfidence.filter((t) => (t.pnl || 0) > 0).length / mediumConfidence.length) * 100;
    const mcPnL = mediumConfidence.reduce((sum, t) => sum + (t.pnl || 0), 0);
    console.log(`   🟡 Medium (50-74%): ${mediumConfidence.length} trades | Win: ${mcWinRate.toFixed(0)}% | P&L: $${mcPnL.toFixed(2)}`);
  }

  if (lowConfidence.length > 0) {
    const lcWinRate = (lowConfidence.filter((t) => (t.pnl || 0) > 0).length / lowConfidence.length) * 100;
    const lcPnL = lowConfidence.reduce((sum, t) => sum + (t.pnl || 0), 0);
    console.log(`   🔴 Low (<50%): ${lowConfidence.length} trades | Win: ${lcWinRate.toFixed(0)}% | P&L: $${lcPnL.toFixed(2)}`);
  }
  console.log("");

  // Symbol Analysis
  console.log("━".repeat(60));
  console.log("SYMBOL PERFORMANCE");
  console.log("━".repeat(60));

  const symbolStats = new Map<
    string,
    {
      count: number;
      wins: number;
      pnl: number;
      avgConfidence: number;
    }
  >();

  completedTrades.forEach((t) => {
    const stats = symbolStats.get(t.ticker) || { count: 0, wins: 0, pnl: 0, avgConfidence: 0 };
    stats.count++;
    if ((t.pnl || 0) > 0) stats.wins++;
    stats.pnl += t.pnl || 0;
    stats.avgConfidence = (stats.avgConfidence * (stats.count - 1) + t.entryConfidence) / stats.count;
    symbolStats.set(t.ticker, stats);
  });

  for (const [symbol, stats] of symbolStats) {
    const winRate = (stats.wins / stats.count) * 100;
    const icon = stats.pnl >= 0 ? "📈" : "📉";
    console.log(`   ${icon} ${symbol}: ${stats.count} trades | Win: ${winRate.toFixed(0)}% | P&L: $${stats.pnl.toFixed(2)} | Conf: ${stats.avgConfidence.toFixed(0)}%`);
  }
  console.log("");

  // Individual Trade Review
  console.log("━".repeat(60));
  console.log("TRADE-BY-TRADE REVIEW");
  console.log("━".repeat(60));

  completedTrades.forEach((trade, idx) => {
    const pnlIcon = (trade.pnl || 0) >= 0 ? "✅" : "❌";
    const confIcon = trade.entryConfidence >= 75 ? "🟢" : trade.entryConfidence >= 50 ? "🟡" : "🔴";

    console.log(`\n[${idx + 1}] ${trade.ticker} ${trade.instrumentType}${trade.optionType ? ` ${trade.optionType}` : ""}`);
    console.log(`    Entry @ $${trade.entryPrice.toFixed(2)} | Exit @ $${trade.exitPrice?.toFixed(2)} [${trade.exitType}]`);
    console.log(`    ${pnlIcon} P&L: $${(trade.pnl || 0).toFixed(2)} (${(trade.pnlPercentage || 0).toFixed(2)}%)`);
    console.log(`    ${confIcon} Confidence: ${trade.entryConfidence}% | Reason: ${trade.entryReason}`);

    if (trade.analysis) {
      console.log(`    ✅ Well: ${trade.analysis.whatWentWell}`);
      console.log(`    ❌ Wrong: ${trade.analysis.whatWentWrong}`);
      console.log(`    🔄 Better: ${trade.analysis.whatCouldBeBetter}`);
      console.log(`    ⚙️  Adjust: ${trade.analysis.ruleAdjustment}`);
    }
  });

  console.log("\n" + "━".repeat(60));
  console.log("KEY INSIGHTS");
  console.log("━".repeat(60));

  // Best and Worst Trades
  const bestTrade = completedTrades.reduce((best, t) => ((t.pnl || 0) > (best.pnl || 0) ? t : best));
  const worstTrade = completedTrades.reduce((worst, t) => ((t.pnl || 0) < (worst.pnl || 0) ? t : worst));

  console.log(`\n   🏆 Best Trade: ${bestTrade.ticker} +$${(bestTrade.pnl || 0).toFixed(2)}`);
  console.log(`       Reason: ${bestTrade.entryReason}`);

  console.log(`\n   💥 Worst Trade: ${worstTrade.ticker} -$${Math.abs(worstTrade.pnl || 0).toFixed(2)}`);
  console.log(`       Reason: ${worstTrade.entryReason}`);
  console.log(`       Why exit: ${worstTrade.exitReason}`);

  // Confidence correlation
  console.log(`\n   📊 High Confidence Win Rate: ${highConfidence.length > 0 ? ((highConfidence.filter((t) => (t.pnl || 0) > 0).length / highConfidence.length) * 100).toFixed(0) : "N/A"}%`);
  console.log(`   📊 Low Confidence Win Rate: ${lowConfidence.length > 0 ? ((lowConfidence.filter((t) => (t.pnl || 0) > 0).length / lowConfidence.length) * 100).toFixed(0) : "N/A"}%`);

  console.log("\n" + "━".repeat(60));
  console.log("✅ ANALYSIS COMPLETE");
  console.log("━".repeat(60));
  console.log(`\nFull log: ${logPath}\n`);
}

analyzeTrades();
