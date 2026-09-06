/**
 * System Health Check Module
 *
 * Before EVERY operation, Tito verifies system integrity:
 * 1. Alpaca API connection
 * 2. Market data feeds
 * 3. Price data consistency
 * 4. Daily loss limit
 * 5. Configuration completeness
 *
 * If ANY check fails → NO TRADE
 * Tito stops and waits for user intervention
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

interface HealthCheckResult {
  isHealthy: boolean;
  timestamp: Date;
  checks: {
    alpacaConnection: { status: boolean; message: string };
    marketDataFeeds: { status: boolean; message: string };
    priceConsistency: { status: boolean; message: string };
    dailyLossLimit: { status: boolean; message: string; currentLoss?: number };
    configComplete: { status: boolean; message: string };
  };
  overallMessage: string;
  recommendedAction: string;
}

export class SystemHealthCheck {
  private alpacaClient: any;
  private dailyLossLimit: number; // e.g., -1000 (dollars) or -3 (percent)
  private maxDailyLossPercent: number; // -3% default

  constructor(maxDailyLossPercent: number = -3) {
    this.maxDailyLossPercent = maxDailyLossPercent;
    this.dailyLossLimit = maxDailyLossPercent; // In real use, calculate from portfolio value
    this.initializeAlpacaClient();
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
      timeout: 5000,
    });
  }

  /**
   * Run comprehensive health check before every trade
   */
  async runHealthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      isHealthy: true,
      timestamp: new Date(),
      checks: {
        alpacaConnection: await this.checkAlpacaConnection(),
        marketDataFeeds: await this.checkMarketDataFeeds(),
        priceConsistency: await this.checkPriceConsistency(),
        dailyLossLimit: await this.checkDailyLossLimit(),
        configComplete: await this.checkConfigCompletion(),
      },
      overallMessage: '',
      recommendedAction: '',
    };

    // Determine overall health
    result.isHealthy = Object.values(result.checks).every(check => check.status);

    // Generate messages
    if (result.isHealthy) {
      result.overallMessage = '✅ ALL SYSTEMS GO - Safe to trade';
      result.recommendedAction = 'Proceed with operations';
    } else {
      const failedChecks = Object.entries(result.checks)
        .filter(([_, check]) => !check.status)
        .map(([name, _]) => name);

      result.overallMessage = `❌ SYSTEM UNHEALTHY - ${failedChecks.length} check(s) failed`;
      result.recommendedAction = '🛑 STOP NEW TRADES - Investigate failures before proceeding';
    }

    return result;
  }

  /**
   * Check 1: Alpaca API Connection
   */
  private async checkAlpacaConnection(): Promise<{ status: boolean; message: string }> {
    try {
      const response = await this.alpacaClient.get('/v2/account', { timeout: 3000 });

      if (response.status === 200 && response.data.account_number) {
        return {
          status: true,
          message: `✅ Alpaca connected | Account: ${response.data.account_number}`,
        };
      } else {
        return {
          status: false,
          message: '❌ Alpaca API: Unexpected response format',
        };
      }
    } catch (error: any) {
      return {
        status: false,
        message: `❌ Alpaca connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Check 2: Market Data Feeds
   */
  private async checkMarketDataFeeds(): Promise<{ status: boolean; message: string }> {
    try {
      // Check if market is open and data is flowing
      const clockResponse = await this.alpacaClient.get('/v2/clock', { timeout: 3000 });

      const clock = clockResponse.data;
      const timestamp = new Date(clock.timestamp);
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - timestamp.getTime()) / 1000; // seconds

      // If timestamp is more than 30 seconds old, data might be stale
      if (timeDiff > 30) {
        return {
          status: false,
          message: `⚠️  Market data potentially stale (${timeDiff.toFixed(0)}s old)`,
        };
      }

      return {
        status: true,
        message: `✅ Market data feeds: Live and current`,
      };
    } catch (error: any) {
      return {
        status: false,
        message: `❌ Cannot access market data: ${error.message}`,
      };
    }
  }

  /**
   * Check 3: Price Data Consistency
   */
  private async checkPriceConsistency(): Promise<{ status: boolean; message: string }> {
    try {
      // Test with a known symbol (SPY) - check if we get valid quotes
      const quoteResponse = await this.alpacaClient.get('/v2/stocks/SPY/quotes/latest?feed=iex', {
        timeout: 3000,
      });

      const quote = quoteResponse.data.quote;

      // Validate quote structure
      if (!quote || !quote.bid || !quote.ask || !quote.last_updated) {
        return {
          status: false,
          message: '❌ Price data: Incomplete quote received',
        };
      }

      // Check if bid < ask (sanity check)
      if (quote.bid >= quote.ask) {
        return {
          status: false,
          message: `❌ Price data anomaly: Bid (${quote.bid}) >= Ask (${quote.ask})`,
        };
      }

      return {
        status: true,
        message: `✅ Price consistency: SPY bid/ask valid ($${quote.bid}/$${quote.ask})`,
      };
    } catch (error: any) {
      return {
        status: false,
        message: `❌ Cannot fetch price data: ${error.message}`,
      };
    }
  }

  /**
   * Check 4: Daily Loss Limit
   */
  private async checkDailyLossLimit(): Promise<{ status: boolean; message: string; currentLoss?: number }> {
    try {
      const accountResponse = await this.alpacaClient.get('/v2/account', { timeout: 3000 });
      const account = accountResponse.data;

      // Calculate today's P&L
      const lastEquity = parseFloat(account.last_equity);
      const portfolioValue = parseFloat(account.portfolio_value);
      const todayPnL = portfolioValue - lastEquity;
      const todayPnLPercent = (todayPnL / lastEquity) * 100;

      // Check against limit
      const hasHitLimit = todayPnLPercent <= this.maxDailyLossPercent;

      if (hasHitLimit) {
        return {
          status: false,
          message: `❌ DAILY LOSS LIMIT REACHED: ${todayPnLPercent.toFixed(2)}% (limit: ${this.maxDailyLossPercent}%)`,
          currentLoss: todayPnLPercent,
        };
      } else {
        const remainingBuffer = Math.abs(this.maxDailyLossPercent - todayPnLPercent);
        return {
          status: true,
          message: `✅ Daily loss limit: ${todayPnLPercent.toFixed(2)}% | Buffer: ${remainingBuffer.toFixed(2)}%`,
          currentLoss: todayPnLPercent,
        };
      }
    } catch (error: any) {
      return {
        status: false,
        message: `❌ Cannot check daily loss: ${error.message}`,
      };
    }
  }

  /**
   * Check 5: Configuration Completeness
   */
  private async checkConfigCompletion(): Promise<{ status: boolean; message: string }> {
    const required = [
      { name: 'ALPACA_API_KEY', value: process.env.ALPACA_API_KEY },
      { name: 'ALPACA_SECRET_KEY', value: process.env.ALPACA_SECRET_KEY },
      { name: 'ALPACA_BASE_URL', value: process.env.ALPACA_BASE_URL },
    ];

    const missing = required.filter(r => !r.value);

    if (missing.length > 0) {
      return {
        status: false,
        message: `❌ Missing config: ${missing.map(m => m.name).join(', ')}`,
      };
    }

    return {
      status: true,
      message: `✅ All required configuration present`,
    };
  }

  /**
   * Print health check results
   */
  printHealthCheck(result: HealthCheckResult): void {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║              SYSTEM HEALTH CHECK - PRE-TRADE               ║
╠════════════════════════════════════════════════════════════╣

📊 Check Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${result.checks.alpacaConnection.status ? '✅' : '❌'} Alpaca Connection
   ${result.checks.alpacaConnection.message}

${result.checks.marketDataFeeds.status ? '✅' : '❌'} Market Data Feeds
   ${result.checks.marketDataFeeds.message}

${result.checks.priceConsistency.status ? '✅' : '❌'} Price Data Consistency
   ${result.checks.priceConsistency.message}

${result.checks.dailyLossLimit.status ? '✅' : '❌'} Daily Loss Limit
   ${result.checks.dailyLossLimit.message}

${result.checks.configComplete.status ? '✅' : '❌'} Configuration Completeness
   ${result.checks.configComplete.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Status: ${result.isHealthy ? '🟢 HEALTHY' : '🔴 UNHEALTHY'}
Message: ${result.overallMessage}
Action: ${result.recommendedAction}

Time: ${result.timestamp.toISOString()}
╚════════════════════════════════════════════════════════════╝
    `);
  }

  setDailyLossLimit(percentOrAmount: number): void {
    this.dailyLossLimit = percentOrAmount;
  }
}

export async function createHealthCheck(maxDailyLossPercent?: number): Promise<SystemHealthCheck> {
  return new SystemHealthCheck(maxDailyLossPercent);
}
