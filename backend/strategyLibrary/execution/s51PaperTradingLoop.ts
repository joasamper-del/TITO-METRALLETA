/**
 * S51 Paper Trading Loop
 * Fully automated, runs during market hours
 * Tito operates autonomously, logs everything
 */

import { StrategySelector, SelectionResult } from "../decision/strategySelector";
import { ConfirmationEngine, ConfirmationResult } from "../confirmation/confirmationEngine";
import { ExecutionEngine, ExecutionDecision } from "./executionEngine";
import { DecisionHistoryLogger } from "../confirmation/decisionHistory";
import { PostTradeReportGenerator } from "./postTradeReportGenerator";
import { SimulationMode } from "./simulationMode";
import { CircuitBreaker } from "./circuitBreaker";

export interface PaperTradingLoopConfig {
  symbols: string[]; // ["SPY", "QQQ", "BTC"]
  checkIntervalMinutes: number; // 5 min default
  maxPositions: number; // 3 max
  paperBalance: number; // $100k starting
  logDir: string; // where to save reports
  isSimulation: boolean; // true = SimulationMode
}

export interface LoopStats {
  tradesExecuted: number;
  tradesRejected: number;
  totalPnL: number;
  startTime: Date;
  lastCheck: Date;
}

export class S51PaperTradingLoop {
  private config: PaperTradingLoopConfig;
  private selector: StrategySelector;
  private confirmationEngine: ConfirmationEngine;
  private executionEngine: ExecutionEngine;
  private logger: DecisionHistoryLogger;
  private simulator: SimulationMode;
  private circuitBreaker: CircuitBreaker;
  private stats: LoopStats;
  private isRunning: boolean = false;
  private checkInterval?: NodeJS.Timer;

  constructor(config: PaperTradingLoopConfig) {
    this.config = config;
    this.selector = new StrategySelector();
    this.confirmationEngine = new ConfirmationEngine();
    this.executionEngine = new ExecutionEngine(
      process.env.APCA_API_KEY_ID || "paper-key",
      process.env.APCA_API_SECRET_KEY || "paper-secret"
    );
    this.logger = new DecisionHistoryLogger("S51");
    this.simulator = new SimulationMode({ startingBalance: config.paperBalance });
    this.circuitBreaker = new CircuitBreaker({
      dailyLossLimit: -2,
      weeklyLossLimit: -5,
      maxConsecutiveLosses: 4,
    });

    this.stats = {
      tradesExecuted: 0,
      tradesRejected: 0,
      totalPnL: 0,
      startTime: new Date(),
      lastCheck: new Date(),
    };
  }

