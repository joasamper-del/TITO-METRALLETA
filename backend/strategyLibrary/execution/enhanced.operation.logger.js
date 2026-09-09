"use strict";
/**
 * Enhanced Operation Logger
 * Captures complete trade context: entry reason, exit reason, confidence, decision analysis
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
exports.EnhancedOperationLogger = void 0;
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var EnhancedOperationLogger = /** @class */ (function () {
    function EnhancedOperationLogger(sessionName) {
        if (sessionName === void 0) { sessionName = "tito-paper-trading"; }
        this.trades = [];
        this.sessionId = this.generateSessionId();
        var logDir = path.resolve(__dirname, "../../logs");
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        var timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        this.logFile = path.join(logDir, "".concat(sessionName, "_").concat(timestamp, ".json"));
        // Initialize log file with session metadata
        var initialData = {
            sessionId: this.sessionId,
            startTime: new Date().toISOString(),
            mode: "PAPER_TRADING_ONLY",
            trades: [],
        };
        fs.writeFileSync(this.logFile, JSON.stringify(initialData, null, 2));
    }
    EnhancedOperationLogger.prototype.recordEntry = function (ticker, instrumentType, options) {
        var tradeId = this.generateTradeId();
        var trade = {
            id: tradeId,
            timestamp: new Date().toISOString(),
            ticker: ticker,
            instrumentType: instrumentType,
            optionType: options.optionType,
            entryPrice: options.entryPrice,
            entryQuantity: options.quantity,
            entryTime: new Date().toLocaleTimeString(),
            entryReason: options.entryReason,
            entryConfidence: options.confidence,
            stopLoss: options.stopLoss,
            takeProfit: options.takeProfit,
            riskPercentage: options.riskPercentage,
        };
        this.trades.push(trade);
        this.writeTrade(trade);
        var confIcon = options.confidence >= 75 ? "🟢" : options.confidence >= 50 ? "🟡" : "🔴";
        console.log("\n\uD83D\uDCCD ENTRY: ".concat(ticker, " ").concat(instrumentType));
        console.log("   Price: $".concat(options.entryPrice.toFixed(2), " | Qty: ").concat(options.quantity));
        console.log("   SL: $".concat(options.stopLoss.toFixed(2), " | TP: $").concat(options.takeProfit.toFixed(2)));
        console.log("   Reason: ".concat(options.entryReason));
        console.log("   ".concat(confIcon, " Confidence: ").concat(options.confidence, "%"));
        return tradeId;
    };
    EnhancedOperationLogger.prototype.recordExit = function (tradeId, exitPrice, exitReason, exitType) {
        var trade = this.trades.find(function (t) { return t.id === tradeId; });
        if (!trade)
            return;
        trade.exitPrice = exitPrice;
        trade.exitTime = new Date().toLocaleTimeString();
        trade.exitReason = exitReason;
        trade.exitType = exitType;
        // Calculate P&L
        trade.pnl = (exitPrice - trade.entryPrice) * trade.entryQuantity;
        trade.pnlPercentage = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
        this.writeTrade(trade);
        var pnlIcon = (trade.pnl || 0) >= 0 ? "✅" : "❌";
        var pnlSign = (trade.pnl || 0) >= 0 ? "+" : "";
        console.log("\n".concat(exitType === "SL" ? "🛑" : "🎯", " EXIT: ").concat(trade.ticker));
        console.log("   ".concat(exitType, ": $").concat(exitPrice.toFixed(2)));
        console.log("   Reason: ".concat(exitReason));
        console.log("   ".concat(pnlIcon, " P&L: ").concat(pnlSign, "$").concat((trade.pnl || 0).toFixed(2), " (").concat(pnlSign).concat((trade.pnlPercentage || 0).toFixed(2), "%)"));
    };
    EnhancedOperationLogger.prototype.logTrade = function (trade) {
        // Generic trade log for automated logging
        var timestamp = new Date().toLocaleTimeString();
        console.log("[".concat(timestamp, "] ").concat(trade.message));
        // Write to file if it contains trade details
        if (trade.symbol && trade.type) {
            try {
                var data = JSON.parse(JSON.stringify(JSON.parse(require("fs").readFileSync(this.logFile, "utf8"))));
                if (!data.trades)
                    data.trades = [];
                data.trades.push(trade);
                require("fs").writeFileSync(this.logFile, JSON.stringify(data, null, 2));
            }
            catch (err) {
                // Silent fail for automated logging
            }
        }
    };
    EnhancedOperationLogger.prototype.addAnalysis = function (tradeId, analysis) {
        var trade = this.trades.find(function (t) { return t.id === tradeId; });
        if (!trade)
            return;
        trade.analysis = analysis;
        this.writeTrade(trade);
        console.log("\n\uD83D\uDCCA ANALYSIS: ".concat(trade.ticker));
        console.log("   \u2705 Well: ".concat(analysis.whatWentWell));
        console.log("   \u274C Wrong: ".concat(analysis.whatWentWrong));
        console.log("   \uD83D\uDD04 Better: ".concat(analysis.whatCouldBeBetter));
        console.log("   \u2699\uFE0F  Adjust: ".concat(analysis.ruleAdjustment));
    };
    EnhancedOperationLogger.prototype.generateSessionId = function () {
        return "SESSION_" + Date.now() + "_" + Math.random().toString(36).substring(7);
    };
    EnhancedOperationLogger.prototype.generateTradeId = function () {
        return "TRADE_" + Date.now() + "_" + Math.random().toString(36).substring(7);
    };
    EnhancedOperationLogger.prototype.writeTrade = function (trade) {
        try {
            var data = JSON.parse(fs.readFileSync(this.logFile, "utf8"));
            var existingIndex = data.trades.findIndex(function (t) { return t.id === trade.id; });
            if (existingIndex >= 0) {
                data.trades[existingIndex] = trade;
            }
            else {
                data.trades.push(trade);
            }
            fs.writeFileSync(this.logFile, JSON.stringify(data, null, 2));
        }
        catch (err) {
            console.error("Error writing to log file:", err);
        }
    };
    EnhancedOperationLogger.prototype.getLogFile = function () {
        return this.logFile;
    };
    EnhancedOperationLogger.prototype.generateSummaryReport = function () {
        var completedTrades = this.trades.filter(function (t) { return t.pnl !== undefined; });
        var winners = completedTrades.filter(function (t) { return (t.pnl || 0) > 0; });
        var losers = completedTrades.filter(function (t) { return (t.pnl || 0) <= 0; });
        var totalPnL = completedTrades.reduce(function (sum, t) { return sum + (t.pnl || 0); }, 0);
        var avgWin = winners.length > 0 ? winners.reduce(function (sum, t) { return sum + (t.pnl || 0); }, 0) / winners.length : 0;
        var avgLoss = losers.length > 0 ? losers.reduce(function (sum, t) { return sum + (t.pnl || 0); }, 0) / losers.length : 0;
        var slTrades = completedTrades.filter(function (t) { return t.exitType === "SL"; });
        var tpTrades = completedTrades.filter(function (t) { return t.exitType === "TP"; });
        return {
            totalTrades: this.trades.length,
            completedTrades: completedTrades.length,
            activeTrades: this.trades.length - completedTrades.length,
            winners: winners.length,
            losers: losers.length,
            winRate: completedTrades.length > 0 ? (winners.length / completedTrades.length) * 100 : 0,
            totalPnL: totalPnL,
            avgWin: avgWin,
            avgLoss: avgLoss,
            slTradeCount: slTrades.length,
            tpTradeCount: tpTrades.length,
        };
    };
    return EnhancedOperationLogger;
}());
exports.EnhancedOperationLogger = EnhancedOperationLogger;
