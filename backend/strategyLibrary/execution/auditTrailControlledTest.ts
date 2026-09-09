/**
 * CONTROLLED TEST: Decision Audit Trail End-to-End
 * Demonstrates: Record decision → Update with outcome → Query from bitácora
 * NO REAL TRADES. Dry-run only.
 */

import { createConnection } from 'typeorm';
import { DecisionAuditService } from '../../src/modules/api/services/decision-audit.service';
import { AuditTrailIntegration, AuditContext } from './auditTrailIntegration';
import { DecisionAuditTrail } from '../../src/modules/database/entities';

async function runControlledTest() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║    CONTROLLED TEST: Audit Trail Decision Recording        ║');
  console.log('║                (Dry-run, no real trades)                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Connect to PostgreSQL
  console.log('🔗 Connecting to PostgreSQL...');
  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'enterprisedb',
    password: process.env.DB_PASSWORD || 'Joa$03111974',
    database: process.env.DB_NAME || 'tito_metralleta',
    entities: [DecisionAuditTrail],
    synchronize: true,
  });

  console.log('✅ Connected to PostgreSQL\n');

  try {
    const auditRepository = connection.getRepository(DecisionAuditTrail);
    const auditService = new DecisionAuditService(auditRepository);
    const integration = new AuditTrailIntegration(auditService);

    // ============================================================
    // STEP 1: Record ENTER decision
    // ============================================================
    console.log('📝 STEP 1: Recording ENTER decision...\n');

    const context: AuditContext = {
      timestamp: new Date(),
      symbol: 'SPY',
      strategy: 'mean-reversion',
      marketData: {
        price: 578.45,
        vix: 19.42,
        volume: 82000000,
      },
      dataAvailability: {
        price: 'REAL',
        vix: 'REAL',
        volume: 'REAL',
      },
    };

    const decisionId = await integration.recordEnterDecision(
      context,
      78, // confidence
      82, // mliScore
      {
        spyTrend: { score: 85, verdict: 'BULLISH', weight: 25 },
        qqqTrend: { score: 79, verdict: 'BULLISH', weight: 20 },
        leadership: { score: 75, verdict: 'NEUTRAL', weight: 15 },
        volatility: { score: 65, verdict: 'NORMAL', weight: 20 },
        volume: { score: 88, verdict: 'STRONG', weight: 15 },
        flow: { score: 72, verdict: 'BULLISH', weight: 10 },
      },
      578.45, // entry
      582.00, // target
      575.50, // stop
    );

    console.log(`✅ Decision recorded with ID: ${decisionId}\n`);

    // ============================================================
    // STEP 2: Retrieve from database
    // ============================================================
    console.log('📋 STEP 2: Retrieving decision from database...\n');

    const recorded = await auditRepository.findOne({ where: { id: decisionId } });

    if (!recorded) {
      throw new Error(`Decision not found in database: ${decisionId}`);
    }

    console.log('✅ Retrieved from database:');
    console.log(`   ID: ${recorded.id}`);
    console.log(`   Symbol: ${recorded.symbol}`);
    console.log(`   Strategy: ${recorded.strategy}`);
    console.log(`   Decision: ${recorded.decision}`);
    console.log(`   Confidence: ${recorded.confidence}%`);
    console.log(`   MLI Score: ${recorded.mliScore}/100`);
    console.log(`   Entry: $${recorded.proposedEntry}`);
    console.log(`   Target: $${recorded.proposedTarget}`);
    console.log(`   Stop: $${recorded.proposedStop}`);
    console.log(`   Status: ${recorded.executionStatus}\n`);

    // ============================================================
    // STEP 3: Simulate trade execution
    // ============================================================
    console.log('⚙️  STEP 3: Simulating trade execution...\n');

    await integration.recordExecutionSuccess(decisionId, {
      status: 'TRADE_PLACED',
      orderId: 'SIM_ORDER_20260905_001',
      reason: 'Simulated execution',
      position: {
        symbol: 'SPY',
        quantity: 100,
        entryPrice: 578.45,
        stopLoss: 575.50,
        takeProfit: 582.00,
        placedAt: new Date(),
      },
      supervisorDecision: {} as any,
    });

    console.log(`✅ Trade execution recorded (simulated, not real)\n`);

    // ============================================================
    // STEP 4: Simulate exit (profit scenario)
    // ============================================================
    console.log('📊 STEP 4: Simulating exit and P&L recording...\n');

    const exitContext: AuditContext = {
      timestamp: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours later
      symbol: 'SPY',
      strategy: 'mean-reversion',
      marketData: {
        price: 580.65,
      },
      dataAvailability: {
        price: 'REAL',
      },
    };

    const exitDecisionId = await integration.recordExitDecision(
      exitContext,
      'TP hit (target reached at $582.00)',
      245.50, // P&L
      2.5, // % P&L
    );

    console.log(`✅ Exit recorded with P&L: $245.50 (+2.5%)\n`);

    // ============================================================
    // STEP 5: Update original decision with outcome
    // ============================================================
    console.log('🎓 STEP 5: Recording lessons learned...\n');

    await integration.recordTradeOutcome(
      decisionId,
      'PROFITABLE',
      245.50,
      2.5,
      {
        correct_components: ['spyTrend', 'volume'],
        incorrect_components: [],
        mli_prediction_accuracy: 'CORRECT',
        recommendation: 'Entry setup was clean, exit at TP was correct',
        next_action: 'Confidence in mean-reversion setup is validated',
      },
    );

    console.log('✅ Lessons recorded\n');

    // ============================================================
    // STEP 6: Query bitácora (audit trail)
    // ============================================================
    console.log('📚 STEP 6: Querying bitácora from Tito...\n');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const decisions = await auditService.getDecisionsByDateRange(today, tomorrow);

    console.log(`✅ Found ${decisions.length} decisions in bitácora today:\n`);

    decisions.forEach((d, idx) => {
      const timestamp = d.timestamp ? d.timestamp.toISOString() : 'UNKNOWN';
      console.log(`${idx + 1}. ${d.symbol} @ ${timestamp}`);
      console.log(`   Decision: ${d.decision}`);
      console.log(`   Confidence: ${d.confidence}%`);
      if (d.mliScore) {
        console.log(`   MLI Score: ${d.mliScore}/100`);
      }
      if (d.executionStatus) {
        console.log(`   Execution: ${d.executionStatus}`);
      }
      if (d.outcome) {
        console.log(`   Outcome: ${d.outcome} (P&L: $${d.profitLoss})`);
      }
      console.log();
    });

    // ============================================================
    // STEP 7: Get statistics
    // ============================================================
    console.log('📊 STEP 7: Audit Trail Statistics\n');

    const stats = await auditService.getDecisionStats(today, tomorrow);

    console.log('✅ Statistics:');
    console.log(`   Total Decisions: ${stats.totalDecisions}`);
    console.log(`   By Type:`);
    Object.entries(stats.byDecision).forEach(([type, count]) => {
      console.log(`      ${type}: ${count}`);
    });
    console.log(`   Executed: ${stats.executedCount}`);
    console.log(`   Profitable: ${stats.profitableCount}`);
    console.log(`   Losses: ${stats.lossCount}`);
    console.log(`   Average Confidence: ${stats.averageConfidence.toFixed(1)}%`);
    console.log(`   Average P&L: $${stats.averagePnL.toFixed(2)}`);
    console.log(`   Average P&L %: ${stats.averagePnLPercent.toFixed(2)}%\n`);

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                   TEST SUMMARY                            ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║ ✅ Decision recorded to database                          ║');
    console.log('║ ✅ Retrieved from bitácora                                ║');
    console.log('║ ✅ Execution tracked                                      ║');
    console.log('║ ✅ Exit recorded with P&L                                 ║');
    console.log('║ ✅ Lessons captured                                       ║');
    console.log('║ ✅ Statistics calculated                                  ║');
    console.log('║                                                            ║');
    console.log('║ RESULT: Audit Trail working correctly ✅                 ║');
    console.log('║ NO REAL TRADES WERE PLACED (DRY-RUN)                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } finally {
    await connection.close();
  }
}

// Run the test
runControlledTest().catch((error) => {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
