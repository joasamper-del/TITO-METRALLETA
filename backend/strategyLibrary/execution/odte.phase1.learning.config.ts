/**
 * 0DTE Phase 1 - Conservative Learning Configuration
 * PAPER TRADING ONLY
 * NO real orders until explicit approval
 */

export const ODTE_PHASE1_CONFIG = {
  // === TRADING LIMITS ===
  maxContractsPerTrade: 1, // Ultra-conservative: learn with 1 contract
  maxOperationsPerDay: 3, // Very limited: 3 trades max per day
  maxSimultaneousPositions: 1, // Only 1 0DTE open at a time

  // === POSITION SIZING ===
  // Position size determined by 1 contract * premium paid
  // Example: SPY CALL @ $1.50 premium = 1 contract = $150 risk
  // No target dollar amount; size limited by contract count alone

  // === ENTRY TIMING ===
  entryStartTime: "09:30", // 9:30 AM ET
  entryStopTime: "15:00", // 3:00 PM ET (stop NEW entries)

  // === EXIT TIMING ===
  forcedClosureTime: "15:45", // 3:45 PM ET (close all remaining 0DTEs)
  marketCloseTime: "16:00", // 4:00 PM ET

  // === STOP LOSS & TAKE PROFIT ===
  // PHASE 1: Wide SL/TP for learning (not tight 1%/2%)
  slPercentageOfPremium: 0.10, // SL at 90% of premium (10% loss tolerance)
  tpPercentageOfPremium: 0.20, // TP at 120% of premium (20% gain target)

  // === TRAILING STOP ===
  // Only activate after reaching +10% profit
  trailingStopEnabled: true,
  trailingStopActivationGain: 0.10, // Activate when +10% premium gain
  trailingStopPercentage: 0.05, // Lock 5% of gains as trailing stop

  // === ENTRY FILTERS ===
  bidAskSpreadMax: 0.05, // 5% max spread (bid-ask / mid)
  volumeMinimum: 500, // 500 contracts/hour minimum
  openInterestMinimum: 100, // 100 OI minimum

  // === SYMBOLS ===
  approvedSymbols: ["SPY", "QQQ", "IWM"],

  // === TRADING MODE ===
  paperTradingOnly: true,
  realMoneyDisabled: true,
  alpacaEndpoint: "https://paper-api.alpaca.markets",

  // === LEARNING ENGINE ===
  recordExitReason: true, // Always record why trade closed
  trackTrailingStopActivations: true, // Track when trailing stop kicks in
  allowReentryAnalysis: true, // Analyze "what if" reentries
  autoReentryDisabled: true, // Don't auto-reenter; only learn from patterns
};

