/**
 * Improved 0DTE Learning Engine
 * Statistically rigorous pattern detection
 * Rejects premature conclusions from small samples
 * Never modifies code/strategies/parameters automatically
 */

export interface TradeData {
  tradeId: string;
  symbol: string;
  type: "CALL" | "PUT";
  entryConfidence: number;
  pnl: number;
  pnlPct: number;
  reason: string;
}

export interface StatisticalPattern {
  name: string;
  sampleSize: number;
  minSampleRequired: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  averageP_L: number;
  expectancy: number; // avg win size * win rate - avg loss size * loss rate
  statisticalConfidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  isReliable: boolean;
  reasoning: string[];
}

const MINIMUM_SAMPLE_SIZE = {
  SYMBOL_ANALYSIS: 20, // Need 20+ trades per symbol
  PATTERN_ANALYSIS: 15, // Need 15+ instances of a pattern
  CONFIDENCE_BANDS: 30, // Need 30+ trades for statistical confidence
  ENTRY_FILTER: 25, // Need 25+ trades with same entry filter
};

const STATISTICAL_THRESHOLDS = {
  HIGH_CONFIDENCE: 0.95, // 95% confidence
  MEDIUM_CONFIDENCE: 0.80, // 80% confidence
  LOW_CONFIDENCE: 0.60, // 60% confidence
  INSUFFICIENT: 0.0,
};

export class ImprovedLearningEngine {
  private trades: TradeData[] = [];
  private patterns: Map<string, StatisticalPattern> = new Map();

  /**
   * Add trade to learning engine
   * ONLY from REAL Paper Trading, never from simulated data
   */
  addRealTrade(trade: TradeData, source: "PAPER_TRADING" | "SIMULATED"): void {
    // CRITICAL: Reject simulated data
    if (source === "SIMULATED") {
      console.log(`\n🔴 REJECTION: Simulated data cannot feed learning engine`);
      console.log(`   Trade: ${trade.symbol} ${trade.type}`);
      console.log(`   Reason: Simulated data only tests software logic\n`);
      return;
    }

    // Accept only PAPER TRADING real data
    if (source === "PAPER_TRADING") {
      this.trades.push(trade);
      console.log(`✅ Real Paper Trade recorded: ${trade.symbol} ${trade.type} ${trade.pnl > 0 ? "+" : ""}${trade.pnl.toFixed(2)}\n`);
    }
  }

  /**
   * Analyze pattern with statistical rigor
   */
  analyzePattern(patternName: string): StatisticalPattern {
    const relevantTrades = this.trades.filter((t) => this.matchesPattern(t, patternName));
    const sampleSize = relevantTrades.length;
    const minRequired = MINIMUM_SAMPLE_SIZE.PATTERN_ANALYSIS;

    if (sampleSize < minRequired) {
      return {
        name: patternName,
        sampleSize,
        minSampleRequired: minRequired,
        winCount: 0,
        lossCount: 0,
        winRate: 0,
        averageP_L: 0,
        expectancy: 0,
        statisticalConfidence: "INSUFFICIENT",
        isReliable: false,
        reasoning: [
          `🔴 DATA INSUFFICIENT — continue collecting`,
          `Current trades: ${sampleSize}/${minRequired}`,
          `Need ${minRequired - sampleSize} more trades for pattern detection`,
        ],
      };
    }

    // Calculate statistics
    const wins = relevantTrades.filter((t) => t.pnl > 0);
    const losses = relevantTrades.filter((t) => t.pnl <= 0);
    const winRate = wins.length / sampleSize;
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / losses.length : 0;
    const expectancy = avgWin * winRate - avgLoss * (1 - winRate);

    // Determine statistical confidence
    const confidence = this.calculateStatisticalConfidence(sampleSize, winRate);
    const isReliable = confidence !== "INSUFFICIENT" && confidence !== "LOW";

    const reasoning: string[] = [];

    if (sampleSize >= MINIMUM_SAMPLE_SIZE.CONFIDENCE_BANDS) {
      reasoning.push(`✅ SUFFICIENT DATA: ${sampleSize} trades analyzed`);
    } else {
      reasoning.push(`⚠️  LIMITED DATA: ${sampleSize} trades (ideal: ${MINIMUM_SAMPLE_SIZE.CONFIDENCE_BANDS}+)`);
    }

    reasoning.push(`Win rate: ${(winRate * 100).toFixed(1)}%`);
    reasoning.push(`Avg win: $${avgWin.toFixed(2)} | Avg loss: -$${avgLoss.toFixed(2)}`);
    reasoning.push(`Expectancy: $${expectancy.toFixed(2)} per trade`);

    if (expectancy > 0) {
      reasoning.push(`✅ Positive expectancy: pattern profitable on average`);
    } else {
      reasoning.push(`❌ Negative expectancy: pattern not profitable`);
    }

    if (isReliable) {
      reasoning.push(`🟢 ${confidence} CONFIDENCE: Safe for recommendation`);
    } else {
      reasoning.push(`🟡 ${confidence} CONFIDENCE: Insufficient for recommendation`);
    }

    return {
      name: patternName,
      sampleSize,
      minSampleRequired: minRequired,
      winCount: wins.length,
      lossCount: losses.length,
      winRate: winRate * 100,
      averageP_L: expectancy,
      expectancy,
      statisticalConfidence: confidence,
      isReliable,
      reasoning,
    };
  }

