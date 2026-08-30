/**
 * Performance Analyzer
 * Learns from trade history to identify patterns and optimize Tito's decisions
 * Answers: "What confidence levels win most?" "Which confirmation combos are best?"
 */

import { PostTradeReport, PostTradeReportGenerator } from "./postTradeReportGenerator";
import { DecisionLogEntry } from "../confirmation/decisionHistory";

export interface PerformanceStats {
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  avgPnL: number;
  avgPnLPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
}

export interface ConfidencePerformance {
  confidenceRange: string; // "80-90", "90-100"
  trades: number;
  wins: number;
  winRate: number;
  avgPnL: number;
  avgPnLPercent: number;
}

export interface SourceCombinationPerformance {
  combination: string; // "VIX + Trend + Volatility"
  trades: number;
  wins: number;
  winRate: number;
  avgPnL: number;
  falsePositives: number;
  reliability: number; // 0-100
}

export interface RegimePerformance {
  regime: string;
  trades: number;
  wins: number;
  winRate: number;
  avgPnL: number;
  avgPnLPercent: number;
}

export interface SourceReliability {
  sourceName: string;
  totalVotes: number;
  confirmVotes: number;
  confirmAccuracy: number; // % of CONFIRM votes that won
  neutralAccuracy: number;
  contradictAccuracy: number;
  overallScore: number; // 0-100
}

export class PerformanceAnalyzer {
  private reports: PostTradeReport[] = [];

  constructor(reports?: PostTradeReport[]) {
    if (reports) {
      this.reports = reports;
    }
  }

  /**
   * Add reports to analysis
   */
  addReports(reports: PostTradeReport[]): void {
    this.reports.push(...reports);
  }

  /**
   * Add from decision history entries
   */
  addFromHistoryEntries(entries: DecisionLogEntry[]): void {
    const reports = entries.map((e) => PostTradeReportGenerator.generateReport(e));
    this.addReports(reports);
  }

  // ========== OVERALL PERFORMANCE ==========

  /**
   * Get overall performance statistics
   */
  getOverallStats(): PerformanceStats {
    if (this.reports.length === 0) {
      return {
        totalTrades: 0,
        winTrades: 0,
        lossTrades: 0,
        winRate: 0,
        avgPnL: 0,
        avgPnLPercent: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        profitFactor: 1,
      };
    }

    const wins = this.reports.filter((r) => r.pnlDollars > 0).length;
    const losses = this.reports.filter((r) => r.pnlDollars < 0).length;
    const totalPnL = this.reports.reduce((sum, r) => sum + r.pnlDollars, 0);
    const avgPnL = totalPnL / this.reports.length;
    const avgPnLPercent = this.reports.reduce((sum, r) => sum + r.pnlPercent, 0) / this.reports.length;

    // Sharpe Ratio (simplified: std dev of returns)
    const returns = this.reports.map((r) => r.pnlPercent);
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgPnLPercent, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? avgPnLPercent / stdDev : 0;

    // Max Drawdown
    let maxDrawdown = 0;
    let cumPnL = 0;
    let peak = 0;
    for (const report of this.reports) {
      cumPnL += report.pnlDollars;
      if (cumPnL > peak) peak = cumPnL;
      maxDrawdown = Math.min(maxDrawdown, cumPnL - peak);
    }

    // Profit Factor
    const grossProfit = this.reports.filter((r) => r.pnlDollars > 0).reduce((sum, r) => sum + r.pnlDollars, 0);
    const grossLoss = Math.abs(
      this.reports.filter((r) => r.pnlDollars < 0).reduce((sum, r) => sum + r.pnlDollars, 0)
    );
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 1;

    return {
      totalTrades: this.reports.length,
      winTrades: wins,
      lossTrades: losses,
      winRate: (wins / this.reports.length) * 100,
      avgPnL,
      avgPnLPercent,
      sharpeRatio,
      maxDrawdown,
      profitFactor,
    };
  }

  // ========== CONFIDENCE-BASED ANALYSIS ==========

