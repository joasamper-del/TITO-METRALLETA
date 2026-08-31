/**
 * Check for existing TP orders blocking positions
 */

import * as dotenv from "dotenv";
import * as path from "path";
import axios from "axios";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

async function checkOrders() {
  const client = axios.create({
    baseURL: "https://paper-api.alpaca.markets",
    headers: {
      "APCA-API-KEY-ID": process.env.ALPACA_API_KEY,
      "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY,
    },
  });

  console.log("\n🔍 CHECKING FOR BLOCKING ORDERS\n");

  // Get positions
  const posRes = await client.get("/v2/positions");
  const positions: any[] = posRes.data;

  // Get all orders
  const ordersRes = await client.get("/v2/orders");
  const orders: any[] = ordersRes.data;

  console.log("POSITIONS:");
  for (const pos of positions) {
    console.log(`\n   ${pos.symbol}`);
    console.log(`   • Qty: ${pos.qty}`);
    console.log(`   • Entry: $${pos.avg_entry_price}`);
  }

  console.log("\n\nALL ORDERS:");
  for (const order of orders) {
    const status =
      order.status === "canceled" || order.status === "filled"
        ? `[${order.status.toUpperCase()}]`
        : "[ACTIVE]";
    console.log(`\n   ${status} ${order.symbol}`);
    console.log(`   • ID: ${order.id}`);
    console.log(`   • Side: ${order.side}`);
    console.log(`   • Type: ${order.type}`);
    console.log(`   • Qty: ${order.qty}`);
    if (order.limit_price) console.log(`   • Price: $${order.limit_price}`);
    console.log(`   • Status: ${order.status}`);
  }

  console.log("\n\nMATCHING LOGIC:");
  for (const pos of positions) {
    console.log(`\n${pos.symbol}:`);

    const relatedOrders = orders.filter((o) => o.symbol === pos.symbol);
    console.log(`   Found ${relatedOrders.length} orders for ${pos.symbol}`);

    const activeSellOrders = relatedOrders.filter(
      (o) =>
        o.side === "sell" &&
        o.type === "limit" &&
        o.status !== "canceled" &&
        o.status !== "filled"
    );
    console.log(`   ${activeSellOrders.length} active SELL LIMIT orders`);

    if (activeSellOrders.length > 0) {
      console.log("   ⚠️  BLOCKING ORDERS FOUND:");
      for (const order of activeSellOrders) {
        console.log(`       • ID: ${order.id} @ $${order.limit_price}`);
      }
      console.log(
        `   💡 FIX: Cancel these orders first, then place new ones or track existing ones`
      );
    }
  }
}

checkOrders().catch(console.error);
