/**
 * Strategy Learning Engine - Central Meta-Learning Module
 *
 * Objective: Tito can learn NEW strategies, test them in paper,
 * evaluate them with clear metrics, and only approve if they meet
 * criteria. Strategies grow the library through disciplined testing.
 *
 * 4-Phase Process:
 * Phase 1: Investigate & Document strategy mechanics
 * Phase 2: Simulate in paper and record results consistently
 * Phase 3: Evaluate with clear metrics
 * Phase 4: Approve ONLY if criteria met, add to library
 *
 * Strategies to Consider:
 * - Trend following, Pullback, Breakout, Range, Wheel
 * - Credit spreads, Iron Condor, Straddle, Strangle
 * - Mean reversion, Momentum, Gap trading, etc.
 *
 * Plus: Compare strategies before trading, always option to skip,
 * update performance after each trade, refine continuously.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

interface StrategyProposal {
  name: string;
  description: string;
  category: 'TREND' | 'MEAN_REVERSION' | 'BREAKOUT' | 'RANGE' | 'OPTIONS' | 'OTHER';
  mechanics: string; // How it works
  advantages: string[];
  disadvantages: string[];
  risks: string[];
  entryRules: string[];
  exitRules: string[];
  examples: string[];
  proposedBy: string;
  dateProposed: Date;
}

interface StrategyTest {
  strategyId: string;
  strategyName: string;
  testStartDate: Date;
  testEndDate?: Date;
  phase: 1 | 2 | 3 | 4;
  status: 'PROPOSED' | 'DOCUMENTED' | 'TESTING' | 'EVALUATING' | 'APPROVED' | 'REJECTED';
  paperTrades: {
    entryTime: Date;
    symbol: string;
    type: string;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    reason: string;
  }[];
  metrics: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    avgRiskReward: number;
  };
  verdict: {
    approved: boolean;
    reason: string;
    criteria: {
      minWinRate: number;
      minProfitFactor: number;
      minShareRatio: number;
      maxDrawdown: number;
      minTrades: number;
    };
  };
  refinements: string[];
  nextSteps: string;
}

export class StrategyLearningEngine {
  private proposedStrategies: StrategyProposal[] = [];
  private testingSessions: StrategyTest[] = [];
  private approvedStrategies: StrategyProposal[] = [];
  private learningPath: string;

  constructor() {
    this.learningPath = path.join(__dirname, '../../logs/strategy-learning');
    this.ensureDirectory();
  }

  private ensureDirectory() {
    if (!fs.existsSync(this.learningPath)) {
      fs.mkdirSync(this.learningPath, { recursive: true });
    }
  }

  /**
   * Phase 1: Propose new strategy
   */
  async proposeStrategy(proposal: StrategyProposal): Promise<string> {
    const strategyId = `${proposal.name.replace(/\s+/g, '-')}-${Date.now()}`;

    this.proposedStrategies.push(proposal);

    console.log(`
╔════════════════════════════════════════════════════════════╗
║              STRATEGY LEARNING - PHASE 1                   ║
║              Investigate & Document                        ║
╠════════════════════════════════════════════════════════════╣

📚 New Strategy Proposed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${proposal.name}
Category: ${proposal.category}
Proposed By: ${proposal.proposedBy}
Date: ${proposal.dateProposed.toISOString()}

Description:
${proposal.description}

Mechanics:
${proposal.mechanics}

Entry Rules:
${proposal.entryRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Exit Rules:
${proposal.exitRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Advantages:
${proposal.advantages.map((a, i) => `✅ ${a}`).join('\n')}

Disadvantages:
${proposal.disadvantages.map((d, i) => `⚠️  ${d}`).join('\n')}

Risks:
${proposal.risks.map((r, i) => `🔴 ${r}`).join('\n')}

Examples:
${proposal.examples.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Status: PHASE 1 COMPLETE → Ready for Phase 2 (paper testing)

Strategy ID: ${strategyId}
╚════════════════════════════════════════════════════════════╝
    `);

    this.saveProposal(strategyId, proposal);
    return strategyId;
  }

  /**
   * Phase 2: Start paper testing
   */
  async startPaperTesting(strategyId: string): Promise<StrategyTest> {
    const proposal = this.proposedStrategies.find(s => s.name === strategyId.split('-').slice(0, -1).join('-'));

    if (!proposal) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    const testSession: StrategyTest = {
      strategyId,
      strategyName: proposal.name,
      testStartDate: new Date(),
      phase: 2,
      status: 'TESTING',
      paperTrades: [],
      metrics: {
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        avgRiskReward: 0,
      },
      verdict: {
        approved: false,
        reason: 'Still testing...',
        criteria: {
          minWinRate: 0.55, // 55% minimum
          minProfitFactor: 1.5,
          minShareRatio: 0.5,
          maxDrawdown: -0.15, // -15% max
          minTrades: 20, // Minimum trades to evaluate
        },
      },
      refinements: [],
      nextSteps: 'Continue paper trading',
    };

    this.testingSessions.push(testSession);

    console.log(`
╔════════════════════════════════════════════════════════════╗
║              STRATEGY LEARNING - PHASE 2                   ║
║              Simulate in Paper                             ║
╠════════════════════════════════════════════════════════════╣

🧪 Paper Testing Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Strategy: ${proposal.name}
Start Date: ${new Date().toISOString()}
Status: TESTING

Testing Rules:
  ✅ Record every trade consistently
  ✅ Log entry, exit, P&L, reason
  ✅ Minimum 20 trades before evaluation
  ✅ Test across different market conditions
  ✅ Document any refinements needed

Next: Phase 3 (Evaluate with metrics)
╚════════════════════════════════════════════════════════════╝
    `);

    return testSession;
  }

  /**
   * Log trade during paper testing
   */
  recordPaperTrade(strategyId: string, trade: StrategyTest['paperTrades'][0]): void {
    const testSession = this.testingSessions.find(t => t.strategyId === strategyId);

    if (!testSession) {
      throw new Error(`Test session ${strategyId} not found`);
    }

    testSession.paperTrades.push(trade);

    console.log(`
📊 Trade Recorded
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Strategy: ${testSession.strategyName}
Trade: ${testSession.paperTrades.length}
Symbol: ${trade.symbol}
Entry: $${trade.entryPrice.toFixed(2)}
Exit: $${trade.exitPrice.toFixed(2)}
P&L: $${trade.pnl.toFixed(2)}
Reason: ${trade.reason}
    `);
  }

  /**
   * Phase 3: Evaluate with metrics
   */
  async evaluateStrategy(strategyId: string): Promise<StrategyTest> {
    const testSession = this.testingSessions.find(t => t.strategyId === strategyId);

    if (!testSession) {
      throw new Error(`Test session ${strategyId} not found`);
    }

    if (testSession.paperTrades.length < 20) {
      throw new Error(`Minimum 20 trades required. Current: ${testSession.paperTrades.length}`);
    }

    // Calculate metrics
    const trades = testSession.paperTrades;
    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl < 0).length;
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);

    testSession.metrics = {
      totalTrades: trades.length,
      winRate: wins / trades.length,
      profitFactor: Math.abs(
        trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) /
          (trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + Math.abs(t.pnl), 0) || 1)
      ),
      sharpeRatio: this.calculateSharpeRatio(trades),
      maxDrawdown: this.calculateMaxDrawdown(trades),
      avgRiskReward: this.calculateAvgRiskReward(trades),
    };

    testSession.phase = 3;
    testSession.status = 'EVALUATING';

    console.log(`
╔════════════════════════════════════════════════════════════╗
║              STRATEGY LEARNING - PHASE 3                   ║
║              Evaluate with Metrics                         ║
╠════════════════════════════════════════════════════════════╣

📈 Performance Metrics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Strategy: ${testSession.strategyName}
Total Trades: ${testSession.metrics.totalTrades}
Win Rate: ${(testSession.metrics.winRate * 100).toFixed(1)}% (${wins}W/${losses}L)
Profit Factor: ${testSession.metrics.profitFactor.toFixed(2)}
Sharpe Ratio: ${testSession.metrics.sharpeRatio.toFixed(2)}
Max Drawdown: ${(testSession.metrics.maxDrawdown * 100).toFixed(1)}%
Avg Risk/Reward: ${testSession.metrics.avgRiskReward.toFixed(2)}:1

Criteria Thresholds:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Win Rate: ${(testSession.metrics.winRate * 100).toFixed(1)}% ${testSession.metrics.winRate >= testSession.verdict.criteria.minWinRate ? '✅' : '❌'} (minimum 55%)
Profit Factor: ${testSession.metrics.profitFactor.toFixed(2)} ${testSession.metrics.profitFactor >= testSession.verdict.criteria.minProfitFactor ? '✅' : '❌'} (minimum 1.5)
Sharpe Ratio: ${testSession.metrics.sharpeRatio.toFixed(2)} ${testSession.metrics.sharpeRatio >= testSession.verdict.criteria.minShareRatio ? '✅' : '❌'} (minimum 0.5)
Max Drawdown: ${(testSession.metrics.maxDrawdown * 100).toFixed(1)}% ${testSession.metrics.maxDrawdown >= testSession.verdict.criteria.maxDrawdown ? '✅' : '❌'} (max -15%)

Next: Phase 4 (Approve/Reject)
╚════════════════════════════════════════════════════════════╝
    `);

    return testSession;
  }

  /**
   * Phase 4: Approve or reject
   */
  async approveStrategy(strategyId: string): Promise<boolean> {
    const testSession = this.testingSessions.find(t => t.strategyId === strategyId);
    const proposal = this.proposedStrategies.find(s => s.name === strategyId.split('-').slice(0, -1).join('-'));

    if (!testSession || !proposal) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    // Check criteria
    const meetsWinRate = testSession.metrics.winRate >= testSession.verdict.criteria.minWinRate;
    const meetsProfitFactor = testSession.metrics.profitFactor >= testSession.verdict.criteria.minProfitFactor;
    const meetsSharpe = testSession.metrics.sharpeRatio >= testSession.verdict.criteria.minShareRatio;
    const meetsDrawdown = testSession.metrics.maxDrawdown >= testSession.verdict.criteria.maxDrawdown;
    const meetsTradeCount = testSession.metrics.totalTrades >= testSession.verdict.criteria.minTrades;

    const approved = meetsWinRate && meetsProfitFactor && meetsSharpe && meetsDrawdown && meetsTradeCount;

    testSession.phase = 4;
    testSession.status = approved ? 'APPROVED' : 'REJECTED';
    testSession.verdict.approved = approved;

    if (approved) {
      this.approvedStrategies.push(proposal);
      testSession.verdict.reason = '✅ All criteria met. Strategy approved for library.';
      testSession.nextSteps = 'Strategy added to library. Tito will now consider it.';
    } else {
      const failures: string[] = [];
      if (!meetsWinRate) failures.push('Win rate < 55%');
      if (!meetsProfitFactor) failures.push('Profit factor < 1.5');
      if (!meetsSharpe) failures.push('Sharpe ratio < 0.5');
      if (!meetsDrawdown) failures.push('Max drawdown > -15%');
      if (!meetsTradeCount) failures.push('Insufficient trades');

      testSession.verdict.reason = `❌ Failed criteria: ${failures.join(', ')}`;
      testSession.nextSteps = 'Refine strategy and retry, or abandon.';
    }

    console.log(`
╔════════════════════════════════════════════════════════════╗
║              STRATEGY LEARNING - PHASE 4                   ║
║              Approve or Reject                             ║
╠════════════════════════════════════════════════════════════╣

🎯 Verdict: ${approved ? '✅ APPROVED' : '❌ REJECTED'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Strategy: ${proposal.name}

Reason: ${testSession.verdict.reason}

Next Steps: ${testSession.nextSteps}

${approved ? `
The strategy "${proposal.name}" is now part of Tito's library.
Tito will consider it when selecting the best strategy for market conditions.
` : `
Consider refinements or abandon this strategy.
Document learnings for future attempts.
`}

╚════════════════════════════════════════════════════════════╝
    `);

    this.saveTestSession(strategyId, testSession);
    return approved;
  }

  /**
   * Get all approved strategies
   */
  getApprovedStrategies(): StrategyProposal[] {
    return this.approvedStrategies;
  }

  /**
   * Update strategy performance after live trade
   */
  updateStrategyPerformance(strategyName: string, trade: any): void {
    // Track how each strategy performs in real trading
    // Use this to continuously refine
    console.log(`📊 Updating performance for strategy: ${strategyName}`);
  }

  private calculateSharpeRatio(trades: any[]): number {
    if (trades.length === 0) return 0;
    const returns = trades.map(t => t.pnl);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    return stdDev !== 0 ? mean / stdDev : 0;
  }

  private calculateMaxDrawdown(trades: any[]): number {
    let balance = 0;
    let peak = 0;
    let maxDrawdown = 0;

    for (const trade of trades) {
      balance += trade.pnl;
      if (balance > peak) peak = balance;
      const drawdown = (balance - peak) / peak;
      if (drawdown < maxDrawdown) maxDrawdown = drawdown;
    }

    return maxDrawdown;
  }

  private calculateAvgRiskReward(trades: any[]): number {
    if (trades.length === 0) return 0;
    const ratios = trades.map(t => Math.abs((t.exitPrice - t.entryPrice) / (t.entryPrice - t.entryPrice * 0.02)));
    return ratios.reduce((a, b) => a + b, 0) / ratios.length;
  }

  private saveProposal(strategyId: string, proposal: StrategyProposal): void {
    const file = path.join(this.learningPath, `${strategyId}-proposal.json`);
    fs.writeFileSync(file, JSON.stringify(proposal, null, 2));
  }

  private saveTestSession(strategyId: string, session: StrategyTest): void {
    const file = path.join(this.learningPath, `${strategyId}-test.json`);
    fs.writeFileSync(file, JSON.stringify(session, null, 2));
  }
}

export async function createLearningEngine(): Promise<StrategyLearningEngine> {
  return new StrategyLearningEngine();
}
