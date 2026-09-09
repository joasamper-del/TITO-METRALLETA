/**
 * Decision History Logger
 * Complete audit trail of every decision made by Tito
 * Stores: strategy, score, source breakdown, reasoning, final verdict
 * Enables post-trade analysis and continuous improvement
 */

import { ConfirmationContext, SourceVerdictRaw, AggregatedConfidence } from "./types";

export type DecisionOutcome = "OPERATE" | "DO_NOT_OPERATE";
export type DecisionReason = "ALL_GATES_PASSED" | "GATE_FAILED" | "REGIME_UNKNOWN" | "NO_STRATEGY" | "CONFIDENCE_LOW" | "MACRO_VETO" | "USER_OVERRIDE";

export interface SourceDecision {
  sourceId: string;
  sourceName: string;
  verdict: "CONFIRM" | "NEUTRAL" | "CONTRADICT";
  vote: number; // 0-100
  dataQuality: "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "FAILED";
  dataQualityScore: number;
  weight: number;
  adjustedWeight: number; // weight × (quality/100)
  reasoning: string;
  dataPoints: string[];
}

export interface DecisionLogEntry {
  // Identifiers
  id: string; // Unique ID (UUID or timestamp-based)
  timestamp: Date;
  sessionId?: string; // For grouping related decisions

  // Market context
  symbol: string;
  regime: string; // BULLISH_STRONG, etc.
  vix: number;
  price: number;

  // Strategy selection
  selectedStrategy?: string; // From StrategySelector
  strategyBlocked?: boolean; // Was strategy blocked?
  blockReason?: string; // Why blocked

  // Risk gates (Strategy Selector)
  riskGatesPassed: boolean;
  riskGateFailures?: string[]; // Which gates failed and why

  // Confidence score (Confirmation Engine)
  confidenceScore: number; // 0-100
  confidenceThreshold: number; // e.g., 65
  confidenceMet: boolean;
  sourceBreakdown: SourceDecision[]; // All 5 sources
  consensusPercentage: number; // % of sources agreeing
  strongestSignal: string; // Source with highest confidence
  weakestSignal: string; // Source with lowest confidence

  // Final decision
  outcome: DecisionOutcome; // OPERATE or DO_NOT_OPERATE
  primaryReason: DecisionReason; // Why this outcome
  reasoning: string[]; // Full reasoning chain

  // Trade execution (if OPERATE)
  executedTrade?: {
    orderId: string;
    positionSize: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    executedAt: Date;
  };

  // Trade result (if trade closed)
  tradeResult?: {
    exitPrice: number;
    pnlDollars: number;
    pnlPercent: number;
    exitReason: "TP_HIT" | "SL_HIT" | "MANUAL" | "EXPIRED";
    closedAt: Date;
    durationSeconds: number;
  };

  // Lessons learned
  lessonsLearned?: string[]; // Post-trade analysis insights
  feedbackForNextTime?: string; // What to adjust

  // Metadata
  notes?: string;
  severity?: "INFO" | "WARNING" | "ERROR"; // Log level
}

