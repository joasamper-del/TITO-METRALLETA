/**
 * Alpaca Adapter (Real Implementation)
 * Connects to Alpaca Paper Trading API
 * Places orders with simulated OCO (since Alpaca Crypto doesn't support OCO natively)
 *
 * Alpaca Crypto Limitation: NO native OCO/bracket support
 * Solution: Place entry → on fill, place STOP + TAKE_PROFIT separately
 *           Monitor and cancel paired order when one executes
 */

import axios, { AxiosInstance } from "axios";

export interface AlpacaOrderRequest {
  symbol: string;
  quantity: number;
  side: "buy" | "sell";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  clientOrderId: string;
}

export interface AlpacaOrder {
  id: string;
  symbol: string;
  quantity: number;
  filledQty: number;
  side: "buy" | "sell";
  status: "pending" | "filled" | "partial" | "rejected" | "cancelled";
  filledPrice?: number;
  createdAt: Date;
  filledAt?: Date;
  error?: string;
}

export interface AlpacaPosition {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  closedAt?: Date;
  exitPrice?: number;
  realizedPnL?: number;
}

export interface AlpacaAccount {
  totalBalance: number;
  availableCash: number;
  buyingPower: number;
  portfolioValue: number;
  portfolioMarginMultiplier?: number;
  dayTradingBuyingPower?: number;
  accountEquity: number;
  lastEquity: number;
  todayPnL: number;
}

export interface ProtectiveOrders {
  entryOrderId: string;
  stopLossOrderId?: string;
  takeProfitOrderId?: string;
  exitedVia?: "stop" | "profit" | "manual";
}

export class AlpacaAdapter {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string = "https://paper-api.alpaca.markets"; // PAPER TRADING
  private apiClient: AxiosInstance;
  private orders: Map<string, AlpacaOrder> = new Map();
  private positions: Map<string, AlpacaPosition> = new Map();
  private protectiveOrders: Map<string, ProtectiveOrders> = new Map(); // Track entry + stop + tp
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;

    if (!apiKey || !secretKey) {
      throw new Error("Alpaca API credentials required (APCA_API_KEY_ID, APCA_API_SECRET_KEY)");
    }