  /**
   * Get performance by confidence level
   */
  getPerformanceByConfidenceLevel(): ConfidencePerformance[] {
    const ranges = [
      { min: 90, max: 100, label: "90-100" },
      { min: 80, max: 89, label: "80-89" },
      { min: 70, max: 79, label: "70-79" },
      { min: 60, max: 69, label: "60-69" },
      { min: 0, max: 59, label: "0-59" },
    ];

    return ranges.map((range) => {
      const filtered = this.reports.filter((r) => r.confidenceScore >= range.min && r.confidenceScore <= range.max);

      if (filtered.length === 0) {
        return {
          confidenceRange: range.label,
          trades: 0,
          wins: 0,
          winRate: 0,
          avgPnL: 0,
          avgPnLPercent: 0,
        };
      }

      const wins = filtered.filter((r) => r.pnlDollars > 0).length;
      const totalPnL = filtered.reduce((sum, r) => sum + r.pnlDollars, 0);
      const avgPnLPercent = filtered.reduce((sum, r) => sum + r.pnlPercent, 0) / filtered.length;

      return {
        confidenceRange: range.label,
        trades: filtered.length,
        wins,
        winRate: (wins / filtered.length) * 100,
        avgPnL: totalPnL / filtered.length,
        avgPnLPercent,
      };
    });
  }

  // ========== SOURCE-BASED ANALYSIS ==========

  /**
   * Get best confirmation combinations
   */
  getBestConfirmationCombinations(): SourceCombinationPerformance[] {
    const combinations = new Map<string, PostTradeReport[]>();

    for (const report of this.reports) {
      const confirmingSources = report.confirmationSources
        .filter((s) => s.verdict === "CONFIRM")
        .map((s) => s.sourceName)
        .sort()
        .join(" + ");

      if (confirmingSources) {
        if (!combinations.has(confirmingSources)) {
          combinations.set(confirmingSources, []);
        }
        combinations.get(confirmingSources)!.push(report);
      }
    }

    const results: SourceCombinationPerformance[] = [];

    for (const [combo, reports] of combinations) {
      if (reports.length < 1) continue; // Include single trades

      const wins = reports.filter((r) => r.pnlDollars > 0).length;
      const losses = reports.filter((r) => r.pnlDollars < 0).length;
      const totalPnL = reports.reduce((sum, r) => sum + r.pnlDollars, 0);

      results.push({
        combination: combo,
        trades: reports.length,
        wins,
        winRate: (wins / reports.length) * 100,
        avgPnL: totalPnL / reports.length,
        falsePositives: losses,
        reliability: (wins / reports.length) * 100,
      });
    }

    // Sort by win rate desc
    return results.sort((a, b) => b.winRate - a.winRate);
  }

  /**
   * Get individual source reliability
   */
  getSourceReliability(): SourceReliability[] {
    const sourceStats = new Map<
      string,
      { confirm: number; confirmWins: number; neutral: number; neutralWins: number; contradict: number; contradictWins: number }
    >();

    for (const report of this.reports) {
      for (const source of report.confirmationSources) {
        if (!sourceStats.has(source.sourceName)) {
          sourceStats.set(source.sourceName, {
            confirm: 0,
            confirmWins: 0,
            neutral: 0,
            neutralWins: 0,
            contradict: 0,
            contradictWins: 0,
          });
        }

        const stats = sourceStats.get(source.sourceName)!;
        const isWin = report.pnlDollars > 0;

        if (source.verdict === "CONFIRM") {
          stats.confirm++;
          if (isWin) stats.confirmWins++;
        } else if (source.verdict === "NEUTRAL") {
          stats.neutral++;
          if (isWin) stats.neutralWins++;
        } else {
          stats.contradict++;
          if (isWin) stats.contradictWins++;
        }
      }
    }

    const results: SourceReliability[] = [];

    for (const [name, stats] of sourceStats) {
      const confirmAccuracy = stats.confirm > 0 ? (stats.confirmWins / stats.confirm) * 100 : 0;
      const neutralAccuracy = stats.neutral > 0 ? (stats.neutralWins / stats.neutral) * 100 : 0;
      const contradictAccuracy = stats.contradict > 0 ? (stats.contradictWins / stats.contradict) * 100 : 0;

      // Weight: CONFIRM is most important (weight 2x), NEUTRAL (1x), CONTRADICT (0.5x)
      const overallScore =
        (confirmAccuracy * stats.confirm * 2 + neutralAccuracy * stats.neutral + contradictAccuracy * stats.contradict * 0.5) /
        (stats.confirm * 2 + stats.neutral + stats.contradict * 0.5);

      results.push({
        sourceName: name,
        totalVotes: stats.confirm + stats.neutral + stats.contradict,
        confirmVotes: stats.confirm,
        confirmAccuracy,
        neutralAccuracy,
        contradictAccuracy,
        overallScore: Math.round(overallScore),
      });
    }

    return results.sort((a, b) => b.overallScore - a.overallScore);
  }

