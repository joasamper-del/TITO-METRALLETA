#!/usr/bin/env ts-node

/**
 * S51 Cron Scheduler
 * Auto start/stop paper trading loop during market hours
 * Runs Monday-Friday: 9:30 AM - 4:00 PM ET
 *
 * Usage: npx ts-node scripts/s51-cron-scheduler.ts
 * Leave running all week — it manages S51 automatically
 */

import * as cron from "node-cron";
import { launchS51PaperTrading, S51PaperTradingLoop } from "../strategyLibrary/execution/s51PaperTradingLoop";
import * as fs from "fs";
import * as path from "path";

const LOG_DIR = path.join(__dirname, "../logs/s51");
const SCHEDULER_LOG = path.join(LOG_DIR, "scheduler.log");

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const msg = `[${timestamp}] ${message}`;
  console.log(msg);

  // Append to log file
  fs.appendFileSync(SCHEDULER_LOG, msg + "\n");
}

class S51CronScheduler {
  private loopInstance: S51PaperTradingLoop | null = null;
  private isRunning: boolean = false;

  constructor() {
    log("🟢 S51 Cron Scheduler initialized");
    this.setupSchedules();
  }

  private setupSchedules(): void {
    // Start at 9:30 AM ET Monday-Friday
    // Cron format: minute hour day-of-month month day-of-week
    // 9:30 AM ET = 13:30 UTC (or 14:30 UTC during EDT)
    cron.schedule("30 9 * * 1-5", () => this.startTradingLoop(), {
      timezone: "America/New_York",
    });

    log("📅 Scheduled START: Mon-Fri 9:30 AM ET");

    // Stop at 4:00 PM ET Monday-Friday
    cron.schedule("0 16 * * 1-5", () => this.stopTradingLoop(), {
      timezone: "America/New_York",
    });

    log("📅 Scheduled STOP: Mon-Fri 4:00 PM ET");

    // Health check every hour
    cron.schedule("0 * * * *", () => this.healthCheck(), {
      timezone: "America/New_York",
    });

    log("📅 Scheduled HEALTH CHECK: Every hour");
  }

  private async startTradingLoop(): Promise<void> {
    if (this.isRunning) {
      log("⚠️  Loop already running, skipping start");
      return;
    }

    try {
      log("🟢 Starting S51 Paper Trading Loop...");
      this.loopInstance = await launchS51PaperTrading();
      this.isRunning = true;
      log("✅ S51 Loop started successfully");
    } catch (error) {
      log(`❌ Failed to start S51: ${error instanceof Error ? error.message : String(error)}`);
      this.isRunning = false;
    }
  }

  private async stopTradingLoop(): Promise<void> {
    if (!this.isRunning || !this.loopInstance) {
      log("⚠️  Loop not running, skipping stop");
      return;
    }

    try {
      log("🔴 Stopping S51 Paper Trading Loop...");
      await this.loopInstance.stop();
      this.isRunning = false;
      log("✅ S51 Loop stopped successfully");

      // Generate end-of-day report
      this.generateEODReport();
    } catch (error) {
      log(`❌ Error stopping S51: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private healthCheck(): void {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const day = now.getDay();

    const isMarketHours = hour >= 9 && hour < 16 && day >= 1 && day <= 5;

    if (isMarketHours && !this.isRunning) {
      log("⚠️  HEALTH CHECK: Loop should be running but isn't! Attempting restart...");
      this.startTradingLoop();
    } else if (!isMarketHours && this.isRunning) {
      log("⚠️  HEALTH CHECK: Loop should be stopped but is running! Attempting stop...");
      this.stopTradingLoop();
    } else if (this.isRunning && this.loopInstance) {
      const status = this.loopInstance.getStatus();
      const perf = this.loopInstance.getPerformance();

      log(
        `✅ HEALTH CHECK: Loop OK | Trades: ${status.stats.tradesExecuted} | ` +
          `Balance: $${status.accountStatus.balance.toFixed(2)} | ` +
          `Win Rate: ${perf.winRate.toFixed(1)}%`
      );
    } else {
      log(`✅ HEALTH CHECK: Off-hours (${hour}:${minute.toString().padStart(2, "0")}), loop stopped`);
    }
  }

  private generateEODReport(): void {
    if (!this.loopInstance) return;

    const status = this.loopInstance.getStatus();
    const perf = this.loopInstance.getPerformance();

    const report = `
╔══════════════════════════════════════════════════════════╗
║                  S51 END-OF-DAY SUMMARY                  ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Date: ${new Date().toISOString()}
║                                                          ║
║  Trades:                                                ║
║    • Executed: ${status.stats.tradesExecuted}
║    • Rejected: ${status.stats.tradesRejected}
║    • Total: ${status.stats.tradesExecuted + status.stats.tradesRejected}
║                                                          ║
║  Performance:                                           ║
║    • Win Rate: ${perf.winRate.toFixed(1)}%
║    • Wins: ${perf.wins} | Losses: ${perf.losses}
║    • Total P&L: $${perf.totalPnL.toFixed(2)}
║    • Avg per trade: $${perf.avgPnLPerTrade.toFixed(2)}
║                                                          ║
║  Account:                                               ║
║    • Balance: $${status.accountStatus.balance.toFixed(2)}
║    • Daily P&L: $${status.accountStatus.dailyPnL.toFixed(2)}
║    • Open positions: ${status.accountStatus.openPositions}
║                                                          ║
║  Status: ✅ Loop completed successfully                  ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `;

    log(report);

    // Also save to daily report file
    const reportFile = path.join(LOG_DIR, `report-${new Date().toISOString().split("T")[0]}.txt`);
    fs.writeFileSync(reportFile, report);
  }

  /**
   * Graceful shutdown on SIGTERM/SIGINT
   */
  setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      log(`\n🛑 Received ${signal}, gracefully shutting down...`);
      if (this.isRunning) {
        await this.stopTradingLoop();
      }
      log("✅ Scheduler shut down cleanly");
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║        S51 CRON SCHEDULER - AUTOMATED PAPER TRADING        ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ✅ Scheduler started                                     ║
║                                                            ║
║  Schedule:                                                ║
║    • START: Mon-Fri 9:30 AM ET                           ║
║    • STOP:  Mon-Fri 4:00 PM ET                           ║
║    • CHECK: Every hour (health monitoring)               ║
║                                                            ║
║  Leave this running all week — it manages S51 for you.   ║
║                                                            ║
║  Logs:                                                    ║
║    • Console (above)                                      ║
║    • File: logs/s51/scheduler.log                        ║
║    • Daily reports: logs/s51/report-YYYY-MM-DD.txt       ║
║                                                            ║
║  To stop: Ctrl+C (graceful shutdown)                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  const scheduler = new S51CronScheduler();
  scheduler.setupGracefulShutdown();

  log("🟢 Ready. Waiting for market hours...");

  // Keep process alive
  await new Promise(() => {});
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
