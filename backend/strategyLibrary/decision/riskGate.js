"use strict";
/**
 * Risk Gate
 * Implements 6 mandatory gates that MUST pass before any trade
 * A single gate failure = DO NOT OPERATE
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskGate = void 0;
var RiskGate = /** @class */ (function () {
    function RiskGate() {
    }
    // Gate 1: Win Rate >45% minimum
    RiskGate.prototype.checkWinRateGate = function (winRate) {
        var passed = winRate >= 45;
        return {
            gateName: "Win Rate",
            passed: passed,
            value: "".concat(winRate.toFixed(1), "%"),
            threshold: "45%",
            failureReason: passed ? undefined : "Win rate ".concat(winRate.toFixed(1), "% is below 45% minimum (too risky)"),
        };
    };
    // Gate 2: Sharpe Ratio >0.5 minimum
    RiskGate.prototype.checkSharpeRatioGate = function (sharpeRatio) {
        var passed = sharpeRatio >= 0.5;
        return {
            gateName: "Sharpe Ratio",
            passed: passed,
            value: sharpeRatio.toFixed(2),
            threshold: "0.5",
            failureReason: passed ? undefined : "Sharpe ratio ".concat(sharpeRatio.toFixed(2), " below 0.5 (inadequate risk-adjusted returns)"),
        };
    };
    // Gate 3: Overfitting <50% maximum
    RiskGate.prototype.checkOverfittingGate = function (overfittingScore) {
        var passed = overfittingScore < 50;
        return {
            gateName: "Overfitting",
            passed: passed,
            value: "".concat(overfittingScore.toFixed(1), "%"),
            threshold: "<50%",
            failureReason: passed ? undefined : "Overfitting ".concat(overfittingScore.toFixed(1), "% exceeds 50% threshold (poor generalization)"),
        };
    };
    // Gate 4: Max Drawdown <6% maximum
    RiskGate.prototype.checkDrawdownGate = function (maxDrawdown) {
        var passed = Math.abs(maxDrawdown) < 6;
        return {
            gateName: "Max Drawdown",
            passed: passed,
            value: "".concat(maxDrawdown.toFixed(1), "%"),
            threshold: "<6%",
            failureReason: passed ? undefined : "Drawdown ".concat(Math.abs(maxDrawdown).toFixed(1), "% exceeds 6% (excessive risk)"),
        };
    };
    // Gate 5: Liquidity adequate
    RiskGate.prototype.checkLiquidityGate = function (symbol, volume) {
        var minimums = {
            SPY: 20000000, // 20M
            QQQ: 15000000, // 15M
            BTC: 500000000, // 500M
            VIX: 100000000, // 100M (estimated)
        };
        var minimum = minimums[symbol] || 10000000;
        var passed = volume >= minimum;
        return {
            gateName: "Liquidity",
            passed: passed,
            value: "".concat((volume / 1000000).toFixed(1), "M"),
            threshold: "".concat((minimum / 1000000).toFixed(0), "M"),
            failureReason: passed ? undefined : "Volume ".concat((volume / 1000000).toFixed(1), "M below required ").concat((minimum / 1000000).toFixed(0), "M"),
        };
    };
    // Gate 6: No earnings within 24 hours (only for individual stocks, NOT indices/crypto)
    RiskGate.prototype.checkEarningsGate = function (symbol, earningsWithin24h) {
        // Only apply to individual stocks, NOT to indices or crypto
        var isIndividualStock = !["SPY", "QQQ", "VIX", "BTC", "ETH"].includes(symbol);
        if (!isIndividualStock) {
            // Gate passes automatically for indices and crypto
            return {
                gateName: "Earnings",
                passed: true,
                value: "N/A (index/crypto)",
                threshold: "N/A",
            };
        }
        var passed = !earningsWithin24h;
        return {
            gateName: "Earnings",
            passed: passed,
            value: earningsWithin24h ? "YES (earnings 24h)" : "NO (safe)",
            threshold: "No earnings 24h before",
            failureReason: passed ? undefined : "Earnings announced within 24 hours (block trade)",
        };
    };
    // Run all 6 gates
    RiskGate.prototype.validateStrategy = function (strategyName, symbol, winRate, sharpeRatio, overfittingScore, maxDrawdown, volume, earningsWithin24h) {
        var gateResults = [
            this.checkWinRateGate(winRate),
            this.checkSharpeRatioGate(sharpeRatio),
            this.checkOverfittingGate(overfittingScore),
            this.checkDrawdownGate(maxDrawdown),
            this.checkLiquidityGate(symbol, volume),
            this.checkEarningsGate(symbol, earningsWithin24h),
        ];
        var allPassed = gateResults.every(function (g) { return g.passed; });
        var failureCount = gateResults.filter(function (g) { return !g.passed; }).length;
        var reasons = gateResults.filter(function (g) { return g.failureReason; }).map(function (g) { return g.failureReason; });
        return {
            allPassed: allPassed,
            gateResults: gateResults,
            failureCount: failureCount,
            recommendation: allPassed ? "OPERATE" : "DO_NOT_OPERATE",
            reasons: reasons,
        };
    };
    // Get gate summary as string
    RiskGate.prototype.getSummary = function (result) {
        var header = "Risk Gate Analysis: ".concat(result.recommendation);
        var summary = result.gateResults.map(function (g) { return "  ".concat(g.gateName, ": ").concat(g.passed ? "✅" : "❌", " (").concat(g.value, ")"); }).join("\n");
        var failures = result.reasons.length > 0 ? "\nFailures:\n".concat(result.reasons.map(function (r) { return "  - ".concat(r); }).join("\n")) : "";
        return "".concat(header, "\n").concat(summary).concat(failures);
    };
    return RiskGate;
}());
exports.RiskGate = RiskGate;
