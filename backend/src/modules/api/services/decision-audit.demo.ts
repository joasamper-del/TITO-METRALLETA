/**
 * Decision Audit Trail Demo
 * Demonstrates recording and querying decision audit trail
 */

import { DecisionAuditService } from './decision-audit.service';
import { DecisionAuditInput, DecisionAuditUpdate } from './decision-audit.service';

/**
 * DEMO: Record a decision (ENTER signal)
 */
export async function demoRecordEnterDecision(service: DecisionAuditService) {
  console.log('\n📝 DEMO: Recording ENTER decision...\n');

  const decision: DecisionAuditInput = {
    timestamp: new Date('2026-09-05T10:30:00Z'),
    symbol: 'SPY',
    strategy: 'mean-reversion',
    decision: 'ENTER',
    confidence: 78,
    riskLevel: 'MEDIUM',
    mliScore: 82,
    mliBreakdown: {
      spyTrend: { score: 85, verdict: 'BULLISH', weight: 25 },
      qqqTrend: { score: 79, verdict: 'BULLISH', weight: 20 },
      leadership: { score: 75, verdict: 'NEUTRAL', weight: 15 },
      volatility: { score: 65, verdict: 'NORMAL', weight: 20 },
      volume: { score: 88, verdict: 'STRONG', weight: 15 },
      flow: { score: 72, verdict: 'BULLISH', weight: 10 },
    },
    marketData: {
      spyPrice: 578.45,
      spyMA50: 572.10,
      spyMA200: 565.30,
      qqqPrice: 315.22,
      vix: 19.42,
      volume: 82000000,
    },
    dataAvailability: {
      spyPrice: 'REAL',
      qqqPrice: 'REAL',
      vix: 'REAL',
      volume: 'REAL',
      flow: 'MOCK',
    },
    filtersApplied: {
      strategySelector: 'MEAN_REVERSION',
      riskGate: 'PASSED',
      earningsEvent: 'NONE',
      volatilityGate: 'PASSED',
    },
    proposedEntry: 578.45,
    proposedTarget: 582.00,
    proposedStop: 575.50,
    notes: 'Strong bullish setup, VIX normal, good risk/reward',
  };

  const recorded = await service.recordDecision(decision);
  console.log('✅ Decision recorded:');
  console.log(`   ID: ${recorded.id}`);
  console.log(`   Symbol: ${recorded.symbol}`);
  console.log(`   Decision: ${recorded.decision}`);
  console.log(`   MLI Score: ${recorded.mliScore}/100`);
  console.log(`   Confidence: ${recorded.confidence}%`);
  console.log(`   Status: PENDING\n`);

  return recorded;
}

/**
 * DEMO: Record a decision (ESPERAR signal - blocked)
 */
export async function demoRecordWaitDecision(service: DecisionAuditService) {
  console.log('\n📝 DEMO: Recording ESPERAR decision (blocked)...\n');

  const decision: DecisionAuditInput = {
    timestamp: new Date('2026-09-05T14:15:00Z'),
    symbol: 'QQQ',
    strategy: 'breakout',
    decision: 'ESPERAR',
    confidence: 61,
    riskLevel: 'HIGH',
    mliScore: 58,
    mliBreakdown: {
      spyTrend: { score: 72, verdict: 'BULLISH', weight: 25 },
      qqqTrend: { score: 68, verdict: 'NEUTRAL', weight: 20 },
      leadership: { score: 42, verdict: 'BEARISH', weight: 15 },
      volatility: { score: 28, verdict: 'ELEVATED', weight: 20 },
      volume: { score: 55, verdict: 'WEAK', weight: 15 },
      flow: { score: 38, verdict: 'BEARISH', weight: 10 },
    },
    marketData: {
      qqqPrice: 314.88,
      qqqMA50: 316.50,
      vix: 21.85,
      volume: 65000000,
    },
    dataAvailability: {
      qqqPrice: 'REAL',
      vix: 'REAL',
      volume: 'REAL',
      flow: 'MOCK',
    },
    blockedReason: 'VIX elevated (21.85) + QQQ lagging SPY = wait for clearer setup',
    notes: 'Risk/reward unfavorable, patience better',
  };

  const recorded = await service.recordDecision(decision);
  console.log('✅ Decision recorded (blocked):');
  console.log(`   ID: ${recorded.id}`);
  console.log(`   Symbol: ${recorded.symbol}`);
  console.log(`   Decision: ${recorded.decision}`);
  console.log(`   Block Reason: ${recorded.blockedReason}`);
  console.log(`   MLI Score: ${recorded.mliScore}/100\n`);

  return recorded;
}

/**
 * DEMO: Update decision outcome after execution
 */