  // ========== REGIME-BASED ANALYSIS ==========

  /**
   * Get performance by market regime
   */
  getPerformanceByRegime(): RegimePerformance[] {
    const regimes = new Map<string, PostTradeReport[]>();

    for (const report of this.reports) {
      if (!regimes.has(report.regime)) {
        regimes.set(report.regime, []);
      }
      regimes.get(report.regime)!.push(report);
    }

    const results: RegimePerformance[] = [];

    for (const [regime, reports] of regimes) {
      const wins = reports.filter((r) => r.pnlDollars > 0).length;
      const totalPnL = reports.reduce((sum, r) => sum + r.pnlDollars, 0);
      const avgPnLPercent = reports.reduce((sum, r) => sum + r.pnlPercent, 0) / reports.length;

      results.push({
        regime,
        trades: reports.length,
        wins,
        winRate: (wins / reports.length) * 100,
        avgPnL: totalPnL / reports.length,
        avgPnLPercent,
      });
    }

    return results.sort((a, b) => b.winRate - a.winRate);
  }

  // ========== DIAGNOSTIC QUERIES ==========

  /**
   * Find trades that broke the pattern (high confidence, lost)
   */
  getMissedSignals(): PostTradeReport[] {
    return this.reports.filter((r) => r.confidenceScore >= 75 && r.pnlDollars < 0).sort((a, b) => a.pnlDollars - b.pnlDollars);
  }

  /**
   * Find trades with low confidence but won anyway
   */
  getLuckyWins(): PostTradeReport[] {
    return this.reports.filter((r) => r.confidenceScore < 65 && r.pnlDollars > 0).sort((a, b) => b.pnlDollars - a.pnlDollars);
  }

  /**
   * Generate summary report
   */
  generateSummary(): string {
    const overall = this.getOverallStats();
    const byConfidence = this.getPerformanceByConfidenceLevel();
    const bestCombos = this.getBestConfirmationCombinations();
    const sourceReliability = this.getSourceReliability();
    const byRegime = this.getPerformanceByRegime();

    const lines: string[] = [
      `═══════════════════════════════════════════════════════════════`,
      `TITO PERFORMANCE ANALYSIS`,
      `═══════════════════════════════════════════════════════════════`,
      ``,
      `📊 OVERALL STATS`,
      `  Total Trades: ${overall.totalTrades}`,
      `  Wins: ${overall.winTrades} | Losses: ${overall.lossTrades}`,
      `  Win Rate: ${overall.winRate.toFixed(1)}%`,
      `  Avg P&L: $${overall.avgPnL.toFixed(2)} (${overall.avgPnLPercent.toFixed(2)}%)`,
      `  Sharpe Ratio: ${overall.sharpeRatio.toFixed(2)}`,
      `  Profit Factor: ${overall.profitFactor.toFixed(2)}`,
      ``,
      `📈 PERFORMANCE BY CONFIDENCE`,
      ...byConfidence.map(
        (p) => `  ${p.confidenceRange}%: ${p.trades} trades | ${p.winRate.toFixed(1)}% win | $${p.avgPnL.toFixed(2)} avg`
      ),
      ``,
      `🎯 BEST CONFIRMATION COMBOS`,
      ...bestCombos.slice(0, 5).map((c) => `  ${c.combination}: ${c.winRate.toFixed(1)}% (${c.trades} trades)`),
      ``,
      `⭐ SOURCE RELIABILITY (Top 3)`,
      ...sourceReliability.slice(0, 3).map((s) => `  ${s.sourceName}: ${s.overallScore}/100 (CONFIRM: ${s.confirmAccuracy.toFixed(1)}%)`),
      ``,
      `📊 PERFORMANCE BY REGIME`,
      ...byRegime.map((r) => `  ${r.regime}: ${r.winRate.toFixed(1)}% | $${r.avgPnL.toFixed(2)} avg`),
      ``,
      `═══════════════════════════════════════════════════════════════`,
    ];

    return lines.join("\n");
  }
}
