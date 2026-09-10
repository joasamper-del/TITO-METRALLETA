const axios = require('axios');
const fs = require('fs');

async function testFredVix() {
  console.log('\n' + '='.repeat(70));
  console.log('FRED VIX LIVE VALIDATION');
  console.log('='.repeat(70) + '\n');

  try {
    // Read backend/.env.local
    const envPath = 'backend/.env.local';
    const envContent = fs.readFileSync(envPath, 'utf8');
    const keyMatch = envContent.match(/FRED_API_KEY=([^\n]+)/);

    if (!keyMatch) {
      console.log('Result: FAIL');
      console.log('Error: FRED_API_KEY not found in backend/.env.local\n');
      return false;
    }

    const apiKey = keyMatch[1].trim();
    const timestamp = new Date().toISOString();

    // Fetch VIX from FRED
    const response = await axios.get('https://api.stlouisfed.org/fred/series/data', {
      params: {
        series_id: 'VIXCLS',
        api_key: apiKey,
        file_type: 'json',
        limit: 1,
        sort_order: 'desc',
      },
      timeout: 10000,
    });

    if (!response.data?.observations?.[0]) {
      console.log('Result: FAIL');
      console.log('Error: No VIX data returned from FRED\n');
      return false;
    }

    const vix = parseFloat(response.data.observations[0].value).toFixed(2);
    const obsDate = response.data.observations[0].date;

    console.log('Result: PASS ✅');
    console.log(`VIX Value: ${vix}`);
    console.log(`Source: fred-vixcls`);
    console.log(`Observation Date: ${obsDate}`);
    console.log(`Query Timestamp: ${timestamp}`);
    console.log(`Freshness: DELAYED (daily update)\n`);

    return true;
  } catch (error) {
    const msg = error.response?.data?.error_message || error.message;
    console.log('Result: FAIL');
    console.log(`Error: ${msg}\n`);
    return false;
  }
}

testFredVix().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.log('Result: FAIL');
  console.log(`Fatal Error: ${err.message}\n`);
  process.exit(1);
});
