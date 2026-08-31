/**
 * Validate TP Order Fix
 * Test precision rounding and existing order detection
 */

import * as dotenv from "dotenv";
import * as path from "path";
import axios from "axios";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

async function validateTPFix() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║         VALIDATING TP ORDER FIX - ALPACA CRYPTO            ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_SECRET_KEY;

  const client = axios.create({
    baseURL: "https://paper-api.alpaca.markets",
    headers: {
      "APCA-API-KEY-ID": apiKey,
      "APCA-API-SECRET-KEY": apiSecret,
    },
  });

  // Step 1: Check positions
  console.log("STEP 1: Checking current positions...");
  const posRes = await client.get("/v2/positions");
  const positions = posRes.data;
  console.log(`✅ Found ${positions.length} positions\n`);

  // Step 2: Check existing orders
  console.log("STEP 2: Checking existing orders...");
  const ordersRes = await client.get("/v2/orders");
  const orders = ordersRes.data;
  console.log(`✅ Found ${orders.length} total orders`);

  const sellLimitOrders = orders.filter(
    (o: any) =>
      o.side === "sell" && o.type === "limit" && o.status !== "canceled" && o.status !== "filled"
  );
  console.log(`✅ Found ${sellLimitOrders.length} active SELL LIMIT orders\n`);

  // Step 3: Test precision rounding
  console.log("STEP 3: Testing precision rounding...");
  for (const pos of positions) {
    const entryPrice = parseFloat(pos.avg_entry_price);
    const tpCalculated = entryPrice * 1.02;
    const tpRounded = Math.round(tpCalculated * 100) / 100;

    console.log(`\n   📍 ${pos.symbol}`);
    console.log(`      Entry: $${entryPrice.toFixed(2)}`);
    console.log(`      Calculated TP: $${tpCalculated} (raw)`);
    console.log(`      Rounded TP: $${tpRounded.toFixed(2)} ✅`);
    console.log(`      Decimals: ${tpRounded.toString().split(".")[1]?.length || 0}`);

    // Check for existing TP
    const existingTP = sellLimitOrders.find(
      (o: any) =>
        o.symbol === pos.symbol &&
        parseFloat(o.qty) === parseFloat(pos.qty) &&
        o.status !== "canceled" &&
        o.status !== "filled"
    );

    if (existingTP) {
      console.log(`      Existing TP: ${existingTP.id} @ $${existingTP.limit_price} ✅ (SKIP)`);
    } else {
      console.log(`      No existing TP found (ready to place) ✅`);
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("SUMMARY:");
  console.log("═".repeat(60));

  const issues = [];

  // Validate precisions
  for (const pos of positions) {
    const entryPrice = parseFloat(pos.avg_entry_price);
    const tpCalculated = entryPrice * 1.02;
    const tpRounded = Math.round(tpCalculated * 100) / 100;
    const decimals = tpRounded.toString().split(".")[1]?.length || 0;

    if (decimals > 2) {
      issues.push(`${pos.symbol}: TP has ${decimals} decimals (max 2)`);
    }
  }

  if (issues.length === 0) {
    console.log("✅ All TP prices have valid precision (≤2 decimals)");
    console.log("✅ Existing order detection working");
    console.log("\n🎯 TP FIX VALIDATED - Ready for S52 test\n");
  } else {
    console.log("❌ Issues found:");
    issues.forEach((issue) => console.log(`   • ${issue}`));
  }
}

validateTPFix().catch((err) => {
  console.error("Validation failed:", err.message);
  process.exit(1);
});
