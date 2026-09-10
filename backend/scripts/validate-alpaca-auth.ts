#!/usr/bin/env node

/**
 * Minimal Alpaca PAPER Authentication Test
 *
 * Read-only verification. Does NOT send orders.
 * Reports: credential validity vs endpoint/config issues.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const apiKey = process.env.ALPACA_API_KEY;
const secretKey = process.env.ALPACA_SECRET_KEY;
const baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';

console.log('🔐 Alpaca PAPER Authentication Test (Read-Only)\n');
console.log('Testing: GET /v2/account');
console.log(`Endpoint: ${baseUrl}`);
console.log(`API Key: [REDACTED]\n`);

async function testAuth() {
  try {
    if (!apiKey || !secretKey) {
      console.error('❌ ALPACA_API_KEY or ALPACA_SECRET_KEY not configured');
      process.exit(1);
    }

    const client = axios.create({
      baseURL: baseUrl,
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
      },
      timeout: 5000,
    });

    console.log('📡 Attempting to read account info...\n');
    const response = await client.get('/v2/account');

    const account = response.data;
    console.log('✅ AUTHENTICATION SUCCESSFUL\n');
    console.log('Account Details:');
    console.log(`  Account Number: ${account.account_number || account.id || 'N/A'}`);

    // Detect account type from multiple possible fields
    const accountType = account.account_type || account.type || 'paper';
    const isPaper = String(accountType).toLowerCase().includes('paper') || accountType === true;

    console.log(`  Account Type: ${isPaper ? 'PAPER ✅' : 'LIVE ❌'}`);
    console.log(`  Portfolio Value: $${parseFloat(account.portfolio_value || 0).toFixed(2)}`);
    console.log(`  Buying Power: $${parseFloat(account.buying_power || 0).toFixed(2)}\n`);

    if (!isPaper) {
      console.error('❌ CRITICAL: Account is not in PAPER mode!');
      process.exit(1);
    }

    console.log('🟢 Status: PAPER credentials are VALID');
    console.log('🟢 Endpoint: REACHABLE and responding');
    console.log('\n✅ Ready to run: npm run stress-test:paper\n');
  } catch (err: any) {
    const statusCode = err.response?.status;
    const errorData = err.response?.data;

    console.error(`❌ AUTHENTICATION FAILED\n`);
    console.error(`Status Code: ${statusCode || 'N/A'}`);
    console.error(`Error: ${err.message}\n`);

    // Diagnose the issue
    if (statusCode === 401) {
      console.error('🔴 DIAGNOSIS: Credentials Rejected');
      console.error('   - API Key is invalid or revoked');
      console.error('   - Secret Key may not match');
      console.error('   - Action: Regenerate keys at https://app.alpaca.markets/paper\n');
    } else if (statusCode === 404) {
      console.error('🔴 DIAGNOSIS: Endpoint Not Found');
      console.error(`   - Base URL may be incorrect: ${baseUrl}`);
      console.error('   - Expected: https://paper-api.alpaca.markets\n');
    } else if (statusCode >= 500) {
      console.error('🔴 DIAGNOSIS: Server Error');
      console.error('   - Alpaca service may be temporarily unavailable');
      console.error('   - Try again in a few moments\n');
    } else if (!statusCode) {
      console.error('🔴 DIAGNOSIS: Connection Failed');
      console.error('   - Network issue or endpoint not reachable');
      console.error('   - Check ALPACA_BASE_URL configuration\n');
    }

    if (errorData) {
      console.error('Server Response:');
      console.error(JSON.stringify(errorData, null, 2));
    }

    process.exit(1);
  }
}

testAuth();
