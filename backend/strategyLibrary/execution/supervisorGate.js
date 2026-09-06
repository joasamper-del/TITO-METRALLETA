"use strict";
/**
 * Supervisor Gate v4
 * 5 mandatory safety checks before ANY trade execution
 * ALL gates must pass, or trade is blocked
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupervisorGate = void 0;
var SupervisorGate = /** @class */ (function () {
    function SupervisorGate() {
    }
    // Gate 1: Max Daily Loss (-2% account)
    SupervisorGate.prototype.checkDailyLossGate = function (accountData) {
        var maxDailyLoss = accountData.totalBalance * -0.02; // -2%
        var passed = accountData.dailyPnL >= maxDailyLoss;
        return {
            gateName: "Daily Loss Limit",
            passed: passed,
            value: "".concat(accountData.dailyPnL.toFixed(2), " (").concat(((accountData.dailyPnL / accountData.totalBalance) * 100).toFixed(2), "%)"),
            threshold: "-2% (".concat(maxDailyLoss.toFixed(2), ")"),
            reason: passed
                ? undefined
                : "Daily loss ".concat(Math.abs(accountData.dailyPnL).toFixed(0), " exceeds 2% limit. Trading halted for day."),
        };
    };
    // Gate 2: Max Open Positions (3 concurrent)
    SupervisorGate.prototype.checkOpenPositionsGate = function (accountData) {
        var maxPositions = 3;
        var passed = accountData.openPositions < maxPositions;
        return {
            gateName: "Open Positions Limit",
            passed: passed,
            value: accountData.openPositions,
            threshold: maxPositions,
            reason: passed ? undefined : "Already have ".concat(accountData.openPositions, " open positions. Max is ").concat(maxPositions, "."),
        };
    };
    // Gate 3: Correlation Check (no 2+ highly correlated positions)
    SupervisorGate.prototype.checkCorrelationGate = function (symbol, openPositions) {
        var correlationMap = {
            SPY: ["QQQ", "IVV", "VOO"], // All broad market
            QQQ: ["SPY", "TQQQ"], // Tech-heavy
            BTC: ["ETH"], // Both crypto
            ETH: ["BTC"], // Both crypto
        };
        var correlatedSymbols = correlationMap[symbol] || [];
        var hasCorrelated = openPositions.some(function (pos) { return correlatedSymbols.includes(pos.symbol); });
        return {
            gateName: "Correlation Risk",
            passed: !hasCorrelated,
            value: hasCorrelated ? "HIGH" : "LOW",
            threshold: "No 2+ correlated positions",
            reason: hasCorrelated
                ? "New ".concat(symbol, " trade correlates with existing position. Risk too high.")
                : undefined,
        };
    };
    // Gate 4: Liquidity Re-Check (volume validation at entry time)
    SupervisorGate.prototype.checkLiquidityGate = function (marketData) {
        var minimumVolume = {
            SPY: 20000000, // 20M
            QQQ: 15000000, // 15M
            BTC: 500000000, // 500M
            ETH: 300000000, // 300M
        };
        var minimum = minimumVolume[marketData.symbol] || 10000000;
        var passed = marketData.volume >= minimum;
        return {
            gateName: "Liquidity Check",
            passed: passed,
            value: "".concat((marketData.volume / 1000000).toFixed(1), "M"),
            threshold: "".concat((minimum / 1000000).toFixed(0), "M"),
            reason: passed
                ? undefined
                : "Volume ".concat((marketData.volume / 1000000).toFixed(1), "M below ").concat((minimum / 1000000).toFixed(0), "M minimum. Too illiquid."),
        };
    };
    // Gate 5: Real-Time Macro Veto
    // In future: integrate with Red Pill source, news API, Fed calendar
    // For now: placeholder that checks high-risk conditions
    SupervisorGate.prototype.checkMacroVetoGate = function (marketData, _accountData) {
        // Placeholder: VIX > 50 is extreme panic (rare)
        var isExtremeFear = marketData.vix > 50;
        return {
            gateName: "Macro Veto",
            passed: !isExtremeFear,
            value: "VIX ".concat(marketData.vix.toFixed(1)),
            threshold: "VIX < 50 (no extreme panic)",
            reason: isExtremeFear
                ? "VIX ".concat(marketData.vix.toFixed(1), " indicates panic conditions. Wait for stabilization.")
                : undefined,
        };
    };
    /**
     * Run all 5 gates
     * Returns: all gates must pass (AND logic)
     */
    SupervisorGate.prototype.validate = function (accountData, marketData, openPositions) {
        if (openPositions === void 0) { openPositions = []; }
        var gateResults = [
            this.checkDailyLossGate(accountData),
            this.checkOpenPositionsGate(accountData),
            this.checkCorrelationGate(marketData.symbol, openPositions),
            this.checkLiquidityGate(marketData),
            this.checkMacroVetoGate(marketData, accountData),
        ];
        var allPassed = gateResults.every(function (g) { return g.passed; });
        var failureCount = gateResults.filter(function (g) { return !g.passed; }).length;
        var failureReasons = gateResults.filter(function (g) { return g.reason; }).map(function (g) { return g.reason; });
        return {
            allPassed: allPassed,
            gateResults: gateResults,
            failureCount: failureCount,
            recommendation: allPassed ? "APPROVE" : "REJECT",
            failureReasons: failureReasons,
        };
    };
    /**
     * Human-readable supervisor report
     */
    SupervisorGate.prototype.formatReport = function (decision) {
        var lines = [
            "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
            decision.allPassed ? "\u2705 SUPERVISOR APPROVAL" : "\u274C SUPERVISOR REJECTION",
            "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
            "",
            "Gate Results:",
        ];
        decision.gateResults.forEach(function (gate) {
            var status = gate.passed ? "✅" : "❌";
            lines.push("  ".concat(status, " ").concat(gate.gateName.padEnd(25), " ").concat(gate.value, " (threshold: ").concat(gate.threshold, ")"));
        });
        if (decision.failureReasons.length > 0) {
            lines.push("", "Failures:");
            decision.failureReasons.forEach(function (reason) {
                lines.push("  \u274C ".concat(reason));
            });
        }
        lines.push("", "Recommendation: ".concat(decision.recommendation), "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
        return lines.join("\n");
    };
    return SupervisorGate;
}());
exports.SupervisorGate = SupervisorGate;
