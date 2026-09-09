"use strict";
/**
 * Strategy Selector
 * Brain of Tito: analyzes market → selects strategy OR decides NOT to operate
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategySelector = void 0;
var strategyMatcher_1 = require("./strategyMatcher");
var riskGate_1 = require("./riskGate");
var StrategySelector = /** @class */ (function () {
    function StrategySelector() {
        this.matcher = new strategyMatcher_1.StrategyMatcher();
        this.riskGate = new riskGate_1.RiskGate();
    }
    StrategySelector.prototype.selectStrategy = function (conditions) {
        var _this = this;
        // Step 0: Verify regime is recognized
        var validRegimes = ["BULLISH_STRONG", "BULLISH_WEAK", "BEARISH_STRONG", "BEARISH_WEAK", "LATERAL", "HIGH_VOLATILITY", "EARNINGS_EVENT"];
        if (!validRegimes.includes(conditions.regime)) {
            return {
                status: "DO_NOT_OPERATE",
                confidence: 0,
                compatibilityScore: 0,
                explanation: "Unknown market regime: ".concat(conditions.regime, ". Cannot determine appropriate strategy."),
                reasons: ["Regime \"".concat(conditions.regime, "\" is not recognized. Valid regimes: ").concat(validRegimes.join(", "))],
            };
        }
        // Step 1: Get all strategies matched to this regime
        var regimeMatches = this.matcher.matchStrategiesToRegime(conditions.regime);
        // Step 2: Filter to only unblocked strategies
        var unblockedStrategies = this.matcher.getUnblockedStrategies();
        var validMatches = regimeMatches.filter(function (m) { return unblockedStrategies.includes(m.strategy) && !m.blockedReason; });
        if (validMatches.length === 0) {
            return {
                status: "DO_NOT_OPERATE",
                confidence: 0,
                compatibilityScore: 0,
                explanation: "No valid strategies for regime ".concat(conditions.regime, ". All candidates blocked or incompatible."),
                reasons: ["No unblocked strategies match current regime"],
            };
        }
        // Step 3: For each candidate, check risk gates
        var bestValidStrategy = null;
        for (var _i = 0, validMatches_1 = validMatches; _i < validMatches_1.length; _i++) {
            var match = validMatches_1[_i];
            var profile = this.matcher.getStrategyProfile(match.strategy);
            if (!profile)
                continue;
            // Apply risk gates
            var gateResult = this.riskGate.validateStrategy(match.strategy, profile.symbol, profile.testWinRate, profile.testSharpe, profile.overfittingScore, profile.maxDrawdown, conditions.volume, conditions.earningsWithin24h);
            // If gates fail, skip this strategy
            if (!gateResult.allPassed) {
                continue;
            }
            // This strategy passed all gates
            var confidence = Math.min(match.confidence, 100 - profile.overfittingScore);
            var result = {
                status: "OPERATE",
                selectedStrategy: match.strategy,
                selectedSymbol: profile.symbol,
                confidence: Math.floor(confidence),
                compatibilityScore: Math.floor(match.compatibilityScore),
                riskGateResult: gateResult,
                explanation: "\u2705 OPERATE: ".concat(match.strategy, " selected for ").concat(conditions.regime, " regime. All risk gates passed."),
                reasons: [
                    "Regime preference: ".concat(match.compatibilityScore.toFixed(0), "/100 compatibility"),
                    "Generalization: ".concat(profile.generalizationQuality, " (").concat(100 - profile.overfittingScore, "% reliability)"),
                    "Test performance: ".concat(profile.testWinRate, "% win rate, ").concat(profile.testSharpe.toFixed(2), " Sharpe"),
                    "All 6 risk gates passed",
                ],
            };
            // Keep track of best strategy (highest confidence)
            if (!bestValidStrategy || result.confidence > bestValidStrategy.confidence) {
                bestValidStrategy = result;
            }
        }
        if (bestValidStrategy) {
            return bestValidStrategy;
        }
        // No strategy passed all gates
        var failedStrategies = validMatches
            .map(function (match) {
            var profile = _this.matcher.getStrategyProfile(match.strategy);
            if (!profile)
                return null;
            var gateResult = _this.riskGate.validateStrategy(match.strategy, profile.symbol, profile.testWinRate, profile.testSharpe, profile.overfittingScore, profile.maxDrawdown, conditions.volume, conditions.earningsWithin24h);
            return { strategy: match.strategy, failures: gateResult.reasons };
        })
            .filter(function (x) { return x !== null; });
        return {
            status: "DO_NOT_OPERATE",
            confidence: 0,
            compatibilityScore: 0,
            explanation: "❌ DO NOT OPERATE: All strategies failed risk gate validation. Conditions not favorable for trading.",
            reasons: __spreadArray([
                "Regime: ".concat(conditions.regime),
                "VIX: ".concat(conditions.vix),
                "Failures:"
            ], failedStrategies.flatMap(function (f) { return (f ? ["  ".concat(f.strategy, ": ").concat(f.failures.join("; "))] : []); }), true),
        };
    };
    StrategySelector.prototype.getBlockedStrategies = function () {
        return this.matcher.getBlockedStrategies();
    };
    StrategySelector.prototype.isLongStraddleDisabled = function () {
        return this.matcher.isStrategyBlocked("LongStraddleStrategy");
    };
    StrategySelector.prototype.getDecisionExplanation = function (result) {
        var lines = [
            "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
            result.status === "OPERATE"
                ? "\u2705 DECISION: OPERATE"
                : "\u274C DECISION: DO NOT OPERATE",
            "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
            "",
            result.explanation,
            "",
            "Reasoning:",
        ];
        result.reasons.forEach(function (reason) {
            lines.push("  \u2022 ".concat(reason));
        });
        if (result.riskGateResult) {
            lines.push("", "Risk Gates:");
            result.riskGateResult.gateResults.forEach(function (gate) {
                var status = gate.passed ? "✅" : "❌";
                lines.push("  ".concat(status, " ").concat(gate.gateName, ": ").concat(gate.value, " (threshold: ").concat(gate.threshold, ")"));
            });
        }
        if (result.status === "OPERATE") {
            lines.push("", "Selected Strategy: ".concat(result.selectedStrategy), "Target: ".concat(result.selectedSymbol), "Confidence: ".concat(result.confidence, "/100"), "Compatibility: ".concat(result.compatibilityScore, "/100"));
        }
        lines.push("", "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
        return lines.join("\n");
    };
    return StrategySelector;
}());
exports.StrategySelector = StrategySelector;
