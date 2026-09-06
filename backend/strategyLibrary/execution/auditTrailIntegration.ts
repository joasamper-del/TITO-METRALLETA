/**
 * Audit Trail Integration Service
 * Bridge between Tito's execution pipeline and DecisionAuditTrail
 * Captures decisions at key points: Selection, Risk Gate, MLI, Execution, Exit
 */

import { DecisionAuditService, DecisionAuditInput, DecisionAuditUpdate } from '../../src/modules/api/services/decision-audit.service';
import { SelectionResult } from '../decision/strategySelector';
import { RiskGateResult } from '../decision/riskGate';
import { ExecutionDecision } from './executionEngine';

export interface AuditContext {
  timestamp: Date;
  symbol: string;
  strategy: string;
  marketData: {
    price: number;
    vix?: number;
    volume?: number;
    [key: string]: any;
  };
  dataAvailability: Record<string, 'REAL' | 'MOCK' | 'MISSING'>;
}

export class AuditTrailIntegration {
  constructor(private auditService: DecisionAuditService) {}

  /**
   * Record decision from StrategySelector (OPERATE or DO_NOT_OPERATE)
   */
  async recordSelectionDecision(
    context: AuditContext,
    selectionResult: SelectionResult,
    riskGateResult?: RiskGateResult,
  ): Promise<string> {
    const decision: DecisionAuditInput = {
      timestamp: context.timestamp,
      symbol: context.symbol,
      strategy: context.strategy,
      decision: selectionResult.status === 'OPERATE' ? 'ESPERAR' : 'NO_ENTRAR', // Not final yet
      confidence: selectionResult.confidence,
      riskLevel: this.calculateRiskLevel(selectionResult.confidence),
      riskGatesApplied: riskGateResult,
      marketData: context.marketData,
      dataAvailability: context.dataAvailability,
      filtersApplied: {
        strategySelector: 'EVALUATED',
        compatibilityScore: selectionResult.compatibilityScore,
      },
      notes: selectionResult.explanation,
    };

    if (!riskGateResult?.allPassed) {
      decision.blockedReason = `Strategy Selector: Risk gate failed - ${riskGateResult?.reasons?.join('; ')}`;
    }

    const record = await this.auditService.recordDecision(decision);
    return record.id;
  }

  /**
   * Record MLI evaluation (adds MLI score and breakdown)
   */
  async recordMliEvaluation(
    auditId: string,
    mliScore: number,
    mliBreakdown: Record<string, any>,
    mliAction: string, // ENTER, ESPERAR, EVITAR
  ): Promise<void> {
    // Note: This would require a method to add MLI info to existing record
    // For now, we record it when ENTER decision is made (see below)
  }

  /**
   * Record ENTER decision (when signal is finally confirmed)
   */
  async recordEnterDecision(
    context: AuditContext,
    confidence: number,
    mliScore: number,
    mliBreakdown: Record<string, any>,
    proposedEntry: number,
    proposedTarget: number,
    proposedStop: number,
  ): Promise<string> {
    const decision: DecisionAuditInput = {
      timestamp: context.timestamp,
      symbol: context.symbol,
      strategy: context.strategy,
      decision: 'ENTER',
      confidence,
      riskLevel: this.calculateRiskLevel(confidence),
      mliScore,
      mliBreakdown,
      marketData: context.marketData,
      dataAvailability: context.dataAvailability,
      proposedEntry,
      proposedTarget,
      proposedStop,
      notes: `Signal confirmed: Enter at ${proposedEntry}, Target ${proposedTarget}, SL ${proposedStop}`,
    };

    const record = await this.auditService.recordDecision(decision);
    return record.id;
  }

  /**
   * Record WAIT decision (opportunity not ripe yet)
   */
  async recordWaitDecision(
    context: AuditContext,
    confidence: number,
    blockedReason: string,
  ): Promise<string> {
    const decision: DecisionAuditInput = {
      timestamp: context.timestamp,
      symbol: context.symbol,
      strategy: context.strategy,
      decision: 'ESPERAR',
      confidence,
      riskLevel: 'MEDIUM',
      marketData: context.marketData,
      dataAvailability: context.dataAvailability,
      blockedReason,
      notes: `Wait for better setup: ${blockedReason}`,
    };

    const record = await this.auditService.recordDecision(decision);
    return record.id;
  }