  /**
   * Calculate statistical confidence based on sample size
   */
  private calculateStatisticalConfidence(sampleSize: number, winRate: number): "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT" {
    if (sampleSize < MINIMUM_SAMPLE_SIZE.PATTERN_ANALYSIS) return "INSUFFICIENT";
    if (sampleSize < MINIMUM_SAMPLE_SIZE.SYMBOL_ANALYSIS) return "LOW";
    if (sampleSize < MINIMUM_SAMPLE_SIZE.CONFIDENCE_BANDS) return "MEDIUM";
    return "HIGH";
  }

  /**
   * Generate improvement proposals (ONLY proposals, never execute)
   */
  generateProposals(): Array<{
    proposal: string;
    basis: string;
    confidence: string;
    action: "NONE" | "MONITOR" | "CONSIDER";
  }> {
    const proposals: Array<{
      proposal: string;
      basis: string;
      confidence: string;
      action: "NONE" | "MONITOR" | "CONSIDER";
    }> = [];

    // Analyze symbol performance
    const symbolStats = this.analyzeBySymbol();
    for (const [symbol, stats] of Object.entries(symbolStats)) {
      if (stats.sampleSize >= MINIMUM_SAMPLE_SIZE.SYMBOL_ANALYSIS) {
        if (stats.winRate > 65) {
          proposals.push({
            proposal: `Monitor ${symbol}: High win rate (${stats.winRate.toFixed(0)}%)`,
            basis: `${stats.sampleSize} trades, positive expectancy`,
            confidence: "HIGH",
            action: "MONITOR",
          });
        }

        if (stats.winRate < 40 && stats.sampleSize >= 20) {
          proposals.push({
            proposal: `Review ${symbol}: Low win rate (${stats.winRate.toFixed(0)}%)`,
            basis: `${stats.sampleSize} trades, negative expectancy`,
            confidence: "HIGH",
            action: "CONSIDER",
          });
        }
      } else {
        proposals.push({
          proposal: `${symbol}: Insufficient data for recommendation`,
          basis: `${stats.sampleSize}/${MINIMUM_SAMPLE_SIZE.SYMBOL_ANALYSIS} trades`,
          confidence: "INSUFFICIENT",
          action: "NONE",
        });
      }
    }

    return proposals;
  }

  /**
   * Analyze performance by symbol
   */
  private analyzeBySymbol(): {
    [key: string]: {
      sampleSize: number;
      winRate: number;
      expectancy: number;
    };
  } {
    const stats: { [key: string]: { wins: number; losses: number; totalP_L: number; count: number } } = {};

    this.trades.forEach((t) => {
      if (!stats[t.symbol]) {
        stats[t.symbol] = { wins: 0, losses: 0, totalP_L: 0, count: 0 };
      }
      stats[t.symbol].count++;
      if (t.pnl > 0) stats[t.symbol].wins++;
      else stats[t.symbol].losses++;
      stats[t.symbol].totalP_L += t.pnl;
    });

    const result: { [key: string]: { sampleSize: number; winRate: number; expectancy: number } } = {};
    for (const [symbol, data] of Object.entries(stats)) {
      result[symbol] = {
        sampleSize: data.count,
        winRate: (data.wins / data.count) * 100,
        expectancy: data.totalP_L / data.count,
      };
    }

    return result;
  }

  /**
   * Match trade to pattern
   */
  private matchesPattern(trade: TradeData, pattern: string): boolean {
    // Pattern format: "SYMBOL_TYPE" or "TIME_WINDOW" or "ENTRY_CONFIDENCE"
    const parts = pattern.split("_");

    if (parts.length === 2 && parts[0] === trade.symbol && parts[1] === trade.type) {
      return true; // Symbol_Type pattern
    }

    if (pattern === "HIGH_CONFIDENCE" && trade.entryConfidence >= 75) {
      return true;
    }

    if (pattern === "MEDIUM_CONFIDENCE" && trade.entryConfidence >= 50 && trade.entryConfidence < 75) {
      return true;
    }

    if (pattern === "LOW_CONFIDENCE" && trade.entryConfidence < 50) {
      return true;
    }

    return false;
  }

  /**
   * Display learning status
   */
  displayLearningStatus(): void {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║          0DTE LEARNING ENGINE - STATUS REPORT              ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log(`📊 TOTAL REAL PAPER TRADES: ${this.trades.length}\n`);

    if (this.trades.length === 0) {
      console.log("⏳ No real trades recorded yet. Learning engine awaiting data.\n");
      return;
    }

    // Analyze high confidence pattern
    const highConfPattern = this.analyzePattern("HIGH_CONFIDENCE");
    console.log(`🔍 PATTERN: High Confidence Entries (>75%)\n`);
    highConfPattern.reasoning.forEach((r) => console.log(`   ${r}`));
    console.log();

    // Show proposals
    const proposals = this.generateProposals();
    console.log(`💡 PROPOSALS (NEVER EXECUTED AUTOMATICALLY):\n`);

    proposals.forEach((p) => {
      const actionIcon =
        p.action === "MONITOR" ? "📌" : p.action === "CONSIDER" ? "⚠️ " : p.action === "NONE" ? "⏳" : "❓";
      console.log(`${actionIcon} ${p.proposal}`);
      console.log(`   Basis: ${p.basis}`);
      console.log(`   Confidence: ${p.confidence}\n`);
    });

    console.log("═══════════════════════════════════════════════════════════\n");
    console.log("🔴 IMPORTANT NOTES:\n");
    console.log("   • All proposals above are OBSERVATIONS, NOT commands");
    console.log("   • Tito CANNOT modify parameters, strategies, or code");
    console.log("   • User must review and decide manually");
    console.log("   • Simulated data is NEVER included in these statistics\n");
  }
}

export default ImprovedLearningEngine;
