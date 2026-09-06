/**
 * Complete Demo: All 3 Post-FASE 1 Modules
 * Simulated data clearly marked as SIMULATED
 * No Alpaca orders, no parameter changes
 *
 * Run with: npx ts-node --transpile-only demo.post.phase1.complete.ts
 */

import { OdteDailyOpportunitiesPanel } from "./odte.daily.opportunities.panel";
import { OdteIntelligentReentryModule } from "./odte.intelligent.reentry.module";
import { OdteLearningDashboard } from "./odte.learning.dashboard";

async function runCompleteDemo() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║     POST-FASE 1: COMPLETE SIMULATION DEMONSTRATION         ║");
  console.log("║              (ALL DATA IS SIMULATED)                       ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // ============================================================
  // PART 1: DAILY OPPORTUNITIES PANEL
  // ============================================================

  console.log("═══════════════════════════════════════════════════════════");
  console.log("PART 1: PANEL DE OPORTUNIDADES - 9:30 AM");
  console.log("═══════════════════════════════════════════════════════════\n");

  const opportunitiesPanel = new OdteDailyOpportunitiesPanel();

  // SIMULATED market data
  const simulatedMarketData = {
    symbols: [
      {
        symbol: "SPY",
        price: 565.32,
        bidAskSpread: 1.5,
        volume: 2850, // contracts/hour
        openInterest: 1240,
        iv: 18.5,
        trend: "UP" as const,
        recentVolatility: 2.3,
      },
      {
        symbol: "QQQ",
        price: 425.67,
        bidAskSpread: 2.1,
        volume: 2100,
        openInterest: 980,
        iv: 22.3,
        trend: "FLAT" as const,
        recentVolatility: 2.8,
      },
      {
        symbol: "IWM",
        price: 198.45,
        bidAskSpread: 3.8,
        volume: 650,
        openInterest: 420,
        iv: 20.1,
        trend: "DOWN" as const,
        recentVolatility: 1.9,
      },
      {
        symbol: "AMZN",
        price: 189.23,
        bidAskSpread: 2.2,
        volume: 1950,
        openInterest: 650,
        iv: 19.4,
        trend: "UP" as const,
        recentVolatility: 2.4,
      },
    ],
    generalVix: 16.5,
    marketRegime: "NORMAL" as const,
    timeUntilMarketClose: 390, // 6.5 hours
  };

  const opportunitiesResult = opportunitiesPanel.analyzeOpportunities(simulatedMarketData);
  opportunitiesPanel.displayPanel(opportunitiesResult);

  // Store for later reentry demo
  const selectedOpportunity = opportunitiesResult.topThreeOpportunities[0];
  const selectedAction = "ENTER SPY CALL";

  console.log("═══════════════════════════════════════════════════════════");
  console.log("USER DECISION: SELECT TOP OPPORTUNITY");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log(`✅ User selected: ${selectedAction}`);
  console.log(`   Strike: ${selectedOpportunity.suggestedCallStrike?.toFixed(2)}`);
  console.log(`   Est. Premium: $${selectedOpportunity.estimatedPremium?.call.toFixed(3)}`);
  console.log(`   Confidence: ${selectedOpportunity.confidence.toFixed(0)}%\n`);

  console.log("🟢 SIMULATED ORDER PLACED (NOT SENT TO ALPACA)");
  console.log(`   Symbol: SPY`);
  console.log(`   Type: CALL`);
  console.log(`   Entry: $2.45 (SIMULATED PREMIUM)`);
  console.log(`   Quantity: 1 contract`);
  console.log(`   SL: $2.21 (10% of premium)`);
  console.log(`   TP: $2.97 (20% of premium)\n`);

  // ============================================================
  // PART 2: INTELLIGENT REENTRY MODULE
  // ============================================================

  console.log("═══════════════════════════════════════════════════════════");
  console.log("PART 2: INTELLIGENT REENTRY MODULE - 11:45 AM (2h 15m later)");
  console.log("═══════════════════════════════════════════════════════════\n");

  const reentryModule = new OdteIntelligentReentryModule();

  // SIMULATED trade exit (trailing stop)
  const simulatedExit = {
    tradeId: "0DTE_001_1693489200000",
    symbol: "SPY",
    type: "CALL" as const,
    entryPrice: 2.45,
    exitPrice: 2.63,
    exitReason: "TRAILING" as const,
    exitTime: new Date(),
    exitP_L: 18.0,
    exitP_LPct: 7.35,
  };

  reentryModule.recordExit(simulatedExit);

  console.log("SIMULATED SCENARIO: Price movement after exit\n");

  const simulatedCurrentPrice = 2.78; // Price moved up after trailing stop
  const simulatedTrend = "UP" as const;

  console.log(`Current time: 11:45 AM ET`);
  console.log(`Current SPY price: $${simulatedCurrentPrice.toFixed(2)}`);
  console.log(`Trend: ${simulatedTrend}`);
  console.log(`Movement since exit: +${((simulatedCurrentPrice - simulatedExit.exitPrice) / simulatedExit.exitPrice * 100).toFixed(2)}%\n`);

  reentryModule.checkTrendResumption("SPY", simulatedCurrentPrice, simulatedTrend);

  console.log("═══════════════════════════════════════════════════════════");
  console.log("REENTRY DECISION");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("⚠️  REENTRY OPPORTUNITY MARKED");
  console.log("   Confidence: 74%");
  console.log("   Suggested: CALL @ $2.78");
  console.log("   Decision: USER REVIEWS MANUALLY (not automatic)\n");

  console.log("🟡 USER DECISION: WAIT FOR BETTER CONFIRMATION\n");

  // ============================================================
  // PART 3: LEARNING DASHBOARD
  // ============================================================

  console.log("═══════════════════════════════════════════════════════════");
  console.log("PART 3: LEARNING DASHBOARD - 4:00 PM (End of Day)");
  console.log("═══════════════════════════════════════════════════════════\n");

  const dashboard = new OdteLearningDashboard();

  // SIMULATED trades for the day
  const simulatedTrades = [
    {
      tradeId: "0DTE_001_1693489200000",
      symbol: "SPY",
      type: "CALL" as const,
      entryTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
      exitTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
      entryPrice: 2.45,
      exitPrice: 2.63,
      pnl: 18.0,
      pnlPct: 7.35,
      exitReason: "TRAILING",
      entryConfidence: 85,
      analysis: {
        whatWentWell: ["Entered at good time", "Trailing stop protected gains", "High confidence setup"],
        whatWentWrong: [],
        improvements: ["Could have held longer"],
      },
    },
    {
      tradeId: "0DTE_002_1693492800000",
      symbol: "QQQ",
      type: "PUT" as const,
      entryTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
      exitTime: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
      entryPrice: 1.82,
      exitPrice: 1.65,
      pnl: -17.0,
      pnlPct: -9.34,
      exitReason: "SL",
      entryConfidence: 62,
      analysis: {
        whatWentWell: [],
        whatWentWrong: ["Market moved quickly against position", "Low confidence entry"],
        improvements: ["Wait for >70% confidence on QQQ"],
      },
    },
    {
      tradeId: "0DTE_003_1693496400000",
      symbol: "SPY",
      type: "CALL" as const,
      entryTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      exitTime: new Date(Date.now() - 30 * 60 * 1000),
      entryPrice: 2.35,
      exitPrice: 2.85,
      pnl: 50.0,
      pnlPct: 21.28,
      exitReason: "TP",
      entryConfidence: 88,
      analysis: {
        whatWentWell: ["Perfect entry timing", "Hit TP exactly", "Very high confidence paid off"],
        whatWentWrong: [],
        improvements: [],
      },
    },
    {
      tradeId: "0DTE_004_1693498200000",
      symbol: "IWM",
      type: "PUT" as const,
      entryTime: new Date(Date.now() - 45 * 60 * 1000),
      exitTime: undefined,
      entryPrice: 1.95,
      exitPrice: undefined,
      pnl: undefined,
      pnlPct: undefined,
      exitReason: undefined,
      entryConfidence: 71,
      analysis: undefined,
    },
  ];

  // Add all trades to dashboard
  simulatedTrades.forEach((trade) => dashboard.addTrade(trade));

  console.log("🟢 SIMULATED DAILY ACTIVITY (4 trades)\n");

  dashboard.displayDashboard();

  // ============================================================
  // FINAL SUMMARY
  // ============================================================

  console.log("═══════════════════════════════════════════════════════════");
  console.log("FINAL SUMMARY: HOW USER SEES EVERYTHING");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("📊 WHAT THE USER SEES ON SCREEN TODAY:\n");

  console.log("9:30 AM - START OF DAY");
  console.log("  Panel shows: SPY CALL (ENTER), QQQ PUT (WAIT), IWM (DO NOT TRADE)");
  console.log("  User picks: SPY CALL");
  console.log("  Entry: $2.45 premium\n");

  console.log("11:45 AM - MID-SESSION");
  console.log("  Trade up +7.35% → Trailing stop activated");
  console.log("  Market rallies → Reentry Module shows: 'Confidence 74% reentry possible'");
  console.log("  User sees: ⚠️ NOT executing automatically");
  console.log("  User decides: Wait for confirmation\n");

  console.log("1:30 PM - AFTERNOON");
  console.log("  First trade closed: +$18.00");
  console.log("  Second trade closed: -$17.00");
  console.log("  Third trade closed: +$50.00");
  console.log("  One trade still open\n");

  console.log("4:00 PM - END OF DAY");
  console.log("  Dashboard shows:");
  console.log("    Win rate: 66.7%");
  console.log("    Total P&L: +$51.00");
  console.log("    Best trade: SPY CALL +$50");
  console.log("    Pattern: SPY consistently wins");
  console.log("    Improvement: 'Focus on SPY, improve QQQ entry filters'\n");

  // ============================================================
  // KEY POINTS HIGHLIGHTED
  // ============================================================

  console.log("═══════════════════════════════════════════════════════════");
  console.log("KEY FEATURES DEMONSTRATED");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("✅ PANEL DE OPORTUNIDADES:");
  console.log("   • Shows ENTER / WAIT / DO_NOT_TRADE with reasoning");
  console.log("   • Includes CALL vs PUT suggestions");
  console.log("   • Confidence score for each symbol");
  console.log("   • Premium estimates");
  console.log("   • Risk assessment\n");

  console.log("✅ REENTRY MODULE:");
  console.log("   • Detects when trend resumes after exit");
  console.log("   • Calculates confidence for reentry");
  console.log("   • Shows: Original trade, current price, suggested reentry");
  console.log("   • ⚠️ MARKS opportunity but DOES NOT execute");
  console.log("   • User makes final decision manually\n");

  console.log("✅ LEARNING DASHBOARD:");
  console.log("   • Win rate, P&L, profit factor");
  console.log("   • Best/worst trade analysis");
  console.log("   • Pattern detection (SPY = profitable, QQQ = needs work)");
  console.log("   • Improvement suggestions for next day");
  console.log("   • Post-trade analysis (what went well/wrong)\n");

  // ============================================================
  // CRITICAL NOTES
  // ============================================================

  console.log("═══════════════════════════════════════════════════════════");
  console.log("CRITICAL NOTES");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("🔴 NO REAL DATA - ALL SIMULATED");
  console.log("   Every number above is SIMULATED for demo purposes\n");

  console.log("🔒 NO ALPACA ORDERS SENT");
  console.log("   This is purely demonstration logic\n");

  console.log("🔒 NO PARAMETERS CHANGED");
  console.log("   FASE 1 parameters remain frozen:\n");
  console.log("   • 1 contract maximum");
  console.log("   • 3 trades/day maximum");
  console.log("   • SL 10% of premium");
  console.log("   • TP 20% of premium");
  console.log("   • Paper Trading MANDATORY");
  console.log("   • Real money DISABLED\n");

  console.log("✅ THESE 3 MODULES WORK WITH FASE 1");
  console.log("   They enhance decision-making without changing core rules\n");

  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("🟢 DEMO COMPLETE\n");
  console.log("When user activates FASE 1 with manager.enableExecution():");
  console.log("  1. Real trades will execute in Paper Trading");
  console.log("  2. Panel, Reentry, and Dashboard will work with REAL data");
  console.log("  3. All learning will be based on actual performance\n");
}

// Run demo
runCompleteDemo().catch(console.error);
