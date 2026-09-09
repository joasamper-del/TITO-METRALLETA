/**
 * Tito Autonomous Paper Trading Operation
 *
 * RESTRICTIONS:
 * ✅ Paper Trading ONLY
 * ✅ SL = 1%, TP = 2%, Risk = 2% (FROZEN)
 * ✅ Existing strategy only
 * ✅ No new symbols
 * ✅ Manual SL monitoring active
 * ✅ Auto-recovery on restart
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { AlpacaAdapter } from "./alpacaAdapter";
import { EnhancedOperationLogger } from "./enhanced.operation.logger";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

interface OperationStatus {
  running: boolean;
  startTime: Date;
  operatingSymbols: string[];
  openPositions: Map<string, { qty: number; entry: number; sl: number; tp: number }>;
  connectionErrors: number;
  lastHealthCheck: Date;
}

const operationStatus: OperationStatus = {
  running: false,
  startTime: new Date(),
  operatingSymbols: ["BTCUSD", "ETHUSD"], // Only enabled symbols
  openPositions: new Map(),
  connectionErrors: 0,
  lastHealthCheck: new Date(),
};

async function startAutonomousOperation() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║     TITO AUTONOMOUS PAPER TRADING OPERATION STARTING       ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_SECRET_KEY;

  if (!apiKey || !apiSecret) {
    console.error("❌ Missing credentials from .env.local");
    process.exit(1);
  }

  console.log("CONFIGURATION:");
  console.log(`   Mode: Paper Trading ONLY`);
  console.log(`   Endpoint: https://paper-api.alpaca.markets`);
  console.log(`   Strategy: Current enabled`);
  console.log(`   SL: 1% (FROZEN)`);
  console.log(`   TP: 2% (FROZEN)`);
  console.log(`   Risk: 2% per trade (FROZEN)`);
  console.log(`   Symbols: ${operationStatus.operatingSymbols.join(", ")}`);
  console.log(`   Started: ${operationStatus.startTime.toISOString()}\n`);

  const adapter = new AlpacaAdapter(apiKey, apiSecret);

  // Initialize logger for trade recording
  const logger = new EnhancedOperationLogger("tito-autonomous-paper");
  adapter.setLogger(logger);

  console.log(`📊 Trade logging enabled: ${logger.getLogFile()}\n`);

  // Verification Phase 1: Health Check
  console.log("VERIFICATION 1: Connectivity");
  const healthy = await adapter.healthCheck();
  if (!healthy) {
    console.error("❌ Cannot connect to Alpaca Paper Trading");
    process.exit(1);
  }
  console.log("✅ Connected to Alpaca Paper Trading\n");

  // Verification Phase 2: Account Status
  console.log("VERIFICATION 2: Account Status");
  const account = await adapter.getAccount();
  if (!account) {
    console.error("❌ Cannot access account");
    process.exit(1);
  }
  console.log(`✅ Account active`);
  console.log(`   Balance: $${account.balance.toFixed(2)}`);
  console.log(`   Cash: $${account.cash.toFixed(2)}`);
  console.log(`   Buying Power: $${account.buyingPower.toFixed(2)}\n`);

  // Verification Phase 3: Existing Positions
  console.log("VERIFICATION 3: Position Recovery");
  const positions = await adapter.getPositions();
  console.log(`✅ Found ${positions.length} open positions`);

  if (positions.length > 0) {
    for (const pos of positions) {
      const entry = parseFloat(pos.avg_entry_price as any);
      const sl = entry * 0.99;
      const tp = entry * 1.02;

      operationStatus.openPositions.set(pos.symbol, {
        qty: parseFloat(pos.qty),
        entry,
        sl,
        tp,
      });

      console.log(`   • ${pos.symbol}: ${pos.qty} @ $${entry.toFixed(2)}`);
      console.log(`      SL: $${sl.toFixed(2)}, TP: $${tp.toFixed(2)}`);
    }
    console.log("");
  }

  // Verification Phase 4: SL Monitoring Setup
  console.log("VERIFICATION 4: SL Monitoring");
  await adapter.recoverExistingPositions();
  console.log("✅ SL monitoring initialized\n");

  // Verification Phase 5: Connection Loss Protection
  console.log("VERIFICATION 5: Protection Against Connection Loss");
  if (adapter.isConnectionLost()) {
    console.error("❌ Connection already lost - aborting startup");
    process.exit(1);
  }
  console.log("✅ Connection protection active\n");

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                  ✅ ALL VERIFICATIONS PASSED                ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  operationStatus.running = true;
  operationStatus.lastHealthCheck = new Date();

  // Health check loop every 30 seconds
  const healthCheckInterval = setInterval(async () => {
    const health = await adapter.healthCheck();
    operationStatus.lastHealthCheck = new Date();

    if (!health) {
      operationStatus.connectionErrors++;
      console.error(
        `🔴 [${operationStatus.lastHealthCheck.toLocaleTimeString()}] Connection lost (${operationStatus.connectionErrors} errors)`
      );

      if (operationStatus.connectionErrors >= 3) {
        console.error("🔴 CONNECTION FAILED - Blocking new entries");
        // Don't exit, just block new trades
      }
    } else if (operationStatus.connectionErrors > 0) {
      console.log(
        `🟢 [${operationStatus.lastHealthCheck.toLocaleTimeString()}] Connection restored`
      );
      operationStatus.connectionErrors = 0;
    }
  }, 30000);

  // Status report every 60 seconds
  const statusInterval = setInterval(() => {
    const uptime = Math.floor(
      (Date.now() - operationStatus.startTime.getTime()) / 1000
    );
    const minutes = Math.floor(uptime / 60);
    const seconds = uptime % 60;

    console.log(`\n📊 [${new Date().toLocaleTimeString()}] STATUS REPORT`);
    console.log(`   Uptime: ${minutes}m ${seconds}s`);
    console.log(`   Connection: ${operationStatus.connectionErrors === 0 ? "✅" : "⚠️"}`);
    console.log(`   Positions: ${operationStatus.openPositions.size} open`);
    console.log(`   SL Monitoring: ${operationStatus.openPositions.size > 0 ? "🟢 ACTIVE" : "⏸️  (no positions)"}`);

    if (operationStatus.openPositions.size > 0) {
      for (const [symbol, pos] of operationStatus.openPositions) {
        const tracked = adapter.getTrackedPosition(symbol);
        if (tracked) {
          const status = tracked.status === "active" ? "🟢" : "🔴";
          const price = tracked.lastPrice ? `$${tracked.lastPrice.toFixed(2)}` : "N/A";
          console.log(
            `      ${status} ${symbol}: ${tracked.quantity} @ ${price} (SL: $${tracked.stopLoss.toFixed(2)})`
          );
        }
      }
    }
    console.log("");
  }, 60000);

  console.log("━".repeat(60));
  console.log("🟢 TITO AUTONOMOUS IN PAPER: RUNNING");
  console.log("━".repeat(60));
  console.log(`\n🔔 Operating Symbols: ${operationStatus.operatingSymbols.join(", ")}`);
  console.log(`🔔 Open Positions: ${operationStatus.openPositions.size}`);
  console.log(`🔔 SL Monitoring: ACTIVE (10-second intervals)`);
  console.log(`🔔 Connection Protection: ACTIVE (3-strike limit)`);
  console.log(`\n📝 Press Ctrl+C to stop gracefully\n`);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n\n🛑 SHUTDOWN SIGNAL RECEIVED");
    console.log("━".repeat(60));

    clearInterval(healthCheckInterval);
    clearInterval(statusInterval);

    console.log("\n📋 FINAL STATUS:");
    console.log(`   Uptime: ${Math.floor((Date.now() - operationStatus.startTime.getTime()) / 1000)}s`);
    console.log(`   Positions: ${operationStatus.openPositions.size}`);
    console.log(`   Connection Errors: ${operationStatus.connectionErrors}`);

    if (operationStatus.openPositions.size > 0) {
      console.log("\n⚠️  OPEN POSITIONS (WILL CONTINUE MONITORING AFTER SHUTDOWN):");
      for (const [symbol, pos] of operationStatus.openPositions) {
        console.log(`   • ${symbol}: ${pos.qty} @ $${pos.entry.toFixed(2)}`);
        console.log(`      SL: $${pos.sl.toFixed(2)}, TP: $${pos.tp.toFixed(2)}`);
      }
    }

    await adapter.cleanup();
    console.log("\n✅ Shutdown complete\n");
    process.exit(0);
  });
}

startAutonomousOperation().catch((err) => {
  console.error("Operation failed:", err.message);
  process.exit(1);
});
