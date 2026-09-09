/**
 * REAL Alpaca Integration Test
 * Validates OCO simulation implementation for Paper Trading
 *
 * RUN BEFORE USING:
 * APCA_API_KEY_ID=... APCA_API_SECRET_KEY=... npx ts-node alpacaAdapter.real.test.ts
 */

import { AlpacaAdapter } from "./alpacaAdapter";

async function testRealAlpacaOCO() {
  console.log("🧪 STARTING REAL ALPACA OCO TEST\n");

  const apiKey = process.env.APCA_API_KEY_ID;
  const apiSecret = process.env.APCA_API_SECRET_KEY;

  if (!apiKey || !apiSecret) {
    console.error("❌ Missing credentials. Set APCA_API_KEY_ID and APCA_API_SECRET_KEY");
    process.exit(1);
  }

  const adapter = new AlpacaAdapter(apiKey, apiSecret);

  // Test 1: Health check
  console.log("TEST 1: Health Check");
  const healthy = await adapter.healthCheck();
  console.log(`  ${healthy ? "✅" : "❌"} Alpaca connectivity: ${healthy}\n`);

  if (!healthy) {
    console.error("❌ Cannot connect to Alpaca. Check credentials.");
    process.exit(1);
  }

  // Test 2: Get account
  console.log("TEST 2: Account Info");
  const account = await adapter.getAccount();
  console.log(`  Balance: $${account.totalBalance.toFixed(2)}`);
  console.log(`  Available Cash: $${account.availableCash.toFixed(2)}`);
  console.log(`  Buying Power: $${account.buyingPower.toFixed(2)}\n`);

  // Test 3: Place test OCO order
  console.log("TEST 3: Place Mini Test Order (BTC - 0.001 BTC)");
  console.log("  ⚠️  THIS WILL PLACE A REAL ORDER ON PAPER TRADING");
  console.log("  Order: BUY 0.001 BTC");
  console.log("  SL: Entry * 0.98 (2% stop)");
  console.log("  TP: Entry * 1.03 (3% profit)\n");

  // Get current BTC price
  console.log("Fetching current BTC price...");
  const positions = await adapter.getPositions();
  console.log(`Current positions: ${positions.length}\n`);

  // Place order - Try BTCUSD for Alpaca Crypto
  const testOrder = await adapter.placeOCOOrder({
    symbol: "BTCUSD",  // Alpaca Crypto uses "BTCUSD" format
    quantity: 0.001,
    side: "buy",
    entryPrice: 45000,
    stopLoss: 45000 * 0.98,
    takeProfit: 45000 * 1.03,
    clientOrderId: `tito_test_${Date.now()}`,
  });

  if (testOrder.status === "rejected") {
    console.error(`❌ Order rejected: ${testOrder.error}\n`);
  } else {
    console.log(`✅ Order placed successfully`);
    console.log(`  Entry Order ID: ${testOrder.id}`);
    console.log(`  Status: ${testOrder.status}`);
    console.log(`  Filled Qty: ${testOrder.filledQty}`);
    console.log(`  Filled Price: ${testOrder.filledPrice?.toFixed(2) || "N/A"}\n`);

    // Test 4: Check protective orders
    console.log("TEST 4: Verify Protective Orders");
    const protective = adapter.getProtectiveOrders("BTCUSD");

    if (protective) {
      console.log(`  Entry Order: ${protective.entryOrderId}`);
      console.log(`  SL Order: ${protective.stopLossOrderId}`);
      console.log(`  TP Order: ${protective.takeProfitOrderId}`);
      console.log(`  Status: ${protective.exitedVia || "MONITORING"}\n`);
    } else {
      console.log("  ⚠️  Protective orders not tracked\n");
    }

    // Test 5: Check positions
    console.log("TEST 5: Get Updated Positions");
    const updatedPositions = await adapter.getPositions();
    console.log(`  Total positions: ${updatedPositions.length}`);
    updatedPositions.forEach((p) => {
      console.log(`  - ${p.symbol}: ${p.quantity} @ ${p.entryPrice.toFixed(2)} (P&L: $${p.unrealizedPnL.toFixed(2)})`);
    });
  }

  console.log("\n✅ TEST COMPLETE\n");
  console.log("NEXT STEPS:");
  console.log("1. Verify in Alpaca Dashboard that all 3 orders appear (entry, SL, TP)");
  console.log("2. Check that orders are OPEN/PENDING (not rejected)");
  console.log("3. Monitor that if one exits, the paired order cancels");
  console.log("4. Once validated, Tito can execute real trades\n");

  await adapter.cleanup();
}

testRealAlpacaOCO().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
