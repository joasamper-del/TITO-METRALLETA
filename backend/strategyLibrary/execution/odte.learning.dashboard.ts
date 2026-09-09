/**
 * 0DTE Learning Dashboard
 * Visual bitácora: trades, P&L, what worked/didn't, repeated patterns, improvements
 */

export interface DashboardTrade {
  tradeId: string;
  symbol: string;
  type: "CALL" | "PUT";
  entryTime: Date;
  exitTime?: Date;
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  pnlPct?: number;
  exitReason?: string;
  entryConfidence: number;
  analysis?: {
    whatWentWell: string[];
    whatWentWrong: string[];
    improvements: string[];
  };
}

export interface LearningMetrics {
  totalTrades: number;
  completedTrades: number;
  activeTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  totalP_L: number;
  profitFactor: number; // avgWin / avgLoss
  bestTrade: DashboardTrade | null;
  worstTrade: DashboardTrade | null;
  patterns: {
    name: string;
    occurrences: number;
    winRate: number;
    avgP_L: number;
  }[];
  improvements: string[];
}

export class OdteLearningDashboard {
  private trades: DashboardTrade[] = [];
  private patternDetector = new PatternDetector();

  /**
   * Add trade to dashboard
   */
  addTrade(trade: DashboardTrade): void {
    this.trades.push(trade);

    if (trade.pnl !== undefined) {
      console.log(
        `\n📊 Trade logged: ${trade.symbol} ${trade.type} ${trade.pnl > 0 ? "✅" : "❌"} ${trade.pnl > 0 ? "+" : ""}${trade.pnl.toFixed(2)} (${trade.pnlPct?.toFixed(1)}%)`
      );
    }
  }

  /**
   * Calculate learning metrics
   */
  calculateMetrics(): LearningMetrics {
    const completed = this.trades.filter((t) => t.pnl !== undefined);
    const active = this.trades.length - completed.length;

    const wins = completed.filter((t) => (t.pnl || 0) > 0);
    const losses = completed.filter((t) => (t.pnl || 0) <= 0);

    const totalWins = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLosses = losses.reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0);

    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;

    const totalP_L = completed.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Detect patterns
    const patterns = this.patternDetector.detectPatterns(completed);

    // Generate improvements
    const improvements = this.generateImprovements(completed, patterns);

