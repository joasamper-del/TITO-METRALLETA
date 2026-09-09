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

import axios, { AxiosInstance } from "axios";
import { EnhancedOperationLogger } from "./enhanced.operation.logger";

export interface CryptoPosition {
  symbol: string;
  quantity: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  takeProfitOrderId?: string;
  enteredAt: Date;
  status: "active" | "sl_triggered" | "tp_triggered" | "closed";
  lastPrice?: number;
  lastPriceUpdate?: Date;
}

export class AlpacaAdapter {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string = "https://paper-api.alpaca.markets";
  private apiClient: AxiosInstance;
  private positions: Map<string, CryptoPosition> = new Map(); // Track positions by symbol
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private ordersSold: Set<string> = new Set(); // Prevent duplicate sells
  private connectionLost: boolean = false;
  public logger?: EnhancedOperationLogger; // Optional logger for trade recording

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.secretKey = apiSecret;

    this.apiClient = axios.create({
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
  async placeOCOOrder(request: {
    symbol: string;
    quantity: number;
    side: "buy" | "sell";
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    clientOrderId: string;
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      // Validate
      if (request.quantity <= 0 || !request.symbol) {
        return { success: false, error: "Invalid parameters" };
      }

      if (request.side === "buy") {
        if (request.stopLoss >= request.entryPrice) {
          return { success: false, error: "SL must be below entry (buy)" };
        }
        if (request.takeProfit <= request.entryPrice) {
          return { success: false, error: "TP must be above entry (buy)" };
        }
      }

      console.log(`\n📍 PLACING ENTRY ORDER`);
      console.log(`   Symbol: ${request.symbol}`);
      console.log(`   Qty: ${request.quantity}`);
      console.log(`   Entry: $${request.entryPrice.toFixed(2)}`);
      console.log(`   SL: $${request.stopLoss.toFixed(2)} (monitored locally)`);
      console.log(`   TP: $${request.takeProfit.toFixed(2)} (limit order)`);

      // Step 1: Place market entry
      const entryOrder = await this.apiClient.post("/v2/orders", {
        symbol: request.symbol,
        qty: request.quantity,
        side: request.side,
        type: "market",
        time_in_force: "gtc",
        client_order_id: `entry_${request.clientOrderId}`,
      });

      const entryOrderId = entryOrder.data.id;
      console.log(`✅ Entry order placed: ${entryOrderId}`);

      // Step 2: Wait for entry to fill
      const filledEntry = await this.waitForOrderFill(entryOrderId, 10000);
      if (!filledEntry) {
        return { success: false, error: "Entry order did not fill" };
      }

      const actualEntryPrice = parseFloat(filledEntry.filled_avg_price) || request.entryPrice;
      console.log(`✅ Entry filled @ $${actualEntryPrice.toFixed(2)}`);

      // Step 3: Place TP limit order (round to 2 decimals for Alpaca Crypto)
      const tpRounded = Math.round(request.takeProfit * 100) / 100;
      const tpOrder = await this.apiClient.post("/v2/orders", {
        symbol: request.symbol,
        qty: request.quantity,
        side: "sell",
        type: "limit",
        limit_price: tpRounded,
        time_in_force: "gtc",
        client_order_id: `tp_${request.clientOrderId}`,
      });

      const tpOrderId = tpOrder.data.id;
      console.log(`🎯 Take-Profit order placed: ${tpOrderId} @ $${request.takeProfit.toFixed(2)}`);

      // Step 4: Track position and start monitoring
      const position: CryptoPosition = {
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

      return { success: true, orderId: entryOrderId };
    } catch (error) {
      console.error(`❌ Order placement failed:`, error instanceof Error ? error.message : error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Monitor stop-loss every 10 seconds
   * If price <= SL: execute market sell + cancel TP
   */
  private startSLMonitoring(symbol: string, position: CryptoPosition): void {
    let failCount = 0;
    const maxFails = 3;

    const interval = setInterval(async () => {
      try {
        if (position.status !== "active") {
          clearInterval(interval);
          this.monitoringIntervals.delete(symbol);
          return;
        }

        // Get current price
        const price = await this.getCurrentPrice(symbol);
        if (!price) {
          failCount++;
          if (failCount >= maxFails) {
            console.error(`🔴 Cannot get price for ${symbol} after ${maxFails} attempts. BLOCKING new trades.`);
            this.connectionLost = true;
            clearInterval(interval);
          }
          return;
        }

        failCount = 0;
        position.lastPrice = price;
        position.lastPriceUpdate = new Date();

        // Check if SL triggered
        if (price <= position.stopLoss) {
          console.log(`\n🛑 STOP-LOSS TRIGGERED @ $${price.toFixed(2)}`);

          // Prevent duplicate sells
          const sellKey = `${symbol}_${position.entryPrice}`;
          if (this.ordersSold.has(sellKey)) {
            console.log(`⚠️  Already sold this position, skipping duplicate`);
            return;
          }

          position.status = "sl_triggered";

          // Execute market sell
          const sellOrder = await this.executeSell(symbol, position.quantity, price);
          if (sellOrder) {
            this.ordersSold.add(sellKey);
            console.log(`✅ Market sell executed`);

            // Log exit to logger if available
            if (this.logger) {
              // Find the trade ID from position metadata (will need to be set during entry)
              // For now, log with basic info
              const pnl = (price - position.entryPrice) * position.quantity;
              const pnlPercent = ((price - position.entryPrice) / position.entryPrice) * 100;
              this.logger.logTrade({
                timestamp: new Date().toISOString(),
                type: "SL_TRIGGERED",
                symbol,
                quantity: position.quantity,
                entryPrice: position.entryPrice,
                currentPrice: price,
                stopLoss: position.stopLoss,
                takeProfit: position.takeProfit,
                profitLoss: pnl,
                profitLossPercent: pnlPercent,
                message: `🛑 STOP-LOSS: ${symbol} @ $${price.toFixed(2)} | P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)`,
              });
            }

            // Cancel TP order
            if (position.takeProfitOrderId) {
              await this.cancelOrder(position.takeProfitOrderId);
              console.log(`✋ Take-Profit order cancelled`);
            }

            position.status = "closed";
          }

          clearInterval(interval);
          this.monitoringIntervals.delete(symbol);
        }
      } catch (error) {
        console.error(`❌ Monitoring error:`, error instanceof Error ? error.message : error);
      }
    }, 10000); // 10 second interval

    this.monitoringIntervals.set(symbol, interval);
    console.log(`🔍 SL monitoring started (every 10s)`);
  }

  /**
   * Get current price for symbol
   */
  private async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      // Try to get latest quote
      const positions = await this.apiClient.get("/v2/positions");
      const pos = positions.data.find((p: any) => p.symbol === symbol);
      if (pos) {
        return parseFloat(pos.current_price);
      }
      return null;
    } catch (error) {
      console.error(`Error getting price for ${symbol}:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Execute market sell
   */
  private async executeSell(symbol: string, quantity: number, price: number): Promise<boolean> {
    try {
      const sellOrder = await this.apiClient.post("/v2/orders", {
        symbol,
        qty: quantity,
        side: "sell",
        type: "market",
        time_in_force: "gtc",
        client_order_id: `sl_sell_${Date.now()}`,
      });

      console.log(`   Sell order: ${sellOrder.data.id}`);
      return true;
    } catch (error) {
      console.error(`❌ Market sell failed:`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Wait for order to fill
   */
  private async waitForOrderFill(orderId: string, timeoutMs: number = 10000): Promise<any> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        const res = await this.apiClient.get(`/v2/orders/${orderId}`);
        if (res.data.status === "filled" || res.data.filled_qty > 0) {
          return res.data;
        }
        await new Promise((r) => setTimeout(r, 1000));
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.apiClient.delete(`/v2/orders/${orderId}`);
      return true;
    } catch (error) {
      console.error(`Error cancelling order:`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.apiClient.get("/v2/account");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get account
   */
  async getAccount(): Promise<any> {
    try {
      const res = await this.apiClient.get("/v2/account");
      return {
        balance: parseFloat(res.data.equity),
        cash: parseFloat(res.data.cash),
        buyingPower: parseFloat(res.data.buying_power),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get positions
   */
  async getPositions(): Promise<any[]> {
    try {
      const res = await this.apiClient.get("/v2/positions");
      return res.data;
    } catch {
      return [];
    }
  }

  /**
   * Get tracked position
   */
  getTrackedPosition(symbol: string): CryptoPosition | undefined {
    return this.positions.get(symbol);
  }

  /**
   * Check if connection lost
   */
  isConnectionLost(): boolean {
    return this.connectionLost;
  }

  /**
   * Recover existing positions on startup
   * Detects open positions and starts SL monitoring
   */
  async recoverExistingPositions(): Promise<void> {
    try {
      console.log("\n🔄 Recovering existing positions...");
      const positions = await this.getPositions();

      if (positions.length === 0) {
        console.log("   No positions to recover\n");
        return;
      }

      for (const pos of positions) {
        if (this.positions.has(pos.symbol)) {
          console.log(`   ⚠️  ${pos.symbol} already monitored, skipping`);
          continue;
        }

        const entryPrice = parseFloat(pos.avg_entry_price as any) || parseFloat(pos.current_price as any);
        const sl = entryPrice * 0.99; // 1% stop
        const tp = entryPrice * 1.02; // 2% profit

        console.log(`\n   📍 Recovering ${pos.symbol}`);
        console.log(`      Qty: ${pos.qty}`);
        console.log(`      Entry: $${entryPrice.toFixed(2)}`);
        console.log(`      SL: $${sl.toFixed(2)} (will monitor)`);
        console.log(`      TP: $${tp.toFixed(2)} (placing limit)`);

        // Place TP limit order
        try {
          // Check for existing TP orders first
          // Note: Alpaca returns symbols as "BTC/USD" but positions as "BTCUSD"
          const orders = await this.apiClient.get("/v2/orders");
          const normalizeSymbol = (sym: string) => sym.replace("/", "");
          const existingTP = orders.data.find(
            (o: any) =>
              normalizeSymbol(o.symbol) === pos.symbol &&
              o.side === "sell" &&
              o.type === "limit" &&
              o.status !== "canceled" &&
              o.status !== "filled"
          );

          if (existingTP) {
            console.log(`   ⚠️  TP order already exists: ${existingTP.id}`);
            console.log(`   ⚠️  Skipping duplicate TP placement`);

            // Track position with existing TP
            const position: CryptoPosition = {
              symbol: pos.symbol,
              quantity: pos.qty,
              entryPrice: entryPrice,
              stopLoss: sl,
              takeProfit: tp,
              takeProfitOrderId: existingTP.id,
              enteredAt: new Date(),
              status: "active",
            };

            this.positions.set(pos.symbol, position);
            this.startSLMonitoring(pos.symbol, position);
            console.log(`   ✅ Position recovered with existing TP\n`);
            continue;
          }

          // Round TP price to 2 decimals (Alpaca Crypto requirement)
          const tpRounded = Math.round(tp * 100) / 100;

          const tpOrder = await this.apiClient.post("/v2/orders", {
            symbol: pos.symbol,
            qty: pos.qty,
            side: "sell",
            type: "limit",
            limit_price: tpRounded,
            time_in_force: "gtc",
            client_order_id: `recover_tp_${Date.now()}`,
          });

          // Track position and start monitoring
          const position: CryptoPosition = {
            symbol: pos.symbol,
            quantity: pos.qty,
            entryPrice: entryPrice,
            stopLoss: sl,
            takeProfit: tp,
            takeProfitOrderId: tpOrder.data.id,
            enteredAt: new Date(),
            status: "active",
          };

          this.positions.set(pos.symbol, position);

          // Log as inherited position if logger available
          if (this.logger) {
            this.logger.logTrade({
              timestamp: new Date().toISOString(),
              type: "ENTRY",
              symbol: pos.symbol,
              quantity: parseFloat(pos.qty),
              entryPrice: entryPrice,
              stopLoss: sl,
              takeProfit: tp,
              message: `📍 RECOVERED: ${pos.symbol} (Inherited position) | Entry: $${entryPrice.toFixed(2)} | SL: $${sl.toFixed(2)} | TP: $${tp.toFixed(2)}`,
            });
          }

          this.startSLMonitoring(pos.symbol, position);

          console.log(`   ✅ TP placed: ${tpOrder.data.id}`);
          console.log(`   ✅ SL monitoring started\n`);
        } catch (error) {
          console.error(`   ❌ Recovery failed for ${pos.symbol}:`, error instanceof Error ? error.message : error);
        }
      }
    } catch (error) {
      console.error(`❌ Recovery error:`, error instanceof Error ? error.message : error);
    }
  }

  /**
   * Set logger for trade recording
   */
  setLogger(logger: EnhancedOperationLogger): void {
    this.logger = logger;
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();
  }
}
