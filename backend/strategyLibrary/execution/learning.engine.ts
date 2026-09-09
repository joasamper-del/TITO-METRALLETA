/**
 * Tito Learning Engine
 * Post-trade analysis and improvement proposals
 *
 * IMPORTANT: This engine LEARNS from trades but NEVER modifies code/rules automatically.
 * All improvement proposals require human approval before implementation.
 */

import * as fs from "fs";
import * as path from "path";

export interface TradeAnalysis {
  tradeId: string;
  ticker: string;
  entryConfidence: number;
  result: "WIN" | "LOSS";
  pnl: number;
  pnlPercent: number;
  duration: number; // minutes
  exitReason: string;
  whatWentWell: string;
  whatWentWrong: string;
  whatCouldBeBetter: string;
  improvementProposal: string; // Never auto-implemented
  timestamp: string;
}

export interface LearningInsight {
  insight: string;
  evidence: string;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  recommendation: string; // For human review
  requiresApproval: boolean;
  proposedChange?: string; // What COULD change (not what WILL change)
}

export class LearningEngine {
  private trades: TradeAnalysis[] = [];
  private insights: LearningInsight[] = [];
  private learningHistoryFile: string;
  private insightsFile: string;

  constructor() {
    const logsDir = path.resolve(__dirname, "../../logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.learningHistoryFile = path.join(logsDir, `learning-history_${timestamp}.json`);
    this.insightsFile = path.join(logsDir, `improvement-proposals_${timestamp}.json`);

    // Initialize files
    fs.writeFileSync(this.learningHistoryFile, JSON.stringify({ trades: [] }, null, 2));
    fs.writeFileSync(this.insightsFile, JSON.stringify({ insights: [], lastReview: new Date().toISOString() }, null, 2));
  }

  analyzeCompletedTrade(analysis: TradeAnalysis): void {
    this.trades.push(analysis);
    this.saveTrade(analysis);

    console.log(`\n📊 AUTO-ANALYZING: ${analysis.ticker}`);
    console.log(`   Result: ${analysis.result} (${analysis.pnlPercent.toFixed(2)}%)`);
    console.log(`   Confidence: ${analysis.entryConfidence}% | Duration: ${analysis.duration}min`);
    console.log(`   Well: ${analysis.whatWentWell}`);
    console.log(`   Wrong: ${analysis.whatWentWrong}`);
    console.log(`   Better: ${analysis.whatCouldBeBetter}`);
  }

  analyzePatterns(): LearningInsight[] {
    if (this.trades.length < 3) {
      return [];
    }

    const insights: LearningInsight[] = [];

    const confidenceAnalysis = this.analyzeConfidenceVsResult();
    if (confidenceAnalysis) insights.push(confidenceAnalysis);

    const exitAnalysis = this.analyzeExitReasons();
    if (exitAnalysis) insights.push(exitAnalysis);

    const symbolAnalysis = this.analyzeSymbolPerformance();
    insights.push(...symbolAnalysis);

    const durationAnalysis = this.analyzeDurationImpact();
    if (durationAnalysis) insights.push(durationAnalysis);

    this.insights.push(...insights);
    this.saveInsights();

    return insights;
  }

  private analyzeConfidenceVsResult(): LearningInsight | null {
    const highConfTrades = this.trades.filter((t) => t.entryConfidence >= 75);
    const lowConfTrades = this.trades.filter((t) => t.entryConfidence < 50);

    if (highConfTrades.length === 0 || lowConfTrades.length === 0) return null;

    const highConfWinRate = (highConfTrades.filter((t) => t.result === "WIN").length / highConfTrades.length) * 100;
    const lowConfWinRate = (lowConfTrades.filter((t) => t.result === "WIN").length / lowConfTrades.length) * 100;

    const difference = highConfWinRate - lowConfWinRate;

    if (Math.abs(difference) < 10) {
      return {
        insight: "Confidence may not predict success - needs review",
        evidence: `High conf (75%+): ${highConfWinRate.toFixed(0)}% | Low conf (<50%): ${lowConfWinRate.toFixed(0)}%`,
        confidenceLevel: "MEDIUM",
        recommendation: "Confidence formula may need calibration",
        requiresApproval: true,
        proposedChange: "Adjust confidence calculation",
      };
    } else if (difference > 0) {
      return {
        insight: "Confidence metric is working well",
        evidence: `High: ${highConfWinRate.toFixed(0)}% vs Low: ${lowConfWinRate.toFixed(0)}%`,
        confidenceLevel: "HIGH",
        recommendation: "Continue using current confidence",
        requiresApproval: false,
      };
    }

    return null;
  }

  private analyzeExitReasons(): LearningInsight | null {
    const exitReasons = new Map<string, { count: number; wins: number; avgPnL: number }>();

    this.trades.forEach((t) => {
      const stats = exitReasons.get(t.exitReason) || { count: 0, wins: 0, avgPnL: 0 };
      stats.count++;
      if (t.result === "WIN") stats.wins++;
      stats.avgPnL = (stats.avgPnL * (stats.count - 1) + t.pnl) / stats.count;
      exitReasons.set(t.exitReason, stats);
    });

    let bestExit: { reason: string; stats: any } | null = null;
    let bestWinRate = 0;

    for (const [reason, stats] of exitReasons) {
      const winRate = (stats.wins / stats.count) * 100;
      if (winRate > bestWinRate) {
        bestWinRate = winRate;
        bestExit = { reason, stats };
      }
    }

    if (bestExit && bestWinRate > 50) {
      return {
        insight: `"${bestExit.reason}" exit is most profitable`,
        evidence: `${bestExit.stats.wins}/${bestExit.stats.count} wins | Avg: $${bestExit.stats.avgPnL.toFixed(2)}`,
        confidenceLevel: "HIGH",
        recommendation: "This exit type works well",
        requiresApproval: false,
      };
    }

    return null;
  }

  private analyzeSymbolPerformance(): LearningInsight[] {
    const symbolStats = new Map<string, { wins: number; total: number; avgPnL: number }>();

    this.trades.forEach((t) => {
      const stats = symbolStats.get(t.ticker) || { wins: 0, total: 0, avgPnL: 0 };
      stats.total++;
      if (t.result === "WIN") stats.wins++;
      stats.avgPnL = (stats.avgPnL * (stats.total - 1) + t.pnl) / stats.total;
      symbolStats.set(t.ticker, stats);
    });

    const insights: LearningInsight[] = [];

    for (const [symbol, stats] of symbolStats) {
      if (stats.total >= 2) {
        const winRate = (stats.wins / stats.total) * 100;
        insights.push({
          insight: `${symbol} summary`,
          evidence: `${stats.wins}/${stats.total} wins (${winRate.toFixed(0)}%) | Avg P&L: $${stats.avgPnL.toFixed(2)}`,
          confidenceLevel: stats.total >= 5 ? "HIGH" : "MEDIUM",
          recommendation: `Monitor ${symbol} for patterns`,
          requiresApproval: false,
        });
      }
    }

    return insights;
  }

  private analyzeDurationImpact(): LearningInsight | null {
    const shortTrades = this.trades.filter((t) => t.duration < 60);
    const longTrades = this.trades.filter((t) => t.duration >= 60);

    if (shortTrades.length === 0 || longTrades.length === 0) return null;

    const shortWinRate = (shortTrades.filter((t) => t.result === "WIN").length / shortTrades.length) * 100;
    const longWinRate = (longTrades.filter((t) => t.result === "WIN").length / longTrades.length) * 100;

    if (Math.abs(shortWinRate - longWinRate) > 15) {
      return {
        insight: "Trade duration affects success",
        evidence: `Short (<1h): ${shortWinRate.toFixed(0)}% | Long (≥1h): ${longWinRate.toFixed(0)}%`,
        confidenceLevel: "MEDIUM",
        recommendation: "Consider duration-based adjustments",
        requiresApproval: true,
        proposedChange: "Tune strategy for optimal trade duration",
      };
    }

    return null;
  }

  private saveTrade(analysis: TradeAnalysis): void {
    try {
      const data = JSON.parse(fs.readFileSync(this.learningHistoryFile, "utf8"));
      data.trades.push(analysis);
      fs.writeFileSync(this.learningHistoryFile, JSON.stringify(data, null, 2));
    } catch (err) {
      // Silent fail
    }
  }

  private saveInsights(): void {
    try {
      const data = {
        insights: this.insights,
        lastAnalyzed: new Date().toISOString(),
        totalTrades: this.trades.length,
      };
      fs.writeFileSync(this.insightsFile, JSON.stringify(data, null, 2));
    } catch (err) {
      // Silent fail
    }
  }

  generateProposals(): string {
    const pendingApprovals = this.insights.filter((i) => i.requiresApproval);

    if (pendingApprovals.length === 0) {
      return "✅ No improvement proposals pending";
    }

    let text = "🤖 IMPROVEMENT PROPOSALS (REQUIRE HUMAN APPROVAL):\n\n";

    pendingApprovals.forEach((insight, idx) => {
      text += `[${idx + 1}] ${insight.insight}\n`;
      text += `    Evidence: ${insight.evidence}\n`;
      text += `    Recommendation: ${insight.recommendation}\n`;
      if (insight.proposedChange) {
        text += `    Could change: ${insight.proposedChange}\n`;
      }
      text += `\n`;
    });

    text += "⚠️  STATUS: Proposals only - no code changes made";

    return text;
  }

  getHistoryFile(): string {
    return this.learningHistoryFile;
  }

  getInsightsFile(): string {
    return this.insightsFile;
  }
}