export class DecisionHistoryLogger {
  private history: DecisionLogEntry[] = [];
  private maxHistorySize: number = 10000; // Keep last 10k decisions in memory
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || `session_${Date.now()}`;
  }

  /**
   * Log a complete decision with all context
   */
  logDecision(entry: Omit<DecisionLogEntry, "id" | "timestamp">) {
    const fullEntry: DecisionLogEntry = {
      ...entry,
      id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      sessionId: this.sessionId,
    };

    this.history.push(fullEntry);

    // Maintain max size (FIFO)
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    return fullEntry.id;
  }

  /**
   * Get a specific decision by ID
   */
  getDecision(id: string): DecisionLogEntry | undefined {
    return this.history.find((d) => d.id === id);
  }

  /**
   * Get all decisions for a symbol
   */
  getDecisionsForSymbol(symbol: string): DecisionLogEntry[] {
    return this.history.filter((d) => d.symbol === symbol);
  }

  /**
   * Get all OPERATE decisions that resulted in trades
   */
  getExecutedTrades(): DecisionLogEntry[] {
    return this.history.filter((d) => d.outcome === "OPERATE" && d.executedTrade);
  }

  /**
   * Get all DO_NOT_OPERATE decisions and their reasons
   */
  getBlockedDecisions(): DecisionLogEntry[] {
    return this.history.filter((d) => d.outcome === "DO_NOT_OPERATE");
  }

  /**
   * Analyze decision quality: accuracy, consistency, error patterns
   */
  getAnalytics() {
    const executed = this.getExecutedTrades();
    const blocked = this.getBlockedDecisions();

    const winningTrades = executed.filter((d) => d.tradeResult && d.tradeResult.pnlDollars > 0);
    const losingTrades = executed.filter((d) => d.tradeResult && d.tradeResult.pnlDollars < 0);

    const totalPnL = executed.reduce((sum, d) => sum + (d.tradeResult?.pnlDollars || 0), 0);
    const avgWinSize = winningTrades.length > 0
      ? winningTrades.reduce((sum, d) => sum + (d.tradeResult?.pnlDollars || 0), 0) / winningTrades.length
      : 0;
    const avgLossSize = losingTrades.length > 0
      ? losingTrades.reduce((sum, d) => sum + (d.tradeResult?.pnlDollars || 0), 0) / losingTrades.length
      : 0;

    // Confidence accuracy: did high-confidence predictions win more?
    const highConfidenceWins = executed
      .filter((d) => d.confidenceScore >= 75 && d.tradeResult && d.tradeResult.pnlDollars > 0)
      .length;
    const highConfidenceTotal = executed.filter((d) => d.confidenceScore >= 75).length;
    const highConfidenceAccuracy = highConfidenceTotal > 0 ? (highConfidenceWins / highConfidenceTotal) * 100 : 0;

    return {
      totalDecisions: this.history.length,
      executedTrades: executed.length,
      blockedDecisions: blocked.length,
      operatePercentage: (executed.length / this.history.length) * 100,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: executed.length > 0 ? (winningTrades.length / executed.length) * 100 : 0,
      totalPnL,
      avgWinSize,
      avgLossSize,
      winLossRatio: avgWinSize > 0 ? Math.abs(avgWinSize / avgLossSize) : 0,
      highConfidenceAccuracy,
      averageConfidenceScore:
        executed.length > 0
          ? executed.reduce((sum, d) => sum + d.confidenceScore, 0) / executed.length
          : 0,
      mostCommonBlockReason: this.getMostCommon(
        blocked.map((d) => d.primaryReason)
      ),
      strongestSource: this.getMostCommon(
        executed.map((d) => d.strongestSignal).filter((s) => s)
      ),
      weakestSource: this.getMostCommon(
        executed.map((d) => d.weakestSignal).filter((s) => s)
      ),
    };
  }

  /**
   * Generate a human-readable summary of recent decisions
   */
  generateSummary(limit: number = 10): string {
    const recent = this.history.slice(-limit);
    const lines: string[] = [
      `═══════════════════════════════════════════════════════`,
      `DECISION HISTORY SUMMARY (last ${limit} decisions)`,
      `═══════════════════════════════════════════════════════`,
      ``,
    ];

    recent.forEach((decision) => {
      lines.push(`${decision.timestamp.toISOString()} | ${decision.symbol}`);
      lines.push(`  Strategy: ${decision.selectedStrategy || "NONE"}`);
      lines.push(`  Outcome: ${decision.outcome}`);
      lines.push(`  Confidence: ${decision.confidenceScore}/100 (threshold: ${decision.confidenceThreshold})`);
      lines.push(`  Reason: ${decision.primaryReason}`);

      if (decision.sourceBreakdown.length > 0) {
        const votes = decision.sourceBreakdown.map((s) => `${s.sourceName}:${s.verdict[0]}`).join(" ");
        lines.push(`  Sources: ${votes}`);
      }

      if (decision.tradeResult) {
        const pnl = decision.tradeResult.pnlDollars >= 0 ? `+${decision.tradeResult.pnlDollars}` : `${decision.tradeResult.pnlDollars}`;
        lines.push(`  Result: ${pnl} (${decision.tradeResult.pnlPercent.toFixed(2)}%)`);
      }

      lines.push(``);
    });

    return lines.join("\n");
  }

  /**
   * Export history as JSON for external analysis
   */
  exportJSON(): string {
    return JSON.stringify(
      {
        sessionId: this.sessionId,
        exportedAt: new Date(),
        totalDecisions: this.history.length,
        decisions: this.history,
      },
      null,
      2
    );
  }

  /**
   * Export history as CSV for spreadsheet analysis
   */
  exportCSV(): string {
    const headers = [
      "timestamp",
      "symbol",
      "regime",
      "vix",
      "strategy",
      "outcome",
      "confidence_score",
      "risk_gates_passed",
      "primary_reason",
      "pnl_dollars",
      "pnl_percent",
    ];

    const rows = this.history.map((d) => [
      d.timestamp.toISOString(),
      d.symbol,
      d.regime,
      d.vix.toFixed(2),
      d.selectedStrategy || "NONE",
      d.outcome,
      d.confidenceScore.toString(),
      d.riskGatesPassed.toString(),
      d.primaryReason,
      d.tradeResult?.pnlDollars.toFixed(2) || "N/A",
      d.tradeResult?.pnlPercent.toFixed(4) || "N/A",
    ]);

    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  }

  // Helper: get most common element
  private getMostCommon(items: string[]): string {
    if (items.length === 0) return "N/A";
    const counts = items.reduce(
      (acc, item) => {
        acc[item] = (acc[item] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Clear history (dangerous - use for testing only)
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get raw history for inspection
   */
  getFullHistory(): DecisionLogEntry[] {
    return [...this.history];
  }
}
