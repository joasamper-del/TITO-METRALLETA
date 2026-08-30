/**
 * Execution Engine
 * Orchestrates: Strategy Selector → Confirmation Engine → Alpaca Trading
 * All safety checks before ANY order placement
 */

import { SelectionResult } from "../decision/strategySelector";
import { ConfirmationResult } from "../confirmation/types";
import { DecisionHistoryLogger } from "../confirmation/decisionHistory";
import { SupervisorGate, SupervisorDecision, AccountData, MarketData } from "./supervisorGate";
import { AlpacaAdapter, AlpacaOrder, AlpacaPosition } from "./alpacaAdapter";

export interface ExecutionContext {
  selectionResult: SelectionResult;
  confirmationResult: ConfirmationResult;
  marketData: MarketData;
  accountData: AccountData;
}

export interface ExecutionDecision {
  status: "TRADE_PLACED" | "TRADE_REJECTED" | "DO_NOT_OPERATE";
  orderId?: string;
  reason: string;
  position?: {
    symbol: string;
    quantity: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    placedAt: Date;
  };
  supervisorDecision: SupervisorDecision;
}

export class ExecutionEngine {
  private supervisor: SupervisorGate;
  private alpaca: AlpacaAdapter;
  private logger: DecisionHistoryLogger;
  private openPositions: Map<string, AlpacaPosition> = new Map();

  constructor(alpacaApiKey: string, alpacaSecretKey: string, sessionId?: string) {
    this.supervisor = new SupervisorGate();
    this.alpaca = new AlpacaAdapter(alpacaApiKey, alpacaSecretKey);
    this.logger = new DecisionHistoryLogger(sessionId);
  }

