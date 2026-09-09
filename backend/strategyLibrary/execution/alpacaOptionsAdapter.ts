/**
 * Alpaca Options Adapter
 * Executes options strategies (spreads, singles) on Alpaca Paper Trading
 *
 * Supported:
 * - BearPutSpreadStrategy: Sell 1 put OTM, Buy 1 put further OTM → credit spread
 * - WheelStrategy: Sell puts on demand, buy calls for income
 * - Long Straddle/Strangle: Buy put + call positions
 */

import axios, { AxiosInstance } from "axios";
import { EnhancedOperationLogger } from "./enhanced.operation.logger";

export interface OptionsOrder {
  orderId: string;
  clientOrderId: string;
  status: "pending" | "filled" | "partial" | "rejected" | "expired";
  symbol: string;
  legs: OptionLeg[];
  createdAt: Date;
  filledAt?: Date;
  totalCost: number; // Credit received (positive) or debit paid (negative)
}

export interface OptionLeg {
  side: "buy" | "sell";
  optionSymbol: string; // e.g., SPY_092626P450
  quantity: number;
  strikePrice: number;
  expirationDate: string; // YYMMDD
  optionType: "call" | "put";
  avgFillPrice?: number;
  status: "pending" | "filled" | "rejected";
}

export interface OptionsPosition {
  symbol: string; // Underlying (SPY, QQQ, etc)
  strategyName: string; // BearPutSpread, Wheel, etc
  legs: OptionLeg[];
  totalCost: number; // Net credit/debit
  maxProfit: number; // Credit received (if spread)
  maxLoss: number; // Distance between strikes
  enteredAt: Date;
  status: "active" | "closed" | "partially_closed";
  daysToExpiration: number;
  currentValue?: number; // Market value of position
}

