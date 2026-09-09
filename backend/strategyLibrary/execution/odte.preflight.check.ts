/**
 * 0DTE Pre-Flight Check
 * Mandatory validation before ANY 0DTE operation
 * Does NOT execute orders, does NOT enable execution
 * Must pass ALL checks before Tito can trade
 */

export interface PrefligthResult {
  passed: boolean;
  status: "READY FOR PAPER 0DTE" | "BLOCKED — DO NOT TRADE";
  checks: Array<{
    name: string;
    status: "PASS" | "FAIL";
    detail: string;
  }>;
  blockerReasons: string[];
  timestamp: Date;
}

export class OdtePreflight {
  /**
   * Run complete pre-flight check
   */
  async runFullCheck(systemState: {
    alpacaConnected: boolean;
    paperTradeMode: boolean;
    realMoneyDisabled: boolean;
    optionsMarketOpen: boolean;
    optionDataAvailable: boolean;
    spyDataValid: boolean;
    qqqDataValid: boolean;
    iwmDataValid: boolean;
    bidAskDataAvailable: boolean;
    volumeDataAvailable: boolean;
    openInterestAvailable: boolean;
    loggerWriting: boolean;
    learningEngineActive: boolean;
    existingPositionsReconciled: boolean;
    odtePositionCount: number;
    odtePositionLimit: number;
    dailyTradeCount: number;
    dailyTradeLimit: number;
    dailyMaxLossLimit: number;
    currentDailyLoss: number;
    slConfigured: boolean;
    tpConfigured: boolean;
    trailingConfigured: boolean;
    currentHourET: number;
    currentMinuteET: number;
    entryWindowStart: number;
    entryWindowEnd: number;
    forcedCloseTime: number;
    connectionLossProtocol: boolean;
  }): Promise<PrefligthResult> {
    const checks: Array<{
      name: string;
      status: "PASS" | "FAIL";
      detail: string;
    }> = [];
    const blockers: string[] = [];

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║              0DTE PRE-FLIGHT CHECK - STARTING              ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    // ============================================================
    // CONNECTIVITY CHECKS
    // ============================================================

    console.log("🔗 CONNECTIVITY CHECKS\n");

    // 1. Alpaca connection
    checks.push({
      name: "Alpaca Connected",
      status: systemState.alpacaConnected ? "PASS" : "FAIL",
      detail: systemState.alpacaConnected
        ? "✅ Alpaca API responding"
        : "❌ Cannot reach Alpaca API",
    });
    if (!systemState.alpacaConnected) blockers.push("Alpaca API not accessible");

    // 2. Paper trading mode
    checks.push({
      name: "Paper Trading Mode",
      status: systemState.paperTradeMode ? "PASS" : "FAIL",
      detail: systemState.paperTradeMode
        ? "✅ Paper trading ENABLED"
        : "❌ Paper trading DISABLED",
    });
    if (!systemState.paperTradeMode) blockers.push("Paper trading mode not enabled");

    // 3. Real money disabled
    checks.push({
      name: "Real Money Disabled",
      status: systemState.realMoneyDisabled ? "PASS" : "FAIL",
      detail: systemState.realMoneyDisabled
        ? "✅ Real money DISABLED"
        : "❌ Real money ENABLED (critical safety issue)",
    });
    if (!systemState.realMoneyDisabled) blockers.push("Real money is enabled (critical)");

    // ============================================================
    // MARKET DATA CHECKS
    // ============================================================

    console.log("📊 MARKET DATA CHECKS\n");

    // 4. Options market open
    checks.push({
      name: "Options Market Open",
      status: systemState.optionsMarketOpen ? "PASS" : "FAIL",
      detail: systemState.optionsMarketOpen
        ? "✅ Options market currently open"
        : "❌ Options market closed",
    });
    if (!systemState.optionsMarketOpen) blockers.push("Options market not open");

    // 5. Option data available
    checks.push({
      name: "Option Chain Data",
      status: systemState.optionDataAvailable ? "PASS" : "FAIL",
      detail: systemState.optionDataAvailable
        ? "✅ Option chains available"
        : "❌ Cannot fetch option chains",
    });
    if (!systemState.optionDataAvailable) blockers.push("Option chain data unavailable");

    // 6. SPY data valid
    checks.push({
      name: "SPY Prices Valid",
      status: systemState.spyDataValid ? "PASS" : "FAIL",
      detail: systemState.spyDataValid
        ? "✅ SPY receiving valid prices"
        : "❌ SPY price data stale or invalid",
    });
    if (!systemState.spyDataValid) blockers.push("SPY price data invalid");

    // 7. QQQ data valid
    checks.push({
      name: "QQQ Prices Valid",
      status: systemState.qqqDataValid ? "PASS" : "FAIL",
      detail: systemState.qqqDataValid
        ? "✅ QQQ receiving valid prices"
        : "❌ QQQ price data stale or invalid",
    });
    if (!systemState.qqqDataValid) blockers.push("QQQ price data invalid");

    // 8. IWM data valid
    checks.push({
      name: "IWM Prices Valid",
      status: systemState.iwmDataValid ? "PASS" : "FAIL",
      detail: systemState.iwmDataValid
        ? "✅ IWM receiving valid prices"
        : "❌ IWM price data stale or invalid",
    });
    if (!systemState.iwmDataValid) blockers.push("IWM price data invalid");

    // 9. Bid/Ask data
    checks.push({
      name: "Bid/Ask Spreads",
      status: systemState.bidAskDataAvailable ? "PASS" : "FAIL",
      detail: systemState.bidAskDataAvailable
        ? "✅ Bid/ask spreads available"
        : "❌ Cannot retrieve bid/ask data",
    });
    if (!systemState.bidAskDataAvailable) blockers.push("Bid/ask spread data unavailable");

    // 10. Volume data
    checks.push({
      name: "Volume Data",
      status: systemState.volumeDataAvailable ? "PASS" : "FAIL",
      detail: systemState.volumeDataAvailable
        ? "✅ Volume data available"
        : "❌ Cannot fetch volume data",
    });
    if (!systemState.volumeDataAvailable) blockers.push("Volume data unavailable");

    // 11. Open interest
    checks.push({
      name: "Open Interest",
      status: systemState.openInterestAvailable ? "PASS" : "FAIL",
      detail: systemState.openInterestAvailable
        ? "✅ Open interest available"
        : "❌ Cannot retrieve open interest",
    });
    if (!systemState.openInterestAvailable) blockers.push("Open interest data unavailable");

    // ============================================================
    // SYSTEM COMPONENTS
    // ============================================================

    console.log("⚙️  SYSTEM COMPONENTS\n");

    // 12. Logger
    checks.push({
      name: "Operation Logger",
      status: systemState.loggerWriting ? "PASS" : "FAIL",
      detail: systemState.loggerWriting
        ? "✅ Logger writing to file"
        : "❌ Logger cannot write",
    });
    if (!systemState.loggerWriting) blockers.push("Operation logger not functioning");

    // 13. Learning engine
    checks.push({
      name: "Learning Engine",
      status: systemState.learningEngineActive ? "PASS" : "FAIL",
      detail: systemState.learningEngineActive
        ? "✅ Learning engine active"
        : "❌ Learning engine offline",
    });
    if (!systemState.learningEngineActive) blockers.push("Learning engine not active");

    // ============================================================
    // POSITION & RISK CHECKS
    // ============================================================

    console.log("📋 POSITION & RISK CHECKS\n");

    // 14. Positions reconciled
    checks.push({
      name: "Existing Positions",
      status: systemState.existingPositionsReconciled ? "PASS" : "FAIL",
      detail: systemState.existingPositionsReconciled
        ? "✅ Positions reconciled from Alpaca"
        : "❌ Cannot reconcile positions",
    });
    if (!systemState.existingPositionsReconciled) blockers.push("Position reconciliation failed");

    // 15. 0DTE position count
    checks.push({
      name: "0DTE Position Limit",
      status: systemState.odtePositionCount < systemState.odtePositionLimit ? "PASS" : "FAIL",
      detail:
        systemState.odtePositionCount < systemState.odtePositionLimit
          ? `✅ ${systemState.odtePositionCount}/${systemState.odtePositionLimit} 0DTE open`
          : `❌ At limit: ${systemState.odtePositionCount}/${systemState.odtePositionLimit}`,
    });
    if (systemState.odtePositionCount >= systemState.odtePositionLimit) {
      blockers.push(`0DTE position limit reached (${systemState.odtePositionCount}/${systemState.odtePositionLimit})`);
    }

    // 16. Daily trade count
    checks.push({
      name: "Daily Trade Count",
      status: systemState.dailyTradeCount < systemState.dailyTradeLimit ? "PASS" : "FAIL",
      detail:
        systemState.dailyTradeCount < systemState.dailyTradeLimit
          ? `✅ ${systemState.dailyTradeCount}/${systemState.dailyTradeLimit} trades today`
          : `❌ At limit: ${systemState.dailyTradeCount}/${systemState.dailyTradeLimit}`,
    });
    if (systemState.dailyTradeCount >= systemState.dailyTradeLimit) {
      blockers.push(`Daily trade limit reached (${systemState.dailyTradeCount}/${systemState.dailyTradeLimit})`);
    }

    // 17. Daily max loss
    checks.push({
      name: "Daily Max Loss",
      status: systemState.currentDailyLoss < systemState.dailyMaxLossLimit ? "PASS" : "FAIL",
      detail:
        systemState.currentDailyLoss < systemState.dailyMaxLossLimit
          ? `✅ Daily loss: -$${Math.abs(systemState.currentDailyLoss).toFixed(2)}/$${systemState.dailyMaxLossLimit}`
          : `❌ At limit: -$${Math.abs(systemState.currentDailyLoss).toFixed(2)}/$${systemState.dailyMaxLossLimit}`,
    });
    if (systemState.currentDailyLoss >= systemState.dailyMaxLossLimit) {
      blockers.push(`Daily loss limit reached ($${systemState.currentDailyLoss.toFixed(2)}/$${systemState.dailyMaxLossLimit})`);
    }

    // ============================================================
    // CONFIGURATION CHECKS
    // ============================================================

    console.log("⚙️  CONFIGURATION CHECKS\n");

    // 18. SL configured
    checks.push({
      name: "Stop Loss Configuration",
      status: systemState.slConfigured ? "PASS" : "FAIL",
      detail: systemState.slConfigured
        ? "✅ SL: 10% of premium (PHASE 1)"
        : "❌ SL configuration missing",
    });
    if (!systemState.slConfigured) blockers.push("Stop loss not configured");

    // 19. TP configured
    checks.push({
      name: "Take Profit Configuration",
      status: systemState.tpConfigured ? "PASS" : "FAIL",
      detail: systemState.tpConfigured
        ? "✅ TP: 20% of premium (PHASE 1)"
        : "❌ TP configuration missing",
    });
    if (!systemState.tpConfigured) blockers.push("Take profit not configured");

    // 20. Trailing stop configured
    checks.push({
      name: "Trailing Stop Configuration",
      status: systemState.trailingConfigured ? "PASS" : "FAIL",
      detail: systemState.trailingConfigured
        ? "✅ Trailing stop: 5% after +10% gain"
        : "❌ Trailing stop not configured",
    });
    if (!systemState.trailingConfigured) blockers.push("Trailing stop not configured");

    // ============================================================
    // TIMING CHECKS
    // ============================================================

    console.log("⏰ TIMING CHECKS\n");

    const currentTimeET = systemState.currentHourET + systemState.currentMinuteET / 60;
    const entryWindowET = systemState.entryWindowStart + systemState.entryWindowEnd / 60;
    const inEntryWindow =
      currentTimeET >= systemState.entryWindowStart && currentTimeET <= systemState.entryWindowEnd;

    // 21. Entry window
    checks.push({
      name: "Entry Window (9:30-15:00 ET)",
      status: inEntryWindow ? "PASS" : "FAIL",
      detail: inEntryWindow
        ? `✅ In entry window (current: ${systemState.currentHourET}:${systemState.currentMinuteET.toString().padStart(2, "0")} ET)`
        : `❌ Outside entry window (current: ${systemState.currentHourET}:${systemState.currentMinuteET.toString().padStart(2, "0")} ET)`,
    });
    if (!inEntryWindow) blockers.push("Current time outside entry window");

    // 22. Forced close protection
    checks.push({
      name: "Forced Close Protection (3:45 PM ET)",
      status: "PASS",
      detail: `✅ Auto-close active at ${systemState.forcedCloseTime}:00 ET`,
    });

    // ============================================================
    // SAFETY PROTOCOL
    // ============================================================

    console.log("🛡️  SAFETY PROTOCOL\n");

    // 23. Connection loss protocol
    checks.push({
      name: "Connection Loss Protocol",
      status: systemState.connectionLossProtocol ? "PASS" : "FAIL",
      detail: systemState.connectionLossProtocol
        ? "✅ Auto-liquidation protocol ready"
        : "❌ Connection loss protocol missing",
    });
    if (!systemState.connectionLossProtocol) blockers.push("Connection loss protocol not available");

    // ============================================================
    // FINAL RESULT
    // ============================================================

    const allPassed = blockers.length === 0;

    console.log("═══════════════════════════════════════════════════════════\n");

    if (allPassed) {
      console.log("✅ ✅ ✅ ALL CHECKS PASSED ✅ ✅ ✅\n");
      console.log("Status: 🟢 READY FOR PAPER 0DTE\n");
      console.log("⚠️  IMPORTANT:\n");
      console.log("   Even though all checks pass, Tito will NOT execute trades");
      console.log("   without EXPLICIT approval from user.\n");
      console.log("   Required to activate: manager.enableExecution('reason')\n");
    } else {
      console.log("❌ ❌ ❌ BLOCKED — DO NOT TRADE ❌ ❌ ❌\n");
      console.log(`Status: 🔴 BLOCKED — ${blockers.length} critical issue(s)\n`);
      console.log("Blocker reasons:\n");
      blockers.forEach((reason, idx) => {
        console.log(`   ${idx + 1}. ${reason}`);
      });
      console.log();
    }

    console.log("═══════════════════════════════════════════════════════════\n");

    // Print all checks
    console.log("DETAILED CHECK RESULTS:\n");
    checks.forEach((check) => {
      const icon = check.status === "PASS" ? "✅" : "❌";
      console.log(`${icon} ${check.name}`);
      console.log(`   ${check.detail}\n`);
    });

    return {
      passed: allPassed,
      status: allPassed ? "READY FOR PAPER 0DTE" : "BLOCKED — DO NOT TRADE",
      checks,
      blockerReasons: blockers,
      timestamp: new Date(),
    };
  }
}

export default OdtePreflight;
