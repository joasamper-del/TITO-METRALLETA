#!/usr/bin/env ts-node

/**
 * Start S51 Paper Trading Loop
 * Run this tomorrow morning at market open
 *
 * Usage: npx ts-node scripts/start-s51.ts
 */

import { launchS51PaperTrading } from "../strategyLibrary/execution/s51PaperTradingLoop";

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          S51 PAPER TRADING - AUTOMATED LOOP START          ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  🟢 Starting Tito Metralleta autonomous trading...        ║
║                                                            ║
║  Configuration:                                            ║
║    • Symbols: SPY, QQQ, BTC                               ║
║    • Check interval: 5 minutes                            ║
║    • Starting balance: $100,000 (paper)                   ║
║    • Mode: Simulation (no real money)                     ║
║    • Duration: This week (Mon-Fri)                        ║
║                                                            ║
║  What Tito will do:                                        ║
║    1. Check market every 5 min                            ║
║    2. Run Strategy Selector (S49)                         ║
║    3. Verify with Confirmation Engine (S50B)             ║
║    4. Execute via SimulationMode (S50)                    ║
║    5. Log all decisions to history                        ║
║    6. Generate mini reports per trade                     ║
║    7. Feed performance data                               ║
║                                                            ║
║  Your job this week:                                       ║
║    • Monitor progress (check logs)                        ║
║    • Watch for errors (none expected)                     ║
║    • Accumulate 50+ trades minimum                        ║
║    • Let Tito show what she can do                        ║
║                                                            ║
║  Friday: Review + Decision (Real money? Scale up?)        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  try {
    const loop = await launchS51PaperTrading();

    // Log status every hour
    setInterval(() => {
      const status = loop.getStatus();
      const perf = loop.getPerformance();

      console.log(`
[${new Date().toISOString()}] Loop Status
  Running: ${status.isRunning ? "✅" : "❌"}
  Trades: ${status.stats.tradesExecuted} executed, ${status.stats.tradesRejected} rejected
  Account: $${status.accountStatus.balance.toFixed(2)} (daily P&L: $${status.accountStatus.dailyPnL.toFixed(2)})
  Performance: ${perf.winRate.toFixed(1)}% win rate (${perf.wins}W/${perf.losses}L)
      `);
    }, 60 * 60 * 1000); // Every hour

    // Graceful shutdown on SIGTERM
    process.on("SIGTERM", async () => {
      console.log("\n🛑 Shutdown signal received. Closing S51...");
      await loop.stop();
      process.exit(0);
    });

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    console.error("❌ Failed to start S51:", error);
    process.exit(1);
  }
}

main();
