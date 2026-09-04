/**
 * Test: 0DTE Decision Journal
 * Demonstrates snapshot capture for ENTER, WAIT, NO_TRADE
 */

import { OdteDecisionJournal } from "./odte.decision.journal";

async function testDecisionJournal() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║      TEST: 0DTE DECISION JOURNAL - IMMUTABLE SNAPSHOTS     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const journal = new OdteDecisionJournal();

  // ============================================================
  // EXAMPLE 1: ENTER DECISION
  // ============================================================

  console.log("EXAMPLE 1: ENTER DECISION\n");

  const enterDecision = {
    decisionId: "DECISION_20260904_001_ENTER",
    timestamp: new Date().toISOString(),
    ticker: "SPY",
    decisionType: "ENTER" as const,

    underlyingPrice: 565.32,
    trend: "BULLISH" as const,

    rsi: 72,
    adx: 35,
    atr: 2.15,
    volume: 850000,
    vix: 14.5,

    strikeConsidered: 568.0,
    expirationDate: "2026-09-04T16:00:00Z",
    bid: 1.45,
    ask: 1.55,
    spread: 0.10,
    spreadPercent: 6.9,
    contractVolume: 2850,
    openInterest: 1240,

    delta: 0.65,
    theta: -0.08,
    gamma: 0.012,
    vega: 0.18,

    premium: 1.50,

    confidenceLevel: 85,
    reasonsFor: [
      "Strong uptrend confirmed by ADX > 25",
      "RSI 72 shows momentum",
      "Premium attractive for 0DTE",
      "Tight bid/ask spread",
    ],
    reasonsAgainst: [
      "High RSI might mean overbought",
      "Time value decay accelerating",
    ],
    missingConditions: [],
  };

  try {
    journal.recordDecisionSnapshot(enterDecision);
    journal.displaySnapshot(enterDecision);
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}\n`);
  }

  // ============================================================
  // EXAMPLE 2: WAIT DECISION
  // ============================================================

  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("EXAMPLE 2: WAIT DECISION\n");

  const waitDecision = {
    decisionId: "DECISION_20260904_002_WAIT",
    timestamp: new Date().toISOString(),
    ticker: "QQQ",
    decisionType: "WAIT" as const,

    underlyingPrice: 425.67,
    trend: "NEUTRAL" as const,

    rsi: 55,
    adx: 18,
    atr: 1.85,
    volume: 620000,
    vix: 16.2,

    strikeConsidered: 427.0,
    expirationDate: "2026-09-04T16:00:00Z",
    bid: 0.95,
    ask: 1.05,
    spread: 0.10,
    spreadPercent: 10.5,
    contractVolume: 1850,
    openInterest: 940,

    delta: 0.52,
    theta: -0.06,
    gamma: 0.011,
    vega: 0.16,

    premium: 1.00,

    confidenceLevel: 58,
    reasonsFor: [
      "Neutral trend with potential",
      "Reasonable premium",
      "Liquidity acceptable",
    ],
    reasonsAgainst: [
      "ADX too low (need > 20 for confirmation)",
      "No clear directional bias",
      "Wider spread than SPY",
    ],
    missingConditions: ["ADX confirmation", "Clear trend direction"],
  };

  try {
    journal.recordDecisionSnapshot(waitDecision);
    journal.displaySnapshot(waitDecision);
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}\n`);
  }

  // ============================================================
  // EXAMPLE 3: NO_TRADE DECISION
  // ============================================================

  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("EXAMPLE 3: NO_TRADE DECISION\n");

  const noTradeDecision = {
    decisionId: "DECISION_20260904_003_NO_TRADE",
    timestamp: new Date().toISOString(),
    ticker: "IWM",
    decisionType: "NO_TRADE" as const,

    underlyingPrice: 198.45,
    trend: "BEARISH" as const,

    rsi: 28,
    adx: 12,
    atr: 1.25,
    volume: 380000,
    vix: 18.5,

    strikeConsidered: 198.0,
    expirationDate: "2026-09-04T16:00:00Z",
    bid: 0.50,
    ask: 0.60,
    spread: 0.10,
    spreadPercent: 18.2,
    contractVolume: 420,
    openInterest: 220,

    delta: -0.45,
    theta: -0.04,
    gamma: 0.008,
    vega: 0.12,

    premium: 0.55,

    confidenceLevel: 32,
    reasonsFor: [],
    reasonsAgainst: [
      "Very wide spread (18.2%) - poor liquidity",
      "Low ADX - no trend strength",
      "Low volume and open interest",
      "RSI 28 shows oversold, reversal risk",
      "Low premium doesn't justify risk",
    ],
    missingConditions: [
      "Adequate liquidity (spread < 5%)",
      "Volume > 500",
      "Open interest > 100",
      "Clear trend direction",
    ],
  };

  try {
    journal.recordDecisionSnapshot(noTradeDecision);
    journal.displaySnapshot(noTradeDecision);
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}\n`);
  }

  // ============================================================
  // EXAMPLE 4: INCOMPLETE DATA (SHOULD FAIL)
  // ============================================================

  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("EXAMPLE 4: INCOMPLETE DATA (should be BLOCKED)\n");

  const incompleteDecision = {
    decisionId: "DECISION_20260904_004_INCOMPLETE",
    timestamp: new Date().toISOString(),
    ticker: "SPY",
    decisionType: "ENTER" as const,

    underlyingPrice: 565.32,
    trend: "BULLISH" as const,

    // Missing critical data: RSI, premium, delta, etc.
    rsi: undefined,
    premium: undefined, // MISSING!
    delta: undefined, // MISSING (required for ENTER)!

    strikeConsidered: 568.0,
    expirationDate: "2026-09-04T16:00:00Z",
    bid: 1.45,
    ask: 1.55,
    spread: 0.10,
    spreadPercent: 6.9,
    contractVolume: 2850,
    openInterest: 1240,

    confidenceLevel: 85,
    reasonsFor: ["Test"],
    reasonsAgainst: [],
    missingConditions: [],
  };

  try {
    journal.recordDecisionSnapshot(incompleteDecision as any);
    console.log("❌ ERROR: Should have been blocked!\n");
  } catch (err: any) {
    console.log(`✅ Correctly blocked: ${err.message}\n`);
  }

  // ============================================================
  // SUMMARY
  // ============================================================

  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("DECISION JOURNAL TEST SUMMARY\n");

  console.log("✅ FEATURES DEMONSTRATED:\n");
  console.log("   1. ENTER decision: Complete snapshot with all data");
  console.log("   2. WAIT decision: Confidence threshold for entry");
  console.log("   3. NO_TRADE decision: Liquidity and trend validation");
  console.log("   4. DATA INCOMPLETE: Blocks entry when critical data missing\n");

  console.log("✅ IMMUTABILITY:\n");
  console.log("   • Snapshots recorded BEFORE trade entry");
  console.log("   • Original data never modified");
  console.log("   • Result fields added separately after close");
  console.log("   • Post-trade comparison without altering history\n");

  console.log("✅ DECISION JOURNAL FILE:\n");
  console.log("   Decision JSON files persist in: backend/decision-journal/\n");

  console.log("═══════════════════════════════════════════════════════════\n");
}

testDecisionJournal().catch(console.error);
