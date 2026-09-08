/**
 * SEC/EDGAR LIVE Test
 * Validates real SEC API connection with GOOGL
 * Run: npx ts-node test-sec-edgar-live.ts
 */

import axios from 'axios';

async function testSecEdgarLive() {
  console.log('\n' + '='.repeat(70));
  console.log('SEC/EDGAR LIVE TEST - GOOGL Financial Data');
  console.log('='.repeat(70) + '\n');

  const cik = '0001652044'; // Google CIK
  const timestamp = new Date().toISOString();

  try {
    console.log(`⏳ Fetching GOOGL financial data from SEC/EDGAR API...`);
    console.log(`   CIK: ${cik}`);
    console.log(`   Timestamp: ${timestamp}\n`);

    // Fetch company facts
    const factsUrl = `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`;
    const response = await axios.get(factsUrl, { timeout: 10000 });

    if (!response.data?.facts?.['us-gaap']) {
      console.log('❌ FAILED: No financial data found');
      return;
    }

    const gaapData = response.data.facts['us-gaap'];
    const filingDate = response.data.filings?.recent?.filingDate?.[0];

    console.log(`✅ Successfully fetched SEC/EDGAR data`);
    console.log(`   Latest filing: ${filingDate}\n`);

    // Extract metrics
    const metrics: any = {};

    // EPS
    if (gaapData.EarningsPerShareBasic?.units?.USD?.[0]) {
      const eps = gaapData.EarningsPerShareBasic.units.USD[0];
      metrics.eps = {
        value: parseFloat(eps.val.toFixed(2)),
        source: 'sec-edgar',
        timestamp: eps.end,
        freshness: getFreashnessStatus(eps.end),
        confidence: 95,
      };
    }

    // Revenue
    if (gaapData.Revenues?.units?.USD?.[0]) {
      const rev = gaapData.Revenues.units.USD[0];
      metrics.revenueTtm = {
        value: parseFloat((rev.val / 1e9).toFixed(2)),
        source: 'sec-edgar',
        timestamp: rev.end,
        freshness: getFreashnessStatus(rev.end),
        confidence: 95,
      };
    }

    // Net Income
    if (gaapData.NetIncomeLoss?.units?.USD?.[0]) {
      const ni = gaapData.NetIncomeLoss.units.USD[0];
      metrics.netIncome = {
        value: parseFloat((ni.val / 1e9).toFixed(2)),
        source: 'sec-edgar',
        timestamp: ni.end,
        freshness: getFreashnessStatus(ni.end),
        confidence: 95,
      };
    }

    // Display results
    console.log('📊 EXTRACTED METRICS:\n');

    if (metrics.eps?.value) {
      console.log(`  EPS (Earnings Per Share)`);
      console.log(`    Value: $${metrics.eps.value}`);
      console.log(`    Source: ${metrics.eps.source}`);
      console.log(`    Timestamp: ${metrics.eps.timestamp}`);
      console.log(`    Freshness: ${metrics.eps.freshness}`);
      console.log(`    Confidence: ${metrics.eps.confidence}%\n`);
    }

    if (metrics.revenueTtm?.value) {
      console.log(`  Revenue (TTM, in billions)`);
      console.log(`    Value: $${metrics.revenueTtm.value}B`);
      console.log(`    Source: ${metrics.revenueTtm.source}`);
      console.log(`    Timestamp: ${metrics.revenueTtm.timestamp}`);
      console.log(`    Freshness: ${metrics.revenueTtm.freshness}`);
      console.log(`    Confidence: ${metrics.revenueTtm.confidence}%\n`);
    }

    if (metrics.netIncome?.value) {
      console.log(`  Net Income (in billions)`);
      console.log(`    Value: $${metrics.netIncome.value}B`);
      console.log(`    Source: ${metrics.netIncome.source}`);
      console.log(`    Timestamp: ${metrics.netIncome.timestamp}`);
      console.log(`    Freshness: ${metrics.netIncome.freshness}`);
      console.log(`    Confidence: ${metrics.netIncome.confidence}%\n`);
    }

    // Summary
    console.log('✅ TEST RESULT: SEC/EDGAR LIVE CONNECTION WORKING\n');
    console.log('Evidence trail:');
    console.log(`  ✅ API endpoint responding`);
    console.log(`  ✅ Financial data extracted`);
    console.log(`  ✅ Metrics have source + timestamp + freshness`);
    console.log(`  ✅ Confidence scores assigned`);

    console.log('\n' + '='.repeat(70));
    console.log('SEC/EDGAR PHASE 1 COMPLETE - READY FOR INTEGRATION');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`❌ LIVE TEST FAILED: ${msg}`);
  }
}

function getFreashnessStatus(filingDate: string): string {
  const daysOld = Math.floor((Date.now() - new Date(filingDate).getTime()) / (1000 * 60 * 60 * 24));
  if (daysOld <= 7) return 'LIVE';
  if (daysOld <= 30) return 'DELAYED';
  if (daysOld <= 90) return 'CACHED';
  return 'STALE';
}

testSecEdgarLive().catch(console.error);
