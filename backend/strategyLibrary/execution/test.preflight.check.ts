/**
 * Test: 0DTE Pre-Flight Check
 * Demonstrates PASS and FAIL scenarios
 */

import { OdtePreflight } from "./odte.preflight.check";

async function testPreflight() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║        TEST: 0DTE PRE-FLIGHT CHECK                         ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const preflight = new OdtePreflight();

  // ============================================================
  // SCENARIO 1: ALL PASS
  // ============================================================

  console.log("SCENARIO 1: ALL SYSTEMS GO\n");

  const allPassState = {
    alpacaConnected: true,
    paperTradeMode: true,
    realMoneyDisabled: true,
    optionsMarketOpen: true,
    optionDataAvailable: true,
    spyDataValid: true,
    qqqDataValid: true,
    iwmDataValid: true,
    bidAskDataAvailable: true,
    volumeDataAvailable: true,
    openInterestAvailable: true,
    loggerWriting: true,
    learningEngineActive: true,
    existingPositionsReconciled: true,
    odtePositionCount: 0,
    odtePositionLimit: 1,
    dailyTradeCount: 1,
    dailyTradeLimit: 3,
    dailyMaxLossLimit: 5000,
    currentDailyLoss: -500,
    slConfigured: true,
    tpConfigured: true,
    trailingConfigured: true,
    currentHourET: 10,
    currentMinuteET: 30,
    entryWindowStart: 9,
    entryWindowEnd: 15,
    forcedCloseTime: 15,
    connectionLossProtocol: true,
  };

  const resultPass = await preflight.runFullCheck(allPassState);

  console.log(`\n\nFinal Status: ${resultPass.status}`);
  console.log(`Passed: ${resultPass.passed}\n\n`);

  // ============================================================
  // SCENARIO 2: CRITICAL FAILURES
  // ============================================================

  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("SCENARIO 2: CRITICAL FAILURES\n");

  const failState = {
    alpacaConnected: false, // ← FAIL
    paperTradeMode: true,
    realMoneyDisabled: false, // ← CRITICAL FAIL
    optionsMarketOpen: false, // ← FAIL (market closed)
    optionDataAvailable: false, // ← FAIL
    spyDataValid: true,
    qqqDataValid: false, // ← FAIL
    iwmDataValid: true,
    bidAskDataAvailable: true,
    volumeDataAvailable: true,
    openInterestAvailable: true,
    loggerWriting: true,
    learningEngineActive: true,
    existingPositionsReconciled: true,
    odtePositionCount: 1,
    odtePositionLimit: 1, // ← At limit
    dailyTradeCount: 3,
    dailyTradeLimit: 3, // ← At limit
    dailyMaxLossLimit: 5000,
    currentDailyLoss: -5500, // ← Over limit!
    slConfigured: true,
    tpConfigured: false, // ← FAIL
    trailingConfigured: true,
    currentHourET: 16,
    currentMinuteET: 15, // ← Outside entry window!
    entryWindowStart: 9,
    entryWindowEnd: 15,
    forcedCloseTime: 15,
    connectionLossProtocol: true,
  };

  const resultFail = await preflight.runFullCheck(failState);

  console.log(`\n\nFinal Status: ${resultFail.status}`);
  console.log(`Passed: ${resultFail.passed}`);
  console.log(`Blocker count: ${resultFail.blockerReasons.length}\n`);
}

testPreflight().catch(console.error);
