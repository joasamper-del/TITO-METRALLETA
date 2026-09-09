/**
 * 0DTE Decision Journal
 * Immutable snapshot of decision state BEFORE each entry
 * Compared post-trade with Learning Engine (without altering original)
 */

import * as fs from "fs";
import * as path from "path";

export interface DecisionSnapshot {
  // IMMUTABLE FIELDS (set before entry, never changed)
  decisionId: string;
  timestamp: string; // Exact date/time
  ticker: string; // SPY, QQQ, IWM
  decisionType: "ENTER" | "WAIT" | "NO_TRADE";

  // MARKET STATE (snapshot)
  underlyingPrice: number;
  trend: "BULLISH" | "NEUTRAL" | "BEARISH";

  // TECHNICAL INDICATORS
  rsi?: number;
  adx?: number;
  atr?: number;
  volume?: number;
  vix?: number | null;

  // OPTION SPECIFICS
  strikeConsidered: number;
  expirationDate: string;
  bid: number;
  ask: number;
  spread: number;
  spreadPercent: number;
  contractVolume: number;
  openInterest: number;

  // GREEKS
  delta?: number;
  theta?: number;
  gamma?: number;
  vega?: number;

  // OPTION PRICE
  premium: number;

  // DECISION QUALITY
  confidenceLevel: number; // 0-100
  reasonsFor: string[];
  reasonsAgainst: string[];
  missingConditions: string[];

  // RESULT FIELDS (immutable after entry, updated post-trade)
  resultData?: {
    exitPrice?: number;
    exitTime?: string;
    exitReason?: string;
    pnl?: number;
    pnlPercent?: number;
    decision_vs_outcome?: string; // Analysis post-trade
  };
}

export class OdteDecisionJournal {
  private journalDir: string;
  private decisions: Map<string, DecisionSnapshot> = new Map();

  constructor() {
    this.journalDir = path.resolve(__dirname, "../../decision-journal");

    // Create directory if not exists
    if (!fs.existsSync(this.journalDir)) {
      fs.mkdirSync(this.journalDir, { recursive: true });
    }

    console.log(`\n✅ Decision Journal initialized at: ${this.journalDir}\n`);
  }

  /**
   * Record decision BEFORE entry
   * Snapshot is immutable except for result fields
   */
  recordDecisionSnapshot(decision: DecisionSnapshot): void {
    // Validate critical data
    const missingCritical = this.validateCriticalData(decision);
    if (missingCritical.length > 0) {
      console.log(`\n🔴 DATA INCOMPLETE - Decision BLOCKED\n`);
      console.log("Missing critical fields:");
      missingCritical.forEach((field) => console.log(`   • ${field}`));
      console.log();
      throw new Error("Cannot record decision: critical data missing");
    }

    // Store in memory
    this.decisions.set(decision.decisionId, decision);

    // Persist to file
    this.persistDecision(decision);

    console.log(`\n✅ Decision snapshot recorded: ${decision.decisionId}`);
    console.log(`   ${decision.ticker} ${decision.decisionType}`);
    console.log(`   Confidence: ${decision.confidenceLevel}%`);
    console.log(`   Premium: $${decision.premium.toFixed(3)}`);
    console.log(`   Snapshot is now IMMUTABLE\n`);
  }

  /**
   * Validate critical data before allowing entry
   */
  private validateCriticalData(decision: DecisionSnapshot): string[] {
    const missing: string[] = [];

    // Absolutely required
    if (!decision.ticker) missing.push("Ticker");
    if (!decision.decisionType) missing.push("Decision type");
    if (decision.underlyingPrice === undefined) missing.push("Underlying price");
    if (!decision.trend) missing.push("Trend");
    if (decision.premium === undefined) missing.push("Premium");
    if (decision.confidenceLevel === undefined) missing.push("Confidence level");
    if (!decision.strikeConsidered) missing.push("Strike");
    if (!decision.expirationDate) missing.push("Expiration");
    if (decision.bid === undefined) missing.push("Bid price");
    if (decision.ask === undefined) missing.push("Ask price");
    if (decision.spreadPercent === undefined) missing.push("Spread %");
    if (decision.contractVolume === undefined) missing.push("Contract volume");
    if (decision.openInterest === undefined) missing.push("Open interest");

    // For ENTER decision, need more data
    if (decision.decisionType === "ENTER") {
      if (decision.delta === undefined) missing.push("Delta (required for ENTER)");
      if (decision.theta === undefined) missing.push("Theta (required for ENTER)");
      if (decision.vega === undefined) missing.push("Vega (required for ENTER)");
    }

    return missing;
  }

  /**
   * Persist decision to JSON file
   */
  private persistDecision(decision: DecisionSnapshot): void {
    const fileName = `${decision.decisionId}.json`;
    const filePath = path.join(this.journalDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(decision, null, 2));
  }

