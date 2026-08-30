/**
 * Simulation Mode
 * Replicate exact execution flow without touching Alpaca
 * Test every decision before going live
 */

import { AlpacaOrder, AlpacaPosition } from "./alpacaAdapter";
import { PreFlightChecklist, PreFlightResult } from "./preFlightChecklist";

export interface SimulatedTrade {
  orderId: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  entryTime: Date;
  stopLoss: number;
  takeProfit: number;
  status: "open" | "closed";
  exitPrice?: number;
  exitTime?: Date;
  exitReason?: "TP_HIT" | "SL_HIT" | "MANUAL";
  pnlDollars?: number;
  pnlPercent?: number;
}

export interface SimulationConfig {
  startingBalance: number;
  maxDrawdown?: number; // -5% by default
  maxDailyLoss?: number; // -2% by default
}

export class SimulationMode {
  private config: SimulationConfig;
  private preFlightChecklist: PreFlightChecklist;
  private trades: Map<string, SimulatedTrade> = new Map();
  private accountBalance: number;
  private dailyPnL: number = 0;
  private openPositions: Map<string, SimulatedTrade> = new Map();

  constructor(config: SimulationConfig = { startingBalance: 100000 }) {
    this.config = {
      startingBalance: config.startingBalance,
      maxDrawdown: config.maxDrawdown || -0.05,
      maxDailyLoss: config.maxDailyLoss || -0.02,
    };
    this.accountBalance = config.startingBalance;
    this.preFlightChecklist = new PreFlightChecklist();
  }

  /**
   * Simulate order placement (exactly like Alpaca, but no API call)
   */
  async placeOrder(config: {
    symbol: string;
    quantity: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    timestamp: Date;
  }): Promise<{
    success: boolean;
    order?: SimulatedTrade;
    preFlightResult: PreFlightResult;
    reason?: string;
  }> {
    // Step 1: Run pre-flight checklist
    const preFlightResult = await this.preFlightChecklist.runAll({
      symbol: config.symbol,
      entryPrice: config.entryPrice,
      stopLoss: config.stopLoss,
      takeProfit: config.takeProfit,
      positionSize: config.quantity,
      accountData: {
        totalBalance: this.accountBalance,
        dailyPnL: this.dailyPnL,
      },
      marketData: {
        volume: 50000000, // Mock volume (assume high liquidity)
        vix: 18, // Mock VIX
      },
      isSimulation: true,
      timestamp: config.timestamp,
    });

    // Step 2: Check if pre-flight passed
    if (preFlightResult.status === "BLOCKED") {
      return {
        success: false,
        preFlightResult,
        reason: `Pre-flight blocked: ${preFlightResult.blockedReasons.join("; ")}`,
      };
    }

    // Step 3: Create simulated trade
    const orderId = `SIM_${config.symbol}_${Date.now()}`;
    const trade: SimulatedTrade = {
      orderId,
      symbol: config.symbol,
      quantity: config.quantity,
      entryPrice: config.entryPrice,
      entryTime: config.timestamp,
      stopLoss: config.stopLoss,
      takeProfit: config.takeProfit,
      status: "open",
    };

    this.trades.set(orderId, trade);
    this.openPositions.set(config.symbol, trade);

    return {
      success: true,
      order: trade,
      preFlightResult,
    };
  }

  /**
   * Simulate market price update and exit logic
   */
  updateMarketPrice(symbol: string, newPrice: number, timestamp: Date): SimulatedTrade | undefined {
    const position = this.openPositions.get(symbol);
    if (!position) return undefined;

    // Check SL
    if (newPrice <= position.stopLoss) {
      return this.closePosition(position.orderId, position.stopLoss, "SL_HIT", timestamp);
    }

    // Check TP
    if (newPrice >= position.takeProfit) {
      return this.closePosition(position.orderId, position.takeProfit, "TP_HIT", timestamp);
    }

    return undefined; // Still open
  }

  /**
   * Close a position
   */
  private closePosition(
    orderId: string,
    exitPrice: number,
    exitReason: "TP_HIT" | "SL_HIT" | "MANUAL",
    timestamp: Date
  ): SimulatedTrade | undefined {
    const trade = this.trades.get(orderId);
    if (!trade || trade.status === "closed") return undefined;

    trade.status = "closed";
    trade.exitPrice = exitPrice;
    trade.exitTime = timestamp;
    trade.exitReason = exitReason;
    trade.pnlDollars = (exitPrice - trade.entryPrice) * trade.quantity;
    trade.pnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;

    // Update account
    this.accountBalance += trade.pnlDollars;
    this.dailyPnL += trade.pnlDollars;

    // Remove from open positions
    this.openPositions.delete(trade.symbol);

    return trade;
  }

  /**
   * Get current account status
   */
  getAccountStatus(): {
    balance: number;
    dailyPnL: number;
    openPositions: number;
    trades: number;
  } {
    return {
      balance: this.accountBalance,
      dailyPnL: this.dailyPnL,
      openPositions: this.openPositions.size,
      trades: this.trades.size,
    };
  }

  /**
   * Get trade history
   */
  getTradeHistory(): SimulatedTrade[] {
    return Array.from(this.trades.values());
  }

  /**
   * Get open positions
   */
  getOpenPositions(): SimulatedTrade[] {
    return Array.from(this.openPositions.values());
  }

  /**
   * Close all positions (end-of-day)
   */
  closeAllPositions(prices: Record<string, number>, timestamp: Date): void {
    for (const [symbol, price] of Object.entries(prices)) {
      this.updateMarketPrice(symbol, price, timestamp);
    }
  }

  /**
   * Reset for next trading day
   */
  resetDaily(): void {
    this.dailyPnL = 0;
  }

  /**
   * Generate simulation report
   */
  generateReport(): string {
    const closed = this.getTradeHistory().filter((t) => t.status === "closed");
    const totalPnL = closed.reduce((sum, t) => sum + (t.pnlDollars || 0), 0);
    const wins = closed.filter((t) => (t.pnlDollars || 0) > 0).length;
    const losses = closed.filter((t) => (t.pnlDollars || 0) < 0).length;
    const winRate = closed.length > 0 ? ((wins / closed.length) * 100).toFixed(1) : "0";

    const lines: string[] = [
      `═══════════════════════════════════════════════════════`,
      `SIMULATION REPORT`,
      `═══════════════════════════════════════════════════════`,
      ``,
      `Starting Balance: $${this.config.startingBalance.toFixed(2)}`,
      `Current Balance: $${this.accountBalance.toFixed(2)}`,
      `Total P&L: $${totalPnL.toFixed(2)}`,
      ``,
      `Trades Completed: ${closed.length}`,
      `Wins: ${wins}`,
      `Losses: ${losses}`,
      `Win Rate: ${winRate}%`,
      ``,
      `Open Positions: ${this.openPositions.size}`,
    ];

    return lines.join("\n");
  }
}
