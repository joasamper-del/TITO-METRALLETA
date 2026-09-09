/**
 * 0DTE Intelligent Reentry Module
 * Detects if trend resumes after trailing stop or pullback exit
 * Marks POSSIBLE reentry opportunity but does NOT execute automatically
 */

export interface TradeExit {
  tradeId: string;
  symbol: string;
  type: "CALL" | "PUT";
  entryPrice: number;
  exitPrice: number;
  exitReason: "TP" | "SL" | "TRAILING" | "TIME_CLOSE" | "CONNECTION_LOSS";
  exitTime: Date;
  exitP_L: number; // in dollars
  exitP_LPct: number; // in percentage
}

export interface TrendResumeSignal {
  tradeId: string; // Original trade that exited
  symbol: string;
  originalType: "CALL" | "PUT";
  originalEntry: number;
  originalExit: number;
  currentPrice: number;
  priceMovement: number; // from exit to current
  priceMovementPct: number;
  trendDirection: "UP" | "DOWN" | "UNCLEAR";
  trendStrength: number; // 0-100 (how strong is the resumed trend)
  reentryOpportunity: boolean; // should we reenter?
  suggestedReentryPrice?: number;
  suggestedReentryType?: "CALL" | "PUT";
  suggestedReentryConfidence?: number; // 0-100
  reasoning: string[];
  timestamp: Date;
}

export class OdteIntelligentReentryModule {
  private exitedTrades: Map<string, TradeExit> = new Map();
  private reentryOpportunities: Map<string, TrendResumeSignal> = new Map();

  /**
   * Record a trade exit for monitoring
   */
  recordExit(exit: TradeExit): void {
    this.exitedTrades.set(exit.tradeId, exit);

    console.log(`\n📌 Tracking exit for potential reentry:`);
    console.log(`   Trade: ${exit.tradeId}`);
    console.log(`   ${exit.symbol} ${exit.type} exited at ${exit.exitReason}`);
    console.log(`   Result: ${exit.exitP_LPct > 0 ? "+" : ""}${exit.exitP_LPct.toFixed(1)}%\n`);
  }

  /**
   * Check if trend resumed after exit
   */
  checkTrendResumption(symbol: string, currentPrice: number, latestTrend: "UP" | "DOWN" | "FLAT"): void {
    // Find recent exits for this symbol
    const relevantExits = Array.from(this.exitedTrades.values()).filter(
      (e) => e.symbol === symbol && Date.now() - e.exitTime.getTime() < 15 * 60 * 1000 // Last 15 minutes
    );

    relevantExits.forEach((exit) => {
      const signal = this.analyzeTrendResumption(exit, currentPrice, latestTrend);

      if (signal.reentryOpportunity) {
        console.log(`\n🔄 REENTRY OPPORTUNITY DETECTED`);
        console.log(`   Original: ${exit.symbol} ${exit.type} @ ${exit.entryPrice.toFixed(4)}`);
        console.log(`   Exited: ${exit.exitPrice.toFixed(4)} (${exit.exitReason})`);
        console.log(`   Current: ${currentPrice.toFixed(4)}`);
        console.log(`   Trend: ${signal.trendDirection} (strength: ${signal.trendStrength.toFixed(0)}/100)`);
        console.log(`   Confidence: ${signal.suggestedReentryConfidence}%`);
        console.log(`   Reasoning: ${signal.reasoning.join("; ")}\n`);

        console.log(`⚠️  NOT EXECUTING AUTOMATICALLY`);
        console.log(`   This is a LEARNING opportunity. Review and decide manually.\n`);

        this.reentryOpportunities.set(exit.tradeId, signal);
      }
    });
  }