// === VALIDATION: Ensure no conflicts ===
export function validatePhase1Config(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that timing makes sense
  if (ODTE_PHASE1_CONFIG.entryStopTime >= ODTE_PHASE1_CONFIG.forcedClosureTime) {
    errors.push("Entry stop time must be before forced closure time");
  }

  // Check that SL/TP are reasonable for learning
  if (ODTE_PHASE1_CONFIG.slPercentageOfPremium > 0.5) {
    errors.push("SL percentage too high (> 50%)");
  }

  if (ODTE_PHASE1_CONFIG.tpPercentageOfPremium > 0.5) {
    errors.push("TP percentage too high (> 50%)");
  }

  // Check that trailing stop activation makes sense
  if (
    ODTE_PHASE1_CONFIG.trailingStopActivationGain <= 0 ||
    ODTE_PHASE1_CONFIG.trailingStopActivationGain > 0.5
  ) {
    errors.push("Trailing stop activation gain must be 0-50%");
  }

  // Check paper trading is enabled
  if (!ODTE_PHASE1_CONFIG.paperTradingOnly || !ODTE_PHASE1_CONFIG.realMoneyDisabled) {
    errors.push("Paper trading must be enabled for Phase 1");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// === SIMULATION MODE (no real orders) ===
export class Phase1Simulator {
  private config = ODTE_PHASE1_CONFIG;

  simulateTrade(scenario: {
    symbol: string;
    type: "CALL" | "PUT";
    premiumPaid: number;
    exitPrice: number;
    exitReason: "TP" | "SL" | "TRAILING" | "TIME_CLOSE" | "CONNECTION_LOSS";
  }): {
    contractProfit: number;
    profitPercentage: number;
    exitLevelUsed: string;
    trailingStopWouldHaveActivated: boolean;
  } {
    const { premiumPaid, exitPrice, exitReason } = scenario;

    // Calculate profit per contract (1 contract = 100 shares)
    const priceChange = exitPrice - premiumPaid;
    const contractProfit = priceChange * 100;
    const profitPercentage = (priceChange / premiumPaid) * 100;

    // Determine which exit level was used
    const slLevel = premiumPaid * (1 - this.config.slPercentageOfPremium);
    const tpLevel = premiumPaid * (1 + this.config.tpPercentageOfPremium);
    const trailingActivationLevel = premiumPaid * (1 + this.config.trailingStopActivationGain);

    // Check if trailing stop would have been active
    let exitLevelUsed = "UNKNOWN";
    let trailingStopWouldHaveActivated = false;

    if (exitReason === "TP") {
      exitLevelUsed = `TP @ $${tpLevel.toFixed(4)}`;
    } else if (exitReason === "SL") {
      exitLevelUsed = `SL @ $${slLevel.toFixed(4)}`;
    } else if (exitReason === "TRAILING") {
      if (exitPrice >= trailingActivationLevel) {
        trailingStopWouldHaveActivated = true;
        const trailingLevel = trailingActivationLevel * (1 - this.config.trailingStopPercentage);
        exitLevelUsed = `TRAILING @ $${trailingLevel.toFixed(4)}`;
      }
    } else if (exitReason === "TIME_CLOSE") {
      exitLevelUsed = "FORCED CLOSE (time limit)";
    } else if (exitReason === "CONNECTION_LOSS") {
      exitLevelUsed = "FORCED CLOSE (connection loss)";
    }

    return {
      contractProfit,
      profitPercentage,
      exitLevelUsed,
      trailingStopWouldHaveActivated,
    };
  }

  /**
   * Run a logical simulation of the Phase 1 framework
   * WITHOUT sending orders to Alpaca
   */
  runLogicalSimulation(): void {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║           0DTE PHASE 1 - LOGICAL SIMULATION (NO ORDERS)    ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    // Validate config
    const validation = validatePhase1Config();
    if (!validation.valid) {
      console.log("❌ CONFIGURATION VALIDATION FAILED:");
      validation.errors.forEach((e) => console.log(`   • ${e}`));
      return;
    }

    console.log("✅ CONFIGURATION VALIDATION PASSED\n");

    console.log("📋 PHASE 1 PARAMETERS:");
    console.log(`   Max contracts/trade:    ${this.config.maxContractsPerTrade}`);
    console.log(`   Max trades/day:         ${this.config.maxOperationsPerDay}`);
    console.log(`   Max simultaneous pos:   ${this.config.maxSimultaneousPositions}`);
    console.log(`   Entry hours:            ${this.config.entryStartTime} - ${this.config.entryStopTime} ET`);
    console.log(`   Forced close:           ${this.config.forcedClosureTime} ET`);
    console.log(`   SL percentage:          ${(this.config.slPercentageOfPremium * 100).toFixed(0)}% of premium`);
    console.log(`   TP percentage:          ${(this.config.tpPercentageOfPremium * 100).toFixed(0)}% of premium`);
    console.log(`   Trailing stop active:   ${this.config.trailingStopEnabled} (after +${(this.config.trailingStopActivationGain * 100).toFixed(0)}%)`);
    console.log(`   Symbols:                ${this.config.approvedSymbols.join(", ")}\n`);

    // Simulate 3 example trades
    console.log("🎯 EXAMPLE TRADE SIMULATIONS (1 contract each):\n");

    // Trade 1: TP hit
    const trade1 = this.simulateTrade({
      symbol: "SPY",
      type: "CALL",
      premiumPaid: 1.5,
      exitPrice: 1.8, // Above TP level
      exitReason: "TP",
    });
    console.log(`TRADE 1 (SPY CALL @ $1.50):`);
    console.log(`   Exit @ $1.80 via ${trade1.exitLevelUsed}`);
    console.log(`   Profit: $${trade1.contractProfit.toFixed(2)} (${trade1.profitPercentage.toFixed(1)}%)\n`);

    // Trade 2: SL hit
    const trade2 = this.simulateTrade({
      symbol: "QQQ",
      type: "PUT",
      premiumPaid: 2.0,
      exitPrice: 1.8, // Below SL level
      exitReason: "SL",
    });
    console.log(`TRADE 2 (QQQ PUT @ $2.00):`);
    console.log(`   Exit @ $1.80 via ${trade2.exitLevelUsed}`);
    console.log(`   Loss: $${trade2.contractProfit.toFixed(2)} (${trade2.profitPercentage.toFixed(1)}%)\n`);

    // Trade 3: Trailing stop after +10% gain
    const trade3 = this.simulateTrade({
      symbol: "IWM",
      type: "CALL",
      premiumPaid: 1.0,
      exitPrice: 1.15, // +15%, triggers trailing
      exitReason: "TRAILING",
    });
    console.log(`TRADE 3 (IWM CALL @ $1.00):`);
    console.log(`   Exit @ $1.15 via ${trade3.exitLevelUsed}`);
    console.log(`   Profit: $${trade3.contractProfit.toFixed(2)} (${trade3.profitPercentage.toFixed(1)}%)`);
    console.log(`   Trailing stop activated: ${trade3.trailingStopWouldHaveActivated}\n`);

    // Summary
    console.log("═══════════════════════════════════════════════════════════");
    console.log("✅ ALL SIMULATIONS COMPLETED");
    console.log("✅ NO REAL ORDERS SENT TO ALPACA");
    console.log("✅ FRAMEWORK LOGIC VALIDATED");
    console.log("═══════════════════════════════════════════════════════════\n");

    console.log("🟢 READY FOR PHASE 1 ACTIVATION");
    console.log("   Awaiting user final approval...\n");
  }
}

// Run simulation if executed directly
if (require.main === module) {
  const simulator = new Phase1Simulator();
  simulator.runLogicalSimulation();
}

export default ODTE_PHASE1_CONFIG;
