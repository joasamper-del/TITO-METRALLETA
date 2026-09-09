/**
 * ETH Position Protection System
 *
 * Active Protection for current 0.209475 ETHUSD position
 * Entry: $2457.12
 *
 * Strategy: Moderate Risk + Dynamic Trailing Stop
 * - Stop Loss: -3% ($2384)
 * - Take Profit: +5% ($2580)
 * - Trailing Stop: +2% above highest price (dynamic protection)
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

interface ProtectionConfig {
  symbol: string;
  quantity: number;
  entryPrice: number;
  stopLossPercent: number;      // -3%
  takeProfitPercent: number;    // +5%
  trailingStopPercent: number;  // +2% above high
  checkIntervalSeconds: number; // Monitor frequency
}

interface ProtectionState {
  highestPrice: number;
  lowestPrice: number;
  currentPrice: number;
  unrealizedPL: number;
  trailingStopLevel: number;
  isTriggered: boolean;
}

export class ETHPositionProtection {
  private config: ProtectionConfig;
  private state: ProtectionState;
  private alpacaClient: any;
  private isActive: boolean = false;
  private monitorInterval?: ReturnType<typeof setInterval>;

  constructor(config: Partial<ProtectionConfig> = {}) {
    this.config = {
      symbol: 'ETHUSD',
      quantity: 0.209475,
      entryPrice: 2457.12,
      stopLossPercent: -3,
      takeProfitPercent: 5,
      trailingStopPercent: 2,
      checkIntervalSeconds: 10,
      ...config,
    };

    this.state = {
      highestPrice: this.config.entryPrice,
      lowestPrice: this.config.entryPrice,
      currentPrice: this.config.entryPrice,
      unrealizedPL: 0,
      trailingStopLevel: this.calculateStopLossLevel(),
      isTriggered: false,
    };

    this.initializeAlpacaClient();
  }

  private initializeAlpacaClient() {
    const apiKey = process.env.ALPACA_API_KEY;
    const apiSecret = process.env.ALPACA_SECRET_KEY;

    if (!apiKey || !apiSecret) {
      throw new Error('Missing Alpaca credentials in .env.local');
    }

    this.alpacaClient = axios.create({
      baseURL: 'https://paper-api.alpaca.markets',
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
      timeout: 5000,
    });
  }

  /**
   * Calculate stop-loss level (fixed -3%)
   */
  private calculateStopLossLevel(): number {
    return this.config.entryPrice * (1 + this.config.stopLossPercent / 100);
  }

  /**
   * Calculate take-profit level (fixed +5%)
   */
  private calculateTakeProfitLevel(): number {
    return this.config.entryPrice * (1 + this.config.takeProfitPercent / 100);
  }

  /**
   * Calculate dynamic trailing stop (moves up only)
   * If highest price > entry, trailing stop = highest - (entry * 2%)
   */
  private calculateTrailingStop(): number {
    const entryAmount = this.config.entryPrice;
    const trailingAmount = entryAmount * (this.config.trailingStopPercent / 100);

    if (this.state.highestPrice > this.config.entryPrice) {
      // Price went up, use trailing stop
      return this.state.highestPrice - trailingAmount;
    } else {
      // Price never went up, use regular stop-loss
      return this.calculateStopLossLevel();
    }
  }

  /**
   * Start monitoring position
   */
  async start(): Promise<void> {
    if (this.isActive) {
      console.log('⚠️  Protection already active');
      return;
    }

    this.isActive = true;

    console.log(`
╔════════════════════════════════════════════════════════════╗
║          ETH POSITION PROTECTION - ACTIVATED               ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Position: ${this.config.quantity} ETHUSD                                      ║
║  Entry: $${this.config.entryPrice}                                       ║
║                                                            ║
║  🛡️  Protection Levels:                                    ║
║     Stop Loss:      $${this.calculateStopLossLevel().toFixed(2)} (-3%)                          ║
║     Take Profit:    $${this.calculateTakeProfitLevel().toFixed(2)} (+5%)                          ║
║     Trailing Stop:  Dynamic (starts at $${this.calculateStopLossLevel().toFixed(2)})       ║
║                                                            ║
║  📊 Monitor Interval: ${this.config.checkIntervalSeconds}s                       ║
║                                                            ║
║  ⚠️  If price hits SL → Position CLOSED at loss           ║
║  ✅ If price hits TP → Position CLOSED at profit          ║
║  🎯 Trailing Stop → Protects gains if price rises         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);

    // Initial check
    await this.checkPosition();

    // Set interval for continuous monitoring
    this.monitorInterval = setInterval(
      () => this.checkPosition(),
      this.config.checkIntervalSeconds * 1000
    );
  }

  /**
   * Check position and update protection levels
   */
  private async checkPosition(): Promise<void> {
    try {
      const posRes = await this.alpacaClient.get(`/v2/positions/${this.config.symbol}`);
      const pos = posRes.data;

      this.state.currentPrice = parseFloat(pos.current_price);
      this.state.unrealizedPL = parseFloat(pos.unrealized_pl);

      // Update highest and lowest
      if (this.state.currentPrice > this.state.highestPrice) {
        this.state.highestPrice = this.state.currentPrice;
      }
      if (this.state.currentPrice < this.state.lowestPrice) {
        this.state.lowestPrice = this.state.currentPrice;
      }

      // Recalculate trailing stop
      this.state.trailingStopLevel = this.calculateTrailingStop();

      // Check if any protection triggered
      const stopLossLevel = this.calculateStopLossLevel();
      const takeProfitLevel = this.calculateTakeProfitLevel();
      const trailingStopLevel = this.state.trailingStopLevel;

      // Display status
      this.printStatus();

      // Check triggers
      if (this.state.currentPrice <= stopLossLevel && !this.state.isTriggered) {
        console.log(`\n🔴 STOP LOSS TRIGGERED at $${this.state.currentPrice}`);
        await this.closePosition('STOP_LOSS');
      } else if (this.state.currentPrice >= takeProfitLevel && !this.state.isTriggered) {
        console.log(`\n🟢 TAKE PROFIT TRIGGERED at $${this.state.currentPrice}`);
        await this.closePosition('TAKE_PROFIT');
      } else if (this.state.currentPrice <= trailingStopLevel && !this.state.isTriggered) {
        console.log(`\n🟡 TRAILING STOP TRIGGERED at $${this.state.currentPrice}`);
        await this.closePosition('TRAILING_STOP');
      }

    } catch (error: any) {
      if (error.response?.status === 404) {
        // Position closed
        console.log(`\n✅ Position CLOSED (no longer open)`);
        this.stop();
      } else {
        console.error(`⚠️  Error checking position:`, error.message);
      }
    }
  }

  /**
   * Print current status
   */
  private printStatus(): void {
    const stopLoss = this.calculateStopLossLevel();
    const takeProfit = this.calculateTakeProfitLevel();
    const trailingStop = this.state.trailingStopLevel;

    const timestamp = new Date().toLocaleTimeString('es-ES');
    const price = this.state.currentPrice.toFixed(2);
    const pl = this.state.unrealizedPL.toFixed(2);
    const plPct = ((this.state.unrealizedPL / (this.config.entryPrice * this.config.quantity)) * 100).toFixed(2);

    // Determine status emoji
    let statusEmoji = '◯';
    if (this.state.currentPrice <= stopLoss) statusEmoji = '🔴';
    else if (this.state.currentPrice >= takeProfit) statusEmoji = '🟢';
    else if (this.state.currentPrice <= trailingStop) statusEmoji = '🟡';

    console.log(
      `${statusEmoji} [${timestamp}] Price: $${price} | P&L: $${pl} (${plPct}%) | SL: $${stopLoss.toFixed(2)} | TP: $${takeProfit.toFixed(2)} | TS: $${trailingStop.toFixed(2)}`
    );
  }

  /**
   * Close position with reason
   */
  private async closePosition(reason: string): Promise<void> {
    try {
      this.state.isTriggered = true;

      console.log(`\n📤 Closing position (${reason})...`);

      const closeRes = await this.alpacaClient.post(`/v2/positions/${this.config.symbol}`, {
        qty: 0, // Sell all
      });

      console.log(`✅ Position CLOSED`);
      console.log(`   Final Price: $${this.state.currentPrice}`);
      console.log(`   Final P&L: $${this.state.unrealizedPL.toFixed(2)}`);
      console.log(`   Reason: ${reason}`);

      this.stop();
    } catch (error: any) {
      console.error(`❌ Error closing position:`, error.message);
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
    this.isActive = false;
    console.log('\n🛑 Protection monitoring STOPPED');
  }

  /**
   * Get current state
   */
  getState(): ProtectionState {
    return { ...this.state };
  }

  /**
   * Get configuration
   */
  getConfig(): ProtectionConfig {
    return { ...this.config };
  }
}

// Export for use
export async function activateETHProtection() {
  const protection = new ETHPositionProtection();
  await protection.start();
  return protection;
}
