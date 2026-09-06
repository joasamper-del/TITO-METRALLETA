"use strict";
/**
 * Execution Engine
 * Orchestrates: Strategy Selector → Confirmation Engine → Alpaca Trading
 * All safety checks before ANY order placement
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionEngine = void 0;
var decisionHistory_1 = require("../confirmation/decisionHistory");
var supervisorGate_1 = require("./supervisorGate");
var alpacaAdapter_1 = require("./alpacaAdapter");
var ExecutionEngine = /** @class */ (function () {
    function ExecutionEngine(alpacaApiKey, alpacaSecretKey, sessionId) {
        this.openPositions = new Map();
        this.supervisor = new supervisorGate_1.SupervisorGate();
        this.alpaca = new alpacaAdapter_1.AlpacaAdapter(alpacaApiKey, alpacaSecretKey);
        this.logger = new decisionHistory_1.DecisionHistoryLogger(sessionId);
    }
    /**
     * Main execution flow: Selector → Confirmation → Supervisor → Alpaca
     */
    ExecutionEngine.prototype.execute = function (context) {
        return __awaiter(this, void 0, void 0, function () {
            var decision_1, decision_2, supervisorDecision, decision_3, positionSize, order, decision_4, decision;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // Step 1: Validate selector signal
                        if (context.selectionResult.status !== "OPERATE") {
                            decision_1 = {
                                status: "DO_NOT_OPERATE",
                                reason: "Selector said DO_NOT_OPERATE",
                                supervisorDecision: {
                                    allPassed: false,
                                    gateResults: [],
                                    failureCount: 0,
                                    recommendation: "REJECT",
                                    failureReasons: ["Strategy Selector blocked"],
                                },
                            };
                            this.logger.logDecision({
                                symbol: context.marketData.symbol,
                                regime: context.confirmationResult.context.regime,
                                vix: context.marketData.vix,
                                price: context.marketData.price,
                                outcome: "DO_NOT_OPERATE",
                                primaryReason: "NO_STRATEGY",
                                reasoning: ["Strategy Selector: " + (context.selectionResult.reason || "blocked")],
                                riskGatesPassed: false,
                                confidenceScore: context.confirmationResult.confidence.finalScore,
                                confidenceThreshold: 65,
                                sourceBreakdown: context.confirmationResult.confidence.votes.map(function (v) { return ({
                                    sourceId: v.sourceId,
                                    sourceName: v.sourceName,
                                    verdict: v.verdict,
                                    vote: v.vote,
                                    dataQuality: v.dataQuality,
                                    dataQualityScore: v.dataQualityScore,
                                    weight: v.weight,
                                    adjustedWeight: v.weight * (v.dataQualityScore / 100),
                                    reasoning: v.reasoning,
                                    dataPoints: v.dataPoints,
                                }); }),
                            });
                            return [2 /*return*/, decision_1];
                        }
                        // Step 2: Validate confirmation signal
                        if (!context.confirmationResult.isConfirmed) {
                            decision_2 = {
                                status: "DO_NOT_OPERATE",
                                reason: "Confidence ".concat(context.confirmationResult.confidence.finalScore, " below threshold ").concat(context.confirmationResult.threshold),
                                supervisorDecision: {
                                    allPassed: false,
                                    gateResults: [],
                                    failureCount: 0,
                                    recommendation: "REJECT",
                                    failureReasons: ["Confirmation score too low"],
                                },
                            };
                            this.logger.logDecision({
                                symbol: context.marketData.symbol,
                                regime: context.confirmationResult.context.regime,
                                vix: context.marketData.vix,
                                price: context.marketData.price,
                                selectedStrategy: context.selectionResult.selectedStrategy,
                                outcome: "DO_NOT_OPERATE",
                                primaryReason: "CONFIDENCE_LOW",
                                reasoning: [
                                    "Strategy: ".concat(context.selectionResult.selectedStrategy),
                                    "Confidence: ".concat(context.confirmationResult.confidence.finalScore, "/100 (need ").concat(context.confirmationResult.threshold, ")"),
                                ],
                                riskGatesPassed: true,
                                confidenceScore: context.confirmationResult.confidence.finalScore,
                                confidenceThreshold: context.confirmationResult.threshold,
                                sourceBreakdown: context.confirmationResult.confidence.votes.map(function (v) { return ({
                                    sourceId: v.sourceId,
                                    sourceName: v.sourceName,
                                    verdict: v.verdict,
                                    vote: v.vote,
                                    dataQuality: v.dataQuality,
                                    dataQualityScore: v.dataQualityScore,
                                    weight: v.weight,
                                    adjustedWeight: v.weight * (v.dataQualityScore / 100),
                                    reasoning: v.reasoning,
                                    dataPoints: v.dataPoints,
                                }); }),
                            });
                            return [2 /*return*/, decision_2];
                        }
                        supervisorDecision = this.supervisor.validate(context.accountData, context.marketData, Array.from(this.openPositions.values()));
                        if (!supervisorDecision.allPassed) {
                            decision_3 = {
                                status: "DO_NOT_OPERATE",
                                reason: "Supervisor rejected: ".concat(supervisorDecision.failureReasons.join("; ")),
                                supervisorDecision: supervisorDecision,
                            };
                            this.logger.logDecision({
                                symbol: context.marketData.symbol,
                                regime: context.confirmationResult.context.regime,
                                vix: context.marketData.vix,
                                price: context.marketData.price,
                                selectedStrategy: context.selectionResult.selectedStrategy,
                                outcome: "DO_NOT_OPERATE",
                                primaryReason: "MACRO_VETO",
                                reasoning: [
                                    "Strategy: ".concat(context.selectionResult.selectedStrategy),
                                    "Supervisor failures: ".concat(supervisorDecision.failureReasons.join("; ")),
                                ],
                                riskGatesPassed: true,
                                confidenceScore: context.confirmationResult.confidence.finalScore,
                                confidenceThreshold: context.confirmationResult.threshold,
                                sourceBreakdown: context.confirmationResult.confidence.votes.map(function (v) { return ({
                                    sourceId: v.sourceId,
                                    sourceName: v.sourceName,
                                    verdict: v.verdict,
                                    vote: v.vote,
                                    dataQuality: v.dataQuality,
                                    dataQualityScore: v.dataQualityScore,
                                    weight: v.weight,
                                    adjustedWeight: v.weight * (v.dataQualityScore / 100),
                                    reasoning: v.reasoning,
                                    dataPoints: v.dataPoints,
                                }); }),
                            });
                            return [2 /*return*/, decision_3];
                        }
                        positionSize = this.calculatePositionSize(context);
                        return [4 /*yield*/, this.alpaca.placeOCOOrder({
                                symbol: context.marketData.symbol,
                                quantity: positionSize,
                                side: "buy",
                                entryPrice: context.marketData.price,
                                stopLoss: this.calculateStopLoss(context),
                                takeProfit: this.calculateTakeProfit(context),
                                clientOrderId: "tito_".concat(Date.now()),
                            })];
                    case 1:
                        order = _c.sent();
                        if (order.status === "rejected") {
                            decision_4 = {
                                status: "TRADE_REJECTED",
                                reason: order.error || "Alpaca rejected order",
                                supervisorDecision: supervisorDecision,
                            };
                            this.logger.logDecision({
                                symbol: context.marketData.symbol,
                                regime: context.confirmationResult.context.regime,
                                vix: context.marketData.vix,
                                price: context.marketData.price,
                                selectedStrategy: context.selectionResult.selectedStrategy,
                                outcome: "DO_NOT_OPERATE",
                                primaryReason: "USER_OVERRIDE",
                                reasoning: ["Order rejected by Alpaca: ".concat(order.error)],
                                riskGatesPassed: true,
                                confidenceScore: context.confirmationResult.confidence.finalScore,
                                confidenceThreshold: context.confirmationResult.threshold,
                                sourceBreakdown: context.confirmationResult.confidence.votes.map(function (v) { return ({
                                    sourceId: v.sourceId,
                                    sourceName: v.sourceName,
                                    verdict: v.verdict,
                                    vote: v.vote,
                                    dataQuality: v.dataQuality,
                                    dataQualityScore: v.dataQualityScore,
                                    weight: v.weight,
                                    adjustedWeight: v.weight * (v.dataQualityScore / 100),
                                    reasoning: v.reasoning,
                                    dataPoints: v.dataPoints,
                                }); }),
                            });
                            return [2 /*return*/, decision_4];
                        }
                        decision = {
                            status: "TRADE_PLACED",
                            orderId: order.id,
                            reason: "All gates passed, order placed",
                            position: {
                                symbol: context.marketData.symbol,
                                quantity: positionSize,
                                entryPrice: context.marketData.price,
                                stopLoss: this.calculateStopLoss(context),
                                takeProfit: this.calculateTakeProfit(context),
                                placedAt: new Date(),
                            },
                            supervisorDecision: supervisorDecision,
                        };
                        this.logger.logDecision({
                            symbol: context.marketData.symbol,
                            regime: context.confirmationResult.context.regime,
                            vix: context.marketData.vix,
                            price: context.marketData.price,
                            selectedStrategy: context.selectionResult.selectedStrategy,
                            strategyBlocked: false,
                            riskGatesPassed: true,
                            confidenceScore: context.confirmationResult.confidence.finalScore,
                            confidenceThreshold: context.confirmationResult.threshold,
                            confidenceMet: context.confirmationResult.isConfirmed,
                            sourceBreakdown: context.confirmationResult.confidence.votes.map(function (v) { return ({
                                sourceId: v.sourceId,
                                sourceName: v.sourceName,
                                verdict: v.verdict,
                                vote: v.vote,
                                dataQuality: v.dataQuality,
                                dataQualityScore: v.dataQualityScore,
                                weight: v.weight,
                                adjustedWeight: v.weight * (v.dataQualityScore / 100),
                                reasoning: v.reasoning,
                                dataPoints: v.dataPoints,
                            }); }),
                            consensusPercentage: (context.confirmationResult.confidence.votes.filter(function (v) { return v.verdict === "CONFIRM"; }).length /
                                context.confirmationResult.confidence.votes.length) *
                                100,
                            strongestSignal: ((_a = context.confirmationResult.confidence.votes.sort(function (a, b) { return b.vote - a.vote; })[0]) === null || _a === void 0 ? void 0 : _a.sourceName) || "N/A",
                            weakestSignal: ((_b = context.confirmationResult.confidence.votes.sort(function (a, b) { return a.vote - b.vote; })[0]) === null || _b === void 0 ? void 0 : _b.sourceName) || "N/A",
                            outcome: "OPERATE",
                            primaryReason: "ALL_GATES_PASSED",
                            reasoning: [
                                "Strategy: ".concat(context.selectionResult.selectedStrategy),
                                "Confidence: ".concat(context.confirmationResult.confidence.finalScore, "/100 (meets ").concat(context.confirmationResult.threshold, ")"),
                                "All 5 supervisor gates passed",
                                "Position: ".concat(positionSize, " shares @ ").concat(context.marketData.price.toFixed(2)),
                            ],
                            executedTrade: {
                                orderId: order.id,
                                positionSize: positionSize,
                                entryPrice: context.marketData.price,
                                stopLoss: this.calculateStopLoss(context),
                                takeProfit: this.calculateTakeProfit(context),
                                executedAt: new Date(),
                            },
                        });
                        // Track open position
                        this.openPositions.set(context.marketData.symbol, {
                            symbol: context.marketData.symbol,
                            quantity: positionSize,
                            entryPrice: context.marketData.price,
                            currentPrice: context.marketData.price,
                            unrealizedPnL: 0,
                            unrealizedPnLPct: 0,
                        });
                        return [2 /*return*/, decision];
                }
            });
        });
    };
    /**
     * Calculate position size (2% max risk per trade)
     */
    ExecutionEngine.prototype.calculatePositionSize = function (context) {
        var maxRiskPerTrade = context.accountData.totalBalance * 0.02; // 2% max risk
        var stopLoss = this.calculateStopLoss(context);
        var riskPerShare = Math.abs(context.marketData.price - stopLoss);
        if (riskPerShare <= 0)
            return 0;
        var positionSize = Math.floor(maxRiskPerTrade / riskPerShare);
        // Cap at 5% of account value
        var maxAccountSize = Math.floor((context.accountData.totalBalance * 0.05) / context.marketData.price);
        positionSize = Math.min(positionSize, maxAccountSize);
        // Min 10 shares
        return Math.max(10, positionSize);
    };
    /**
     * Calculate stop loss
     */
    ExecutionEngine.prototype.calculateStopLoss = function (context) {
        // Simple: 1% below entry (can be enhanced with ATR)
        return context.marketData.price * 0.99;
    };
    /**
     * Calculate take profit
     */
    ExecutionEngine.prototype.calculateTakeProfit = function (context) {
        // Simple: 2% above entry (1:2 risk/reward)
        return context.marketData.price * 1.02;
    };
    /**
     * Get logger for decision history
     */
    ExecutionEngine.prototype.getLogger = function () {
        return this.logger;
    };
    /**
     * Get Alpaca adapter for monitoring
     */
    ExecutionEngine.prototype.getAlpaca = function () {
        return this.alpaca;
    };
    return ExecutionEngine;
}());
exports.ExecutionEngine = ExecutionEngine;
