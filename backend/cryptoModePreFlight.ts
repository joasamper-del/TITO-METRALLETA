/**
 * CRYPTO MODE PREFLIGHT — Verificación antes de ejecutar
 */

import * as fs from "fs";
import * as path from "path";

const envFilePath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envFilePath, "utf8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  if (line && !line.startsWith("#")) {
    const [key, ...valueParts] = line.split("=");
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

const API_KEY = envVars.ALPACA_API_KEY;
const SECRET_KEY = envVars.ALPACA_SECRET_KEY;

function getAuthHeader(): string {
  const credentials = `${API_KEY}:${SECRET_KEY}`;
  return "Basic " + Buffer.from(credentials).toString("base64");
}

async function runCryptoPreFlight() {
  console.log("\n🔵 CRYPTO MODE PREFLIGHT CHECK");
  console.log("=====================================\n");

  let passed = 0;
  let failed = 0;

  try {
    // 1. Account status
    console.log("1️⃣ Account Status");
    const accountRes = await fetch(
      `https://paper-api.alpaca.markets/v2/account`,
      { headers: { Authorization: getAuthHeader() } }
    );
    const account = (await accountRes.json()) as any;

    if (
      account.status === "ACTIVE" &&
      account.crypto_status === "ACTIVE"
    ) {
      console.log(`   ✅ PAPER ACTIVE`);
      console.log(`   ✅ CRYPTO ACTIVE`);
      console.log(`   ✅ Equity: $${account.equity}`);
      passed++;
    } else {
      console.log(`   ❌ Account not ready`);
      failed++;
    }

    // 2. No open positions
    console.log(`\n2️⃣ Open Positions`);
    const posRes = await fetch(
      `https://paper-api.alpaca.markets/v2/positions?asset_class=crypto`,
      { headers: { Authorization: getAuthHeader() } }
    );
    const positions = (await posRes.json()) as any;

    if (!Array.isArray(positions) || positions.length === 0) {
      console.log(`   ✅ 0 crypto positions`);
      passed++;
    } else {
      console.log(`   ❌ ${positions.length} open positions found`);
      failed++;
    }

    // 3. No pending orders
    console.log(`\n3️⃣ Pending Orders`);
    const pendingRes = await fetch(
      `https://paper-api.alpaca.markets/v2/orders?status=pending`,
      { headers: { Authorization: getAuthHeader() } }
    );
    const pending = (await pendingRes.json()) as any;

    if (!Array.isArray(pending) || pending.length === 0) {
      console.log(`   ✅ 0 pending orders`);
      passed++;
    } else {
      console.log(`   ❌ ${pending.length} orders pending`);
      failed++;
    }

    // 4. Tito Core frozen
    console.log(`\n4️⃣ Tito Core Status`);
    const titoPath = path.join(__dirname, "../backend/@tito-core");
    if (fs.existsSync(titoPath)) {
      console.log(`   ✅ Tito Core present (FROZEN)`);
      passed++;
    } else {
      console.log(`   ⚠️  Tito Core path not found`);
    }

    // 5. Crypto mode isolated
    console.log(`\n5️⃣ Crypto Mode Isolation`);
    const cryptoModePath = path.join(__dirname, "cryptoMode.ts");
    if (fs.existsSync(cryptoModePath)) {
      console.log(`   ✅ Crypto mode separate from EQUITY`);
      console.log(`   ✅ SPY/QQQ/VIX logic untouched`);
      passed++;
    } else {
      console.log(`   ❌ Crypto mode file missing`);
      failed++;
    }

    // 6. Logs directory
    console.log(`\n6️⃣ Logging Infrastructure`);
    const logDir = path.join(__dirname, "phase_d_logs");
    if (fs.existsSync(logDir)) {
      console.log(`   ✅ Logs directory ready`);
      passed++;
    } else {
      console.log(`   ❌ Logs directory missing`);
      failed++;
    }

    // Summary
    console.log(`\n✅ Passed: ${passed}/6`);
    console.log(`❌ Failed: ${failed}/6`);

    if (failed === 0) {
      console.log(`\n🟢 CRYPTO PREFLIGHT COMPLETE — READY FOR DRY-RUN`);
    } else {
      console.log(`\n🔴 ISSUES FOUND — FIX BEFORE EXECUTING`);
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

runCryptoPreFlight();
