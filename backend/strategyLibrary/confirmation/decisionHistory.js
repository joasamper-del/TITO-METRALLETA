"use strict";
/**
 * Decision History Logger
 * Complete audit trail of every decision made by Tito
 * Stores: strategy, score, source breakdown, reasoning, final verdict
 * Enables post-trade analysis and continuous improvement
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.DecisionHistoryLogger = void 0;
var DecisionHistoryLogger = /** @class */ (function () {
    function DecisionHistoryLogger(sessionId) {
        this.history = [];
        this.maxHistorySize = 10000; // Keep last 10k decisions in memory
        this.sessionId = sessionId || "session_".concat(Date.now());
    }
    /**
     * Log a complete decision with all context
     */
    DecisionHistoryLogger.prototype.logDecision = function (entry) {
        var fullEntry = __assign(__assign({}, entry), { id: "decision_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9)), timestamp: new Date(), sessionId: this.sessionId });
        this.history.push(fullEntry);
        // Maintain max size (FIFO)
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
        return fullEntry.id;
    };
    /**
     * Get a specific decision by ID
     */
    DecisionHistoryLogger.prototype.getDecision = function (id) {
        return this.history.find(function (d) { return d.id === id; });
    };
    /**
     * Get all decisions for a symbol
     */
    DecisionHistoryLogger.prototype.getDecisionsForSymbol = function (symbol) {
        return this.history.filter(function (d) { return d.symbol === symbol; });
    };
    /**
     * Get all OPERATE decisions that resulted in trades
     */
    DecisionHistoryLogger.prototype.getExecutedTrades = function () {
        return this.history.filter(function (d) { return d.outcome === "OPERATE" && d.executedTrade; });
    };
    /**
     * Get all DO_NOT_OPERATE decisions and their reasons
     */
    DecisionHistoryLogger.prototype.getBlockedDecisions = function () {
        return this.history.filter(function (d) { return d.outcome === "DO_NOT_OPERATE"; });
    };
    /**
     * Analyze decision quality: accuracy, consistency, error patterns
     */
    DecisionHistoryLogger.prototype.getAnalytics = function () {
        var executed = this.getExecutedTrades();
        var blocked = this.getBlockedDecisions();
        var winningTrades = executed.filter(function (d) { return d.tradeResult && d.tradeResult.pnlDollars > 0; });
        var losingTrades = executed.filter(function (d) { return d.tradeResult && d.tradeResult.pnlDollars < 0; });
        var totalPnL = executed.reduce(function (sum, d) { var _a; return sum + (((_a = d.tradeResult) === null || _a === void 0 ? void 0 : _a.pnlDollars) || 0); }, 0);
        var avgWinSize = winningTrades.length > 0
            ? winningTrades.reduce(function (sum, d) { var _a; return sum + (((_a = d.tradeResult) === null || _a === void 0 ? void 0 : _a.pnlDollars) || 0); }, 0) / winningTrades.length
            : 0;
        var avgLossSize = losingTrades.length > 0
            ? losingTrades.reduce(function (sum, d) { var _a; return sum + (((_a = d.tradeResult) === null || _a === void 0 ? void 0 : _a.pnlDollars) || 0); }, 0) / losingTrades.length
            : 0;
        // Confidence accuracy: did high-confidence predictions win more?
        var highConfidenceWins = executed
            .filter(function (d) { return d.confidenceScore >= 75 && d.tradeResult && d.tradeResult.pnlDollars > 0; })
            .length;
        var highConfidenceTotal = executed.filter(function (d) { return d.confidenceScore >= 75; }).length;
        var highConfidenceAccuracy = highConfidenceTotal > 0 ? (highConfidenceWins / highConfidenceTotal) * 100 : 0;
        return {
            totalDecisions: this.history.length,
            executedTrades: executed.length,
            blockedDecisions: blocked.length,
            operatePercentage: (executed.length / this.history.length) * 100,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate: executed.length > 0 ? (winningTrades.length / executed.length) * 100 : 0,
            totalPnL: totalPnL,
            avgWinSize: avgWinSize,
            avgLossSize: avgLossSize,
            winLossRatio: avgWinSize > 0 ? Math.abs(avgWinSize / avgLossSize) : 0,
            highConfidenceAccuracy: highConfidenceAccuracy,
            averageConfidenceScore: executed.length > 0
                ? executed.reduce(function (sum, d) { return sum + d.confidenceScore; }, 0) / executed.length
                : 0,
            mostCommonBlockReason: this.getMostCommon(blocked.map(function (d) { return d.primaryReason; })),
            strongestSource: this.getMostCommon(executed.map(function (d) { return d.strongestSignal; }).filter(function (s) { return s; })),
            weakestSource: this.getMostCommon(executed.map(function (d) { return d.weakestSignal; }).filter(function (s) { return s; })),
        };
    };
    /**
     * Generate a human-readable summary of recent decisions
     */
    DecisionHistoryLogger.prototype.generateSummary = function (limit) {
        if (limit === void 0) { limit = 10; }
        var recent = this.history.slice(-limit);
        var lines = [
            "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
            "DECISION HISTORY SUMMARY (last ".concat(limit, " decisions)"),
            "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
            "",
        ];
        recent.forEach(function (decision) {
            lines.push("".concat(decision.timestamp.toISOString(), " | ").concat(decision.symbol));
            lines.push("  Strategy: ".concat(decision.selectedStrategy || "NONE"));
            lines.push("  Outcome: ".concat(decision.outcome));
            lines.push("  Confidence: ".concat(decision.confidenceScore, "/100 (threshold: ").concat(decision.confidenceThreshold, ")"));
            lines.push("  Reason: ".concat(decision.primaryReason));
            if (decision.sourceBreakdown.length > 0) {
                var votes = decision.sourceBreakdown.map(function (s) { return "".concat(s.sourceName, ":").concat(s.verdict[0]); }).join(" ");
                lines.push("  Sources: ".concat(votes));
            }
            if (decision.tradeResult) {
                var pnl = decision.tradeResult.pnlDollars >= 0 ? "+".concat(decision.tradeResult.pnlDollars) : "".concat(decision.tradeResult.pnlDollars);
                lines.push("  Result: ".concat(pnl, " (").concat(decision.tradeResult.pnlPercent.toFixed(2), "%)"));
            }
            lines.push("");
        });
        return lines.join("\n");
    };
    /**
     * Export history as JSON for external analysis
     */
    DecisionHistoryLogger.prototype.exportJSON = function () {
        return JSON.stringify({
            sessionId: this.sessionId,
            exportedAt: new Date(),
            totalDecisions: this.history.length,
            decisions: this.history,
        }, null, 2);
    };
    /**
     * Export history as CSV for spreadsheet analysis
     */
    DecisionHistoryLogger.prototype.exportCSV = function () {
        var headers = [
            "timestamp",
            "symbol",
            "regime",
            "vix",
            "strategy",
            "outcome",
            "confidence_score",
            "risk_gates_passed",
            "primary_reason",
            "pnl_dollars",
            "pnl_percent",
        ];
        var rows = this.history.map(function (d) {
            var _a, _b;
            return [
                d.timestamp.toISOString(),
                d.symbol,
                d.regime,
                d.vix.toFixed(2),
                d.selectedStrategy || "NONE",
                d.outcome,
                d.confidenceScore.toString(),
                d.riskGatesPassed.toString(),
                d.primaryReason,
                ((_a = d.tradeResult) === null || _a === void 0 ? void 0 : _a.pnlDollars.toFixed(2)) || "N/A",
                ((_b = d.tradeResult) === null || _b === void 0 ? void 0 : _b.pnlPercent.toFixed(4)) || "N/A",
            ];
        });
        return __spreadArray([headers], rows, true).map(function (row) { return row.join(","); }).join("\n");
    };
    // Helper: get most common element
    DecisionHistoryLogger.prototype.getMostCommon = function (items) {
        if (items.length === 0)
            return "N/A";
        var counts = items.reduce(function (acc, item) {
            acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; })[0][0];
    };
    /**
     * Clear history (dangerous - use for testing only)
     */
    DecisionHistoryLogger.prototype.clearHistory = function () {
        this.history = [];
    };
    /**
     * Get raw history for inspection
     */
    DecisionHistoryLogger.prototype.getFullHistory = function () {
        return __spreadArray([], this.history, true);
    };
    return DecisionHistoryLogger;
}());
exports.DecisionHistoryLogger = DecisionHistoryLogger;
