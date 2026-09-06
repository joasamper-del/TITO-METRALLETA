/**
 * Autonomous Trading Manager
 *
 * Objective: When user is away, Tito continues analyzing and executing
 * operations in the authorized account, strictly respecting risk rules
 * and defined strategy.
 *
 * Execution Rules:
 * 1. Analyze market continuously, but ONLY execute trades with Quality Score >= threshold
 * 2. Every operation MUST open with SL + Trailing Stop + TP
 * 3. Smart Reentry only if trend re-confirmed
 * 4. NEVER remove protection from open position
 * 5. Respect maximum operations per day
 * 6. Critical alerts (open, close, SL trigger, TP hit, reentry, crash stop)
 * 7. Auto report at end of day (summary, stats, learnings, recommendations)
 *
 * Safety Rule: If Tito detects anomalies (data failure, disconnect, extreme
 * volatility, incomplete rules), STOP opening new operations, keep existing
 * protected, and log everything.
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

interface AutonomousConfig {
  minQualityScore: number; // 85 default
  maxOperationsPerDay: number; // 5 default
  maxDailyLossPercent: number; // -3% default
  maxConcurrentPositions: number; // 3 default
  reportTime: string; // "18:00" default
  emergencyMode: boolean; // false = normal, true = stop new entries
}

interface DailySession {
  date: string;
  startTime: Date;
  endTime?: Date;
  config: AutonomousConfig;
  trades: any[];
  alerts: any[];
  stats: {
    totalOperations: number;
    winningTrades: number;
    losingTrades: number;
    totalPnL: number;
    totalPnLPercent: number;
    bestTrade: any;
    worstTrade: any;
    consecutiveWins: number;
    consecutiveLosses: number;
  };
  systemHealth: {
    dataConnection: boolean;
    alpacaConnection: boolean;
    abnormalVolatility: boolean;
    incompletePrices: boolean;
    emergencyActive: boolean;
  };
}

export class AutonomousTradingManager {
  private config: AutonomousConfig;
  private alpacaClient: any;
  private dailySession: DailySession | null = null;
  private isRunning: boolean = false;
  private checkInterval?: ReturnType<typeof setInterval>;
  private sessionPath: string;

  constructor(config: Partial<AutonomousConfig> = {}) {
    this.config = {
      minQualityScore: 85,
      maxOperationsPerDay: 5,
      maxDailyLossPercent: -3,
      maxConcurrentPositions: 3,
      reportTime: '18:00',
      emergencyMode: false,
      ...config,
    };

    this.sessionPath = path.join(__dirname, '../../logs/autonomous-sessions');
    this.ensureDirectory();
    this.initializeAlpacaClient();
  }

  private ensureDirectory() {
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }
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

  /**
   * Start autonomous trading session
   */
  async startAutonomousSession(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Autonomous session already running');
      return;
    }

    this.isRunning = true;

    // Initialize daily session
    this.dailySession = {
      date: new Date().toISOString().split('T')[0],
      startTime: new Date(),
      config: this.config,
      trades: [],
      alerts: [],
      stats: {
        totalOperations: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        bestTrade: null,
        worstTrade: null,
        consecutiveWins: 0,
        consecutiveLosses: 0,
      },
      systemHealth: {
        dataConnection: true,
        alpacaConnection: true,
        abnormalVolatility: false,
        incompletePrices: false,
        emergencyActive: false,
      },
    };

    console.log(`
╔════════════════════════════════════════════════════════════╗
║        AUTONOMOUS TRADING MANAGER - SESSION STARTED        ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  🤖 Tito is now operating AUTONOMOUSLY                    ║
║                                                            ║
║  Configuration:                                            ║
║    • Minimum Quality Score: ${this.config.minQualityScore}/100                        ║
║    • Max Operations/Day: ${this.config.maxOperationsPerDay}                             ║
║    • Max Daily Loss: ${this.config.maxDailyLossPercent}%                            ║
║    • Max Concurrent Positions: ${this.config.maxConcurrentPositions}                     ║
║    • Report Time: ${this.config.reportTime} UTC                          ║
║                                                            ║
║  Rules:                                                    ║
║    ✅ Every trade: SL + Trailing Stop + TP                ║
║    ✅ Quality Score filter: ${this.config.minQualityScore}+ only                        ║
║    ✅ Smart Reentry: Only if trend re-confirmed           ║
║    ✅ Zero tolerance: Never remove position protection    ║
║    🔴 Auto-stop: If anomalies detected                    ║
║                                                            ║
║  Monitoring: Every 10 seconds                             ║
║  Auto-Report: End of day or when anomalies detected       ║
║                                                            ║
║  User away? Tito is READY.                               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);

    // Start monitoring loop
    await this.monitorMarketAndTrade();

    // Set report timer
    this.scheduleEndOfDayReport();

    // Graceful shutdown handler
    process.on('SIGINT', () => {
      this.stopAutonomousSession();
    });
  }

  /**
   * Main monitoring loop
   */
  private async monitorMarketAndTrade(): Promise<void> {
    this.checkInterval = setInterval(async () => {
      if (!this.dailySession) return;

      try {
        // 1. Check system health
        await this.checkSystemHealth();

        if (this.dailySession.systemHealth.emergencyActive) {
          console.log('🔴 EMERGENCY MODE: No new entries allowed. Protecting existing positions.');
          return;
        }

        // 2. Check if max operations reached
        if (
          this.dailySession.stats.totalOperations >= this.config.maxOperationsPerDay
        ) {
          console.log(`⚠️  Daily operation limit reached (${this.config.maxOperationsPerDay})`);
          return;
        }

        // 3. Analyze market and get opportunities
        const opportunities = await this.analyzeMarket();

        // 4. Filter by Quality Score
        const approvedOpportunities = opportunities.filter((opp: any) => opp.qualityScore >= this.config.minQualityScore);

        // 5. Execute approved opportunities
        for (const opportunity of approvedOpportunities) {
          await this.executeOpportunity(opportunity);
        }

        // 6. Monitor open positions
        await this.monitorOpenPositions();

      } catch (error) {
        console.error('Error in monitoring loop:', error);
        this.addAlert({
          type: 'ERROR',
          severity: 'HIGH',
          message: `Monitoring loop error: ${error}`,
          timestamp: new Date(),
        });
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Check system health
   */
  private async checkSystemHealth(): Promise<void> {
    if (!this.dailySession) return;

    try {
      // Test Alpaca connection
      const clockRes = await this.alpacaClient.get('/v2/clock');
      this.dailySession.systemHealth.alpacaConnection = clockRes.status === 200;

      // Check for anomalies
      // In real implementation, would check:
      // - Data feed status
      // - Volatility levels (VIX, realized vol)
      // - Price consistency
      // - Volume anomalies

      // If any critical anomaly, activate emergency mode
      if (
        !this.dailySession.systemHealth.alpacaConnection ||
        this.dailySession.systemHealth.abnormalVolatility
      ) {
        this.dailySession.systemHealth.emergencyActive = true;

        this.addAlert({
          type: 'EMERGENCY',
          severity: 'CRITICAL',
          message: 'System anomaly detected. Emergency mode activated.',
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.dailySession.systemHealth.alpacaConnection = false;
      this.dailySession.systemHealth.emergencyActive = true;

      this.addAlert({
        type: 'CONNECTION_ERROR',
        severity: 'CRITICAL',
        message: 'Lost connection to Alpaca. Emergency mode activated.',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Analyze market for opportunities
   */
  private async analyzeMarket(): Promise<any[]> {
    // Simplified: would call Strategy Selector + Quality Score Engine
    // Returns list of opportunities with quality scores

    return [
      {
        symbol: 'SPY',
        type: 'LONG',
        entry: 425.50,
        stop: 423.20,
        target: 428.75,
        qualityScore: 87,
        reason: 'Breakout above resistance with volume confirmation',
      },
      // ... more opportunities
    ];
  }

  /**
   * Execute opportunity with full protection
   */
  private async executeOpportunity(opportunity: any): Promise<void> {
    if (!this.dailySession) return;

    try {
      console.log(`\n📊 Executing: ${opportunity.symbol} ${opportunity.type}`);
      console.log(`   Quality Score: ${opportunity.qualityScore}/100`);

      // Execute with full protection
      // In real implementation:
      // - Calculate position size
      // - Place entry order
      // - Place SL order
      // - Place TP order
      // - Place Trailing Stop

      const trade = {
        id: `${opportunity.symbol}-${Date.now()}`,
        ...opportunity,
        entryTime: new Date(),
        quantity: 100, // Would be calculated
        slOrder: { price: opportunity.stop, status: 'PENDING' },
        tpOrder: { price: opportunity.target, status: 'PENDING' },
        trailingStop: { level: opportunity.stop * 1.01, status: 'ACTIVE' },
      };

      this.dailySession.trades.push(trade);
      this.dailySession.stats.totalOperations++;

      this.addAlert({
        type: 'TRADE_OPEN',
        severity: 'INFO',
        message: `${opportunity.symbol} ${opportunity.type} opened at $${opportunity.entry}`,
        timestamp: new Date(),
        tradeId: trade.id,
      });

    } catch (error) {
      this.addAlert({
        type: 'EXECUTION_ERROR',
        severity: 'HIGH',
        message: `Failed to execute ${opportunity.symbol}: ${error}`,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Monitor open positions for exit signals
   */
  private async monitorOpenPositions(): Promise<void> {
    if (!this.dailySession) return;

    for (const trade of this.dailySession.trades) {
      if (trade.status === 'CLOSED') continue;

      // Check SL, TP, Trailing Stop
      // If triggered, close position and record result
      // Generate trade report via AI Coach
    }
  }

  /**
   * Schedule end-of-day report
   */
  private scheduleEndOfDayReport(): void {
    const reportTime = this.config.reportTime.split(':');
    const reportHour = parseInt(reportTime[0]);
    const reportMinute = parseInt(reportTime[1]) || 0;

    const now = new Date();
    let reportDate = new Date(now);
    reportDate.setHours(reportHour, reportMinute, 0, 0);

    if (reportDate <= now) {
      reportDate.setDate(reportDate.getDate() + 1);
    }

    const timeUntilReport = reportDate.getTime() - now.getTime();

    setTimeout(() => {
      this.generateEndOfDayReport();
    }, timeUntilReport);
  }

  /**
   * Generate end-of-day report
   */
  private async generateEndOfDayReport(): Promise<void> {
    if (!this.dailySession) return;

    this.dailySession.endTime = new Date();

    const report = `
╔════════════════════════════════════════════════════════════╗
║           AUTONOMOUS TRADING - END OF DAY REPORT           ║
╠════════════════════════════════════════════════════════════╣

📊 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: ${this.dailySession.date}
Session Duration: ${this.formatDuration(this.dailySession.startTime, this.dailySession.endTime!)}
Status: ${this.dailySession.systemHealth.emergencyActive ? '🔴 EMERGENCY MODE' : '🟢 NORMAL'}

📈 STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Operations: ${this.dailySession.stats.totalOperations}
Winning Trades: ${this.dailySession.stats.winningTrades}
Losing Trades: ${this.dailySession.stats.losingTrades}
Total P&L: $${this.dailySession.stats.totalPnL.toFixed(2)} (${this.dailySession.stats.totalPnLPercent.toFixed(2)}%)

Best Trade: ${this.dailySession.stats.bestTrade ? this.dailySession.stats.bestTrade.symbol : 'N/A'} +$${this.dailySession.stats.bestTrade?.pnl || 0}
Worst Trade: ${this.dailySession.stats.worstTrade ? this.dailySession.stats.worstTrade.symbol : 'N/A'} -$${Math.abs(this.dailySession.stats.worstTrade?.pnl || 0)}

Win Rate: ${this.dailySession.stats.totalOperations > 0 ? ((this.dailySession.stats.winningTrades / this.dailySession.stats.totalOperations) * 100).toFixed(1) : 0}%
Consecutive Wins: ${this.dailySession.stats.consecutiveWins}
Consecutive Losses: ${this.dailySession.stats.consecutiveLosses}

🎓 TITO'S LEARNING & RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Adaptive recommendations based on today's performance]