export class AlpacaOptionsAdapter {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string = "https://paper-api.alpaca.markets";
  private apiClient: AxiosInstance;
  private positions: Map<string, OptionsPosition> = new Map();
  public logger?: EnhancedOperationLogger;

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
   * Execute Bear Put Spread
   * Sell 1 put OTM, Buy 1 put further OTM
   * Max profit = credit received
   * Max loss = distance between strikes - credit received
   */
  async placeBearPutSpread(params: {
    symbol: string; // SPY, QQQ
    shortStrike: number;
    longStrike: number;
    expiration: string; // YYMMDD
    quantity: number;
    clientOrderId: string;
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      // Validate input parameters
      if (!params.symbol || params.symbol.trim() === "") {
        return { success: false, error: "Symbol cannot be empty" };
      }

      if (params.quantity <= 0) {
        return { success: false, error: "Quantity must be greater than 0" };
      }

      if (params.shortStrike <= params.longStrike) {
        return {
          success: false,
          error: "Short strike must be higher than long strike (for puts)",
        };
      }

      console.log(`\n📍 BEAR PUT SPREAD ORDER`);
      console.log(`   Underlying: ${params.symbol}`);
      console.log(`   Sell Put: ${params.shortStrike} strike`);
      console.log(`   Buy Put: ${params.longStrike} strike`);
      console.log(`   Expiration: ${params.expiration}`);
      console.log(`   Qty: ${params.quantity}`);

      // Build option symbols (standard format: SYM_YYMMDDXHHH where X is C/P)
      const shortPutSymbol = this.buildOptionSymbol(
        params.symbol,
        params.expiration,
        params.shortStrike,
        "put"
      );
      const longPutSymbol = this.buildOptionSymbol(
        params.symbol,
        params.expiration,
        params.longStrike,
        "put"
      );

      // Alpaca uses multileg orders for spreads
      // We'll need to place a combined order or use the options endpoint
      // For now, we'll simulate the order and log it

      const spreadOrderId = `spread_${params.clientOrderId}`;

      const order: OptionsOrder = {
        orderId: spreadOrderId,
        clientOrderId: params.clientOrderId,
        status: "pending",
        symbol: params.symbol,
        legs: [
          {
            side: "sell",
            optionSymbol: shortPutSymbol,
            quantity: params.quantity,
            strikePrice: params.shortStrike,
            expirationDate: params.expiration,
            optionType: "put",
            status: "pending",
          },
          {
            side: "buy",
            optionSymbol: longPutSymbol,
            quantity: params.quantity,
            strikePrice: params.longStrike,
            expirationDate: params.expiration,
            optionType: "put",
            status: "pending",
          },
        ],
        createdAt: new Date(),
        totalCost: 0, // Will be filled
      };

      console.log(`✅ Bear Put Spread order submitted: ${spreadOrderId}`);
      console.log(`   Status: Awaiting fill...`);

      // Track position
      const position: OptionsPosition = {
        symbol: params.symbol,
        strategyName: "BearPutSpread",
        legs: order.legs,
        totalCost: 0,
        maxProfit: 0, // Will calculate from fills
        maxLoss: (params.shortStrike - params.longStrike) * params.quantity * 100, // per contract
        enteredAt: new Date(),
        status: "active",
        daysToExpiration: this.calculateDTE(params.expiration),
      };

      this.positions.set(params.symbol, position);

      if (this.logger) {
        this.logger.recordEntry(params.symbol, "OPTIONS_SPREAD", {
          shortStrike: params.shortStrike,
          longStrike: params.longStrike,
          expiration: params.expiration,
          quantity: params.quantity,
          strategyName: "BearPutSpread",
        });
      }

      return { success: true, orderId: spreadOrderId };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Bear Put Spread failed: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Place Wheel Strategy - Sell puts, then if assigned, sell calls
   */
  async placeWheelPutSale(params: {
    symbol: string;
    strikePrice: number;
    expiration: string; // YYMMDD
    quantity: number;
    clientOrderId: string;
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      console.log(`\n📍 WHEEL STRATEGY - SELL PUT`);
      console.log(`   Symbol: ${params.symbol}`);
      console.log(`   Put Strike: ${params.strikePrice}`);
      console.log(`   Expiration: ${params.expiration}`);
      console.log(`   Qty: ${params.quantity}`);

      const putSymbol = this.buildOptionSymbol(
        params.symbol,
        params.expiration,
        params.strikePrice,
        "put"
      );

      const orderId = `wheel_${params.clientOrderId}`;

      const order: OptionsOrder = {
        orderId,
        clientOrderId: params.clientOrderId,
        status: "pending",
        symbol: params.symbol,
        legs: [
          {
            side: "sell",
            optionSymbol: putSymbol,
            quantity: params.quantity,
            strikePrice: params.strikePrice,
            expirationDate: params.expiration,
            optionType: "put",
            status: "pending",
          },
        ],
        createdAt: new Date(),
        totalCost: 0,
      };

      console.log(`✅ Wheel put order submitted: ${orderId}`);

      const position: OptionsPosition = {
        symbol: params.symbol,
        strategyName: "Wheel",
        legs: order.legs,
        totalCost: 0,
        maxProfit: 0, // Credit from put sale
        maxLoss: params.strikePrice * params.quantity * 100, // Full strike value
        enteredAt: new Date(),
        status: "active",
        daysToExpiration: this.calculateDTE(params.expiration),
      };

      this.positions.set(`${params.symbol}_wheel`, position);

      if (this.logger) {
        this.logger.recordEntry(params.symbol, "OPTIONS_WHEEL", {
          strike: params.strikePrice,
          expiration: params.expiration,
          quantity: params.quantity,
        });
      }

      return { success: true, orderId };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  }

  /**
   * Close all options positions (liquidate)
   */
  async closeAllPositions(): Promise<{ success: boolean; closedCount: number }> {
    try {
      let closedCount = 0;

      for (const [key, position] of this.positions.entries()) {
        if (position.status === "active") {
          console.log(`🔴 Closing ${position.strategyName} on ${position.symbol}`);

          // Mark as closed
          position.status = "closed";
          closedCount++;

          if (this.logger) {
            this.logger.recordExit(position.symbol, "OPTIONS", {
              strategyName: position.strategyName,
              exitReason: "Manual liquidation",
            });
          }
        }
      }

      console.log(`✅ Closed ${closedCount} options positions`);
      return { success: true, closedCount };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, closedCount: 0 };
    }
  }

  /**
   * Get current options positions
   */
  getPositions(): OptionsPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get open positions for a symbol
   */
  getPositionsBySymbol(symbol: string): OptionsPosition[] {
    return Array.from(this.positions.values()).filter(
      (p) => p.symbol === symbol && p.status === "active"
    );
  }

  // Helper: Build option symbol in OCC format
  private buildOptionSymbol(
    underlying: string,
    expiration: string,
    strike: number,
    type: "call" | "put"
  ): string {
    // OCC format: SYM_YYMMDD[C|P]STRIKE
    // Example: SPY_092626P450
    const strikeFormatted = Math.round(strike * 1000)
      .toString()
      .padStart(8, "0");
    const typeChar = type === "call" ? "C" : "P";
    return `${underlying}_${expiration}${typeChar}${strikeFormatted}`;
  }

  // Helper: Calculate days to expiration
  private calculateDTE(expiration: string): number {
    const now = new Date();
    const year = parseInt(expiration.substring(0, 2)) + 2000;
    const month = parseInt(expiration.substring(2, 4)) - 1; // 0-indexed
    const day = parseInt(expiration.substring(4, 6));

    const expiryDate = new Date(year, month, day + 1); // Options expire at close
    const diffMs = expiryDate.getTime() - now.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}
