/**
 * Diagnose 403 Error - Safe Credential Check
 * No secrets displayed in output
 */

import axios from "axios";

async function diagnose() {
  console.log("\n🔍 DIAGNOSING 403 ERROR - SAFE MODE\n");

  const apiKey = process.env.APCA_API_KEY_ID;
  const apiSecret = process.env.APCA_API_SECRET_KEY;

  if (!apiKey || !apiSecret) {
    console.log("⚠️  Missing env vars: APCA_API_KEY_ID or APCA_API_SECRET_KEY");
    console.log("   Checking .env.local for alternative names...\n");

    // Check if using different names
    const altKey = process.env.ALPACA_API_KEY;
    const altSecret = process.env.ALPACA_SECRET_KEY;

    if (altKey && altSecret) {
      console.log("✅ Found alternative var names:");
      console.log("   ALPACA_API_KEY: [present]");
      console.log("   ALPACA_SECRET_KEY: [present]");
      console.log("\n   ⚠️  MISMATCH: Code expects APCA_API_KEY_ID/APCA_API_SECRET_KEY");
      console.log("   ACTION: Pass correct variable names to test:\n");
      console.log("   APCA_API_KEY_ID=$ALPACA_API_KEY \\");
      console.log("   APCA_API_SECRET_KEY=$ALPACA_SECRET_KEY \\");
      console.log("   npx ts-node test.manual.sl.ts\n");
      return;
    }

    console.error("❌ No Alpaca credentials found");
    process.exit(1);
  }

  console.log("✅ Environment variables present");
  console.log(`   APCA_API_KEY_ID: [${apiKey.length} chars]`);
  console.log(`   APCA_API_SECRET_KEY: [${apiSecret.length} chars]\n`);

  const baseUrl = "https://paper-api.alpaca.markets";
  console.log(`📍 Endpoint: ${baseUrl}\n`);

  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      "APCA-API-KEY-ID": apiKey,
      "APCA-API-SECRET-KEY": apiSecret,
    },
    timeout: 10000,
  });

  // Test 1: GET (should work)
  console.log("TEST 1: GET /v2/account (Read)");
  try {
    const res = await client.get("/v2/account");
    console.log(`  ✅ Status ${res.status}`);
    console.log(`  Account active: ${res.data.status}`);
    console.log(`  Crypto enabled: ${res.data.crypto_status}\n`);
  } catch (err: any) {
    console.log(`  ❌ Status ${err.response?.status || "ERROR"}`);
    console.log(`  Message: ${err.response?.data?.message || err.message}\n`);
  }

  // Test 2: GET /v2/positions (should work)
  console.log("TEST 2: GET /v2/positions (Read)");
  try {
    const res = await client.get("/v2/positions");
    console.log(`  ✅ Status ${res.status}`);
    console.log(`  Positions: ${res.data.length}\n`);
  } catch (err: any) {
    console.log(`  ❌ Status ${err.response?.status || "ERROR"}\n`);
  }

  // Test 3: POST (the one failing)
  console.log("TEST 3: POST /v2/orders (Write - PROBLEM)");
  try {
    const res = await client.post("/v2/orders", {
      symbol: "ETHUSD",
      qty: 0.00001, // Tiny amount
      side: "buy",
      type: "market",
      time_in_force: "gtc",
      client_order_id: `diag_${Date.now()}`,
    });
    console.log(`  ✅ Status ${res.status}`);
    console.log(`  Order: ${res.data.id}\n`);
  } catch (err: any) {
    console.log(`  ❌ Status ${err.response?.status}`);
    const msg = err.response?.data?.message || err.message;
    console.log(`  Error: ${msg}\n`);

    if (err.response?.status === 403) {
      console.log("  📋 Possible causes:");
      console.log("     1. Credentials are READ-ONLY (no trading permissions)");
      console.log("     2. Account not approved for paper trading writes");
      console.log("     3. Credentials expired or revoked");
      console.log("     4. IP whitelist blocking (if configured)\n");

      console.log("  ✅ Solutions:");
      console.log("     1. Check Alpaca Account Settings → API Keys");
      console.log("     2. Verify key has 'full' permissions (not 'read-only')");
      console.log("     3. Try regenerating the key in Alpaca Dashboard");
      console.log("     4. Confirm Paper Trading is enabled on account\n");
    }
  }

  console.log("═".repeat(60));
  console.log("NEXT STEP:");
  console.log("═".repeat(60));
  console.log(`
1. Open Alpaca Dashboard: https://app.alpaca.markets
2. Go to Account Settings → API Keys
3. Check that your key has permissions:
   ✅ Trading: YES
   ✅ Account: READ
   ✅ Orders: READ/WRITE
   ✅ Positions: READ/WRITE
4. If read-only: Generate new key with full permissions
5. Update .env or pass new credentials to test
6. Re-run diagnose to verify
  `);
}

diagnose().catch(console.error);
