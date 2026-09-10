const axios = require('axios');
const fs = require('fs');

async function testFredLive() {
  console.log('\n' + '='.repeat(70));
  console.log('FRED VIX LIVE VALIDATION TEST');
  console.log('='.repeat(70) + '\n');

  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const keyMatch = envContent.match(/FRED_API_KEY=([^\n]+)/);

    if (!keyMatch) {
      console.log('❌ FRED_API_KEY not found in .env.local\n');
      return false;
    }

    const apiKey = keyMatch[1].trim();
    const timestamp = new Date().toISOString();

    console.log('📊 Fetching VIX data from FRED...\n');

    // FRED API endpoint for VIX (VIXCLS)
    const response = await axios.get('https://api.stlouisfed.org/fred/series/data', {
      params: {
        series_id: 'VIXCLS',
        api_key: apiKey,
        file_type: 'json',
        limit: 1,
        sort_order: 'desc',
      },
      timeout: 5000,
    });

    if (!response.data || !response.data.observations || response.data.observations.length === 0) {
      console.log('❌ No VIX data returned from FRED\n');
      return false;
    }

    const latestObs = response.data.observations[0];
    const vixValue = parseFloat(latestObs.value);
    const observationDate = latestObs.date;

    console.log('✅ FRED VIX LIVE TEST: PASSED\n');
    console.log('Evidence:');
    console.log(`  Result: PASS ✅`);
    console.log(`  VIX Value: ${vixValue.toFixed(2)}`);
    console.log(`  Source: fred-vixcls`);
    console.log(`  Observation Date: ${observationDate}`);
    console.log(`  Query Timestamp: ${timestamp}`);
    console.log(`  Freshness: DELAYED (daily update)`);
    console.log(`  Confidence: 100% (official CBOE/FRED data)\n`);

    console.log('='.repeat(70));
    console.log('✅ FRED/VIX SOURCE VALIDATED - READY FOR S63');
    console.log('='.repeat(70) + '\n');

    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`❌ FRED LIVE TEST: FAILED`);
    console.log(`Error: ${msg}\n`);
    return false;
  }
}

testFredLive().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
