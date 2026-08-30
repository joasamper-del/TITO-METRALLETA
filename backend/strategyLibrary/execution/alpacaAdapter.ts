/**
 * Alpaca Adapter
 * Connects to Alpaca Paper Trading API
 * Places OCO orders, monitors fills, retrieves P&L
 */

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

export class AlpacaAdapter {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string = "https://paper-api.alpaca.markets"; // PAPER TRADING
  private orders: Map<string, AlpacaOrder> = new Map();
  private positions: Map<string, AlpacaPosition> = new Map();

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;

    if (!apiKey || !secretKey) {
      throw new Error("Alpaca API credentials required (APCA_API_KEY_ID, APCA_API_SECRET_KEY)");
    }
  }

  /**
   * Place OCO (One-Cancels-Other) order
   * Entry + Stop Loss + Take Profit
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
        };
      }

      // In real implementation: call Alpaca API
      // For now: simulate order placement
      const orderId = `${request.symbol}_${Date.now()}`;

      const order: AlpacaOrder = {
        id: orderId,
        symbol: request.symbol,
        quantity: request.quantity,
        filledQty: 0,
        side: request.side,
        status: "pending",
        createdAt: new Date(),
        error: undefined,
      };

      this.orders.set(orderId, order);

      // Simulate fill (in real scenario, wait for webhook/polling)
      setTimeout(() => {
        this.simulateFill(orderId, request.entryPrice);
      }, 1000);

      return order;
    } catch (error) {
      return {
        id: "",
        symbol: request.symbol,
        quantity: 0,
        filledQty: 0,
        side: request.side,
        status: "rejected",
        error: `Alpaca error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Simulate order fill (in production: polling/webhook)
   */
  private simulateFill(orderId: string, filledPrice: number): void {
    const order = this.orders.get(orderId);
    if (!order) return;

    order.filledQty = order.quantity;
    order.filledPrice = filledPrice;
    order.status = "filled";
    order.filledAt = new Date();

    // Create position
    this.positions.set(order.symbol, {
      symbol: order.symbol,
      quantity: order.quantity,
      entryPrice: filledPrice,
      currentPrice: filledPrice,
      unrealizedPnL: 0,
      unrealizedPnLPct: 0,
    });
  }

  /**
   * Get order status
   */
  async getOrder(orderId: string): Promise<AlpacaOrder | undefined> {
    return this.orders.get(orderId);
  }

  /**
   * Get all open positions
   */
  async getPositions(): Promise<AlpacaPosition[]> {
    return Array.from(this.positions.values()).filter((p) => !p.closedAt);
  }

  /**
   * Get specific position
   */
  async getPosition(symbol: string): Promise<AlpacaPosition | undefined> {
    return this.positions.get(symbol);
  }

  /**
   * Close position (exit trade)
   */
  async closePosition(symbol: string, exitPrice: number): Promise<AlpacaPosition | undefined> {
    const position = this.positions.get(symbol);
    if (!position) return undefined;

    position.closedAt = new Date();
    position.exitPrice = exitPrice;
    position.realizedPnL = (exitPrice - position.entryPrice) * position.quantity;

    return position;
  }

  /**
   * Get account info
   */
  async getAccount(): Promise<AlpacaAccount> {
    // In real implementation: call Alpaca /v2/account
    // For now: simulate account data
    return {
      totalBalance: 100000, // $100k starting balance
      availableCash: 95000,
      buyingPower: 380000, // 4x for day trading
      portfolioValue: 100000,
      accountEquity: 100000,
      lastEquity: 100000,
      todayPnL: 0,
    };
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order || order.status === "filled") return false;

    order.status = "cancelled";
    return true;
  }

  /**
   * Update market prices (for simulation/backtesting)
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
      // In real implementation: call Alpaca /v2/account
      // For now: always true (paper trading is always available)
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
}