export async function demoUpdateDecisionOutcome(
  service: DecisionAuditService,
  decisionId: string,
) {
  console.log('\n📊 DEMO: Updating decision with trade outcome...\n');

  const update: DecisionAuditUpdate = {
    executionStatus: 'EXECUTED',
    executionId: 'trade_20260905_001',
    outcome: 'PROFITABLE',
    profitLoss: 245.50,
    profitLossPercent: 2.5,
    lessons: {
      correct_components: ['spyTrend', 'volume'],
      incorrect_components: [],
      recommendation: 'MLI was right, entry was clean',
      nextAction: 'Monitor for exit signals',
    },
  };

  const updated = await service.updateDecisionOutcome(decisionId, update);
  console.log('✅ Decision updated with outcome:');
  console.log(`   Execution: ${updated.executionStatus}`);
  console.log(`   Outcome: ${updated.outcome}`);
  console.log(`   P&L: $${updated.profitLoss} (${updated.profitLossPercent}%)`);
  console.log(`   Lessons: ${JSON.stringify(updated.lessons, null, 2)}\n`);

  return updated;
}

/**
 * DEMO: Query decision statistics for a date range
 */
export async function demoGetDecisionStats(
  service: DecisionAuditService,
  startDate: Date,
  endDate: Date,
) {
  console.log(
    `\n📊 DEMO: Getting decision statistics for ${startDate.toISOString().split('T')[0]}...\n`,
  );

  const stats = await service.getDecisionStats(startDate, endDate);

  console.log('📈 Decision Statistics:');
  console.log(`   Total Decisions: ${stats.totalDecisions}`);
  console.log(`   By Decision Type:`);
  Object.entries(stats.byDecision).forEach(([type, count]) => {
    console.log(`      ${type}: ${count}`);
  });
  console.log(`   Executed: ${stats.executedCount}`);
  console.log(`   Profitable: ${stats.profitableCount}`);
  console.log(`   Losses: ${stats.lossCount}`);
  console.log(`   Average Confidence: ${stats.averageConfidence.toFixed(1)}%`);
  console.log(`   Average P&L: $${stats.averagePnL.toFixed(2)}`);
  console.log(`   Average P&L %: ${stats.averagePnLPercent.toFixed(2)}%\n`);

  return stats;
}

/**
 * DEMO: Get all decisions for a symbol
 */
export async function demoGetDecisionsBySymbol(
  service: DecisionAuditService,
  symbol: string,
) {
  console.log(`\n📋 DEMO: Getting all decisions for ${symbol}...\n`);

  const decisions = await service.getDecisionsBySymbol(symbol);

  console.log(`✅ Found ${decisions.length} decisions for ${symbol}:`);
  decisions.slice(0, 5).forEach((d, idx) => {
    console.log(`\n   ${idx + 1}. ${d.symbol} @ ${d.timestamp.toISOString()}`);
    console.log(`      Decision: ${d.decision}`);
    console.log(`      Confidence: ${d.confidence}%`);
    console.log(`      Status: ${d.executionStatus}`);
    if (d.outcome) {
      console.log(`      Outcome: ${d.outcome}`);
    }
  });
  console.log();

  return decisions;
}

/**
 * DEMO: Get MLI accuracy
 */
export async function demoGetMliAccuracy(
  service: DecisionAuditService,
  startDate: Date,
  endDate: Date,
) {
  console.log(
    `\n🎯 DEMO: Calculating MLI accuracy for ${startDate.toISOString().split('T')[0]}...\n`,
  );

  const accuracy = await service.getMliAccuracy(startDate, endDate);

  console.log('📊 MLI Performance:');
  console.log(`   Accuracy: ${accuracy.toFixed(1)}%`);
  if (accuracy >= 65) {
    console.log(`   Status: ✅ READY FOR VETO POWER`);
  } else if (accuracy >= 50) {
    console.log(`   Status: 🟡 ADVISOR MODE (keep monitoring)`);
  } else {
    console.log(`   Status: ❌ NEEDS TUNING (do not use for blocking)`);
  }
  console.log();

  return accuracy;
}

/**
 * Full integration test
 */
export async function runFullAuditTrailDemo(
  service: DecisionAuditService,
) {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   DECISION AUDIT TRAIL - FULL DEMO         ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Record an ENTER decision
  const enterDecision = await demoRecordEnterDecision(service);

  // Record a WAIT decision
  const waitDecision = await demoRecordWaitDecision(service);

  // Update first decision with outcome
  await demoUpdateDecisionOutcome(service, enterDecision.id);

  // Get statistics
  const friday = new Date('2026-09-05T00:00:00Z');
  const fridayEnd = new Date('2026-09-05T23:59:59Z');
  await demoGetDecisionStats(service, friday, fridayEnd);

  // Get decisions by symbol
  await demoGetDecisionsBySymbol(service, 'SPY');

  // Get MLI accuracy
  await demoGetMliAccuracy(service, friday, fridayEnd);

  console.log('✅ FULL DEMO COMPLETED\n');
}

export default {
  demoRecordEnterDecision,
  demoRecordWaitDecision,
  demoUpdateDecisionOutcome,
  demoGetDecisionStats,
  demoGetDecisionsBySymbol,
  demoGetMliAccuracy,
  runFullAuditTrailDemo,
};
