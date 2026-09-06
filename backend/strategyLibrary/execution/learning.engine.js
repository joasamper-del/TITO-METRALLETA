"use strict";
/**
 * Tito Learning Engine
 * Post-trade analysis and improvement proposals
 *
 * IMPORTANT: This engine LEARNS from trades but NEVER modifies code/rules automatically.
 * All improvement proposals require human approval before implementation.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningEngine = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class LearningEngine {
    constructor() {
        this.trades = [];
        this.insights = [];
        const logsDir = path.resolve(__dirname, "../../logs");
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        this.learningHistoryFile = path.join(logsDir, `learning-history_${timestamp}.json`);
        this.insightsFile = path.join(logsDir, `improvement-proposals_${timestamp}.json`);
        // Initialize files
        fs.writeFileSync(this.learningHistoryFile, JSON.stringify({ trades: [] }, null, 2));
        fs.writeFileSync(this.insightsFile, JSON.stringify({ insights: [], lastReview: new Date().toISOString() }, null, 2));
    }
    analyzeCompletedTrade(analysis) {
        this.trades.push(analysis);
        this.saveTrade(analysis);
        console.log(`\n📊 AUTO-ANALYZING: ${analysis.ticker}`);
        console.log(`   Result: ${analysis.result} (${analysis.pnlPercent.toFixed(2)}%)`);
        console.log(`   Confidence: ${analysis.entryConfidence}% | Duration: ${analysis.duration}min`);
        console.log(`   Well: ${analysis.whatWentWell}`);
        console.log(`   Wrong: ${analysis.whatWentWrong}`);
        console.log(`   Better: ${analysis.whatCouldBeBetter}`);
    }
    analyzePatterns() {
        if (this.trades.length < 3) {
            return [];
        }
        const insights = [];
        const confidenceAnalysis = this.analyzeConfidenceVsResult();
        if (confidenceAnalysis)
            insights.push(confidenceAnalysis);
        const exitAnalysis = this.analyzeExitReasons();
        if (exitAnalysis)
            insights.push(exitAnalysis);
        const symbolAnalysis = this.analyzeSymbolPerformance();
        insights.push(...symbolAnalysis);
        const durationAnalysis = this.analyzeDurationImpact();
        if (durationAnalysis)
            insights.push(durationAnalysis);
        this.insights.push(...insights);
        this.saveInsights();
        return insights;
    }
    analyzeConfidenceVsResult() {
        const highConfTrades = this.trades.filter((t) => t.entryConfidence >= 75);
        const lowConfTrades = this.trades.filter((t) => t.entryConfidence < 50);
        if (highConfTrades.length === 0 || lowConfTrades.length === 0)
            return null;
        const highConfWinRate = (highConfTrades.filter((t) => t.result === "WIN").length / highConfTrades.length) * 100;
        const lowConfWinRate = (lowConfTrades.filter((t) => t.result === "WIN").length / lowConfTrades.length) * 100;
        const difference = highConfWinRate - lowConfWinRate;
        if (Math.abs(difference) < 10) {
            return {
                insight: "Confidence may not predict success - needs review",
                evidence: `High conf (75%+): ${highConfWinRate.toFixed(0)}% | Low conf (<50%): ${lowConfWinRate.toFixed(0)}%`,
                confidenceLevel: "MEDIUM",
                recommendation: "Confidence formula may need calibration",
                requiresApproval: true,
                proposedChange: "Adjust confidence calculation",
            };
        }
        else if (difference > 0) {
            return {
                insight: "Confidence metric is working well",
                evidence: `High: ${highConfWinRate.toFixed(0)}% vs Low: ${lowConfWinRate.toFixed(0)}%`,
                confidenceLevel: "HIGH",
                recommendation: "Continue using current confidence",
                requiresApproval: false,
            };
        }
        return null;
    }
    analyzeExitReasons() {
        const exitReasons = new Map();
        this.trades.forEach((t) => {
            const stats = exitReasons.get(t.exitReason) || { count: 0, wins: 0, avgPnL: 0 };
            stats.count++;
            if (t.result === "WIN")
                stats.wins++;
            stats.avgPnL = (stats.avgPnL * (stats.count - 1) + t.pnl) / stats.count;
            exitReasons.set(t.exitReason, stats);
        });
        let bestExit = null;
        let bestWinRate = 0;
        for (const [reason, stats] of exitReasons) {
            const winRate = (stats.wins / stats.count) * 100;
            if (winRate > bestWinRate) {
                bestWinRate = winRate;
                bestExit = { reason, stats };
            }
        }
        if (bestExit && bestWinRate > 50) {
            return {
                insight: `"${bestExit.reason}" exit is most profitable`,
                evidence: `${bestExit.stats.wins}/${bestExit.stats.count} wins | Avg: $${bestExit.stats.avgPnL.toFixed(2)}`,
                confidenceLevel: "HIGH",
                recommendation: "This exit type works well",
                requiresApproval: false,
            };
        }
        return null;
    }
    analyzeSymbolPerformance() {
        const symbolStats = new Map();
        this.trades.forEach((t) => {
            const stats = symbolStats.get(t.ticker) || { wins: 0, total: 0, avgPnL: 0 };
            stats.total++;
            if (t.result === "WIN")
                stats.wins++;
            stats.avgPnL = (stats.avgPnL * (stats.total - 1) + t.pnl) / stats.total;
            symbolStats.set(t.ticker, stats);
        });
        const insights = [];
        for (const [symbol, stats] of symbolStats) {
            if (stats.total >= 2) {
                const winRate = (stats.wins / stats.total) * 100;
                insights.push({
                    insight: `${symbol} summary`,
                    evidence: `${stats.wins}/${stats.total} wins (${winRate.toFixed(0)}%) | Avg P&L: $${stats.avgPnL.toFixed(2)}`,
                    confidenceLevel: stats.total >= 5 ? "HIGH" : "MEDIUM",
                    recommendation: `Monitor ${symbol} for patterns`,
                    requiresApproval: false,
                });
            }
        }
        return insights;
    }
    analyzeDurationImpact() {
        const shortTrades = this.trades.filter((t) => t.duration < 60);
        const longTrades = this.trades.filter((t) => t.duration >= 60);
        if (shortTrades.length === 0 || longTrades.length === 0)
            return null;
        const shortWinRate = (shortTrades.filter((t) => t.result === "WIN").length / shortTrades.length) * 100;
        const longWinRate = (longTrades.filter((t) => t.result === "WIN").length / longTrades.length) * 100;
        if (Math.abs(shortWinRate - longWinRate) > 15) {
            return {
                insight: "Trade duration affects success",
                evidence: `Short (<1h): ${shortWinRate.toFixed(0)}% | Long (≥1h): ${longWinRate.toFixed(0)}%`,
                confidenceLevel: "MEDIUM",
                recommendation: "Consider duration-based adjustments",
                requiresApproval: true,
                proposedChange: "Tune strategy for optimal trade duration",
            };
        }
        return null;
    }
    saveTrade(analysis) {
        try {
            const data = JSON.parse(fs.readFileSync(this.learningHistoryFile, "utf8"));
            data.trades.push(analysis);
            fs.writeFileSync(this.learningHistoryFile, JSON.stringify(data, null, 2));
        }
        catch (err) {
            // Silent fail
        }
    }
    saveInsights() {
        try {
            const data = {
                insights: this.insights,
                lastAnalyzed: new Date().toISOString(),
                totalTrades: this.trades.length,
            };
            fs.writeFileSync(this.insightsFile, JSON.stringify(data, null, 2));
        }
        catch (err) {
            // Silent fail
        }
    }
    generateProposals() {
        const pendingApprovals = this.insights.filter((i) => i.requiresApproval);
        if (pendingApprovals.length === 0) {
            return "✅ No improvement proposals pending";
        }
        let text = "🤖 IMPROVEMENT PROPOSALS (REQUIRE HUMAN APPROVAL):\n\n";
        pendingApprovals.forEach((insight, idx) => {
            text += `[${idx + 1}] ${insight.insight}\n`;
            text += `    Evidence: ${insight.evidence}\n`;
            text += `    Recommendation: ${insight.recommendation}\n`;
            if (insight.proposedChange) {
                text += `    Could change: ${insight.proposedChange}\n`;
            }
            text += `\n`;
        });
        text += "⚠️  STATUS: Proposals only - no code changes made";
        return text;
    }
    getHistoryFile() {
        return this.learningHistoryFile;
    }
    getInsightsFile() {
        return this.insightsFile;
    }
}
exports.LearningEngine = LearningEngine;