  /**
   * Start the paper trading loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("Loop already running");
      return;
    }

    this.isRunning = true;
    console.log(`🟢 S51 Paper Trading Loop started at ${new Date().toISOString()}`);
    console.log(`   Symbols: ${this.config.symbols.join(", ")}`);
    console.log(`   Check interval: ${this.config.checkIntervalMinutes} min`);
    console.log(`   Starting balance: $${this.config.paperBalance}`);

    // Run initial check immediately
    await this.checkAndTrade();

    // Then set interval for subsequent checks
    this.checkInterval = setInterval(
      () => this.checkAndTrade(),
      this.config.checkIntervalMinutes * 60 * 1000
    );
  }

  /**
   * Stop the loop
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    console.log(`🔴 S51 Paper Trading Loop stopped at ${new Date().toISOString()}`);
    await this.generateDailyReport();
  }

  /**
   * Main trading logic: check each symbol and trade if qualified
   */
  private async checkAndTrade(): Promise<void> {
    const now = new Date();
    this.stats.lastCheck = now;

    console.log(`\n[${now.toISOString()}] Checking market...`);

    for (const symbol of this.config.symbols) {
      try {
        // Step 1: Get market data
        const marketData = await this.getMarketData(symbol);
        if (!marketData) continue;

        // Step 2: Strategy selection
        const selection = await this.selector.selectStrategy(symbol, marketData);

        if (selection.status !== "OPERATE") {
          console.log(`  ${symbol}: ${selection.status} (${selection.reason})`);
          continue;
        }

        // Step 3: Confirmation engine
        const confirmation = await this.confirmationEngine.evaluate({
          symbol,
          marketData,
          selectedStrategy: selection.selectedStrategy,
        });

        if (!confirmation.isConfirmed) {
          console.log(`  ${symbol}: Confirmation failed (${confirmation.confidence.finalScore}/${confirmation.threshold})`);
          continue;
        }

        // Step 4: Circuit breaker check
        const cbStatus = this.circuitBreaker.getStatus();
        if (cbStatus.isTripped) {
          console.log(`  ⚠️  Circuit breaker tripped: ${cbStatus.reason}`);
          continue;
        }

        // Step 5: Execute via simulation
        const execution = await this.executeSimulated(symbol, selection, confirmation, marketData);

        if (execution.status === "TRADE_PLACED") {
          this.stats.tradesExecuted++;
          console.log(`  ✅ ${symbol}: Order placed (${selection.selectedStrategy})`);

          // Generate mini report
          await this.generateTradeReport(execution, selection, confirmation);
        } else {
          this.stats.tradesRejected++;
          console.log(`  ❌ ${symbol}: Order rejected (${execution.reason})`);
        }
      } catch (error) {
        console.error(`  ❌ Error processing ${symbol}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Check for exit signals
    await this.checkAndExitPositions();
  }

  /**
   * Get current market data for symbol
   */
  private async getMarketData(symbol: string): Promise<any> {
    // TODO: Integrate with real data sources (Alpaca, Massive, etc.)
    // For now: mock data
    return {
      symbol,
      price: Math.random() * 500 + 100,
      volume: Math.random() * 100000000 + 50000000,
      vix: Math.random() * 30 + 10,
      timestamp: new Date(),
    };
  }

  /**
   * Execute trade via SimulationMode
   */
  private async executeSimulated(
    symbol: string,
    selection: SelectionResult,
    confirmation: ConfirmationResult,
    marketData: any
  ): Promise<ExecutionDecision> {
    // Use simulator for paper trading
    const simResult = await this.simulator.placeOrder({
      symbol,
      quantity: Math.floor(Math.random() * 100) + 10, // 10-110 shares
      entryPrice: marketData.price,
      stopLoss: marketData.price * 0.98,
      takeProfit: marketData.price * 1.02,
      timestamp: new Date(),
    });

    if (!simResult.success) {
      return {
        status: "TRADE_REJECTED",
        reason: simResult.reason || "Pre-flight failed",
        supervisorDecision: {
          allPassed: false,
          gateResults: [],
          failureCount: 0,
          recommendation: "REJECT",
          failureReasons: simResult.preFlightResult.blockedReasons,
        },
      };
    }

    return {
      status: "TRADE_PLACED",
      orderId: simResult.order?.orderId,
      reason: "Simulated order placed",
      position: {
        symbol,
        quantity: simResult.order?.quantity || 0,
        entryPrice: simResult.order?.entryPrice || 0,
        stopLoss: simResult.order?.stopLoss || 0,
        takeProfit: simResult.order?.takeProfit || 0,
        placedAt: new Date(),
      },
      supervisorDecision: {
        allPassed: true,
        gateResults: [],
        failureCount: 0,
        recommendation: "APPROVE",
        failureReasons: [],
      },
    };
  }

  /**
   * Check if any positions should exit
   */
  private async checkAndExitPositions(): Promise<void> {
    const openPositions = this.simulator.getOpenPositions();

    for (const position of openPositions) {
      // Simple exit logic: exit after 1 hour or if target hit
      const ageMinutes = (Date.now() - position.entryTime.getTime()) / 60000;

      if (ageMinutes > 60) {
        // Exit after 1 hour
        this.simulator.updateMarketPrice(
          position.symbol,
          position.entryPrice * (Math.random() * 0.02 - 0.01), // +/- 1% random
          new Date()
        );
      }
    }
  }

  /**
   * Generate trade report and log
   */
  private async generateTradeReport(
    execution: ExecutionDecision,
    selection: SelectionResult,
    confirmation: ConfirmationResult
  ): Promise<void> {
    const report = PostTradeReportGenerator.generateReport({
      symbol: selection.selectedSymbol,
      strategy: selection.selectedStrategy,
      regime: confirmation.context.regime,
      vix: confirmation.context.vix,
      confidenceScore: confirmation.confidence.finalScore,
      confidenceThreshold: confirmation.threshold,
      entryPrice: execution.position?.entryPrice || 0,
      exitPrice: execution.position?.entryPrice || 0, // Will update on exit
      pnlDollars: 0,
      pnlPercent: 0,
      reasoning: selection.reasons,
      timestamp: new Date(),
    } as any);

    console.log(`\n${PostTradeReportGenerator.formatAsText(report)}`);
  }

  /**
   * Generate daily summary report
   */
  private async generateDailyReport(): Promise<void> {
    const accountStatus = this.simulator.getAccountStatus();
    const report = this.simulator.generateReport();

    const lines: string[] = [
      `═══════════════════════════════════════════════════════════`,
      `S51 DAILY SUMMARY - ${new Date().toISOString()}`,
      `═══════════════════════════════════════════════════════════`,
      ``,
      `Stats:`,
      `  Trades Executed: ${this.stats.tradesExecuted}`,
      `  Trades Rejected: ${this.stats.tradesRejected}`,
      `  Daily P&L: $${accountStatus.dailyPnL.toFixed(2)}`,
      `  Total P&L: $${(accountStatus.balance - this.config.paperBalance).toFixed(2)}`,
      `  Open Positions: ${accountStatus.openPositions}`,
      ``,
      `Details:`,
      ...report.split("\n"),
      ``,
      `═══════════════════════════════════════════════════════════`,
    ];

    console.log(lines.join("\n"));
  }

  /**
   * Get current loop status
   */
  getStatus(): {
    isRunning: boolean;
    stats: LoopStats;
    accountStatus: any;
  } {
    return {
      isRunning: this.isRunning,
      stats: this.stats,
      accountStatus: this.simulator.getAccountStatus(),
    };
  }

  /**
   * Get performance analytics
   */
  getPerformance(): any {
    const trades = this.simulator.getTradeHistory();
    const wins = trades.filter((t) => (t.pnlDollars || 0) > 0).length;
    const losses = trades.filter((t) => (t.pnlDollars || 0) < 0).length;
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnlDollars || 0), 0);

    return {
      totalTrades: trades.length,
      wins,
      losses,
      winRate: (wins / (wins + losses)) * 100 || 0,
      totalPnL,
      avgPnLPerTrade: totalPnL / trades.length || 0,
    };
  }
}

/**
 * Launch S51 paper trading
 */
export async function launchS51PaperTrading(): Promise<S51PaperTradingLoop> {
  const loop = new S51PaperTradingLoop({
    symbols: ["SPY", "QQQ", "BTC"],
    checkIntervalMinutes: 5,
    maxPositions: 3,
    paperBalance: 100000,
    logDir: "./logs/s51",
    isSimulation: true,
  });

  await loop.start();
  return loop;
}