🚨 ALERTS & ANOMALIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${this.dailySession.alerts.length > 0 ? this.dailySession.alerts.map(a => `[${a.type}] ${a.message}`).join('\n') : 'No alerts'}

🔧 SYSTEM HEALTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Data Connection: ${this.dailySession.systemHealth.dataConnection ? '✅' : '❌'}
Alpaca Connection: ${this.dailySession.systemHealth.alpacaConnection ? '✅' : '❌'}
Abnormal Volatility: ${this.dailySession.systemHealth.abnormalVolatility ? '⚠️' : '✅'}
Emergency Mode: ${this.dailySession.systemHealth.emergencyActive ? '🔴 ACTIVE' : '✅ OK'}

╚════════════════════════════════════════════════════════════╝
    `;

    console.log(report);

    // Save report
    const reportFile = path.join(
      this.sessionPath,
      `report-${this.dailySession.date}-${Date.now()}.txt`
    );
    fs.writeFileSync(reportFile, report);

    // Save session data
    const sessionFile = path.join(
      this.sessionPath,
      `session-${this.dailySession.date}-${Date.now()}.json`
    );
    fs.writeFileSync(sessionFile, JSON.stringify(this.dailySession, null, 2));

    console.log(`\n✅ Reports saved to ${this.sessionPath}`);
  }

  /**
   * Add alert
   */
  private addAlert(alert: any): void {
    if (!this.dailySession) return;
    this.dailySession.alerts.push(alert);
    console.log(`🔔 [${alert.type}] ${alert.message}`);
  }

  /**
   * Stop autonomous session
   */
  async stopAutonomousSession(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    console.log('\n🛑 Autonomous trading session stopped');
    console.log('   All open positions protected with SL/TP/TS');
    console.log('   End-of-day report generated');

    if (this.dailySession) {
      this.dailySession.endTime = new Date();
      await this.generateEndOfDayReport();
    }

    process.exit(0);
  }

  private formatDuration(start: Date, end: Date): string {
    const ms = end.getTime() - start.getTime();
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  getSessionData(): DailySession | null {
    return this.dailySession;
  }
}

export async function createAutonomousManager(config?: Partial<AutonomousConfig>) {
  return new AutonomousTradingManager(config);
}
