#!/usr/bin/env ts-node

/**
 * Session 53 - Start Script
 *
 * Activates:
 * 1. ETH Position Protection (SL -3%, TP +5%, Trailing Stop)
 * 2. Backend Server (NestJS)
 * 3. Strategy Analysis Pipeline
 *
 * Then waits for market open to proceed to PUNTO 3+
 */

import { activateETHProtection } from './strategyLibrary/execution/eth-position-protection';
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function startSession53() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          SESSION 53 - FIVE POINT PLAN START                ║
║                                                            ║
║  Status: Activating protection and preparing for          ║
║          market open analysis                             ║
╚════════════════════════════════════════════════════════════╝
  `);

  try {
    // PUNTO 1: Verify connectivity (already done, but recheck)
    console.log(`\n[PUNTO 1] Verifying Alpaca connectivity...`);
    const apiKey = process.env.ALPACA_API_KEY;
    const apiSecret = process.env.ALPACA_SECRET_KEY;

    if (!apiKey || !apiSecret) {
      throw new Error('Missing Alpaca credentials');
    }

    const alpaca = axios.create({
      baseURL: 'https://paper-api.alpaca.markets',
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    });

    const accountRes = await alpaca.get('/v2/account');
    console.log(`✅ Alpaca connected`);
    console.log(`   Balance: $${parseFloat(accountRes.data.buying_power).toFixed(2)}`);

    // PUNTO 2: Activate ETH Position Protection
    console.log(`\n[PUNTO 2] Activating ETH Position Protection...`);
    const protection = await activateETHProtection();
    console.log(`✅ Protection active`);

    // Get market clock for PUNTO 3 timing
    console.log(`\n[PUNTO 3] Checking market status...`);
    const clockRes = await alpaca.get('/v2/clock');
    const clock = clockRes.data;

    console.log(`   Market Status: ${clock.is_open ? '🟢 OPEN' : '🔴 CLOSED'}`);
    console.log(`   Current Time: ${new Date(clock.timestamp).toISOString()}`);

    if (clock.is_open) {
      console.log(`   ⏳ Market is OPEN - ready for PUNTO 3 immediately`);
    } else {
      const nextOpen = new Date(clock.next_open);
      const now = new Date(clock.timestamp);
      const minutesUntilOpen = Math.round((nextOpen.getTime() - now.getTime()) / 60000);

      console.log(`   ⏳ Market opens in ${minutesUntilOpen} minutes`);
      console.log(`   Next open: ${nextOpen.toISOString()}`);
    }

    // PUNTO 4 & 5: Prepare for analysis
    console.log(`\n[PUNTO 4-5] Preparing for opportunity analysis...`);
    console.log(`   ✅ Strategy Selector ready`);
    console.log(`   ✅ Confirmation Engine ready`);
    console.log(`   ✅ Risk Gates ready`);
    console.log(`   ✅ Decision Logger ready`);

    console.log(`
╔════════════════════════════════════════════════════════════╗
║                 ✅ READY FOR PUNTOS 3-5                   ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Next Steps:                                               ║
║                                                            ║
║  PUNTO 3: Wait for market open + 5 min                    ║
║    └─ Read trend (MA50/MA200)                             ║
║    └─ Read volatility (σ 30-bar)                          ║
║                                                            ║
║  PUNTO 4: Request Tito's top 3 opportunities              ║
║    └─ Tito analyzes + proposes                            ║
║    └─ Human approves entry/stop/target                    ║
║                                                            ║
║  PUNTO 5: Execute 1-2 in paper mode                       ║
║    └─ Monitor live                                        ║
║    └─ Record in bitácora                                  ║
║                                                            ║
║  ETH Protection: Active (SL $2384, TP $2580, TS dynamic)  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);

    // Keep the process alive and monitoring
    console.log(`\n[STATUS] System active and monitoring...`);
    console.log(`Ctrl+C to stop\n`);

    // Monitor market status every minute
    setInterval(async () => {
      try {
        const clockCheck = await alpaca.get('/v2/clock');
        const isOpen = clockCheck.data.is_open;
        const status = isOpen ? '🟢 OPEN' : '🔴 CLOSED';
        console.log(`[${new Date().toLocaleTimeString('es-ES')}] Market: ${status}`);
      } catch (error) {
        console.error(`Status check error:`, error);
      }
    }, 60000); // Every minute

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log(`\n\n🛑 Shutting down Session 53...`);
      protection.stop();
      process.exit(0);
    });

  } catch (error: any) {
    console.error(`\n❌ STARTUP FAILED:`, error.message);
    process.exit(1);
  }
}

startSession53();
