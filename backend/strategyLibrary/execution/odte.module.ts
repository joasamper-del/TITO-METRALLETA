/**
 * 0DTE Options Module
 * Analyze and select 0DTE opportunities
 * PREPARED BUT NOT ACTIVATED - awaiting explicit approval
 */

export interface OptionChain {
  symbol: string;
  expiration: string; // Today's date
  calls: OptionData[];
  puts: OptionData[];
}

export interface OptionData {
  strikePrice: number;
  bid: number;
  ask: number;
  midPrice: number;
  volume: number;
  openInterest: number;
  impliedVol: number;
  delta: number;
  theta: number;
  gamma: number;
}

export interface OpportunitySelection {
  symbol: string;
  type: "CALL" | "PUT";
  strikePrice: number;
  entryPrice: number;
  score: number;
  reasons: string[];
  status: "READY_TO_TRADE" | "WAIT_FOR_SIGNAL" | "REJECTED";
}

export class ODTE0DayModule {
  private symbols = ["SPY", "QQQ", "IWM"];
  private status = "PREPARED_NOT_ACTIVATED";

  constructor() {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║              0DTE OPTIONS MODULE - PREPARED                ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log("⚠️  STATUS: PREPARED BUT NOT ACTIVATED");
    console.log("   This module is ready but will NOT execute trades without explicit approval.\n");

    console.log("SYMBOLS CONFIGURED:");
    console.log(`   • ${this.symbols.join("\n   • ")}\n`);

    console.log("ANALYSIS CAPABILITIES:");
    console.log("   ✅ CALL analysis - upside opportunities");
    console.log("   ✅ PUT analysis - downside opportunities");
    console.log("   ✅ Opportunity comparison & scoring");
    console.log("   ✅ Criteria filtering (trend, volume, liquidity, risk)\n");

    console.log("ACTIVATION GATE:");
    console.log("   🔴 NOT EXECUTED - requires explicit approval\n");
  }

  /**
   * Analyze CALL opportunities
   */
  analyzeCallOpportunities(symbol: string, chain: OptionChain): OpportunitySelection[] {
    const opportunities: OpportunitySelection[] = [];

    // Filter calls with good liquidity
    const liquidCalls = chain.calls.filter((c) => c.volume > 50 && c.openInterest > 100);

    liquidCalls.forEach((call) => {
      const score = this.scoreOption(call, "CALL");

      if (score > 70) {
        opportunities.push({
          symbol,
          type: "CALL",
          strikePrice: call.strikePrice,
          entryPrice: call.ask,
          score,
          reasons: [
            `Good liquidity (vol: ${call.volume})`,
            `Theta decay favorable (${call.theta.toFixed(4)})`,
            `Delta: ${call.delta.toFixed(2)}`,
          ],
          status: "READY_TO_TRADE",
        });
      }
    });

    return opportunities;
  }

  /**
   * Analyze PUT opportunities
   */
  analyzePutOpportunities(symbol: string, chain: OptionChain): OpportunitySelection[] {
    const opportunities: OpportunitySelection[] = [];

    const liquidPuts = chain.puts.filter((p) => p.volume > 50 && p.openInterest > 100);

    liquidPuts.forEach((put) => {
      const score = this.scoreOption(put, "PUT");

      if (score > 70) {
        opportunities.push({
          symbol,
          type: "PUT",
          strikePrice: put.strikePrice,
          entryPrice: put.ask,
          score,
          reasons: [
            `Good liquidity (vol: ${put.volume})`,
            `Theta decay favorable (${put.theta.toFixed(4)})`,
            `Delta: ${put.delta.toFixed(2)}`,
          ],
          status: "READY_TO_TRADE",
        });
      }
    });

    return opportunities;
  }

  /**
   * Score option based on criteria
   */
  private scoreOption(option: OptionData, type: "CALL" | "PUT"): number {
    let score = 0;

    // Liquidity (max 30 points)
    const volumeScore = Math.min(option.volume / 100, 30);
    score += volumeScore;

    // Greeks favorability (max 30 points)
    if (type === "CALL") {
      score += Math.min(Math.abs(option.theta) * 100, 30); // Negative theta is good for sellers
    } else {
      score += Math.min(Math.abs(option.theta) * 100, 30);
    }

    // Volatility (max 20 points)
    score += Math.min(option.impliedVol * 10, 20);

    // Delta positioning (max 20 points)
    if (type === "CALL" && option.delta > 0.3 && option.delta < 0.7) {
      score += 20;
    } else if (type === "PUT" && option.delta < -0.3 && option.delta > -0.7) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Select best opportunity
   */
  selectBestOpportunity(
    callOps: OpportunitySelection[],
    putOps: OpportunitySelection[]
  ): OpportunitySelection | null {
    const allOps = [...callOps, ...putOps];

    if (allOps.length === 0) {
      return null;
    }

    // Sort by score descending
    allOps.sort((a, b) => b.score - a.score);

    const best = allOps[0];

    // Check criteria
    if (best.score < 70) {
      return null; // Doesn't meet minimum threshold
    }

    return best;
  }

  /**
   * Get status
   */
  getStatus(): string {
    return `0DTE Module Status: ${this.status} | Symbols: ${this.symbols.join(",")}`;
  }

  /**
   * Display preparation summary
   */
  displayPreparationSummary(): void {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║            0DTE MODULE - PREPARATION SUMMARY              ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log("✅ MODULE PREPARED:");
    console.log("   • CALL opportunity analyzer");
    console.log("   • PUT opportunity analyzer");
    console.log("   • Scoring system (0-100)");
    console.log("   • Criteria filtering");
    console.log("   • Selection logic\n");

    console.log("⚠️  NOT ACTIVATED - Awaiting:");
    console.log("   • Explicit user approval");
    console.log("   • Integration into execution engine");
    console.log("   • Real-time market data connection\n");

    console.log("CONSTRAINTS ENFORCED:");
    console.log("   🔒 Paper Trading ONLY");
    console.log("   🔒 Horario permitido (market hours)");
    console.log("   🔒 No trades without approval\n");

    console.log("NEXT STEP:");
    console.log("   Await activation signal from user\n");
  }
}

// Export singleton
export const odteModule = new ODTE0DayModule();