    return {
      totalTrades: this.trades.length,
      completedTrades: completed.length,
      activeTrades: active,
      winCount: wins.length,
      lossCount: losses.length,
      winRate: completed.length > 0 ? (wins.length / completed.length) * 100 : 0,
      avgWin,
      avgLoss,
      totalP_L,
      profitFactor,
      bestTrade: completed.length > 0 ? completed.sort((a, b) => (b.pnl || 0) - (a.pnl || 0))[0] : null,
      worstTrade: completed.length > 0 ? completed.sort((a, b) => (a.pnl || 0) - (b.pnl || 0))[0] : null,
      patterns,
      improvements,
    };
  }

  /**
   * Generate improvement suggestions
   */
  private generateImprovements(trades: DashboardTrade[], patterns: LearningMetrics["patterns"]): string[] {
    const improvements: string[] = [];

    // Analyze high-win-rate patterns
    const goodPatterns = patterns.filter((p) => p.winRate > 60);
    if (goodPatterns.length > 0) {
      improvements.push(`Repeatable pattern found: ${goodPatterns[0].name} (${goodPatterns[0].winRate.toFixed(0)}% win rate)`);
    }

    // Low confidence analysis
    const lowConfidenceTrades = trades.filter((t) => t.entryConfidence < 50);
    if (lowConfidenceTrades.length > trades.length * 0.3) {
      improvements.push("Many low-confidence entries. Tighten entry filters or wait for higher confidence.");
    }

    // Exit reason analysis
    const slTrades = trades.filter((t) => t.exitReason?.includes("SL"));
    const tpTrades = trades.filter((t) => t.exitReason?.includes("TP"));
    if (slTrades.length > tpTrades.length * 2) {
      improvements.push("SL hit too often. Consider wider SL (15%) or better entry timing.");
    }

    // Time of day patterns
    const morningTrades = trades.filter((t) => t.entryTime.getHours() < 12);
    const afternoonTrades = trades.filter((t) => t.entryTime.getHours() >= 12);
    if (morningTrades.length > 3) {
      const morningWinRate = morningTrades.filter((t) => (t.pnl || 0) > 0).length / morningTrades.length;
      if (morningWinRate > 0.6) {
        improvements.push("Morning trades have higher win rate. Focus on 9:30-12:00 ET window.");
      }
    }

    // Symbol performance
    const symbolStats: { [key: string]: { wins: number; total: number } } = {};
    trades.forEach((t) => {
      if (!symbolStats[t.symbol]) symbolStats[t.symbol] = { wins: 0, total: 0 };
      symbolStats[t.symbol].total++;
      if ((t.pnl || 0) > 0) symbolStats[t.symbol].wins++;
    });

    const bestSymbol = Object.entries(symbolStats).sort(([, a], [, b]) => b.wins / b.total - a.wins / a.total)[0];
    if (bestSymbol && bestSymbol[1].total > 2) {
      const winRate = (bestSymbol[1].wins / bestSymbol[1].total) * 100;
      improvements.push(`${bestSymbol[0]} performs best (${winRate.toFixed(0)}% win rate). Increase allocation.`);
    }

    return improvements.slice(0, 5); // Top 5 improvements
  }

  /**
   * Display learning dashboard
   */
  displayDashboard(): void {
    const metrics = this.calculateMetrics();

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║          0DTE LEARNING DASHBOARD - BITÁCORA                ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    // Summary stats
    console.log("📊 SUMMARY STATISTICS\n");
    console.log(`   Total trades: ${metrics.totalTrades} (${metrics.completedTrades} completed, ${metrics.activeTrades} active)`);
    console.log(`   Win rate: ${metrics.winRate.toFixed(1)}% (${metrics.winCount}W / ${metrics.lossCount}L)`);
    console.log(`   Total P&L: ${metrics.totalP_L > 0 ? "+" : ""}$${metrics.totalP_L.toFixed(2)}`);
    console.log(`   Avg win: $${metrics.avgWin.toFixed(2)} | Avg loss: -$${metrics.avgLoss.toFixed(2)}`);
    console.log(`   Profit factor: ${metrics.profitFactor.toFixed(2)}x\n`);

    // Best and worst trades
    if (metrics.bestTrade) {
      console.log(`✅ BEST TRADE:`);
      console.log(`   ${metrics.bestTrade.symbol} ${metrics.bestTrade.type} +$${(metrics.bestTrade.pnl || 0).toFixed(2)}`);
      console.log(`   Reason: ${metrics.bestTrade.exitReason}\n`);
    }

    if (metrics.worstTrade) {
      console.log(`❌ WORST TRADE:`);
      console.log(`   ${metrics.worstTrade.symbol} ${metrics.worstTrade.type} -$${Math.abs(metrics.worstTrade.pnl || 0).toFixed(2)}`);
      console.log(`   Reason: ${metrics.worstTrade.exitReason}\n`);
    }

    // Recent trades
    console.log(`📋 RECENT TRADES (Last 10)\n`);
    const recent = this.trades.slice(-10);
    recent.forEach((t, idx) => {
      const status = t.pnl ? (t.pnl > 0 ? "✅" : "❌") : "⏳";
      const pnlStr = t.pnl ? `${t.pnl > 0 ? "+" : ""}$${t.pnl.toFixed(2)}` : "OPEN";
      console.log(
        `   ${idx + 1}. ${t.symbol} ${t.type} ${status} ${pnlStr} (Confidence: ${t.entryConfidence}%)`
      );
    });
    console.log();

    // Patterns
    if (metrics.patterns.length > 0) {
      console.log(`🔄 DETECTED PATTERNS\n`);
      metrics.patterns.slice(0, 3).forEach((p) => {
        console.log(`   • ${p.name}`);
        console.log(`     Occurrences: ${p.occurrences} | Win rate: ${p.winRate.toFixed(0)}% | Avg P&L: ${p.avgP_L > 0 ? "+" : ""}$${p.avgP_L.toFixed(2)}\n`);
      });
    }

    // Improvements
    if (metrics.improvements.length > 0) {
      console.log(`💡 SUGGESTED IMPROVEMENTS\n`);
      metrics.improvements.forEach((imp, idx) => {
        console.log(`   ${idx + 1}. ${imp}`);
      });
      console.log();
    }

    console.log("═══════════════════════════════════════════════════════════\n");
  }

  /**
   * Export dashboard to JSON
   */
  exportMetrics(): LearningMetrics {
    return this.calculateMetrics();
  }
}

/**
 * Pattern detector for trades
 */
class PatternDetector {
  detectPatterns(trades: DashboardTrade[]): Array<{
    name: string;
    occurrences: number;
    winRate: number;
    avgP_L: number;
  }> {
    const patterns: { [key: string]: { trades: DashboardTrade[]; count: number } } = {};

    // Symbol-based patterns
    trades.forEach((t) => {
      const key = `${t.symbol}_${t.type}`;
      if (!patterns[key]) patterns[key] = { trades: [], count: 0 };
      patterns[key].trades.push(t);
      patterns[key].count++;
    });

    // Calculate stats per pattern
    const result = Object.entries(patterns)
      .map(([name, data]) => {
        const wins = data.trades.filter((t) => (t.pnl || 0) > 0).length;
        const avgP_L = data.trades.reduce((sum, t) => sum + (t.pnl || 0), 0) / data.trades.length;
        return {
          name,
          occurrences: data.count,
          winRate: (wins / data.count) * 100,
          avgP_L,
        };
      })
      .sort((a, b) => b.winRate - a.winRate);

    return result;
  }
}

export default OdteLearningDashboard;