  /**
   * Main execution flow: Selector → Confirmation → Supervisor → Alpaca
   */
  async execute(context: ExecutionContext): Promise<ExecutionDecision> {
    // Step 1: Validate selector signal
    if (context.selectionResult.status !== "OPERATE") {
      const decision: ExecutionDecision = {
        status: "DO_NOT_OPERATE",
        reason: "Selector said DO_NOT_OPERATE",
        supervisorDecision: {
          allPassed: false,
          gateResults: [],
          failureCount: 0,
          recommendation: "REJECT",
          failureReasons: ["Strategy Selector blocked"],
        },
      };

      this.logger.logDecision({
        symbol: context.marketData.symbol,
        regime: context.confirmationResult.context.regime,
        vix: context.marketData.vix,
        price: context.marketData.price,
        outcome: "DO_NOT_OPERATE",
        primaryReason: "NO_STRATEGY",
        reasoning: ["Strategy Selector: " + (context.selectionResult.reason || "blocked")],
        riskGatesPassed: false,
        confidenceScore: context.confirmationResult.confidence.finalScore,
        confidenceThreshold: 65,
        sourceBreakdown: context.confirmationResult.confidence.votes.map((v) => ({
          sourceId: v.sourceId,
          sourceName: v.sourceName,
          verdict: v.verdict,
          vote: v.vote,
          dataQuality: v.dataQuality,
          dataQualityScore: v.dataQualityScore,
          weight: v.weight,
          adjustedWeight: v.weight * (v.dataQualityScore / 100),
          reasoning: v.reasoning,
          dataPoints: v.dataPoints,
        })),
      });

      return decision;
    }

    // Step 2: Validate confirmation signal
    if (!context.confirmationResult.isConfirmed) {
      const decision: ExecutionDecision = {
        status: "DO_NOT_OPERATE",
        reason: `Confidence ${context.confirmationResult.confidence.finalScore} below threshold ${context.confirmationResult.threshold}`,
        supervisorDecision: {
          allPassed: false,
          gateResults: [],
          failureCount: 0,
          recommendation: "REJECT",
          failureReasons: ["Confirmation score too low"],
        },
      };

      this.logger.logDecision({
        symbol: context.marketData.symbol,
        regime: context.confirmationResult.context.regime,
        vix: context.marketData.vix,
        price: context.marketData.price,
        selectedStrategy: context.selectionResult.selectedStrategy,
        outcome: "DO_NOT_OPERATE",
        primaryReason: "CONFIDENCE_LOW",
        reasoning: [
          `Strategy: ${context.selectionResult.selectedStrategy}`,
          `Confidence: ${context.confirmationResult.confidence.finalScore}/100 (need ${context.confirmationResult.threshold})`,
        ],
        riskGatesPassed: true,
        confidenceScore: context.confirmationResult.confidence.finalScore,
        confidenceThreshold: context.confirmationResult.threshold,
        sourceBreakdown: context.confirmationResult.confidence.votes.map((v) => ({
          sourceId: v.sourceId,
          sourceName: v.sourceName,
          verdict: v.verdict,
          vote: v.vote,
          dataQuality: v.dataQuality,
          dataQualityScore: v.dataQualityScore,
          weight: v.weight,
          adjustedWeight: v.weight * (v.dataQualityScore / 100),
          reasoning: v.reasoning,
          dataPoints: v.dataPoints,
        })),
      });

      return decision;
    }

    // Step 3: Run Supervisor Gates
    const supervisorDecision = this.supervisor.validate(
      context.accountData,
      context.marketData,
      Array.from(this.openPositions.values())
    );

    if (!supervisorDecision.allPassed) {
      const decision: ExecutionDecision = {
        status: "DO_NOT_OPERATE",
        reason: `Supervisor rejected: ${supervisorDecision.failureReasons.join("; ")}`,
        supervisorDecision,
      };

      this.logger.logDecision({
        symbol: context.marketData.symbol,
        regime: context.confirmationResult.context.regime,
        vix: context.marketData.vix,
        price: context.marketData.price,
        selectedStrategy: context.selectionResult.selectedStrategy,
        outcome: "DO_NOT_OPERATE",
        primaryReason: "MACRO_VETO",
        reasoning: [
          `Strategy: ${context.selectionResult.selectedStrategy}`,
          `Supervisor failures: ${supervisorDecision.failureReasons.join("; ")}`,
        ],
        riskGatesPassed: true,
        confidenceScore: context.confirmationResult.confidence.finalScore,
        confidenceThreshold: context.confirmationResult.threshold,
        sourceBreakdown: context.confirmationResult.confidence.votes.map((v) => ({
          sourceId: v.sourceId,
          sourceName: v.sourceName,
          verdict: v.verdict,
          vote: v.vote,
          dataQuality: v.dataQuality,
          dataQualityScore: v.dataQualityScore,
          weight: v.weight,
          adjustedWeight: v.weight * (v.dataQualityScore / 100),
          reasoning: v.reasoning,
          dataPoints: v.dataPoints,
        })),
      });

      return decision;
    }

    // Step 4: Calculate position size
    const positionSize = this.calculatePositionSize(context);

    // Step 5: Place order on Alpaca
    const order = await this.alpaca.placeOCOOrder({
      symbol: context.marketData.symbol,
      quantity: positionSize,
      side: "buy",
      entryPrice: context.marketData.price,
      stopLoss: this.calculateStopLoss(context),
      takeProfit: this.calculateTakeProfit(context),
      clientOrderId: `tito_${Date.now()}`,
    });

    if (order.status === "rejected") {
      const decision: ExecutionDecision = {
        status: "TRADE_REJECTED",
        reason: order.error || "Alpaca rejected order",
        supervisorDecision,
      };

      this.logger.logDecision({
        symbol: context.marketData.symbol,
        regime: context.confirmationResult.context.regime,
        vix: context.marketData.vix,
        price: context.marketData.price,
        selectedStrategy: context.selectionResult.selectedStrategy,
        outcome: "DO_NOT_OPERATE",
        primaryReason: "USER_OVERRIDE",
        reasoning: [`Order rejected by Alpaca: ${order.error}`],
        riskGatesPassed: true,
        confidenceScore: context.confirmationResult.confidence.finalScore,
        confidenceThreshold: context.confirmationResult.threshold,
        sourceBreakdown: context.confirmationResult.confidence.votes.map((v) => ({
          sourceId: v.sourceId,
          sourceName: v.sourceName,
          verdict: v.verdict,
          vote: v.vote,
          dataQuality: v.dataQuality,
          dataQualityScore: v.dataQualityScore,
          weight: v.weight,
          adjustedWeight: v.weight * (v.dataQualityScore / 100),
          reasoning: v.reasoning,
          dataPoints: v.dataPoints,
        })),
      });

      return decision;
    }

    // Step 6: Log execution
    const decision: ExecutionDecision = {
      status: "TRADE_PLACED",
      orderId: order.id,
      reason: "All gates passed, order placed",
      position: {
        symbol: context.marketData.symbol,
        quantity: positionSize,
        entryPrice: context.marketData.price,
        stopLoss: this.calculateStopLoss(context),
        takeProfit: this.calculateTakeProfit(context),
        placedAt: new Date(),
      },
      supervisorDecision,
    };

    this.logger.logDecision({
      symbol: context.marketData.symbol,
      regime: context.confirmationResult.context.regime,
      vix: context.marketData.vix,
      price: context.marketData.price,
      selectedStrategy: context.selectionResult.selectedStrategy,
      strategyBlocked: false,
      riskGatesPassed: true,
      confidenceScore: context.confirmationResult.confidence.finalScore,
      confidenceThreshold: context.confirmationResult.threshold,
      confidenceMet: context.confirmationResult.isConfirmed,
      sourceBreakdown: context.confirmationResult.confidence.votes.map((v) => ({
        sourceId: v.sourceId,
        sourceName: v.sourceName,
        verdict: v.verdict,
        vote: v.vote,
        dataQuality: v.dataQuality,
        dataQualityScore: v.dataQualityScore,
        weight: v.weight,
        adjustedWeight: v.weight * (v.dataQualityScore / 100),
        reasoning: v.reasoning,
        dataPoints: v.dataPoints,
      })),
      consensusPercentage:
        (context.confirmationResult.confidence.votes.filter((v) => v.verdict === "CONFIRM").length /
          context.confirmationResult.confidence.votes.length) *
        100,
      strongestSignal:
        context.confirmationResult.confidence.votes.sort((a, b) => b.vote - a.vote)[0]?.sourceName || "N/A",
      weakestSignal:
        context.confirmationResult.confidence.votes.sort((a, b) => a.vote - b.vote)[0]?.sourceName || "N/A",
      outcome: "OPERATE",
      primaryReason: "ALL_GATES_PASSED",
      reasoning: [
        `Strategy: ${context.selectionResult.selectedStrategy}`,
        `Confidence: ${context.confirmationResult.confidence.finalScore}/100 (meets ${context.confirmationResult.threshold})`,
        `All 5 supervisor gates passed`,
        `Position: ${positionSize} shares @ ${context.marketData.price.toFixed(2)}`,
      ],
      executedTrade: {
        orderId: order.id,
        positionSize,
        entryPrice: context.marketData.price,
        stopLoss: this.calculateStopLoss(context),
        takeProfit: this.calculateTakeProfit(context),
        executedAt: new Date(),
      },
    });

    // Track open position
    this.openPositions.set(context.marketData.symbol, {
      symbol: context.marketData.symbol,
      quantity: positionSize,
      entryPrice: context.marketData.price,
      currentPrice: context.marketData.price,
      unrealizedPnL: 0,
      unrealizedPnLPct: 0,
    });

    return decision;
  }

