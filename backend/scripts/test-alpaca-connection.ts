/**
 * Quick Alpaca Connection Test
 * Verifies Paper Trading account access
 */

import * as dotenv from 'dotenv';
import axios from 'axios';
import * as path from 'path';

// Load env from root .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function testAlpacaConnection() {
  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_SECRET_KEY;
  const baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';

  console.log(`
╔════════════════════════════════════════════════════════════╗
║              ALPACA PAPER TRADING CONNECTION TEST          ║
╚════════════════════════════════════════════════════════════╝
  `);

  if (!apiKey || !apiSecret) {
    console.error('❌ CRITICAL: Missing ALPACA_API_KEY or ALPACA_SECRET_KEY in .env.local');
    console.error('   Please add credentials before proceeding.');
    process.exit(1);
  }

  console.log(`📡 Testing connection to: ${baseUrl}`);
  console.log(`🔑 API Key: ${apiKey.slice(0, 5)}...${apiKey.slice(-5)}`);

  try {
    // Test 1: Get Account Info
    console.log('\n[1] Testing Account Access...');
    const accountResponse = await axios.get(`${baseUrl}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
      timeout: 5000,
    });

    const account = accountResponse.data;
    console.log(`✅ Account Access: SUCCESS`);
    console.log(`   Status: ${account.account_number ? 'Active' : 'Inactive'}`);
    console.log(`   Balance: $${parseFloat(account.buying_power).toFixed(2)}`);
    console.log(`   Cash: $${parseFloat(account.cash).toFixed(2)}`);
    console.log(`   Portfolio Value: $${parseFloat(account.portfolio_value).toFixed(2)}`);

    // Test 2: Get Clock (Market Status)
    console.log('\n[2] Testing Market Clock...');
    const clockResponse = await axios.get(`${baseUrl}/v2/clock`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
      timeout: 5000,
    });

    const clock = clockResponse.data;
    console.log(`✅ Market Status: SUCCESS`);
    console.log(`   Market Open: ${clock.is_open ? '🟢 OPEN' : '🔴 CLOSED'}`);
    console.log(`   Current Time: ${new Date(clock.timestamp).toISOString()}`);
    console.log(`   Next Open: ${new Date(clock.next_open).toISOString()}`);

    // Test 3: Get Recent Positions
    console.log('\n[3] Checking Current Positions...');
    const positionsResponse = await axios.get(`${baseUrl}/v2/positions`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
      timeout: 5000,
    });

    const positions = positionsResponse.data;
    if (positions.length === 0) {
      console.log(`✅ Positions: No open positions (portfolio clean)`);
    } else {
      console.log(`✅ Positions: ${positions.length} open`);
      positions.forEach((pos: any) => {
        console.log(`   • ${pos.symbol}: ${pos.qty} shares @ $${pos.avg_entry_price}`);
      });
    }

    // Test 4: Get Recent Orders
    console.log('\n[4] Checking Recent Orders...');
    const ordersResponse = await axios.get(`${baseUrl}/v2/orders?status=all&limit=5`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
      timeout: 5000,
    });

    const orders = ordersResponse.data;
    if (orders.length === 0) {
      console.log(`✅ Orders: No recent orders`);
    } else {
      console.log(`✅ Orders: ${orders.length} recent`);
      orders.slice(0, 3).forEach((order: any) => {
        console.log(`   • ${order.symbol} ${order.side} ${order.qty}x @ ${order.created_at}`);
      });
    }

    console.log(`
╔════════════════════════════════════════════════════════════╗
║                   ✅ ALL TESTS PASSED                     ║
║          Alpaca Paper Trading is READY TO OPERATE          ║
╚════════════════════════════════════════════════════════════╝
    `);

  } catch (error: any) {
    console.error(`
❌ CONNECTION FAILED
   Error: ${error.message}
   Status: ${error.response?.status}
   Response: ${error.response?.data?.message || 'No details'}
    `);
    process.exit(1);
  }
}

testAlpacaConnection();
