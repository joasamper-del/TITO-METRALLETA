"use strict";
/**
 * Alpaca Adapter - Manual Stop-Loss Monitoring
 *
 * Alpaca Crypto Limitation: NO native STOP orders
 * Solution: Monitor prices + execute market sell when SL hit
 *
 * Architecture:
 * 1. Entry: MARKET order (filled immediately)
 * 2. TP: LIMIT order (stays open, monitored)
 * 3. SL: Monitored internally every 10 seconds
 * 4. On SL trigger: Market sell + cancel TP
 * 5. Fail-safe: Detect duplicates, reconnect, recover on restart
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlpacaAdapter = void 0;
var axios_1 = __importDefault(require("axios"));
var AlpacaAdapter = /** @class */ (function () {
    function AlpacaAdapter(apiKey, apiSecret) {
        this.baseUrl = "https://paper-api.alpaca.markets";
        this.positions = new Map(); // Track positions by symbol
        this.monitoringIntervals = new Map();
        this.ordersSold = new Set(); // Prevent duplicate sells
        this.connectionLost = false;
        this.apiKey = apiKey;
        this.secretKey = apiSecret;
        this.apiClient = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                "APCA-API-KEY-ID": apiKey,
                "APCA-API-SECRET-KEY": apiSecret,
                "Content-Type": "application/json",
            },
            timeout: 10000,
        });
    }
    /**
     * Place OCO simulation for Alpaca Crypto (manual SL monitoring)
     * 1. Market buy
     * 2. Limit TP order
     * 3. Start monitoring SL every 10 seconds
     */
    AlpacaAdapter.prototype.placeOCOOrder = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var entryOrder, entryOrderId, filledEntry, actualEntryPrice, tpRounded, tpOrder, tpOrderId, position, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        // Validate
                        if (request.quantity <= 0 || !request.symbol) {
                            return [2 /*return*/, { success: false, error: "Invalid parameters" }];
                        }
                        if (request.side === "buy") {
                            if (request.stopLoss >= request.entryPrice) {
                                return [2 /*return*/, { success: false, error: "SL must be below entry (buy)" }];
                            }
                            if (request.takeProfit <= request.entryPrice) {
                                return [2 /*return*/, { success: false, error: "TP must be above entry (buy)" }];
                            }
                        }
                        console.log("\n\uD83D\uDCCD PLACING ENTRY ORDER");
                        console.log("   Symbol: ".concat(request.symbol));
                        console.log("   Qty: ".concat(request.quantity));
                        console.log("   Entry: $".concat(request.entryPrice.toFixed(2)));
                        console.log("   SL: $".concat(request.stopLoss.toFixed(2), " (monitored locally)"));
                        console.log("   TP: $".concat(request.takeProfit.toFixed(2), " (limit order)"));
                        return [4 /*yield*/, this.apiClient.post("/v2/orders", {
                                symbol: request.symbol,
                                qty: request.quantity,
                                side: request.side,
                                type: "market",
                                time_in_force: "gtc",
                                client_order_id: "entry_".concat(request.clientOrderId),
                            })];
                    case 1:
                        entryOrder = _a.sent();
                        entryOrderId = entryOrder.data.id;
                        console.log("\u2705 Entry order placed: ".concat(entryOrderId));
                        return [4 /*yield*/, this.waitForOrderFill(entryOrderId, 10000)];
                    case 2:
                        filledEntry = _a.sent();
                        if (!filledEntry) {
                            return [2 /*return*/, { success: false, error: "Entry order did not fill" }];
                        }
                        actualEntryPrice = parseFloat(filledEntry.filled_avg_price) || request.entryPrice;
                        console.log("\u2705 Entry filled @ $".concat(actualEntryPrice.toFixed(2)));
                        tpRounded = Math.round(request.takeProfit * 100) / 100;
                        return [4 /*yield*/, this.apiClient.post("/v2/orders", {
                                symbol: request.symbol,
                                qty: request.quantity,
                                side: "sell",
                                type: "limit",
                                limit_price: tpRounded,
                                time_in_force: "gtc",
                                client_order_id: "tp_".concat(request.clientOrderId),
                            })];
                    case 3:
                        tpOrder = _a.sent();
                        tpOrderId = tpOrder.data.id;
                        console.log("\uD83C\uDFAF Take-Profit order placed: ".concat(tpOrderId, " @ $").concat(request.takeProfit.toFixed(2)));
                        position = {
                            symbol: request.symbol,
                            quantity: request.quantity,
                            entryPrice: actualEntryPrice,
                            stopLoss: request.stopLoss,
                            takeProfit: request.takeProfit,
                            takeProfitOrderId: tpOrderId,
                            enteredAt: new Date(),
                            status: "active",
                        };
                        this.positions.set(request.symbol, position);
                        // Log entry to logger if available
                        if (this.logger) {
                            this.logger.recordEntry(request.symbol, "CRYPTO", {
                                entryPrice: actualEntryPrice,
                                quantity: request.quantity,
                                entryReason: "Market entry signal detected",
                                confidence: 50,
                                stopLoss: request.stopLoss,
                                takeProfit: request.takeProfit,
                                riskPercentage: 1,
                            });
                        }
                        // Step 5: Start SL monitoring loop (every 10 seconds)
                        this.startSLMonitoring(request.symbol, position);
                        return [2 /*return*/, { success: true, orderId: entryOrderId }];
                    case 4:
                        error_1 = _a.sent();
                        console.error("\u274C Order placement failed:", error_1 instanceof Error ? error_1.message : error_1);
                        return [2 /*return*/, { success: false, error: error_1 instanceof Error ? error_1.message : String(error_1) }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Monitor stop-loss every 10 seconds
     * If price <= SL: execute market sell + cancel TP
     */
    AlpacaAdapter.prototype.startSLMonitoring = function (symbol, position) {
        var _this = this;
        var failCount = 0;
        var maxFails = 3;
        var interval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            var price, sellKey, sellOrder, pnl, pnlPercent, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        if (position.status !== "active") {
                            clearInterval(interval);
                            this.monitoringIntervals.delete(symbol);
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.getCurrentPrice(symbol)];
                    case 1:
                        price = _a.sent();
                        if (!price) {
                            failCount++;
                            if (failCount >= maxFails) {
                                console.error("\uD83D\uDD34 Cannot get price for ".concat(symbol, " after ").concat(maxFails, " attempts. BLOCKING new trades."));
                                this.connectionLost = true;
                                clearInterval(interval);
                            }
                            return [2 /*return*/];
                        }
                        failCount = 0;
                        position.lastPrice = price;
                        position.lastPriceUpdate = new Date();
                        if (!(price <= position.stopLoss)) return [3 /*break*/, 6];
                        console.log("\n\uD83D\uDED1 STOP-LOSS TRIGGERED @ $".concat(price.toFixed(2)));
                        sellKey = "".concat(symbol, "_").concat(position.entryPrice);
                        if (this.ordersSold.has(sellKey)) {
                            console.log("\u26A0\uFE0F  Already sold this position, skipping duplicate");
                            return [2 /*return*/];
                        }
                        position.status = "sl_triggered";
                        return [4 /*yield*/, this.executeSell(symbol, position.quantity, price)];
                    case 2:
                        sellOrder = _a.sent();
                        if (!sellOrder) return [3 /*break*/, 5];
                        this.ordersSold.add(sellKey);
                        console.log("\u2705 Market sell executed");
                        // Log exit to logger if available
                        if (this.logger) {
                            pnl = (price - position.entryPrice) * position.quantity;
                            pnlPercent = ((price - position.entryPrice) / position.entryPrice) * 100;
                            this.logger.logTrade({
                                timestamp: new Date().toISOString(),
                                type: "SL_TRIGGERED",
                                symbol: symbol,
                                quantity: position.quantity,
                                entryPrice: position.entryPrice,
                                currentPrice: price,
                                stopLoss: position.stopLoss,
                                takeProfit: position.takeProfit,
                                profitLoss: pnl,
                                profitLossPercent: pnlPercent,
                                message: "\uD83D\uDED1 STOP-LOSS: ".concat(symbol, " @ $").concat(price.toFixed(2), " | P&L: ").concat(pnl >= 0 ? "+" : "", "$").concat(pnl.toFixed(2), " (").concat(pnlPercent >= 0 ? "+" : "").concat(pnlPercent.toFixed(2), "%)"),
                            });
                        }
                        if (!position.takeProfitOrderId) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.cancelOrder(position.takeProfitOrderId)];
                    case 3:
                        _a.sent();
                        console.log("\u270B Take-Profit order cancelled");
                        _a.label = 4;
                    case 4:
                        position.status = "closed";
                        _a.label = 5;
                    case 5:
                        clearInterval(interval);
                        this.monitoringIntervals.delete(symbol);
                        _a.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_2 = _a.sent();
                        console.error("\u274C Monitoring error:", error_2 instanceof Error ? error_2.message : error_2);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        }); }, 10000); // 10 second interval
        this.monitoringIntervals.set(symbol, interval);
        console.log("\uD83D\uDD0D SL monitoring started (every 10s)");
    };
    /**
     * Get current price for symbol
     */
    AlpacaAdapter.prototype.getCurrentPrice = function (symbol) {
        return __awaiter(this, void 0, void 0, function () {
            var positions, pos, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.apiClient.get("/v2/positions")];
                    case 1:
                        positions = _a.sent();
                        pos = positions.data.find(function (p) { return p.symbol === symbol; });
                        if (pos) {
                            return [2 /*return*/, parseFloat(pos.current_price)];
                        }
                        return [2 /*return*/, null];
                    case 2:
                        error_3 = _a.sent();
                        console.error("Error getting price for ".concat(symbol, ":"), error_3 instanceof Error ? error_3.message : error_3);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Execute market sell
     */
    AlpacaAdapter.prototype.executeSell = function (symbol, quantity, price) {
        return __awaiter(this, void 0, void 0, function () {
            var sellOrder, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.apiClient.post("/v2/orders", {
                                symbol: symbol,
                                qty: quantity,
                                side: "sell",
                                type: "market",
                                time_in_force: "gtc",
                                client_order_id: "sl_sell_".concat(Date.now()),
                            })];
                    case 1:
                        sellOrder = _a.sent();
                        console.log("   Sell order: ".concat(sellOrder.data.id));
                        return [2 /*return*/, true];
                    case 2:
                        error_4 = _a.sent();
                        console.error("\u274C Market sell failed:", error_4 instanceof Error ? error_4.message : error_4);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Wait for order to fill
     */
    AlpacaAdapter.prototype.waitForOrderFill = function (orderId_1) {
        return __awaiter(this, arguments, void 0, function (orderId, timeoutMs) {
            var startTime, res, error_5;
            if (timeoutMs === void 0) { timeoutMs = 10000; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        if (!(Date.now() - startTime < timeoutMs)) return [3 /*break*/, 7];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, , 6]);
                        return [4 /*yield*/, this.apiClient.get("/v2/orders/".concat(orderId))];
                    case 3:
                        res = _a.sent();
                        if (res.data.status === "filled" || res.data.filled_qty > 0) {
                            return [2 /*return*/, res.data];
                        }
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1000); })];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        error_5 = _a.sent();
                        return [2 /*return*/, null];
                    case 6: return [3 /*break*/, 1];
                    case 7: return [2 /*return*/, null];
                }
            });
        });
    };
    /**
     * Cancel order
     */
    AlpacaAdapter.prototype.cancelOrder = function (orderId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.apiClient.delete("/v2/orders/".concat(orderId))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 2:
                        error_6 = _a.sent();
                        console.error("Error cancelling order:", error_6 instanceof Error ? error_6.message : error_6);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Health check
     */
    AlpacaAdapter.prototype.healthCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.apiClient.get("/v2/account")];
                    case 1:
                        _b.sent();
                        return [2 /*return*/, true];
                    case 2:
                        _a = _b.sent();
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get account
     */
    AlpacaAdapter.prototype.getAccount = function () {
        return __awaiter(this, void 0, void 0, function () {
            var res, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.apiClient.get("/v2/account")];
                    case 1:
                        res = _a.sent();
                        return [2 /*return*/, {
                                balance: parseFloat(res.data.equity),
                                cash: parseFloat(res.data.cash),
                                buyingPower: parseFloat(res.data.buying_power),
                            }];
                    case 2:
                        error_7 = _a.sent();
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get positions
     */
    AlpacaAdapter.prototype.getPositions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var res, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.apiClient.get("/v2/positions")];
                    case 1:
                        res = _b.sent();
                        return [2 /*return*/, res.data];
                    case 2:
                        _a = _b.sent();
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get tracked position
     */
    AlpacaAdapter.prototype.getTrackedPosition = function (symbol) {
        return this.positions.get(symbol);
    };
    /**
     * Check if connection lost
     */
    AlpacaAdapter.prototype.isConnectionLost = function () {
        return this.connectionLost;
    };
    /**
     * Recover existing positions on startup
     * Detects open positions and starts SL monitoring
     */
    AlpacaAdapter.prototype.recoverExistingPositions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var positions, _loop_1, this_1, _i, positions_1, pos, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        console.log("\n🔄 Recovering existing positions...");
                        return [4 /*yield*/, this.getPositions()];
                    case 1:
                        positions = _a.sent();
                        if (positions.length === 0) {
                            console.log("   No positions to recover\n");
                            return [2 /*return*/];
                        }
                        _loop_1 = function (pos) {
                            var entryPrice, sl, tp, orders, normalizeSymbol_1, existingTP, position_1, tpRounded, tpOrder, position, error_9;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        if (this_1.positions.has(pos.symbol)) {
                                            console.log("   \u26A0\uFE0F  ".concat(pos.symbol, " already monitored, skipping"));
                                            return [2 /*return*/, "continue"];
                                        }
                                        entryPrice = parseFloat(pos.avg_entry_price) || parseFloat(pos.current_price);
                                        sl = entryPrice * 0.99;
                                        tp = entryPrice * 1.02;
                                        console.log("\n   \uD83D\uDCCD Recovering ".concat(pos.symbol));
                                        console.log("      Qty: ".concat(pos.qty));
                                        console.log("      Entry: $".concat(entryPrice.toFixed(2)));
                                        console.log("      SL: $".concat(sl.toFixed(2), " (will monitor)"));
                                        console.log("      TP: $".concat(tp.toFixed(2), " (placing limit)"));
                                        _b.label = 1;
                                    case 1:
                                        _b.trys.push([1, 4, , 5]);
                                        return [4 /*yield*/, this_1.apiClient.get("/v2/orders")];
                                    case 2:
                                        orders = _b.sent();
                                        normalizeSymbol_1 = function (sym) { return sym.replace("/", ""); };
                                        existingTP = orders.data.find(function (o) {
                                            return normalizeSymbol_1(o.symbol) === pos.symbol &&
                                                o.side === "sell" &&
                                                o.type === "limit" &&
                                                o.status !== "canceled" &&
                                                o.status !== "filled";
                                        });
                                        if (existingTP) {
                                            console.log("   \u26A0\uFE0F  TP order already exists: ".concat(existingTP.id));
                                            console.log("   \u26A0\uFE0F  Skipping duplicate TP placement");
                                            position_1 = {
                                                symbol: pos.symbol,
                                                quantity: pos.qty,
                                                entryPrice: entryPrice,
                                                stopLoss: sl,
                                                takeProfit: tp,
                                                takeProfitOrderId: existingTP.id,
                                                enteredAt: new Date(),
                                                status: "active",
                                            };
                                            this_1.positions.set(pos.symbol, position_1);
                                            this_1.startSLMonitoring(pos.symbol, position_1);
                                            console.log("   \u2705 Position recovered with existing TP\n");
                                            return [2 /*return*/, "continue"];
                                        }
                                        tpRounded = Math.round(tp * 100) / 100;
                                        return [4 /*yield*/, this_1.apiClient.post("/v2/orders", {
                                                symbol: pos.symbol,
                                                qty: pos.qty,
                                                side: "sell",
                                                type: "limit",
                                                limit_price: tpRounded,
                                                time_in_force: "gtc",
                                                client_order_id: "recover_tp_".concat(Date.now()),
                                            })];
                                    case 3:
                                        tpOrder = _b.sent();
                                        position = {
                                            symbol: pos.symbol,
                                            quantity: pos.qty,
                                            entryPrice: entryPrice,
                                            stopLoss: sl,
                                            takeProfit: tp,
                                            takeProfitOrderId: tpOrder.data.id,
                                            enteredAt: new Date(),
                                            status: "active",
                                        };
                                        this_1.positions.set(pos.symbol, position);
                                        // Log as inherited position if logger available
                                        if (this_1.logger) {
                                            this_1.logger.logTrade({
                                                timestamp: new Date().toISOString(),
                                                type: "ENTRY",
                                                symbol: pos.symbol,
                                                quantity: parseFloat(pos.qty),
                                                entryPrice: entryPrice,
                                                stopLoss: sl,
                                                takeProfit: tp,
                                                message: "\uD83D\uDCCD RECOVERED: ".concat(pos.symbol, " (Inherited position) | Entry: $").concat(entryPrice.toFixed(2), " | SL: $").concat(sl.toFixed(2), " | TP: $").concat(tp.toFixed(2)),
                                            });
                                        }
                                        this_1.startSLMonitoring(pos.symbol, position);
                                        console.log("   \u2705 TP placed: ".concat(tpOrder.data.id));
                                        console.log("   \u2705 SL monitoring started\n");
                                        return [3 /*break*/, 5];
                                    case 4:
                                        error_9 = _b.sent();
                                        console.error("   \u274C Recovery failed for ".concat(pos.symbol, ":"), error_9 instanceof Error ? error_9.message : error_9);
                                        return [3 /*break*/, 5];
                                    case 5: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, positions_1 = positions;
                        _a.label = 2;
                    case 2:
                        if (!(_i < positions_1.length)) return [3 /*break*/, 5];
                        pos = positions_1[_i];
                        return [5 /*yield**/, _loop_1(pos)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_8 = _a.sent();
                        console.error("\u274C Recovery error:", error_8 instanceof Error ? error_8.message : error_8);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set logger for trade recording
     */
    AlpacaAdapter.prototype.setLogger = function (logger) {
        this.logger = logger;
    };
    /**
     * Cleanup
     */
    AlpacaAdapter.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, interval;
            return __generator(this, function (_b) {
                for (_i = 0, _a = this.monitoringIntervals.values(); _i < _a.length; _i++) {
                    interval = _a[_i];
                    clearInterval(interval);
                }
                this.monitoringIntervals.clear();
                return [2 /*return*/];
            });
        });
    };
    return AlpacaAdapter;
}());
exports.AlpacaAdapter = AlpacaAdapter;
