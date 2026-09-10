const axios = require('axios');
const fs = require('fs');

async function validateAllSources() {
  console.log('\n' + '='.repeat(70));
  console.log('MULTI-SOURCE LIVE VALIDATION');
  console.log('='.repeat(70) + '\n');

  const timestamp = new Date().toISOString();
  const results = {};

  // 1. FRED/VIX
  console.log('1️⃣  FRED/VIX VALIDATION...\n');
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const keyMatch = envContent.match(/FRED_API_KEY=([^\n]+)/);

    if (!keyMatch) {
      results.fred = { status: 'FAIL', reason: 'No API key configured', timestamp };
      console.log('   Result: FAIL ❌ (No FRED_API_KEY in .env.local)\n');
    } else {
      const apiKey = keyMatch[1].trim();
      const response = await axios.get('https://api.stlouisfed.org/fred/series/data', {
        params: { series_id: 'VIXCLS', api_key: apiKey, file_type: 'json', limit: 1, sort_order: 'desc' },
        timeout: 5000,
      });

      if (response.data?.observations?.[0]) {
        const vixValue = parseFloat(response.data.observations[0].value).toFixed(2);
        results.fred = { status: 'PASS', value: vixValue, source: 'fred-vixcls', timestamp };
        console.log(`   Result: PASS ✅`);
        console.log(`   VIX Value: ${vixValue}`);
        console.log(`   Source: fred-vixcls`);
        console.log(`   Timestamp: ${timestamp}\n`);
      } else {
        results.fred = { status: 'FAIL', reason: 'No data from FRED', timestamp };
        console.log('   Result: FAIL ❌ (No VIX data)\n');
      }
    }
  } catch (error) {
    results.fred = { status: 'FAIL', reason: error.message, timestamp };
    console.log(`   Result: FAIL ❌ (${error.message})\n`);
  }

  // 2. TradingView
  console.log('2️⃣  TRADINGVIEW VALIDATION...\n');
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const tvMatch = envContent.match(/TRADINGVIEW.*KEY|TRADINGVIEW.*TOKEN/i);

    if (!tvMatch) {
      results.tradingview = { status: 'FAIL', reason: 'No credentials found', timestamp };
      console.log('   Result: FAIL ❌ (No TradingView credentials in .env.local)\n');
    } else {
      // TradingView doesn't have public free API, would need session-based access
      results.tradingview = { status: 'FAIL', reason: 'TradingView API requires premium access', timestamp };
      console.log('   Result: FAIL ❌ (TradingView API restricted)\n');
    }
  } catch (error) {
    results.tradingview = { status: 'FAIL', reason: error.message, timestamp };
    console.log(`   Result: FAIL ❌ (${error.message})\n`);
  }

  // 3. MarketSnacks
  console.log('3️⃣  MARKETSNACKS VALIDATION...\n');
  try {
    const response = await axios.get('https://www.marketsnacks.com', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 5000,
    });

    if (response.status === 200) {
      results.marketsnacks = { 
        status: 'PARTIAL',
        note: 'Website responding, session management required',
        timestamp 
      };
      console.log('   Result: PARTIAL ⚠️');
      console.log('   Website Status: Responding');
      console.log('   Note: Session management needed for data extraction');
      console.log(`   Timestamp: ${timestamp}\n`);
    } else {
      results.marketsnacks = { status: 'FAIL', reason: 'No response', timestamp };
      console.log('   Result: FAIL ❌\n');
    }
  } catch (error) {
    results.marketsnacks = { status: 'FAIL', reason: error.message, timestamp };
    console.log(`   Result: FAIL ❌ (Website not responding)\n`);
  }

  // Summary
  console.log('='.repeat(70));
  console.log('SUMMARY\n');
  console.log(`FRED/VIX:       ${results.fred.status}`);
  console.log(`TradingView:    ${results.tradingview.status}`);
  console.log(`MarketSnacks:   ${results.marketsnacks.status}`);
  console.log('\n' + '='.repeat(70) + '\n');

  return results;
}

validateAllSources().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
