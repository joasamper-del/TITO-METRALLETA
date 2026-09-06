"use strict";
/**
 * 0DTE Execution Manager - FASE 1
 * Integrates 0DTE options trading into ExecutionEngine
 * Conservative learning phase: 1 contract max, 3 trades/day, wide SL/TP
 * Paper Trading ONLY, real money DISABLED
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
exports.OdteExecutionManager = void 0;
var executionEngine_1 = require("./executionEngine");
var enhanced_operation_logger_1 = require("./enhanced.operation.logger");
var odte_phase1_learning_config_1 = require("./odte.phase1.learning.config");
var alpacaAdapter_1 = require("./alpacaAdapter");
var dotenv = __importStar(require("dotenv"));
var path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
var OdteExecutionManager = /** @class */ (function () {
    function OdteExecutionManager(alpacaApiKey, alpacaSecretKey) {
        this.openTrades = new Map();
        this.tradesPlacedToday = 0;
        this.executionEnabled = false; // CRITICAL: Default FALSE until explicit enable
        this.tradeCounter = 0;
        // Validate config first
        var validation = (0, odte_phase1_learning_config_1.validatePhase1Config)();
        if (!validation.valid) {
            throw new Error("Phase 1 Config validation failed: ".concat(validation.errors.join("; ")));
        }
        // Initialize components
        this.executionEngine = new executionEngine_1.ExecutionEngine(alpacaApiKey, alpacaSecretKey, "0DTE_PHASE1");
        this.operationLogger = new enhanced_operation_logger_1.EnhancedOperationLogger();
        this.alpaca = new alpacaAdapter_1.AlpacaAdapter(alpacaApiKey, alpacaSecretKey);
        // Verify Paper Trading is enforced
        if (!odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.paperTradingOnly || !odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.realMoneyDisabled) {
            throw new Error("Paper Trading MUST be enabled for Phase 1");
        }
        console.log("\n╔════════════════════════════════════════════════════════════╗");
        console.log("║        0DTE EXECUTION MANAGER - PHASE 1 INITIALIZED        ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");
        console.log("🟢 STATUS: READY");
        console.log("   Execution enabled: ".concat(this.executionEnabled));
        console.log("   Paper Trading: ".concat(odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.paperTradingOnly));
        console.log("   Real money disabled: ".concat(odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.realMoneyDisabled, "\n"));
        console.log("⚠️  EXECUTION IS CURRENTLY DISABLED");
        console.log("   Awaiting explicit enablement via enableExecution()\n");
    }
    /**
     * Enable execution (MUST be called explicitly by user)
     */
    OdteExecutionManager.prototype.enableExecution = function (reason) {
        if (reason === void 0) { reason = "User approval"; }
        if (this.executionEnabled) {
            console.log("⚠️  Execution already enabled");
            return;
        }
        console.log("\n╔════════════════════════════════════════════════════════════╗");
        console.log("║              0DTE EXECUTION ENABLED                        ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");
        console.log("\u2705 Execution enabled at ".concat(new Date().toISOString()));
        console.log("   Reason: ".concat(reason));
        console.log("   Mode: Paper Trading (MANDATORY)\n");
        this.executionEnabled = true;
    };
    /**
     * Check if execution is enabled
     */
    OdteExecutionManager.prototype.isExecutionEnabled = function () {
        return this.executionEnabled;
    };
    /**
     * Execute 0DTE trade
     * Checks all FASE 1 constraints before allowing execution
     */
    OdteExecutionManager.prototype.executeOdteTrade = function (symbol_1, type_1, premiumPaid_1) {
        return __awaiter(this, arguments, void 0, function (symbol, type, premiumPaid, quantity) {
            var tradeId, preflight, slLevel, tpLevel, riskPercentage, trade;
            if (quantity === void 0) { quantity = 1; }
            return __generator(this, function (_a) {
                tradeId = "0DTE_".concat(++this.tradeCounter, "_").concat(Date.now());
                preflight = this.validatePreFlight(symbol, type, premiumPaid, quantity, tradeId);
                if (!preflight.valid) {
                    return [2 /*return*/, {
                            success: false,
                            message: preflight.errors.join("; "),
                            wouldExecute: false,
                        }];
                }
                // Check if execution is enabled
                if (!this.executionEnabled) {
                    console.log("\n\u26A0\uFE0F  Trade NOT executed (execution disabled)");
                    console.log("   Would execute: ".concat(symbol, " ").concat(type, " @ $").concat(premiumPaid.toFixed(4)));
                    console.log("   Trade ID: ".concat(tradeId, "\n"));
                    return [2 /*return*/, {
                            success: false,
                            message: "Execution currently disabled (awaiting user approval)",
                            wouldExecute: true,
                            tradeId: tradeId,
                        }];
                }
                slLevel = premiumPaid * (1 - odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.slPercentageOfPremium);
                tpLevel = premiumPaid * (1 + odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.tpPercentageOfPremium);
                riskPercentage = odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.slPercentageOfPremium * 100;
                trade = {
                    tradeId: tradeId,
                    symbol: symbol,
                    type: type,
                    premiumPaid: premiumPaid,
                    quantity: quantity,
                    entryPrice: premiumPaid,
                    entryTime: new Date(),
                    confidence: 75, // Placeholder
                    slLevel: slLevel,
                    tpLevel: tpLevel,
                };
                // Log entry with correct types
                this.operationLogger.recordEntry(symbol, "OPTION", {
                    entryPrice: premiumPaid,
                    quantity: quantity,
                    entryReason: "".concat(type, " position initiated"),
                    confidence: 75,
                    stopLoss: slLevel,
                    takeProfit: tpLevel,
                    riskPercentage: riskPercentage,
                    optionType: type,
                });
                // Track trade
                this.openTrades.set(tradeId, trade);
                this.tradesPlacedToday++;
                console.log("\n\u2705 0DTE Trade executed: ".concat(tradeId));
                console.log("   Symbol: ".concat(symbol, " ").concat(type));
                console.log("   Premium: $".concat(premiumPaid.toFixed(4)));
                console.log("   SL: $".concat(slLevel.toFixed(4), " (").concat((odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.slPercentageOfPremium * 100).toFixed(0), "% loss)"));
                console.log("   TP: $".concat(tpLevel.toFixed(4), " (").concat((odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.tpPercentageOfPremium * 100).toFixed(0), "% gain)\n"));
                return [2 /*return*/, {
                        success: true,
                        tradeId: tradeId,
                        message: "Trade placed successfully",
                    }];
            });
        });
    };
    /**
     * Validate pre-flight checks for 0DTE trade
     */
    OdteExecutionManager.prototype.validatePreFlight = function (symbol, type, premiumPaid, quantity, tradeId) {
        var errors = [];
        // Check symbol
        if (!odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.approvedSymbols.includes(symbol)) {
            errors.push("Symbol ".concat(symbol, " not approved for 0DTE (only ").concat(odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.approvedSymbols.join(", "), ")"));
        }
        // Check quantity
        if (quantity > odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.maxContractsPerTrade) {
            errors.push("Quantity ".concat(quantity, " exceeds max ").concat(odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.maxContractsPerTrade, " contract(s)"));
        }
        // Check daily trade count
        if (this.tradesPlacedToday >= odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.maxOperationsPerDay) {
            errors.push("Daily limit reached (".concat(odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.maxOperationsPerDay, " trades/day)"));
        }
        // Check simultaneous positions
        if (this.openTrades.size >= odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.maxSimultaneousPositions) {
            errors.push("Max simultaneous positions (".concat(odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.maxSimultaneousPositions, ") already reached"));
        }
        // Check entry time
        var now = new Date();
        var hours = now.getHours();
        var minutes = now.getMinutes();
        var currentTime = "".concat(hours.toString().padStart(2, "0"), ":").concat(minutes.toString().padStart(2, "0"));
        if (currentTime >= odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.entryStopTime) {
            errors.push("Entry window closed (stops at ".concat(odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.entryStopTime, " ET)"));
        }
        if (currentTime < odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.entryStartTime) {
            errors.push("Entry window not open yet (starts at ".concat(odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.entryStartTime, " ET)"));
        }
        // Check premium validity
        if (premiumPaid <= 0) {
            errors.push("Premium must be > 0 (got ".concat(premiumPaid, ")"));
        }
        return {
            valid: errors.length === 0,
            errors: errors,
        };
    };
    /**
     * Record trade exit (TP, SL, trailing, time close, connection loss)
     */
    OdteExecutionManager.prototype.recordTradeExit = function (tradeId, exitPrice, exitReason) {
        return __awaiter(this, void 0, void 0, function () {
            var trade, priceChange, trailingActivationLevel, exitType, exitReasonStr, analysis;
            var _a, _b;
            return __generator(this, function (_c) {
                trade = this.openTrades.get(tradeId);
                if (!trade) {
                    console.error("Trade ".concat(tradeId, " not found"));
                    return [2 /*return*/];
                }
                trade.exitPrice = exitPrice;
                trade.exitTime = new Date();
                trade.exitReason = exitReason;
                priceChange = exitPrice - trade.entryPrice;
                trade.pnl = priceChange * 100 * trade.quantity; // 100 shares per contract
                trade.pnlPercentage = (priceChange / trade.entryPrice) * 100;
                // Check if trailing stop was active
                if (exitReason === "TRAILING") {
                    trailingActivationLevel = trade.entryPrice * (1 + odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.trailingStopActivationGain);
                    if (exitPrice >= trailingActivationLevel) {
                        trade.trailingStopActivated = true;
                    }
                }
                exitType = exitReason === "TP" ? "TP" :
                    exitReason === "SL" ? "SL" :
                        "MANUAL";
                exitReasonStr = exitReason === "TRAILING" ? "Trailing stop activated" :
                    exitReason === "TIME_CLOSE" ? "Forced close (market hours)" :
                        exitReason === "CONNECTION_LOSS" ? "Auto-liquidation (connection loss)" :
                            exitReason;
                // Log exit
                this.operationLogger.recordExit(tradeId, exitPrice, exitReasonStr, exitType);
                analysis = {
                    whatWentWell: this.analyzeWhatWentWell(trade).join("; "),
                    whatWentWrong: this.analyzeWhatWentWrong(trade).join("; "),
                    whatCouldBeBetter: this.analyzeCouldImprove(trade).join("; "),
                    ruleAdjustment: this.suggestRuleAdjustment(trade),
                };
                this.operationLogger.addAnalysis(tradeId, analysis);
                // Remove from open trades
                this.openTrades.delete(tradeId);
                console.log("\n\uD83D\uDCCA Trade closed: ".concat(tradeId));
                console.log("   Exit: ".concat(exitReason, " @ $").concat(exitPrice.toFixed(4)));
                console.log("   P&L: $".concat((_a = trade.pnl) === null || _a === void 0 ? void 0 : _a.toFixed(2), " (").concat((_b = trade.pnlPercentage) === null || _b === void 0 ? void 0 : _b.toFixed(1), "%)\n"));
                return [2 /*return*/];
            });
        });
    };
    /**
     * Analyze what went well
     */
    OdteExecutionManager.prototype.analyzeWhatWentWell = function (trade) {
        var insights = [];
        if (trade.pnl > 0) {
            insights.push("Trade was profitable");
        }
        if (trade.exitReason === "TP") {
            insights.push("Took profit at target (good discipline)");
        }
        if (trade.trailingStopActivated) {
            insights.push("Trailing stop protected gains");
        }
        if (Math.abs(trade.pnlPercentage) >= 15) {
            insights.push("High confidence setup, good execution");
        }
        return insights.length > 0 ? insights : ["Trade executed as planned"];
    };
    /**
     * Analyze what went wrong
     */
    OdteExecutionManager.prototype.analyzeWhatWentWrong = function (trade) {
        var insights = [];
        if (trade.pnl < 0) {
            insights.push("Trade resulted in loss");
        }
        if (trade.exitReason === "SL") {
            insights.push("Hit stop loss (rapid move against position)");
        }
        if (trade.exitReason === "TIME_CLOSE") {
            insights.push("Forced close due to time (theta decay may have hurt)");
        }
        if (trade.exitReason === "CONNECTION_LOSS") {
            insights.push("Liquidated due to connection loss (uncontrolled exit)");
        }
        return insights;
    };
    /**
     * Analyze what could improve
     */
    OdteExecutionManager.prototype.analyzeCouldImprove = function (trade) {
        var insights = [];
        if (trade.exitReason === "SL" && Math.abs(trade.pnlPercentage) > 10) {
            insights.push("SL 10% may be too tight; consider 15% for Phase 1 refinement");
        }
        if (trade.exitReason === "TP" && trade.pnlPercentage > 25) {
            insights.push("TP 20% hit early; could be opportunity for wider TP");
        }
        if (trade.confidence < 65) {
            insights.push("Low confidence setup; tighten entry filters");
        }
        return insights;
    };
    /**
     * Suggest rule adjustment
     */
    OdteExecutionManager.prototype.suggestRuleAdjustment = function (trade) {
        if (trade.pnl > 100) {
            return "Consider similar setups in future; parameters working well";
        }
        if (trade.exitReason === "SL" && trade.pnlPercentage < -8) {
            return "SL triggered quickly; may need wider SL for Phase 1 learning";
        }
        if (trade.exitReason === "TRAILING" && trade.trailingStopActivated) {
            return "Trailing stop effective; consider activating after +5% instead of +10%";
        }
        return "No rule adjustment needed; Phase 1 learning continues";
    };
    /**
     * Get current status
     */
    OdteExecutionManager.prototype.getStatus = function () {
        return {
            enabled: this.executionEnabled,
            executionAllowed: this.executionEnabled,
            config: odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG,
            paperTrading: odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.paperTradingOnly,
            realMoneyDisabled: odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.realMoneyDisabled,
            openTrades: Array.from(this.openTrades.values()),
            tradeCount: {
                today: this.tradesPlacedToday,
                maximum: odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.maxOperationsPerDay,
            },
            errors: [],
        };
    };
    /**
     * Display phase 1 status
     */
    OdteExecutionManager.prototype.displayStatus = function () {
        var status = this.getStatus();
        console.log("\n╔════════════════════════════════════════════════════════════╗");
        console.log("║           0DTE PHASE 1 - EXECUTION STATUS                 ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");
        console.log("\uD83D\uDFE2 Enabled: ".concat(status.enabled ? "YES" : "NO"));
        console.log("\uD83D\uDD12 Paper Trading: ".concat(status.paperTrading ? "YES (MANDATORY)" : "DISABLED"));
        console.log("\uD83D\uDEAB Real Money: ".concat(status.realMoneyDisabled ? "DISABLED (MANDATORY)" : "ENABLED (ERROR!)", "\n"));
        console.log("\uD83D\uDCCA Today's Activity:");
        console.log("   Trades: ".concat(status.tradeCount.today, "/").concat(status.tradeCount.maximum));
        console.log("   Open positions: ".concat(status.openTrades.length, "/").concat(odte_phase1_learning_config_1.ODTE_PHASE1_CONFIG.maxSimultaneousPositions, "\n"));
        if (status.openTrades.length > 0) {
            console.log("📋 Open Trades:");
            status.openTrades.forEach(function (trade) {
                console.log("   ".concat(trade.tradeId));
                console.log("   \u2022 ".concat(trade.symbol, " ").concat(trade.type, " @ $").concat(trade.entryPrice.toFixed(4)));
                console.log("   \u2022 SL: $".concat(trade.slLevel.toFixed(4), " | TP: $").concat(trade.tpLevel.toFixed(4), "\n"));
            });
        }
        console.log("═══════════════════════════════════════════════════════════");
        console.log("✅ Phase 1 framework operational\n");
    };
    return OdteExecutionManager;
}());
exports.OdteExecutionManager = OdteExecutionManager;
exports.default = OdteExecutionManager;