    // Initialize Alpaca HTTP client
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "APCA-API-KEY-ID": apiKey,
        "APCA-API-SECRET-KEY": secretKey,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
  }

  /**
   * Place OCO simulation for Alpaca Crypto
   * Step 1: Place entry order (BUY at market/limit)
   * Step 2: Poll until filled
   * Step 3: Place STOP and TAKE_PROFIT orders
   * Step 4: Monitor - cancel TP if SL hits, cancel SL if TP hits
   */
  async placeOCOOrder(request: AlpacaOrderRequest): Promise<AlpacaOrder> {
    try {
      // Validate inputs
      if (request.quantity <= 0 || !request.symbol || !request.entryPrice) {
        return {
          id: "",
          symbol: request.symbol,
          quantity: 0,
          filledQty: 0,
          side: request.side,
          status: "rejected",
          error: "Invalid order parameters (qty, symbol, price)",
          createdAt: new Date(),
        };
      }

      // Validate stop/tp levels
      if (request.side === "buy") {
        if (request.stopLoss >= request.entryPrice) {
          return {
            id: "",
            symbol: request.symbol,
            quantity: 0,
            filledQty: 0,
            side: request.side,
            status: "rejected",
            error: "Buy SL must be below entry price",
            createdAt: new Date(),
          };
        }
        if (request.takeProfit <= request.entryPrice) {
          return {
            id: "",
            symbol: request.symbol,
            quantity: 0,
            filledQty: 0,
            side: request.side,
            status: "rejected",
            error: "Buy TP must be above entry price",
            createdAt: new Date(),
          };
        }
      }

      console.log(`📍 Placing entry order: ${request.side.toUpperCase()} ${request.quantity} ${request.symbol} @ ${request.entryPrice.toFixed(2)}`);
      console.log(`   SL: ${request.stopLoss.toFixed(2)} | TP: ${request.takeProfit.toFixed(2)}`);

      // Step 1: Place entry order
      const entryOrder = await this.placeMarketOrder(
        request.symbol,
        request.quantity,
        request.side,
        request.clientOrderId
      );

      if (entryOrder.status === "rejected") {
        console.error(`❌ Entry order rejected: ${entryOrder.error}`);
        return entryOrder;
      }

      // Step 2: Wait for entry to fill
      const filledEntry = await this.waitForOrderFill(entryOrder.id, 30000); // 30s timeout

      if (!filledEntry || filledEntry.filledQty === 0) {
        return {
          ...entryOrder,
          error: "Entry order did not fill within timeout",
          status: "rejected",
          createdAt: new Date(),
        };
      }

      console.log(`✅ Entry filled @ ${filledEntry.filledPrice?.toFixed(2)}`);

      // Step 3: Place protective orders (STOP + TAKE_PROFIT)
      const stopOrder = await this.placeStopOrder(
        request.symbol,
        request.quantity,
        "sell", // Opposite side
        request.stopLoss,
        `${request.clientOrderId}_SL`
      );

      const tpOrder = await this.placeLimitOrder(
        request.symbol,
        request.quantity,
        "sell", // Opposite side
        request.takeProfit,
        `${request.clientOrderId}_TP`
      );

      console.log(`🛡️  Protective orders placed:`);
      console.log(`   SL: ${stopOrder.id}`);
      console.log(`   TP: ${tpOrder.id}`);

      // Step 4: Track the protective orders
      const protectiveEntry: ProtectiveOrders = {
        entryOrderId: entryOrder.id,
        stopLossOrderId: stopOrder.id,
        takeProfitOrderId: tpOrder.id,
      };

      this.protectiveOrders.set(request.symbol, protectiveEntry);

      // Step 5: Start monitoring (cancel paired order when one executes)
      this.startProtectiveMonitoring(request.symbol, protectiveEntry);

      // Update local state
      this.orders.set(entryOrder.id, filledEntry);
      this.positions.set(request.symbol, {
        symbol: request.symbol,
        quantity: request.quantity,
        entryPrice: filledEntry.filledPrice || request.entryPrice,
        currentPrice: filledEntry.filledPrice || request.entryPrice,
        unrealizedPnL: 0,
        unrealizedPnLPct: 0,
      });

      return {
        ...entryOrder,
        filledQty: filledEntry.filledQty,
        filledPrice: filledEntry.filledPrice,
        status: "filled",
      };
    } catch (error) {
      return {
        id: "",
        symbol: request.symbol,
        quantity: 0,
        filledQty: 0,
        side: request.side,
        status: "rejected",
        error: `Alpaca error: ${error instanceof Error ? error.message : String(error)}`,
        createdAt: new Date(),
      };
    }
  }

  /**
   * Place market order (buy/sell at current price)
   */
  private async placeMarketOrder(
    symbol: string,
    quantity: number,
    side: "buy" | "sell",
    clientOrderId: string
  ): Promise<AlpacaOrder> {
    try {
      const response = await this.apiClient.post("/v2/orders", {
        symbol,
        qty: quantity,
        side,
        type: "market",
        time_in_force: "day",
        client_order_id: clientOrderId,
      });

      const order: AlpacaOrder = {
        id: response.data.id,
        symbol: response.data.symbol,
        quantity: response.data.qty,
        filledQty: response.data.filled_qty || 0,
        side: response.data.side,
        status: response.data.status as any,
        createdAt: new Date(response.data.created_at),
      };

      this.orders.set(order.id, order);
      return order;
    } catch (error) {
      console.error(`❌ Market order failed:`, error instanceof Error ? error.message : error);
      return {
        id: "",
        symbol,
        quantity: 0,
        filledQty: 0,
        side,
        status: "rejected",
        error: error instanceof Error ? error.message : String(error),
        createdAt: new Date(),
      };
    }
  }

  /**
   * Place stop-loss order
   */
  private async placeStopOrder(
    symbol: string,
    quantity: number,
    side: "buy" | "sell",
    stopPrice: number,
    clientOrderId: string
  ): Promise<AlpacaOrder> {
    try {
      const response = await this.apiClient.post("/v2/orders", {
        symbol,
        qty: quantity,
        side,
        type: "stop",
        stop_price: stopPrice,
        time_in_force: "gtc", // Good-til-cancelled
        client_order_id: clientOrderId,
      });

      const order: AlpacaOrder = {
        id: response.data.id,
        symbol: response.data.symbol,
        quantity: response.data.qty,
        filledQty: response.data.filled_qty || 0,
        side: response.data.side,
        status: response.data.status as any,
        createdAt: new Date(response.data.created_at),
      };

      this.orders.set(order.id, order);
      return order;
    } catch (error) {
      console.error(`❌ Stop order failed:`, error instanceof Error ? error.message : error);
      return {
        id: "",
        symbol,
        quantity: 0,
        filledQty: 0,
        side,
        status: "rejected",
        error: error instanceof Error ? error.message : String(error),
        createdAt: new Date(),
      };
    }
  }

  /**
   * Place take-profit order (limit order)
   */
  private async placeLimitOrder(
    symbol: string,
    quantity: number,
    side: "buy" | "sell",
    limitPrice: number,
    clientOrderId: string
  ): Promise<AlpacaOrder> {
    try {
      const response = await this.apiClient.post("/v2/orders", {
        symbol,
        qty: quantity,
        side,
        type: "limit",
        limit_price: limitPrice,
        time_in_force: "gtc", // Good-til-cancelled
        client_order_id: clientOrderId,
      });

      const order: AlpacaOrder = {
        id: response.data.id,
        symbol: response.data.symbol,
        quantity: response.data.qty,
        filledQty: response.data.filled_qty || 0,
        side: response.data.side,
        status: response.data.status as any,
        createdAt: new Date(response.data.created_at),
      };

      this.orders.set(order.id, order);
      return order;
    } catch (error) {
      console.error(`❌ Limit order failed:`, error instanceof Error ? error.message : error);
      return {
        id: "",
        symbol,
        quantity: 0,
        filledQty: 0,
        side,
        status: "rejected",
        error: error instanceof Error ? error.message : String(error),
        createdAt: new Date(),
      };
    }
  }

  /**
   * Wait for order to fill (polling with timeout)
   */
  private async waitForOrderFill(orderId: string, timeoutMs: number = 30000): Promise<AlpacaOrder | null> {
    const startTime = Date.now();
    const pollInterval = 1000; // Poll every 1 second

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await this.apiClient.get(`/v2/orders/${orderId}`);
        const order: AlpacaOrder = {
          id: response.data.id,
          symbol: response.data.symbol,
          quantity: response.data.qty,
          filledQty: response.data.filled_qty || 0,
          side: response.data.side,
          status: response.data.status as any,
          filledPrice: response.data.filled_avg_price,
          createdAt: new Date(response.data.created_at),
          filledAt: response.data.filled_at ? new Date(response.data.filled_at) : undefined,
        };

        if (order.status === "filled" || order.filledQty > 0) {
          return order;
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error(`⚠️  Error polling order ${orderId}:`, error instanceof Error ? error.message : error);
        return null;
      }
    }

    return null;
  }

  /**
   * Monitor protective orders - cancel paired order when one executes
   */
  private startProtectiveMonitoring(symbol: string, orders: ProtectiveOrders): void {
    const monitorInterval = setInterval(async () => {
      try {
        if (!orders.stopLossOrderId || !orders.takeProfitOrderId) return;

        // Check SL status
        const slOrder = await this.apiClient.get(`/v2/orders/${orders.stopLossOrderId}`);
        const tpOrder = await this.apiClient.get(`/v2/orders/${orders.takeProfitOrderId}`);

        // If SL filled, cancel TP
        if (slOrder.data.status === "filled" || slOrder.data.filled_qty > 0) {
          console.log(`🛑 Stop-Loss EXECUTED @ ${slOrder.data.filled_avg_price}`);
          await this.cancelOrder(orders.takeProfitOrderId);
          orders.exitedVia = "stop";
          clearInterval(monitorInterval);
          return;
        }

        // If TP filled, cancel SL
        if (tpOrder.data.status === "filled" || tpOrder.data.filled_qty > 0) {
          console.log(`📈 Take-Profit EXECUTED @ ${tpOrder.data.filled_avg_price}`);
          await this.cancelOrder(orders.stopLossOrderId);
          orders.exitedVia = "profit";
          clearInterval(monitorInterval);
          return;
        }
      } catch (error) {
        console.error(`⚠️  Error monitoring protective orders:`, error instanceof Error ? error.message : error);
      }
    }, 5000); // Monitor every 5 seconds

    this.monitoringIntervals.set(symbol, monitorInterval);
  }

  /**
   * Get order status
   */
  async getOrder(orderId: string): Promise<AlpacaOrder | undefined> {
    try {
      const response = await this.apiClient.get(`/v2/orders/${orderId}`);
      const order: AlpacaOrder = {
        id: response.data.id,
        symbol: response.data.symbol,
        quantity: response.data.qty,
        filledQty: response.data.filled_qty || 0,
        side: response.data.side,
        status: response.data.status as any,
        filledPrice: response.data.filled_avg_price,
        createdAt: new Date(response.data.created_at),
        filledAt: response.data.filled_at ? new Date(response.data.filled_at) : undefined,
      };
      return order;
    } catch (error) {
      return this.orders.get(orderId);
    }
  }

  /**
   * Get all open positions from Alpaca
   */
  async getPositions(): Promise<AlpacaPosition[]> {
    try {
      const response = await this.apiClient.get("/v2/positions");
      return response.data.map((p: any) => ({
        symbol: p.symbol,
        quantity: p.qty,
        entryPrice: p.avg_fill_price,
        currentPrice: p.current_price,
        unrealizedPnL: p.unrealized_pl,
        unrealizedPnLPct: p.unrealized_plpc * 100,
      }));
    } catch (error) {
      console.error("Error fetching positions:", error);
      return Array.from(this.positions.values()).filter((p) => !p.closedAt);
    }
  }

  /**
   * Get specific position
   */
  async getPosition(symbol: string): Promise<AlpacaPosition | undefined> {
    try {
      const response = await this.apiClient.get(`/v2/positions/${symbol}`);
      return {
        symbol: response.data.symbol,
        quantity: response.data.qty,
        entryPrice: response.data.avg_fill_price,
        currentPrice: response.data.current_price,
        unrealizedPnL: response.data.unrealized_pl,
        unrealizedPnLPct: response.data.unrealized_plpc * 100,
      };
    } catch (error) {
      return this.positions.get(symbol);
    }
  }

  /**
   * Close position (exit trade) - cancel protective orders
   */
  async closePosition(symbol: string, exitPrice: number): Promise<AlpacaPosition | undefined> {
    const position = this.positions.get(symbol);
    if (!position) return undefined;

    // Cancel protective orders
    const protective = this.protectiveOrders.get(symbol);
    if (protective) {
      if (protective.stopLossOrderId) await this.cancelOrder(protective.stopLossOrderId);
      if (protective.takeProfitOrderId) await this.cancelOrder(protective.takeProfitOrderId);
      clearInterval(this.monitoringIntervals.get(symbol));
      this.monitoringIntervals.delete(symbol);
      this.protectiveOrders.delete(symbol);
    }

    position.closedAt = new Date();
    position.exitPrice = exitPrice;
    position.realizedPnL = (exitPrice - position.entryPrice) * position.quantity;

    return position;
  }

  /**
   * Get account info from Alpaca
   */
  async getAccount(): Promise<AlpacaAccount> {
    try {
      const response = await this.apiClient.get("/v2/account");
      return {
        totalBalance: parseFloat(response.data.equity),
        availableCash: parseFloat(response.data.cash),
        buyingPower: parseFloat(response.data.buying_power),
        portfolioValue: parseFloat(response.data.portfolio_value),
        accountEquity: parseFloat(response.data.equity),
        lastEquity: parseFloat(response.data.last_equity),
        todayPnL: parseFloat(response.data.portfolio_value) - parseFloat(response.data.last_equity),
      };
    } catch (error) {
      console.error("Error fetching account:", error);
      return {
        totalBalance: 0,
        availableCash: 0,
        buyingPower: 0,
        portfolioValue: 0,
        accountEquity: 0,
        lastEquity: 0,
        todayPnL: 0,
      };
    }
  }

  /**
   * Cancel order in Alpaca
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.apiClient.delete(`/v2/orders/${orderId}`);
      const order = this.orders.get(orderId);
      if (order) {
        order.status = "cancelled";
      }
      console.log(`✋ Order cancelled: ${orderId}`);
      return true;
    } catch (error) {
      console.error(`Error cancelling order ${orderId}:`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Update market prices (for local tracking)
   */
  updateMarketPrice(symbol: string, price: number): void {
    const position = this.positions.get(symbol);
    if (!position) return;

    position.currentPrice = price;
    position.unrealizedPnL = (price - position.entryPrice) * position.quantity;
    position.unrealizedPnLPct = ((price - position.entryPrice) / position.entryPrice) * 100;
  }

  /**
   * Health check: can we connect to Alpaca?
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
   * Format order status for logging
   */
  formatOrder(order: AlpacaOrder): string {
    return `
    Order: ${order.id}
    Symbol: ${order.symbol}
    Side: ${order.side.toUpperCase()}
    Quantity: ${order.quantity}
    Filled: ${order.filledQty}/${order.quantity}
    Status: ${order.status}
    Filled Price: ${order.filledPrice?.toFixed(2) || "N/A"}
    Created: ${order.createdAt.toISOString()}
    ${order.error ? `Error: ${order.error}` : ""}
    `.trim();
  }

  /**
   * Format position status for logging
   */
  formatPosition(position: AlpacaPosition): string {
    const pnl = position.unrealizedPnL.toFixed(2);
    const pnlPct = position.unrealizedPnLPct.toFixed(2);
    const status = position.closedAt ? "CLOSED" : "OPEN";

    return `
    Position: ${position.symbol}
    Status: ${status}
    Quantity: ${position.quantity}
    Entry: ${position.entryPrice.toFixed(2)}
    Current: ${position.currentPrice.toFixed(2)}
    P&L: $${pnl} (${pnlPct}%)
    `.trim();
  }

  /**
   * Get protective orders info
   */
  getProtectiveOrders(symbol: string): ProtectiveOrders | undefined {
    return this.protectiveOrders.get(symbol);
  }

  /**
   * Cleanup monitoring on shutdown
   */
  async cleanup(): Promise<void> {
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();
  }
}