  /**
   * Record SKIP/AVOID decision (high risk, don't enter)
   */
  async recordAvoidDecision(
    context: AuditContext,
    confidence: number,
    blockedReasons: string[],
  ): Promise<string> {
    const decision: DecisionAuditInput = {
      timestamp: context.timestamp,
      symbol: context.symbol,
      strategy: context.strategy,
      decision: 'NO_ENTRAR',
      confidence,
      riskLevel: 'HIGH',
      marketData: context.marketData,
      dataAvailability: context.dataAvailability,
      blockedReason: blockedReasons.join(' | '),
      notes: `Avoid trading: ${blockedReasons.join('; ')}`,
    };

    const record = await this.auditService.recordDecision(decision);
    return record.id;
  }

  /**
   * Record trade execution (links decision to actual trade)
   */
  async recordExecutionSuccess(
    decisionId: string,
    executionDecision: ExecutionDecision,
  ): Promise<void> {
    if (!executionDecision.position) return;

    await this.auditService.updateDecisionOutcome(decisionId, {
      executionStatus: 'EXECUTED',
      executionId: executionDecision.orderId,
      notes: `Trade placed: ${executionDecision.position.quantity} shares at ${executionDecision.position.entryPrice}`,
    });
  }

  /**
   * Record trade rejection
   */
  async recordExecutionFailure(
    decisionId: string,
    reason: string,
  ): Promise<void> {
    await this.auditService.updateDecisionOutcome(decisionId, {
      executionStatus: 'FAILED',
      blockedReason: reason,
    });
  }

  /**
   * Record exit signal (SALIR)
   */
  async recordExitDecision(
    context: AuditContext,
    reason: string, // TP hit, SL hit, manual exit, etc.
    pnl: number,
    pnlPercent: number,
  ): Promise<string> {
    const decision: DecisionAuditInput = {
      timestamp: context.timestamp,
      symbol: context.symbol,
      strategy: context.strategy,
      decision: 'SALIR',
      confidence: 100, // Deterministic exit
      marketData: context.marketData,
      dataAvailability: context.dataAvailability,
      notes: `Exit: ${reason}. P&L: $${pnl} (${pnlPercent.toFixed(2)}%)`,
    };

    const record = await this.auditService.recordDecision(decision);

    // Update with outcome after recording
    await this.auditService.updateDecisionOutcome(record.id, {
      outcome: pnl > 0 ? 'PROFITABLE' : pnl < 0 ? 'LOSS' : 'PARTIAL',
      profitLoss: pnl,
      profitLossPercent: pnlPercent,
    });

    return record.id;
  }

  /**
   * Record error decision (system failure)
   */
  async recordErrorDecision(
    context: AuditContext,
    errorMessage: string,
    stack?: string,
  ): Promise<string> {
    const decision: DecisionAuditInput = {
      timestamp: context.timestamp,
      symbol: context.symbol || 'UNKNOWN',
      strategy: context.strategy || 'UNKNOWN',
      decision: 'ERROR',
      confidence: 0,
      riskLevel: 'EXTREME',
      marketData: context.marketData,
      dataAvailability: context.dataAvailability,
      blockedReason: errorMessage,
      notes: `System error: ${errorMessage}${stack ? '\n' + stack : ''}`,
    };

    const record = await this.auditService.recordDecision(decision);
    return record.id;
  }

  /**
   * Record post-trade outcome and lessons
   */
  async recordTradeOutcome(
    decisionId: string,
    outcome: 'PROFITABLE' | 'LOSS' | 'PARTIAL',
    pnl: number,
    pnlPercent: number,
    lessons: Record<string, any>,
  ): Promise<void> {
    await this.auditService.updateDecisionOutcome(decisionId, {
      executionStatus: 'EXECUTED',
      outcome,
      profitLoss: pnl,
      profitLossPercent: pnlPercent,
      lessons,
    });
  }

  /**
   * Calculate risk level from confidence
   */
  private calculateRiskLevel(confidence: number): string {
    if (confidence >= 80) return 'LOW';
    if (confidence >= 60) return 'MEDIUM';
    if (confidence >= 40) return 'HIGH';
    return 'EXTREME';
  }
}

export default AuditTrailIntegration;