  /**
   * Update result fields ONLY after trade closes
   * Original snapshot remains unchanged
   */
  updateTradeResult(
    decisionId: string,
    exitPrice: number,
    exitTime: string,
    exitReason: string,
    pnl: number,
    pnlPercent: number
  ): void {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      console.error(`Decision not found: ${decisionId}`);
      return;
    }

    // Update only result fields (immutable snapshot unchanged)
    decision.resultData = {
      exitPrice,
      exitTime,
      exitReason,
      pnl,
      pnlPercent,
    };

    // Persist updated decision
    this.persistDecision(decision);

    console.log(`\n✅ Trade result recorded for: ${decisionId}`);
    console.log(`   Exit: ${exitReason} @ $${exitPrice.toFixed(3)}`);
    console.log(`   P&L: ${pnl > 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPercent > 0 ? "+" : ""}${pnlPercent.toFixed(1)}%)\n`);
  }

  /**
   * Get decision for post-trade analysis
   * Original snapshot is immutable, result data added separately
   */
  getDecision(decisionId: string): DecisionSnapshot | null {
    return this.decisions.get(decisionId) || null;
  }

  /**
   * Display decision snapshot
   */
  displaySnapshot(decision: DecisionSnapshot): void {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║             DECISION JOURNAL - SNAPSHOT                    ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log(`📋 DECISION METADATA`);
    console.log(`   ID: ${decision.decisionId}`);
    console.log(`   Time: ${decision.timestamp}`);
    console.log(`   Ticker: ${decision.ticker}`);
    console.log(`   Decision: ${decision.decisionType}\n`);

    console.log(`📊 MARKET STATE`);
    console.log(`   Underlying: $${decision.underlyingPrice.toFixed(2)}`);
    console.log(`   Trend: ${decision.trend}`);
    if (decision.volume) console.log(`   Volume: ${decision.volume}`);
    if (decision.vix !== null && decision.vix !== undefined) console.log(`   VIX: ${decision.vix.toFixed(1)}\n`);
    else console.log(`   VIX: N/A\n`);

    console.log(`📈 TECHNICALS`);
    if (decision.rsi !== undefined) console.log(`   RSI: ${decision.rsi.toFixed(0)}`);
    if (decision.adx !== undefined) console.log(`   ADX: ${decision.adx.toFixed(0)}`);
    if (decision.atr !== undefined) console.log(`   ATR: ${decision.atr.toFixed(3)}\n`);
    else console.log();

    console.log(`🎯 OPTION DETAILS`);
    console.log(`   Strike: $${decision.strikeConsidered.toFixed(2)}`);
    console.log(`   Expiration: ${decision.expirationDate}`);
    console.log(`   Premium: $${decision.premium.toFixed(3)}`);
    console.log(`   Bid/Ask: $${decision.bid.toFixed(3)} / $${decision.ask.toFixed(3)} (${decision.spreadPercent.toFixed(2)}%)`);
    console.log(`   Volume: ${decision.contractVolume} | OI: ${decision.openInterest}\n`);

    if (decision.delta !== undefined || decision.theta !== undefined) {
      console.log(`📐 GREEKS`);
      if (decision.delta !== undefined) console.log(`   Delta: ${decision.delta.toFixed(2)}`);
      if (decision.theta !== undefined) console.log(`   Theta: ${decision.theta.toFixed(4)}`);
      if (decision.gamma !== undefined) console.log(`   Gamma: ${decision.gamma.toFixed(4)}`);
      if (decision.vega !== undefined) console.log(`   Vega: ${decision.vega.toFixed(3)}\n`);
    }

    console.log(`💡 DECISION ANALYSIS`);
    console.log(`   Confidence: ${decision.confidenceLevel}%`);
    console.log(`   ✅ For: ${decision.reasonsFor.join(", ")}`);
    console.log(`   ❌ Against: ${decision.reasonsAgainst.join(", ")}`);
    if (decision.missingConditions.length > 0) {
      console.log(`   ⚠️  Missing: ${decision.missingConditions.join(", ")}`);
    }
    console.log();

    if (decision.resultData) {
      console.log(`📊 RESULT (immutable original, result data added separately)`);
      console.log(`   Exit: $${decision.resultData.exitPrice?.toFixed(3)} via ${decision.resultData.exitReason}`);
      console.log(`   P&L: ${decision.resultData.pnl! > 0 ? "+" : ""}$${decision.resultData.pnl?.toFixed(2)} (${decision.resultData.pnlPercent! > 0 ? "+" : ""}${decision.resultData.pnlPercent?.toFixed(1)}%)`);
      console.log(`   Analysis: ${decision.resultData.decision_vs_outcome}\n`);
    }

    console.log("═══════════════════════════════════════════════════════════\n");
  }
}

export default OdteDecisionJournal;
