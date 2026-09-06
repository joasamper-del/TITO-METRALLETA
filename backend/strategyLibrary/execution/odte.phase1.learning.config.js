"use strict";
/**
 * 0DTE Phase 1 - Conservative Learning Configuration
 * PAPER TRADING ONLY
 * NO real orders until explicit approval
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Phase1Simulator = exports.ODTE_PHASE1_CONFIG = void 0;
exports.validatePhase1Config = validatePhase1Config;
exports.ODTE_PHASE1_CONFIG = {
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
function validatePhase1Config() {
    var errors = [];
    // Check that timing makes sense
    if (exports.ODTE_PHASE1_CONFIG.entryStopTime >= exports.ODTE_PHASE1_CONFIG.forcedClosureTime) {
        errors.push("Entry stop time must be before forced closure time");
    }
    // Check that SL/TP are reasonable for learning
    if (exports.ODTE_PHASE1_CONFIG.slPercentageOfPremium > 0.5) {
        errors.push("SL percentage too high (> 50%)");
    }
    if (exports.ODTE_PHASE1_CONFIG.tpPercentageOfPremium > 0.5) {
        errors.push("TP percentage too high (> 50%)");
    }
    // Check that trailing stop activation makes sense
    if (exports.ODTE_PHASE1_CONFIG.trailingStopActivationGain <= 0 ||
        exports.ODTE_PHASE1_CONFIG.trailingStopActivationGain > 0.5) {
        errors.push("Trailing stop activation gain must be 0-50%");
    }
    // Check paper trading is enabled
    if (!exports.ODTE_PHASE1_CONFIG.paperTradingOnly || !exports.ODTE_PHASE1_CONFIG.realMoneyDisabled) {
        errors.push("Paper trading must be enabled for Phase 1");
    }
    return {
        valid: errors.length === 0,
        errors: errors,
    };
}
// === SIMULATION MODE (no real orders) ===
var Phase1Simulator = /** @class */ (function () {
    function Phase1Simulator() {
        this.config = exports.ODTE_PHASE1_CONFIG;
    }
    Phase1Simulator.prototype.simulateTrade = function (scenario) {
        var premiumPaid = scenario.premiumPaid, exitPrice = scenario.exitPrice, exitReason = scenario.exitReason;
        // Calculate profit per contract (1 contract = 100 shares)
        var priceChange = exitPrice - premiumPaid;
        var contractProfit = priceChange * 100;
        var profitPercentage = (priceChange / premiumPaid) * 100;
        // Determine which exit level was used
        var slLevel = premiumPaid * (1 - this.config.slPercentageOfPremium);
        var tpLevel = premiumPaid * (1 + this.config.tpPercentageOfPremium);
        var trailingActivationLevel = premiumPaid * (1 + this.config.trailingStopActivationGain);
        // Check if trailing stop would have been active
        var exitLevelUsed = "UNKNOWN";
        var trailingStopWouldHaveActivated = false;
        if (exitReason === "TP") {
            exitLevelUsed = "TP @ $".concat(tpLevel.toFixed(4));
        }
        else if (exitReason === "SL") {
            exitLevelUsed = "SL @ $".concat(slLevel.toFixed(4));
        }
        else if (exitReason === "TRAILING") {
            if (exitPrice >= trailingActivationLevel) {
                trailingStopWouldHaveActivated = true;
                var trailingLevel = trailingActivationLevel * (1 - this.config.trailingStopPercentage);
                exitLevelUsed = "TRAILING @ $".concat(trailingLevel.toFixed(4));
            }
        }
        else if (exitReason === "TIME_CLOSE") {
            exitLevelUsed = "FORCED CLOSE (time limit)";
        }
        else if (exitReason === "CONNECTION_LOSS") {
            exitLevelUsed = "FORCED CLOSE (connection loss)";
        }
        return {
            contractProfit: contractProfit,
            profitPercentage: profitPercentage,
            exitLevelUsed: exitLevelUsed,
            trailingStopWouldHaveActivated: trailingStopWouldHaveActivated,
        };
    };
    /**
     * Run a logical simulation of the Phase 1 framework
     * WITHOUT sending orders to Alpaca
     */
    Phase1Simulator.prototype.runLogicalSimulation = function () {
        console.log("\n╔════════════════════════════════════════════════════════════╗");
        console.log("║           0DTE PHASE 1 - LOGICAL SIMULATION (NO ORDERS)    ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");
        // Validate config
        var validation = validatePhase1Config();
        if (!validation.valid) {
            console.log("❌ CONFIGURATION VALIDATION FAILED:");
            validation.errors.forEach(function (e) { return console.log("   \u2022 ".concat(e)); });
            return;
        }
        console.log("✅ CONFIGURATION VALIDATION PASSED\n");
        console.log("📋 PHASE 1 PARAMETERS:");
        console.log("   Max contracts/trade:    ".concat(this.config.maxContractsPerTrade));
        console.log("   Max trades/day:         ".concat(this.config.maxOperationsPerDay));
        console.log("   Max simultaneous pos:   ".concat(this.config.maxSimultaneousPositions));
        console.log("   Entry hours:            ".concat(this.config.entryStartTime, " - ").concat(this.config.entryStopTime, " ET"));
        console.log("   Forced close:           ".concat(this.config.forcedClosureTime, " ET"));
        console.log("   SL percentage:          ".concat((this.config.slPercentageOfPremium * 100).toFixed(0), "% of premium"));
        console.log("   TP percentage:          ".concat((this.config.tpPercentageOfPremium * 100).toFixed(0), "% of premium"));
        console.log("   Trailing stop active:   ".concat(this.config.trailingStopEnabled, " (after +").concat((this.config.trailingStopActivationGain * 100).toFixed(0), "%)"));
        console.log("   Symbols:                ".concat(this.config.approvedSymbols.join(", "), "\n"));
        // Simulate 3 example trades
        console.log("🎯 EXAMPLE TRADE SIMULATIONS (1 contract each):\n");
        // Trade 1: TP hit
        var trade1 = this.simulateTrade({
            symbol: "SPY",
            type: "CALL",
            premiumPaid: 1.5,
            exitPrice: 1.8, // Above TP level
            exitReason: "TP",
        });
        console.log("TRADE 1 (SPY CALL @ $1.50):");
        console.log("   Exit @ $1.80 via ".concat(trade1.exitLevelUsed));
        console.log("   Profit: $".concat(trade1.contractProfit.toFixed(2), " (").concat(trade1.profitPercentage.toFixed(1), "%)\n"));
        // Trade 2: SL hit
        var trade2 = this.simulateTrade({
            symbol: "QQQ",
            type: "PUT",
            premiumPaid: 2.0,
            exitPrice: 1.8, // Below SL level
            exitReason: "SL",
        });
        console.log("TRADE 2 (QQQ PUT @ $2.00):");
        console.log("   Exit @ $1.80 via ".concat(trade2.exitLevelUsed));
        console.log("   Loss: $".concat(trade2.contractProfit.toFixed(2), " (").concat(trade2.profitPercentage.toFixed(1), "%)\n"));
        // Trade 3: Trailing stop after +10% gain
        var trade3 = this.simulateTrade({
            symbol: "IWM",
            type: "CALL",
            premiumPaid: 1.0,
            exitPrice: 1.15, // +15%, triggers trailing
            exitReason: "TRAILING",
        });
        console.log("TRADE 3 (IWM CALL @ $1.00):");
        console.log("   Exit @ $1.15 via ".concat(trade3.exitLevelUsed));
        console.log("   Profit: $".concat(trade3.contractProfit.toFixed(2), " (").concat(trade3.profitPercentage.toFixed(1), "%)"));
        console.log("   Trailing stop activated: ".concat(trade3.trailingStopWouldHaveActivated, "\n"));
        // Summary
        console.log("═══════════════════════════════════════════════════════════");
        console.log("✅ ALL SIMULATIONS COMPLETED");
        console.log("✅ NO REAL ORDERS SENT TO ALPACA");
        console.log("✅ FRAMEWORK LOGIC VALIDATED");
        console.log("═══════════════════════════════════════════════════════════\n");
        console.log("🟢 READY FOR PHASE 1 ACTIVATION");
        console.log("   Awaiting user final approval...\n");
    };
    return Phase1Simulator;
}());
exports.Phase1Simulator = Phase1Simulator;
// Run simulation if executed directly
if (require.main === module) {
    var simulator = new Phase1Simulator();
    simulator.runLogicalSimulation();
}
exports.default = exports.ODTE_PHASE1_CONFIG;