  /**
   * Calculate position size (2% max risk per trade)
   */
  private calculatePositionSize(context: ExecutionContext): number {
    const maxRiskPerTrade = context.accountData.totalBalance * 0.02; // 2% max risk
    const stopLoss = this.calculateStopLoss(context);
    const riskPerShare = Math.abs(context.marketData.price - stopLoss);

    if (riskPerShare <= 0) return 0;

    let positionSize = Math.floor(maxRiskPerTrade / riskPerShare);

    // Cap at 5% of account value
    const maxAccountSize = Math.floor((context.accountData.totalBalance * 0.05) / context.marketData.price);
    positionSize = Math.min(positionSize, maxAccountSize);

    // Min 10 shares
    return Math.max(10, positionSize);
  }

  /**
   * Calculate stop loss
   */
  private calculateStopLoss(context: ExecutionContext): number {
    // Simple: 1% below entry (can be enhanced with ATR)
    return context.marketData.price * 0.99;
  }

  /**
   * Calculate take profit
   */
  private calculateTakeProfit(context: ExecutionContext): number {
    // Simple: 2% above entry (1:2 risk/reward)
    return context.marketData.price * 1.02;
  }

  /**
   * Get logger for decision history
   */
  getLogger(): DecisionHistoryLogger {
    return this.logger;
  }

  /**
   * Get Alpaca adapter for monitoring
   */
  getAlpaca(): AlpacaAdapter {
    return this.alpaca;
  }
}
