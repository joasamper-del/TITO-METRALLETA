/**
 * Post-Trade Report Generator
 * Generates detailed mini-reports after each trade closes
 * Captures: strategy, entry/exit reasons, result, lessons
 */

import { DecisionLogEntry } from "../confirmation/decisionHistory";

export interface PostTradeReport {
  tradeId: string;
  symbol: string;
  timestamp: Date;
  strategy: string;
  regime: string;
  vix: number;

  // Entry context
  entryReason: string[];
  confirmationSources: SourceSummary[];
  confidenceScore: number;
  confidenceThreshold: number;

  // Execution
  entryPrice: number;
  quantity: number;

  // Exit & Result
  exitPrice: number;
  exitReason: "TP_HIT" | "SL_HIT" | "MANUAL" | "EOD";
  pnlDollars: number;
  pnlPercent: number;
  duration: string; // "25 minutes", "2 hours", etc
  riskRewardRatio: number;

  // Lessons
  lessons: string[];
  nextTrade: string;

  // Quality metrics
  riskGatesAllPassed: boolean;
  supervisorGatesAllPassed: boolean;
}

export interface SourceSummary {
  sourceName: string;
  verdict: "CONFIRM" | "NEUTRAL" | "CONTRADICT";
  score: number;
  dataQuality: string;
  impact: "strong" | "moderate" | "weak";
}

export class PostTradeReportGenerator {
  /**
   * Generate formatted report from decision history entry
   */
  static generateReport(entry: DecisionLogEntry, executedTrade?: any): PostTradeReport {
    const entryPrice = executedTrade?.entryPrice || entry.executedTrade?.entryPrice || 0;
    const quantity = executedTrade?.positionSize || entry.executedTrade?.positionSize || 0;
    const exitPrice = executedTrade?.exitPrice || 0;
    const pnlDollars = (exitPrice - entryPrice) * quantity;
    const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
    const riskRewardRatio = Math.abs(exitPrice - entryPrice) / Math.abs(entryPrice - (executedTrade?.stopLoss || 0));

    const confirmingSources = entry.sourceBreakdown?.filter((s) => s.verdict === "CONFIRM") || [];
    const sources: SourceSummary[] = entry.sourceBreakdown?.map((s) => ({
      sourceName: s.sourceName,
      verdict: s.verdict,
      score: s.vote,
      dataQuality: s.dataQuality,
      impact: s.vote > 80 ? "strong" : s.vote > 60 ? "moderate" : "weak",
    })) || [];

    const duration = this.formatDuration(entry.timestamp, executedTrade?.exitTime || new Date());

    return {
      tradeId: `${entry.symbol}_${entry.timestamp.getTime()}`,
      symbol: entry.symbol,
      timestamp: entry.timestamp,
      strategy: entry.selectedStrategy || "UNKNOWN",
      regime: entry.regime,
      vix: entry.vix,

      entryReason: entry.reasoning || [],
      confirmationSources: sources,
      confidenceScore: entry.confidenceScore || 0,
      confidenceThreshold: entry.confidenceThreshold || 65,

      entryPrice,
      quantity,

      exitPrice,
      exitReason: executedTrade?.exitReason || "MANUAL",
      pnlDollars,
      pnlPercent,
      duration,
      riskRewardRatio: isFinite(riskRewardRatio) ? riskRewardRatio : 0,

      lessons: entry.lessonsLearned || [],
      nextTrade: this.generateNextTradeAdvice(pnlDollars, entry.regime, confirmingSources.length),

      riskGatesAllPassed: entry.riskGatesPassed ?? true,
      supervisorGatesAllPassed: entry.outcome === "OPERATE",
    };
  }