  /**
   * Analyze if trend actually resumed
   */
  private analyzeTrendResumption(exit: TradeExit, currentPrice: number, latestTrend: "UP" | "DOWN" | "FLAT"): TrendResumeSignal {
    const priceMove = currentPrice - exit.exitPrice;
    const priceMovePercent = (priceMove / exit.exitPrice) * 100;

    // Determine trend
    const trendDirection = priceMove > 0 ? "UP" : priceMove < 0 ? "DOWN" : "FLAT";

    // Check if trend aligns with original type
    const originalTrendWas = exit.type === "CALL" ? "UP" : "DOWN";
    const trendResumed = trendDirection === originalTrendWas;

    // Trend strength (how far it moved vs exit)
    let trendStrength = Math.min(Math.abs(priceMovePercent) * 10, 100);

    // Adjust for volatility context
    if (latestTrend === originalTrendWas) trendStrength += 15;
    trendStrength = Math.min(trendStrength, 100);

    // Determine if reentry makes sense
    let reentryOpportunity = false;
    let confidence = 0;

    if (trendResumed && trendStrength > 50) {
      // Original trend resumed with strength
      if (exit.exitReason === "TRAILING") {
        // Exit was trailing stop (good sign trend resumed)
        reentryOpportunity = true;
        confidence = Math.min(75 + (trendStrength - 50) / 2, 95);
      } else if (exit.exitReason === "SL" && Math.abs(priceMovePercent) > 2) {
        // SL triggered but trend resumed
        reentryOpportunity = true;
        confidence = Math.min(60 + (trendStrength - 50) / 3, 85);
      }
    }

    // Suggested reentry parameters
    let suggestedType: "CALL" | "PUT" = "CALL";
    if (trendDirection === "DOWN") suggestedType = "PUT";

    const reasoning: string[] = [];

    if (trendResumed) reasoning.push(`Trend resumed in original direction (${originalTrendWas})`);
    if (trendStrength > 70) reasoning.push("Strong resumed trend");
    if (Math.abs(priceMovePercent) > 3) reasoning.push("Significant price movement");
    if (exit.exitReason === "TRAILING") reasoning.push("Original exit was trailing stop (controlled)");
    if (exit.exitReason === "SL") reasoning.push("Hit SL then recovered (potential V-shape)");
    if (exit.exitP_L > 0) reasoning.push("Original trade was profitable");
    if (confidence < 50) reasoning.push("Weak signal - wait for confirmation");

    return {
      tradeId: exit.tradeId,
      symbol: exit.symbol,
      originalType: exit.type,
      originalEntry: exit.entryPrice,
      originalExit: exit.exitPrice,
      currentPrice,
      priceMovement: priceMove,
      priceMovementPct: priceMovePercent,
      trendDirection,
      trendStrength,
      reentryOpportunity,
      suggestedReentryPrice: currentPrice,
      suggestedReentryType: suggestedType,
      suggestedReentryConfidence: reentryOpportunity ? confidence : 0,
      reasoning,
      timestamp: new Date(),
    };
  }

  /**
   * Get all pending reentry opportunities
   */
  getReentryOpportunities(): TrendResumeSignal[] {
    return Array.from(this.reentryOpportunities.values()).filter((o) => o.reentryOpportunity);
  }

  /**
   * Check if reentry was good (for learning)
   */
  analyzeReentryQuality(tradeId: string, reentryResult: { success: boolean; finalP_L: number }): void {
    const signal = this.reentryOpportunities.get(tradeId);
    if (!signal) return;

    console.log(`\n📊 REENTRY QUALITY ANALYSIS`);
    console.log(`   Original trade: ${signal.symbol} ${signal.originalType}`);
    console.log(`   Original exit reason: Detected trend resumption`);
    console.log(`   Reentry confidence: ${signal.suggestedReentryConfidence}%`);
    console.log(`   Reentry result: ${reentryResult.success ? "✅ PROFITABLE" : "❌ LOSS"}`);
    console.log(`   P&L: ${reentryResult.finalP_L > 0 ? "+" : ""}${reentryResult.finalP_L.toFixed(2)}\n`);

    // Learning insights
    if (reentryResult.success && signal.suggestedReentryConfidence > 70) {
      console.log(`   ✅ High confidence reentry worked. Pattern: Trend resumption after ${signal.trendDirection === "UP" ? "UP" : "DOWN"} move.`);
    } else if (!reentryResult.success && signal.suggestedReentryConfidence < 50) {
      console.log(`   ⚠️  Low confidence reentry failed. Lesson: Wait for >70% confidence before reentering.`);
    }

    console.log();
  }

  /**
   * Display reentry opportunities
   */
  displayReentryOpportunities(): void {
    const opportunities = this.getReentryOpportunities();

    if (opportunities.length === 0) {
      console.log("\n✅ No reentry opportunities at this moment.\n");
      return;
    }

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║       0DTE INTELLIGENT REENTRY OPPORTUNITIES              ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    opportunities.forEach((opp, idx) => {
      console.log(`${idx + 1}. ${opp.symbol} - TREND RESUMED (${opp.trendDirection})`);
      console.log(`   Original: ${opp.originalType} @ ${opp.originalEntry.toFixed(4)}`);
      console.log(`   Exited: ${opp.originalExit.toFixed(4)}`);
      console.log(`   Current: ${opp.currentPrice.toFixed(4)} (${opp.priceMovementPct > 0 ? "+" : ""}${opp.priceMovementPct.toFixed(2)}%)`);
      console.log(`   Trend strength: ${opp.trendStrength.toFixed(0)}/100`);
      console.log(`   Reentry confidence: ${opp.suggestedReentryConfidence}%`);
      console.log(`   Suggested: ${opp.suggestedReentryType} @ ${opp.suggestedReentryPrice?.toFixed(4)}`);
      opp.reasoning.forEach((r) => console.log(`   • ${r}`));
      console.log();
    });

    console.log("═══════════════════════════════════════════════════════════\n");
    console.log(`⚠️  All opportunities MARKED but NOT EXECUTED`);
    console.log(`   Review confidence scores and decide manually.\n`);
  }

  /**
   * Clear old exits (over 30 minutes)
   */
  cleanupOldExits(): void {
    const now = Date.now();
    const cutoff = 30 * 60 * 1000; // 30 minutes

    Array.from(this.exitedTrades.entries()).forEach(([key, exit]) => {
      if (now - exit.exitTime.getTime() > cutoff) {
        this.exitedTrades.delete(key);
        this.reentryOpportunities.delete(key);
      }
    });
  }
}

export default OdteIntelligentReentryModule;
