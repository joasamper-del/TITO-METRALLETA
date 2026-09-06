/**
 * Check ETH Position & Orders
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function checkETHOrders() {
  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_SECRET_KEY;
  const baseUrl = 'https://paper-api.alpaca.markets';

  try {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║              ETH/USD POSITION & ORDERS AUDIT               ║
╚════════════════════════════════════════════════════════════╝
    `);

    // Get all ETH orders
    const ordersRes = await axios.get(`${baseUrl}/v2/orders?status=all&limit=100&symbols=ETHUSD`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    });

    const orders = ordersRes.data;

    console.log(`\n📊 ETH/USD Trading History (${orders.length} orders):\n`);

    orders.slice(0, 20).forEach((o: any) => {
      const timestamp = new Date(o.created_at).toLocaleString('es-ES');
      const type = o.order_type?.toUpperCase() || 'UNKNOWN';
      const status = o.status?.toUpperCase() || '?';
      const side = o.side?.toUpperCase() || '?';
      const qty = parseFloat(o.qty).toFixed(6);
      const price = o.filled_avg_price || o.limit_price || '---';

      console.log(`[${timestamp}] ${type.padEnd(6)} | ${side.padEnd(4)} ${qty.padEnd(10)} @ ${String(price).padEnd(8)} | ${status}`);
    });

    // Check for active SL/TP orders
    console.log(`\n\n🚨 Active Protection Orders:`);
    const activeOrders = orders.filter((o: any) => o.status === 'pending' || o.status === 'accepted');

    if (activeOrders.length === 0) {
      console.log(`❌ NO active orders found for stop-loss or take-profit protection!`);
    } else {
      console.log(`Found ${activeOrders.length} active orders:`);
      activeOrders.forEach((o: any) => {
        console.log(`   • ${o.side.toUpperCase()} ${o.qty} @ ${o.limit_price || 'market'} (${o.order_type})`);
      });
    }

    // Get current position
    const posRes = await axios.get(`${baseUrl}/v2/positions/ETHUSD`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    });

    const pos = posRes.data;
    console.log(`\n\n💰 Current Position:`);
    console.log(`   Quantity: ${pos.qty}`);
    console.log(`   Entry Price: $${pos.avg_entry_price}`);
    console.log(`   Current Price: $${pos.current_price}`);
    console.log(`   P&L: $${parseFloat(pos.unrealized_pl).toFixed(2)} (${parseFloat(pos.unrealized_plpc).toFixed(2)}%)`);

    // Risk assessment
    console.log(`\n\n⚠️  Risk Assessment:`);
    if (activeOrders.length === 0) {
      console.log(`   🔴 CRITICAL: Position is UNPROTECTED`);
      console.log(`   • No stop-loss order active`);
      console.log(`   • Unrealized P&L: $${parseFloat(pos.unrealized_pl).toFixed(2)}`);
      console.log(`   • Recommendation: Set immediate SL before market opens`);
    } else {
      console.log(`   🟢 Protected with ${activeOrders.length} active order(s)`);
    }

  } catch (error: any) {
    console.error(`❌ Error:`, error.message);
    if (error.response?.data) {
      console.error(`   Details:`, error.response.data);
    }
  }
}

checkETHOrders();
