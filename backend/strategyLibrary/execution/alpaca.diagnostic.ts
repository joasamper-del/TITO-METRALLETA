/**
 * Alpaca API Diagnostic
 * Test different order formats to identify the 422 error
 */

import axios from "axios";

const apiKey = "PKZJACBLG2RGWLHBJSCXHXXYZB";
const apiSecret = "DqcYBAACZjCzJ6YSWbLBAczi5aRJ4ddu8Azkv2KrxUH6";
const baseUrl = "https://paper-api.alpaca.markets";

const client = axios.create({
  baseURL: baseUrl,
  headers: {
    "APCA-API-KEY-ID": apiKey,
    "APCA-API-SECRET-KEY": apiSecret,
  },
  timeout: 10000,
});

async function test() {
  console.log("🔍 ALPACA API DIAGNOSTIC\n");

  // Get positions
  const pos = await client.get("/v2/positions");
  console.log("Your positions:");
  pos.data.forEach((p: any) => {
    console.log(`  ${p.symbol}: ${p.qty} @ $${p.current_price}`);
  });

  console.log("\n🧪 Testing market order formats...\n");

  // Test 1: Simple market order
  console.log("TEST 1: Basic market order");
  try {
    const res = await client.post("/v2/orders", {
      symbol: "ETHUSD",
      qty: 0.0001,
      side: "buy",
      type: "market",
      time_in_force: "day",
    });
    console.log("✅ SUCCESS:", res.data.id);
  } catch (err: any) {
    console.log("❌ ERROR:", err.response?.status, err.response?.data?.message || err.message);
  }

  // Test 2: With client_order_id
  console.log("\nTEST 2: Market order + client_order_id");
  try {
    const res = await client.post("/v2/orders", {
      symbol: "ETHUSD",
      qty: 0.0001,
      side: "buy",
      type: "market",
      time_in_force: "day",
      client_order_id: `test_${Date.now()}`,
    });
    console.log("✅ SUCCESS:", res.data.id);
  } catch (err: any) {
    console.log("❌ ERROR:", err.response?.status, err.response?.data?.message || err.message);
  }

  // Test 3: Stop order
  console.log("\nTEST 3: Stop order (after market order succeeds)");
  try {
    const res = await client.post("/v2/orders", {
      symbol: "ETHUSD",
      qty: 0.0001,
      side: "sell",
      type: "stop",
      stop_price: 2000,
      time_in_force: "gtc",
    });
    console.log("✅ SUCCESS:", res.data.id);
  } catch (err: any) {
    console.log("❌ ERROR:", err.response?.status, err.response?.data?.message || err.message);
  }

  // Test 4: Limit order
  console.log("\nTEST 4: Limit order");
  try {
    const res = await client.post("/v2/orders", {
      symbol: "ETHUSD",
      qty: 0.0001,
      side: "sell",
      type: "limit",
      limit_price: 3000,
      time_in_force: "gtc",
    });
    console.log("✅ SUCCESS:", res.data.id);
  } catch (err: any) {
    console.log("❌ ERROR:", err.response?.status, err.response?.data?.message || err.message);
  }

  console.log("\n✅ Diagnostic complete");
}

test().catch(console.error);
