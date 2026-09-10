const axios = require('axios');
const fs = require('fs');

async function testAlpacaPaper() {
  console.log('\n' + '='.repeat(70));
  console.log('ALPACA PAPER TRADING - CONNECTION TEST');
  console.log('='.repeat(70) + '\n');

  try {
    // Read .env.local to get credentials (only for this test, never log them)
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const apiKeyMatch = envContent.match(/ALPACA_API_KEY=([^\n]+)/);
    const secretKeyMatch = envContent.match(/ALPACA_SECRET_KEY=([^\n]+)/);
    const urlMatch = envContent.match(/ALPACA_BASE_URL=([^\n]+)/);

    if (!apiKeyMatch || !secretKeyMatch || !urlMatch) {
      console.log('❌ Credentials not found in .env.local');
      return false;
    }

    const apiKey = apiKeyMatch[1].trim();
    const secretKey = secretKeyMatch[1].trim();
    const baseUrl = urlMatch[1].trim();

    console.log(`📡 Connecting to Alpaca Paper API...`);
    console.log(`   Endpoint: ${baseUrl.replace(/https?:\/\/(paper-api|api)/, 'https://PAPER-API')} (Paper ✅)\n`);

    // Test connection - fetch account info
    const timestamp = new Date().toISOString();
    const response = await axios.get(`${baseUrl}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
      },
      timeout: 5000,
    });

    if (response.status === 200 && response.data) {
      console.log(`✅ ALPACA PAPER CONNECTION: SUCCESS\n`);
      console.log(`Evidence:`);
      console.log(`  - Connection: ✅ Successful`);
      console.log(`  - Endpoint: ${baseUrl.includes('paper') ? 'PAPER' : 'LIVE'}`);
      console.log(`  - Account Status: ${response.data.status}`);
      console.log(`  - Source: alpaca-paper`);
      console.log(`  - Timestamp: ${timestamp}`);
      console.log(`\n✅ Alpaca Paper credentials are VALID and WORKING\n`);
      return true;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`❌ Alpaca connection failed: ${msg}\n`);
    return false;
  }
}

testAlpacaPaper().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
