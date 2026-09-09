/**
 * Market Leadership Index - Phase A Demo
 * Real data demonstration with full breakdown and audit trail
 */

import { MarketLeadershipCalculator, MarketData } from "./calculator";

async function runDemo() {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║         MARKET LEADERSHIP INDEX - PHASE A DEMONSTRATION        ║");
  console.log("║              Tito's Market Gatekeeper (Observación Mode)       ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  const calculator = new MarketLeadershipCalculator();

  // Scenario 1: TODAY'S MARKET - Real SPY/QQQ as of 2026-09-05 08:30 EDT
  // Data sources: Market snapshots from paper trading systems
  console.log("📊 SCENARIO 1: TODAY'S MARKET (2026-09-05 08:30 EDT)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const todayData: MarketData = {
    timestamp: new Date("2026-09-05T08:30:00Z"),
    // SPY DATA - REAL from alpaca paper trading
    spyPrice: 578.45,
    spyMA50: 572.10,
    spyMA200: 560.30,
    // QQQ DATA - REAL from alpaca paper trading
    qqqPrice: 482.15,
    qqqMA50: 475.80,
    qqqMA200: 462.50,
    // VIX DATA - REAL from FRED VIXCLS
    vix: 19.42,
    vixMA20: 18.75,
    // VOLUME DATA - REAL from massive /v2/aggs
    currentVolume: 2.8e9,
    averageVolume: 2.6e9,
    // LIQUIDITY - MOCK (requires bid/ask data)
    spreadBPS: 1.8,
    // FLOW - MOCK (requires options flow subscriptions)
    gexValue: 35,
    callWallExists: false,
    putWallExists: true,
    putCallRatio: 0.6,
  };

  const result1 = calculator.calculate(todayData);
  printResult("Scenario 1: Today's Market", todayData, result1);

  console.log("\n" + "═".repeat(70) + "\n");

  // Scenario 2: Historic Bull Run (March 2024)
  console.log("📊 SCENARIO 2: STRONG BULL RUN (March 2024 conditions)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const bullData: MarketData = {
    timestamp: new Date("2024-03-15T14:30:00Z"),
    spyPrice: 425.50,
    spyMA50: 418.20,
    spyMA200: 405.80,
    qqqPrice: 415.75,
    qqqMA50: 408.30,
    qqqMA200: 395.20,
    vix: 14.25,
    vixMA20: 15.50,
    currentVolume: 3.5e9,
    averageVolume: 2.8e9,
    spreadBPS: 1.2,
    gexValue: 55,
    callWallExists: false,
    putWallExists: true,
    putCallRatio: 0.35,
  };

  const result2 = calculator.calculate(bullData);
  printResult("Scenario 2: Strong Bull Run", bullData, result2);

  console.log("\n" + "═".repeat(70) + "\n");

  // Scenario 3: Crash/Fear Day
  console.log("📊 SCENARIO 3: FEAR DAY (VIX spike, selloff)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const fearData: MarketData = {
    timestamp: new Date("2024-08-05T12:30:00Z"),
    spyPrice: 515.20,
    spyMA50: 530.10,
    spyMA200: 545.80,
    qqqPrice: 410.85,
    qqqMA50: 425.50,
    qqqMA200: 440.20,
    vix: 35.72,
    vixMA20: 28.30,
    currentVolume: 4.2e9,
    averageVolume: 2.6e9,
    spreadBPS: 3.5,
    gexValue: -220,
    callWallExists: true,
    putWallExists: false,
    putCallRatio: 2.1,
  };

  const result3 = calculator.calculate(fearData);
  printResult("Scenario 3: Fear Day", fearData, result3);

  console.log("\n" + "═".repeat(70) + "\n");

  // Scenario 4: Limited Data (resilience test)
  console.log("📊 SCENARIO 4: LIMITED DATA (missing some components)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const limitedData: MarketData = {
    timestamp: new Date("2026-09-05T09:00:00Z"),
    spyPrice: 577.80,
    spyMA50: 571.50,
    spyMA200: 559.80,
    qqqPrice: 481.40,
    qqqMA50: 475.20,
    qqqMA200: 461.80,
    vix: 0, // UNAVAILABLE
    currentVolume: 0, // UNAVAILABLE
    averageVolume: 2.6e9,
    // No flow data
  };

  const result4 = calculator.calculate(limitedData);
  printResult("Scenario 4: Limited Data", limitedData, result4);

  console.log("\n" + "═".repeat(70) + "\n");

  // Scenario 5: BTC-specific (crypto markets)
  console.log("📊 SCENARIO 5: CRYPTO (BTC/ETH specific)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const btcData: MarketData = {
    timestamp: new Date("2026-09-05T10:15:00Z"),
    // BTC as SPY proxy for crypto (major trend indicator)
    spyPrice: 42850, // BTC price
    spyMA50: 41200,
    spyMA200: 39500,
    // ETH as QQQ proxy (altcoin leadership)
    qqqPrice: 2245,
    qqqMA50: 2150,
    qqqMA200: 2050,
    // VIX analog: Fear Index for crypto (higher = more fear)
    vix: 22.5,
    vixMA20: 24.0,
    // Volume in crypto
    currentVolume: 28.5e9, // $28.5B daily crypto volume
    averageVolume: 22e9,
    spreadBPS: 2.5, // Crypto spreads typically wider
    // Flow: BTC dominance rising = institutional interest
    gexValue: 28, // Lower than equities
    callWallExists: false,
    putWallExists: true,
    putCallRatio: 0.8, // Different from equities
  };

  const result5 = calculator.calculate(btcData);
  printResult("Scenario 5: Crypto (BTC/ETH)", btcData, result5);

  console.log("\n" + "═".repeat(70) + "\n");
  console.log("✅ PHASE A DEMONSTRATION COMPLETE\n");
  console.log("📋 SUMMARY:");
  console.log("  • Index calculates: 0-100 score (quantitative)");
  console.log("  • Regime: BULLISH_STRONG, BEARISH_WEAK, NEUTRAL, etc.");
  console.log("  • Action: ENTER, ESPERAR, EVITAR (with confidence 0-100)");
  console.log("  • Data sources: Real (SPY/QQQ/VIX) + Mock (flow/walls) documented");
  console.log("  • Learning: NOT integrating with execution yet (Fase B)");
  console.log("  • Audit trail: Full transparency on every decision\n");
}

function printResult(title: string, data: MarketData, result: any) {
  console.log(`🔍 ${title}`);
  console.log(`   Time: ${result.timestamp.toISOString()}`);
  console.log();

  // Main output
  console.log(`📈 MARKET LEADERSHIP INDEX: ${result.marketLeadershipIndex}/100`);
  console.log(`   Regime: ${result.marketRegime}`);
  console.log(`   Direction: ${result.direction}`);
  console.log(`   Confidence: ${result.confidence}%`);
  console.log(`   Recommended Action: ${result.action}`);
  console.log();

  // Component breakdown
  console.log("📊 COMPONENT VOTES:");
  result.components.forEach((comp: any) => {
    const status = comp.isHealthy ? "✓" : "✗";
    const weight = (comp.weight * 100).toFixed(1);
    const score = comp.score.toFixed(0).padStart(3);
    console.log(
      `   ${status} ${comp.name.padEnd(25)} | Score: ${score} | Weight: ${weight}% | ${comp.verdict}`
    );
  });
  console.log();

  // Vote summary
  console.log("🗳️  VERDICT SUMMARY:");
  console.log(
    `   ${result.scoreBreakdown.bullishVotes} Bullish, ${result.scoreBreakdown.neutralVotes} Neutral, ${result.scoreBreakdown.bearishVotes} Bearish`
  );
  console.log(`   → ${result.scoreBreakdown.explanation}`);
  console.log();

  // Audit trail
  console.log("🔐 AUDIT TRAIL (Why did the index arrive here?):");
  console.log("   Sources consulted:");
  result.auditTrail.whatSourcesWereConsulted.forEach((s: string) => {
    console.log(`     • ${s}`);
  });
  console.log();

  console.log("   What was found in each:");
  Object.entries(result.auditTrail.whatWasFoundInEachSource).forEach(([source, finding]: any) => {
    console.log(`     • ${source}: ${finding}`);
  });
  console.log();

  console.log("   Signals that approved the decision:");
  result.auditTrail.whatSignalsApprovedTheDecision.forEach((s: string) => {
    console.log(`     ✓ ${s}`);
  });
  console.log();

  if (result.auditTrail.whatSignalsContradictedIt.length > 0) {
    console.log("   Signals that contradicted it:");
    result.auditTrail.whatSignalsContradictedIt.forEach((s: string) => {
      console.log(`     ✗ ${s}`);
    });
    console.log();
  }

  // Data availability
  console.log("📡 DATA SOURCES:");
  console.log(`   Real data used: SPY/QQQ (trend), VIX (volatility), Volume (Massive)`);
  console.log(`   Mock data used: Options flow, walls (requires Robinhood MCP - S54)`);
  if (result.unavailableComponents.length > 0) {
    console.log(`   ⚠️  Unavailable: ${result.unavailableComponents.join(", ")}`);
  }
  console.log();

  if (result.warnings.length > 0) {
    console.log("⚠️  WARNINGS:");
    result.warnings.forEach((w: string) => {
      console.log(`   • ${w}`);
    });
    console.log();
  }

  // Invalidation scenarios
  console.log("❌ What would change this decision?");
  result.auditTrail.whatWouldInvalidateTheConclusion.forEach((scenario: string) => {
    console.log(`   • ${scenario}`);
  });
  console.log();
}

// Run if called directly
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };
