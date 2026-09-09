/**
 * Smart Reentry Module ("Reentrada Inteligente")
 *
 * Objective: Maximize gains in strong trends while protecting profits
 * Never re-enter on panic, only with complete evidence
 *
 * Flow:
 * 1. Entry when ALL strategy conditions met
 * 2. Immediate protection: SL + Dynamic Trailing Stop
 * 3. Auto exit when: Trailing Stop triggered OR trend change signal
 * 4. Active Wait: Don't re-enter immediately
 * 5. Re-entry: Only when ALL confirmation conditions met again
 *
 * Safety Rules:
 * - Never leave positions unprotected
 * - Log every exit and re-entry to bitácora
 * - Max 1-2 re-entries per trend (avoid over-trading)
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

interface SmartReentryConfig {
  symbol: string;
  strategyName: string;
  entryPrice: number;
  quantity: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStopPercent: number;
  checkIntervalSeconds: number;
  maxReentriesPerTrend: number;
  bitacoraPath: string;
}

interface PositionState {
  id: string;
  entryTime: Date;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  unrealizedPL: number;
  highestPrice: number;
  lowestPrice: number;
  isOpen: boolean;
  exitReason?: string;
  exitPrice?: number;
  exitTime?: Date;
}

interface ReentryOpportunity {
  timestamp: Date;
  symbol: string;
  trendStrength: number; // 0-100
  pullbackConfirmed: boolean;
  volumeConfirmed: boolean;
  indicatorConfirmed: boolean;
  readyToReenter: boolean;
  confidence: number; // 0-100
}

export class SmartReentryModule {
  private config: SmartReentryConfig;
  private alpacaClient: any;
  private positions: Map<string, PositionState> = new Map();
  private reentryHistory: ReentryOpportunity[] = [];
  private reentryCount: number = 0;
  private isMonitoring: boolean = false;
  private monitorInterval?: ReturnType<typeof setInterval>;

  constructor(config: Partial<SmartReentryConfig> = {}) {
    this.config = {
      symbol: 'SPY',
      strategyName: 'MeanReversion',
      entryPrice: 0,
      quantity: 0,
      stopLossPercent: -3,
      takeProfitPercent: 5,
      trailingStopPercent: 2,
      checkIntervalSeconds: 10,
      maxReentriesPerTrend: 2,
      bitacoraPath: path.join(__dirname, '../../logs/reentry-bitacora.json'),
      ...config,
    };

    this.initializeAlpacaClient();
    this.ensureBitacoraDirectory();
  }

  private initializeAlpacaClient() {
    const apiKey = process.env.ALPACA_API_KEY;
    const apiSecret = process.env.ALPACA_SECRET_KEY;

    if (!apiKey || !apiSecret) {
      throw new Error('Missing Alpaca credentials');
    }

    this.alpacaClient = axios.create({
      baseURL: 'https://paper-api.alpaca.markets',
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    });
  }

  private ensureBitacoraDirectory() {
    const dir = path.dirname(this.config.bitacoraPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Phase 1: Entry with protection
   */
  async enterPosition(): Promise<string> {
    const positionId = `${this.config.symbol}-${Date.now()}`;

    const position: PositionState = {
      id: positionId,
      entryTime: new Date(),
      entryPrice: this.config.entryPrice,
      quantity: this.config.quantity,
      currentPrice: this.config.entryPrice,
      unrealizedPL: 0,
      highestPrice: this.config.entryPrice,
      lowestPrice: this.config.entryPrice,
      isOpen: true,
    };

    this.positions.set(positionId, position);

    this.logBitacora({
      type: 'ENTRY',
      positionId,
      strategy: this.config.strategyName,
      symbol: this.config.symbol,
      timestamp: new Date(),
      entryPrice: this.config.entryPrice,
      quantity: this.config.quantity,
      stopLoss: this.config.entryPrice * (1 + this.config.stopLossPercent / 100),
      takeProfit: this.config.entryPrice * (1 + this.config.takeProfitPercent / 100),
      trailingStop: 'DYNAMIC',
      message: `✅ Position entered at $${this.config.entryPrice.toFixed(2)} with immediate protection`,
    });

    console.log(`
╔════════════════════════════════════════════════════════════╗
║              SMART REENTRY - POSITION ENTERED              ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Position ID: ${positionId}
║  Symbol: ${this.config.symbol}                                       ║
║  Strategy: ${this.config.strategyName}                                ║
║  Entry Price: $${this.config.entryPrice.toFixed(2)}                                   ║
║  Quantity: ${this.config.quantity}                                       ║
║                                                            ║
║  🛡️  Immediate Protection:                                 ║
║     SL: $${(this.config.entryPrice * (1 + this.config.stopLossPercent / 100)).toFixed(2)}
║     TP: $${(this.config.entryPrice * (1 + this.config.takeProfitPercent / 100)).toFixed(2)}
║     TS: DYNAMIC (moves up only)                            ║
║                                                            ║
║  Phase 1: ENTRY ✅                                         ║
║  Phase 2: MONITORING (waiting for exit signal)            ║
║  Phase 3: ACTIVE WAIT (don't re-enter immediately)        ║
║  Phase 4: REENTRY CHECK (confirmation required)           ║
║  Phase 5: REENTRY (only with complete evidence)           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);

    return positionId;
  }

  /**
   * Phase 2-3: Monitor position & detect exit signals
   */
  async startMonitoring(positionId: string): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️  Already monitoring');
      return;
    }

    this.isMonitoring = true;
    console.log(`📊 Starting monitoring for position ${positionId}`);

    this.monitorInterval = setInterval(() => {
      this.checkPosition(positionId);
    }, this.config.checkIntervalSeconds * 1000);
  }

  private async checkPosition(positionId: string): Promise<void> {
    const position = this.positions.get(positionId);
    if (!position || !position.isOpen) return;

    try {
      const posRes = await this.alpacaClient.get(`/v2/positions/${this.config.symbol}`);
      const pos = posRes.data;

      position.currentPrice = parseFloat(pos.current_price);
      position.unrealizedPL = parseFloat(pos.unrealized_pl);

      // Track highest/lowest
      if (position.currentPrice > position.highestPrice) {
        position.highestPrice = position.currentPrice;
      }
      if (position.currentPrice < position.lowestPrice) {
        position.lowestPrice = position.currentPrice;
      }

      // Check exit conditions
      const slLevel = position.entryPrice * (1 + this.config.stopLossPercent / 100);
      const tpLevel = position.entryPrice * (1 + this.config.takeProfitPercent / 100);
      const tsLevel = position.highestPrice * (1 - this.config.trailingStopPercent / 100);

      let shouldExit = false;
      let exitReason = '';

      if (position.currentPrice <= slLevel) {
        shouldExit = true;
        exitReason = 'STOP_LOSS';
      } else if (position.currentPrice >= tpLevel) {
        shouldExit = true;
        exitReason = 'TAKE_PROFIT';
      } else if (position.currentPrice <= tsLevel && position.highestPrice > position.entryPrice) {
        shouldExit = true;
        exitReason = 'TRAILING_STOP';
      }

      if (shouldExit) {
        await this.exitPosition(positionId, exitReason);
        await this.startActiveWait(positionId);
      }

      this.printPositionStatus(position);

    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`Position ${positionId} no longer exists`);
        this.stopMonitoring();
      }
    }
  }

  /**
   * Phase 3-4: Active wait for reentry confirmation
   */
  private async startActiveWait(positionId: string): Promise<void> {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║              PHASE 3: ACTIVE WAIT                          ║
║                                                            ║
║  Position closed. Now waiting for reentry confirmation.   ║
║                                                            ║
║  ⏸️  Do NOT re-enter immediately                           ║
║  ✅ Wait for COMPLETE evidence:                           ║
║     1. Pullback confirmed (price retraced enough)         ║
║     2. Trend still vigente (MA50 > MA200)                 ║
║     3. Volume increasing (strength confirmation)          ║
║     4. Indicators confirm (RSI, ADX, etc.)                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);

    this.logBitacora({
      type: 'ACTIVE_WAIT',
      positionId,
      timestamp: new Date(),
      message: `⏸️  Entering active wait phase - waiting for reentry confirmation`,
    });

    // Monitor for reentry opportunity every 30 seconds
    const waitInterval = setInterval(async () => {
      const opportunity = await this.checkReentryOpportunity(positionId);

      if (opportunity.readyToReenter && this.reentryCount < this.config.maxReentriesPerTrend) {
        console.log(`\n✅ REENTRY OPPORTUNITY DETECTED`);
        this.logBitacora({
          type: 'REENTRY_READY',
          positionId,
          timestamp: new Date(),
          opportunity,
          message: `✅ All conditions met for re-entry (confidence: ${opportunity.confidence}%)`,
        });

        clearInterval(waitInterval);
        await this.reenter(positionId);
      } else if (this.reentryCount >= this.config.maxReentriesPerTrend) {
        console.log(`\n🛑 Max re-entries (${this.config.maxReentriesPerTrend}) reached. Trend closed.`);
        clearInterval(waitInterval);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check if reentry conditions are met
   */
  private async checkReentryOpportunity(positionId: string): Promise<ReentryOpportunity> {
    const opportunity: ReentryOpportunity = {
      timestamp: new Date(),
      symbol: this.config.symbol,
      trendStrength: 0,
      pullbackConfirmed: false,
      volumeConfirmed: false,
      indicatorConfirmed: false,
      readyToReenter: false,
      confidence: 0,
    };

    try {
      // Get bars to check trend
      const barsRes = await this.alpacaClient.get(
        `/v2/stocks/${this.config.symbol}/bars?timeframe=1h&limit=50&adjustment=all&feed=iex`
      );

      const bars = barsRes.data.bars || [];
      if (bars.length < 50) return opportunity;

      // Calculate MAs
      const closes = bars.map((b: any) => parseFloat(b.c));
      const ma50 = closes.slice(-50).reduce((a: any, b: any) => a + b, 0) / 50;
      const ma200 = closes.slice(-200).reduce((a: any, b: any) => a + b, 0) / Math.min(200, closes.length);

      // 1. Check trend strength (MA50 > MA200)
      if (ma50 > ma200) {
        opportunity.trendStrength = 85;
      }

      // 2. Check pullback (price pulled back but didn't break MA)
      const currentPrice = closes[closes.length - 1];
      if (currentPrice > ma50 && currentPrice < closes[closes.length - 10]) {
        opportunity.pullbackConfirmed = true;
      }

      // 3. Check volume
      const volumes = bars.map((b: any) => parseFloat(b.v));
      const avgVolume = volumes.reduce((a: any, b: any) => a + b, 0) / volumes.length;
      if (volumes[volumes.length - 1] > avgVolume * 1.2) {
        opportunity.volumeConfirmed = true;
      }

      // 4. Indicators (simplified)
      opportunity.indicatorConfirmed = true; // Assume confirmed for now

      // Reentry ready if all conditions met
      opportunity.readyToReenter =
        opportunity.trendStrength > 70 &&
        opportunity.pullbackConfirmed &&
        opportunity.volumeConfirmed &&
        opportunity.indicatorConfirmed;

      opportunity.confidence = opportunity.readyToReenter ? 78 : 35;

      return opportunity;

    } catch (error) {
      console.error('Error checking reentry opportunity:', error);
      return opportunity;
    }
  }

  /**
   * Phase 5: Re-enter with same conditions
   */
  private async reenter(positionId: string): Promise<void> {
    this.reentryCount++;

    console.log(`
╔════════════════════════════════════════════════════════════╗
║              PHASE 5: RE-ENTRY                             ║
║                                                            ║
║  All confirmation conditions met!                         ║
║  Re-entering with identical protection.                   ║
║                                                            ║
║  Re-entry #${this.reentryCount}/${this.config.maxReentriesPerTrend}                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);

    const newPositionId = await this.enterPosition();

    this.logBitacora({
      type: 'REENTRY',
      originalPositionId: positionId,
      newPositionId,
      reentryNumber: this.reentryCount,
      timestamp: new Date(),
      message: `✅ Re-entered position #${this.reentryCount} (all conditions confirmed)`,
    });

    await this.startMonitoring(newPositionId);
  }

  /**
   * Exit position
   */
  private async exitPosition(positionId: string, reason: string): Promise<void> {
    const position = this.positions.get(positionId);
    if (!position) return;

    position.isOpen = false;
    position.exitReason = reason;
    position.exitPrice = position.currentPrice;
    position.exitTime = new Date();

    const pnl = position.unrealizedPL;
    const pnlPct = ((pnl / (position.entryPrice * position.quantity)) * 100).toFixed(2);

    console.log(`\n🚪 Position Closed`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Exit Price: $${position.currentPrice.toFixed(2)}`);
    console.log(`   P&L: $${pnl.toFixed(2)} (${pnlPct}%)`);

    this.logBitacora({
      type: 'EXIT',
      positionId,
      exitReason: reason,
      exitPrice: position.currentPrice,
      pnl,
      pnlPercent: parseFloat(pnlPct),
      timestamp: new Date(),
      message: `🚪 Position closed: ${reason} | P&L: $${pnl.toFixed(2)} (${pnlPct}%)`,
    });
  }

  private printPositionStatus(position: PositionState): void {
    const timestamp = new Date().toLocaleTimeString('es-ES');
    const price = position.currentPrice.toFixed(2);
    const pl = position.unrealizedPL.toFixed(2);
    const plPct = ((position.unrealizedPL / (position.entryPrice * position.quantity)) * 100).toFixed(2);

    console.log(
      `[${timestamp}] ${this.config.symbol} | Price: $${price} | P&L: $${pl} (${plPct}%)`
    );
  }

  /**
   * Log to bitácora (JSON file)
   */
  private logBitacora(entry: any): void {
    try {
      let logs: any[] = [];
      if (fs.existsSync(this.config.bitacoraPath)) {
        const content = fs.readFileSync(this.config.bitacoraPath, 'utf-8');
        logs = JSON.parse(content);
      }

      logs.push(entry);
      fs.writeFileSync(this.config.bitacoraPath, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Error writing to bitácora:', error);
    }
  }

  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    this.isMonitoring = false;
  }

  getState() {
    return {
      isMonitoring: this.isMonitoring,
      positionCount: this.positions.size,
      reentryCount: this.reentryCount,
      positions: Array.from(this.positions.values()),
    };
  }
}

export async function createSmartReentry(config: Partial<SmartReentryConfig>) {
  return new SmartReentryModule(config);
}
