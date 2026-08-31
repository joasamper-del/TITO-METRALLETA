/**
 * Diagnose TP Order Placement Issue
 * Identify why recovery TP orders are failing
 */

import axios from "axios";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

async function diagnoseTP() {
  console.log("\n🔍 DIAGNOSING TP ORDER PLACEMENT\n");

  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_SECRET_KEY;

  const client = axios.create({
    baseURL: "https://paper-api.alpaca.markets",
    headers: {
      "APCA-API-KEY-ID": apiKey,
      "APCA-API-SECRET-KEY": apiSecret,
    },
    timeout: 10000,
  });

  // Get positions
  console.log("1. Fetching current positions...");
  let positions: any[] = [];
  try {
    const res = await client.get("/v2/positions");
    positions = res.data;
    console.log(`   ✅ Found ${positions.length} positions\n`);
  } catch (err: any) {
    console.error("   ❌ Error fetching positions:", err.response?.status, err.response?.data);
    return;
  }

  // Get account info
  console.log("2. Fetching account info...");
  let account: any = {};
  try {
    const res = await client.get("/v2/account");
    account = res.data;
    console.log(`   ✅ Account active: ${account.status}`);
    console.log(`   ✅ Buying power: $${account.buying_power}`);
    console.log(`   ✅ Available cash: $${account.cash}\n`);
  } catch (err: any) {
    console.error("   ❌ Error fetching account");
    return;
  }

  // Try to place TP order for each position
  console.log("3. Attempting TP orders for each position...\n");

  for (const pos of positions) {
    const symbol = pos.symbol;
    const qty = parseFloat(pos.qty);
    const entryPrice = parseFloat(pos.avg_entry_price || pos.current_price);
    const tp = entryPrice * 1.02;

    console.log(`   📍 Testing ${symbol}`);
    console.log(`      Entry: $${entryPrice.toFixed(2)}`);
    console.log(`      TP: $${tp.toFixed(2)} (qty: ${qty})`);
    console.log(`      Order size in USD: $${(qty * tp).toFixed(2)}`);

    try {
      const response = await client.post("/v2/orders", {
        symbol,
        qty,
        side: "sell",
        type: "limit",
        limit_price: tp,
        time_in_force: "gtc",
        client_order_id: `diag_tp_${Date.now()}_${Math.random()}`,
      });

      console.log(`      ✅ SUCCESS: ${response.data.id}\n`);
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;

      console.log(`      ❌ Status: ${status}`);
      console.log(`      Message: ${data?.message || data?.error || err.message}`);

      // Diagnose specific issues
      if (status === 403) {
        console.log(`      🔐 ISSUE: Permission denied (403)`);
        console.log(`         • Check if account has write permissions`);
        console.log(`         • Check if API key is read-only`);
      } else if (status === 422) {
        console.log(`      ❌ ISSUE: Unprocessable entity (422)`);
        if (data?.message?.includes("minimum")) {
          console.log(`         • Order size too small (minimum $10)`);
          console.log(`         • Current size: $${(qty * tp).toFixed(2)}`);
        } else if (data?.message?.includes("precision")) {
          console.log(`         • Qty precision error`);
          console.log(`         • Try reducing decimal places`);
        } else if (data?.message?.includes("conflict")) {
          console.log(`         • Conflict with existing order`);
          console.log(`         • Check Alpaca Orders dashboard`);
        } else {
          console.log(`         • Raw error: ${JSON.stringify(data)}`);
        }
      }

      console.log("");
    }
  }

  console.log("\n═".repeat(60));
  console.log("DIAGNOSIS COMPLETE");
  console.log("═".repeat(60));
}

diagnoseTP().catch(console.error);
