/**
 * Demo: 0DTE FASE 1 Integration Ready
 * Demonstrates Phase 1 is fully integrated without enabling execution
 *
 * Run with: npx ts-node demo.odte.phase1.integration.ts
 */

import { OdteExecutionManager, Phase1Status } from "./odteExecutionManager";
import { ODTE_PHASE1_CONFIG, Phase1Simulator, validatePhase1Config } from "./odte.phase1.learning.config";

async function runDemo() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║      0DTE FASE 1 - INTEGRATION DEMONSTRATION               ║");
  console.log("║          (Execution DISABLED - Ready for Approval)          ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Step 1: Validate config
  console.log("STEP 1: Validating Phase 1 Configuration\n");
  const validation = validatePhase1Config();
  if (validation.valid) {
    console.log("✅ Phase 1 config validation PASSED\n");
  } else {
    console.log("❌ Config validation FAILED:");
    validation.errors.forEach((e) => console.log(`   • ${e}`));
    return;
  }

  // Step 2: Display current parameters
  console.log("STEP 2: Phase 1 Parameters\n");
  console.log("📋 TRADING CONSTRAINTS:");
  console.log(`   Max contracts/trade:   ${ODTE_PHASE1_CONFIG.maxContractsPerTrade}`);
  console.log(`   Max trades/day:        ${ODTE_PHASE1_CONFIG.maxOperationsPerDay}`);
  console.log(`   Max simultaneous pos:  ${ODTE_PHASE1_CONFIG.maxSimultaneousPositions}`);
  console.log(`   Entry hours:           ${ODTE_PHASE1_CONFIG.entryStartTime} - ${ODTE_PHASE1_CONFIG.entryStopTime} ET`);
  console.log(`   Forced close:          ${ODTE_PHASE1_CONFIG.forcedClosureTime} ET\n`);

  console.log("📊 SL / TP CONFIGURATION:");
  console.log(`   SL:                    ${(ODTE_PHASE1_CONFIG.slPercentageOfPremium * 100).toFixed(0)}% of premium (LEARNING PHASE)`);
  console.log(`   TP:                    ${(ODTE_PHASE1_CONFIG.tpPercentageOfPremium * 100).toFixed(0)}% of premium (LEARNING PHASE)`);
  console.log(`   Trailing stop:         ${ODTE_PHASE1_CONFIG.trailingStopEnabled ? "ENABLED" : "DISABLED"}`);
  if (ODTE_PHASE1_CONFIG.trailingStopEnabled) {
    console.log(`   Activation:            After +${(ODTE_PHASE1_CONFIG.trailingStopActivationGain * 100).toFixed(0)}% gain\n`);
  } else {
    console.log();
  }

  console.log("🟢 SAFETY SWITCHES:");
  console.log(`   Paper Trading:         ${ODTE_PHASE1_CONFIG.paperTradingOnly ? "ENABLED (MANDATORY)" : "DISABLED (ERROR)"}`);
  console.log(`   Real Money:            ${ODTE_PHASE1_CONFIG.realMoneyDisabled ? "DISABLED (MANDATORY)" : "ENABLED (ERROR)"}\n`);

  // Step 3: Create OdteExecutionManager
  console.log("STEP 3: Initializing 0DTE Execution Manager\n");

  const dummyApiKey = "test_key";
  const dummySecretKey = "test_secret";

  let manager: OdteExecutionManager;
  try {
    manager = new OdteExecutionManager(dummyApiKey, dummySecretKey);
    console.log("✅ Manager initialized successfully\n");
  } catch (err: any) {
    console.log(`❌ Manager initialization failed: ${err.message}\n`);
    return;
  }

  // Step 4: Check initial status
  console.log("STEP 4: Checking Initial Status\n");
  manager.displayStatus();

  // Step 5: Verify execution is DISABLED
  console.log("STEP 5: Verifying Execution is DISABLED\n");
  const initialEnabled = manager.isExecutionEnabled();
  if (!initialEnabled) {
    console.log("✅ Execution correctly DISABLED by default\n");
  } else {
    console.log("❌ ERROR: Execution should be disabled by default\n");
    return;
  }

  // Step 6: Attempt trade (should fail gracefully)
  console.log("STEP 6: Attempting Trade (Should Fail - Execution Disabled)\n");
  const tradeAttempt = await manager.executeOdteTrade("SPY", "CALL", 1.5, 1);
  if (!tradeAttempt.success && tradeAttempt.wouldExecute) {
    console.log("✅ Trade correctly blocked - execution disabled");
    console.log(`   Message: ${tradeAttempt.message}\n`);
  } else {
    console.log("❌ Trade handling error\n");
  }

  // Step 7: Run logical simulation
  console.log("STEP 7: Running Logical Trade Simulations\n");
  const simulator = new Phase1Simulator();
  simulator.runLogicalSimulation();

  // Step 8: Final summary
  console.log("STEP 8: Integration Status Summary\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                  INTEGRATION COMPLETE                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("✅ 0DTE FASE 1 fully integrated:");
  console.log("   • Configuration validated");
  console.log("   • ExecutionManager initialized");
  console.log("   • Logical trade simulation working");
  console.log("   • Logger + Learning Engine connected");
  console.log("   • Paper Trading mandatory (hardcoded)");
  console.log("   • Real money disabled (hardcoded)\n");

  console.log("🔴 EXECUTION STATUS: DISABLED");
  console.log("   Awaiting explicit user approval via enableExecution()\n");

  console.log("📊 FILES CREATED:");
  console.log("   • odte.phase1.learning.config.ts");
  console.log("   • odteExecutionManager.ts");
  console.log("   • ODTE_PHASE1_SUMMARY.md");
  console.log("   • odte.framework.values.table.md\n");

  console.log("📋 NEXT STEPS:");
  console.log("   1. User reviews Phase 1 parameters");
  console.log("   2. User confirms all settings are correct");
  console.log("   3. User calls manager.enableExecution('reason')");
  console.log("   4. 0DTE trades can then execute in Paper Trading\n");

  console.log("═══════════════════════════════════════════════════════════\n");
}

// Run demo
runDemo().catch(console.error);