  /**
   * Format as human-readable report
   */
  static formatAsText(report: PostTradeReport): string {
    const symbol = report.symbol.padEnd(6);
    const strategyName = report.strategy.padEnd(20);
    const pnlSign = report.pnlDollars >= 0 ? "+" : "";
    const pnlColor = report.pnlDollars >= 0 ? "✅" : "❌";

    const lines: string[] = [
      `═══════════════════════════════════════════════════════════════`,
      `${pnlColor} TRADE REPORT #${report.tradeId.split("_")[1].slice(-4)}`,
      `═══════════════════════════════════════════════════════════════`,
      ``,
      `📊 OVERVIEW`,
      `  Symbol: ${symbol} | Strategy: ${strategyName} | Duration: ${report.duration}`,
      `  Regime: ${report.regime.padEnd(16)} | VIX: ${report.vix.toFixed(1)}`,
      ``,
      `💡 ENTRY CONTEXT`,
      `  Confidence: ${report.confidenceScore}/${report.confidenceThreshold} (${this.confidenceLevel(report.confidenceScore)})`,
      `  Sources:`,
      ...report.confirmationSources.map(
        (s) => `    • ${s.sourceName.padEnd(18)} ${s.verdict.padEnd(10)} (${s.score}/100, ${s.impact})`
      ),
      ``,
      `💰 EXECUTION`,
      `  Entry:  $${report.entryPrice.toFixed(2)} | Qty: ${report.quantity} shares = $${(report.entryPrice * report.quantity).toFixed(2)}`,
      `  Exit:   $${report.exitPrice.toFixed(2)} (${report.exitReason})`,
      ``,
      `📈 RESULT`,
      `  P&L: ${pnlSign}$${Math.abs(report.pnlDollars).toFixed(2)} (${pnlSign}${report.pnlPercent.toFixed(2)}%)`,
      `  R:R: ${report.riskRewardRatio.toFixed(2)}:1`,
      ``,
    ];

    if (report.lessons.length > 0) {
      lines.push(`📚 LESSONS LEARNED`);
      report.lessons.forEach((lesson) => {
        lines.push(`  • ${lesson}`);
      });
      lines.push(``);
    }

    lines.push(`💬 NEXT TRADE`);
    lines.push(`  ${report.nextTrade}`);
    lines.push(``, `═══════════════════════════════════════════════════════════════`);

    return lines.join("\n");
  }

  /**
   * Format as JSON for logging/analysis
   */
  static formatAsJSON(report: PostTradeReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export multiple reports as CSV
   */
  static exportAsCSV(reports: PostTradeReport[]): string {
    const headers = [
      "TradeID",
      "Symbol",
      "Timestamp",
      "Strategy",
      "Regime",
      "VIX",
      "EntryPrice",
      "ExitPrice",
      "Quantity",
      "PnLDollars",
      "PnLPercent",
      "RiskRewardRatio",
      "Duration",
      "ExitReason",
      "Confidence",
      "ConfidenceThreshold",
      "SourceCount",
      "ConfirmingCount",
    ];

    const rows = reports.map((r) => [
      r.tradeId,
      r.symbol,
      r.timestamp.toISOString(),
      r.strategy,
      r.regime,
      r.vix.toFixed(2),
      r.entryPrice.toFixed(2),
      r.exitPrice.toFixed(2),
      r.quantity,
      r.pnlDollars.toFixed(2),
      r.pnlPercent.toFixed(2),
      r.riskRewardRatio.toFixed(2),
      r.duration,
      r.exitReason,
      r.confidenceScore,
      r.confidenceThreshold,
      r.confirmationSources.length,
      r.confirmationSources.filter((s) => s.verdict === "CONFIRM").length,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    return csv;
  }

  // Private helpers

  private static formatDuration(start: Date, end: Date): string {
    const ms = end.getTime() - start.getTime();
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  }

  private static confidenceLevel(score: number): string {
    if (score >= 90) return "VERY_HIGH";
    if (score >= 75) return "HIGH";
    if (score >= 65) return "MEDIUM";
    if (score >= 50) return "LOW";
    return "VERY_LOW";
  }

  private static generateNextTradeAdvice(pnl: number, regime: string, confirmingSourceCount: number): string {
    if (pnl > 0) {
      if (confirmingSourceCount >= 4) {
        return "✅ Excellent execution. Multiple sources aligned. Continue this pattern.";
      }
      return "✅ Good win. But only a few sources confirmed. Be more selective next time.";
    }

    // Loss scenarios
    if (regime === "LATERAL") {
      return "📊 Loss in lateral regime (expected). Good discipline to exit quickly. Skip next LATERAL signals.";
    }
    if (confirmingSourceCount <= 2) {
      return "⚠️  Loss with low confirmation count. Raise confidence threshold to 75+ for next trade.";
    }
    return "📝 Documented loss in strong regime. Analyze which source failed. Update scoring weights.";
  }
}
