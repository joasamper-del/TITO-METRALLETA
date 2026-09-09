import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditTrailIntegration, AuditContext } from './auditTrailIntegration';
import { DecisionAuditService } from '../../modules/api/services/decision-audit.service';
import { SelectionResult } from '../decision/strategySelector';
import { RiskGateResult } from '../decision/riskGate';

describe('AuditTrailIntegration', () => {
  let integration: AuditTrailIntegration;
  let auditService: DecisionAuditService;

  const mockContext: AuditContext = {
    timestamp: new Date('2026-09-05T10:30:00Z'),
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

  beforeEach(() => {
    auditService = {
      recordDecision: vi.fn().mockResolvedValue({ id: 'test-id-123' }),
      updateDecisionOutcome: vi.fn().mockResolvedValue({}),
    } as any;

    integration = new AuditTrailIntegration(auditService);
  });

  describe('recordSelectionDecision', () => {
    it('should record OPERATE decision from StrategySelector', async () => {
      const selectionResult: SelectionResult = {
        status: 'OPERATE',
        selectedStrategy: 'MeanReversionStrategy',
        selectedSymbol: 'SPY',
        confidence: 78,
        compatibilityScore: 82,
        explanation: 'Good setup',
        reasons: ['Test reason'],
      };

      const id = await integration.recordSelectionDecision(
        mockContext,
        selectionResult,
      );

      expect(auditService.recordDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'SPY',
          decision: 'ESPERAR', // Selection OPERATE becomes ESPERAR (not final)
          confidence: 78,
        }),
      );
      expect(id).toBe('test-id-123');
    });

    it('should record DO_NOT_OPERATE decision', async () => {
      const selectionResult: SelectionResult = {
        status: 'DO_NOT_OPERATE',
        confidence: 0,
        compatibilityScore: 0,
        explanation: 'No valid strategies',
        reasons: ['All strategies blocked'],
      };

      const id = await integration.recordSelectionDecision(
        mockContext,
        selectionResult,
      );

      expect(auditService.recordDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: 'NO_ENTRAR',
          confidence: 0,
        }),
      );
      expect(id).toBe('test-id-123');
    });
  });

  describe('recordEnterDecision', () => {
    it('should record ENTER decision with full market context', async () => {
      const id = await integration.recordEnterDecision(
        mockContext,
        78, // confidence
        82, // mliScore
        {
          spyTrend: { score: 85, verdict: 'BULLISH' },
          vix: { score: 65, verdict: 'NORMAL' },
        },
        578.45, // entry
        582.00, // target
        575.50, // stop
      );

      expect(auditService.recordDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: 'ENTER',
          symbol: 'SPY',
          strategy: 'mean-reversion',
          confidence: 78,
          mliScore: 82,
          proposedEntry: 578.45,
          proposedTarget: 582.00,
          proposedStop: 575.50,
        }),
      );
      expect(id).toBe('test-id-123');
    });
  });

  describe('recordWaitDecision', () => {
    it('should record ESPERAR decision with blocking reason', async () => {
      const id = await integration.recordWaitDecision(
        mockContext,
        61,
        'VIX elevated (21.85) + QQQ lagging SPY',
      );

      expect(auditService.recordDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: 'ESPERAR',
          confidence: 61,
          blockedReason: 'VIX elevated (21.85) + QQQ lagging SPY',
        }),
      );
      expect(id).toBe('test-id-123');
    });
  });

  describe('recordAvoidDecision', () => {
    it('should record NO_ENTRAR decision with multiple reasons', async () => {
      const id = await integration.recordAvoidDecision(mockContext, 30, [
        'VIX > 25',
        'Earnings upcoming',
        'Low volume',
      ]);

      expect(auditService.recordDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: 'NO_ENTRAR',
          confidence: 30,
          riskLevel: 'HIGH',
          blockedReason: 'VIX > 25 | Earnings upcoming | Low volume',
        }),
      );
      expect(id).toBe('test-id-123');
    });
  });

  describe('recordExecutionSuccess', () => {
    it('should update decision with execution ID', async () => {
      const executionDecision = {
        status: 'TRADE_PLACED',
        orderId: 'order_123',
        reason: 'Trade placed',
        position: {
          symbol: 'SPY',
          quantity: 100,
          entryPrice: 578.45,
          stopLoss: 575.50,
          takeProfit: 582.00,
          placedAt: new Date(),
        },
        supervisorDecision: {} as any,
      };

      await integration.recordExecutionSuccess('audit-id', executionDecision);

      expect(auditService.updateDecisionOutcome).toHaveBeenCalledWith(
        'audit-id',
        expect.objectContaining({
          executionStatus: 'EXECUTED',
          executionId: 'order_123',
        }),
      );
    });
  });

  describe('recordExitDecision', () => {
    it('should record SALIR decision with P&L', async () => {
      const id = await integration.recordExitDecision(
        mockContext,
        'TP hit',
        245.50,
        2.5,
      );

      expect(auditService.recordDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: 'SALIR',
          confidence: 100,
        }),
      );

      expect(auditService.updateDecisionOutcome).toHaveBeenCalledWith(
        'test-id-123',
        expect.objectContaining({
          outcome: 'PROFITABLE',
          profitLoss: 245.50,
          profitLossPercent: 2.5,
        }),
      );
      expect(id).toBe('test-id-123');
    });

    it('should record loss outcome', async () => {
      const id = await integration.recordExitDecision(
        mockContext,
        'SL hit',
        -125.30,
        -1.8,
      );

      expect(auditService.updateDecisionOutcome).toHaveBeenCalledWith(
        'test-id-123',
        expect.objectContaining({
          outcome: 'LOSS',
          profitLoss: -125.30,
        }),
      );
      expect(id).toBe('test-id-123');
    });
  });

  describe('recordErrorDecision', () => {
    it('should record ERROR decision with exception details', async () => {
      const id = await integration.recordErrorDecision(
        mockContext,
        'Failed to place order',
        'Error: API timeout',
      );

      expect(auditService.recordDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: 'ERROR',
          confidence: 0,
          riskLevel: 'EXTREME',
          blockedReason: 'Failed to place order',
        }),
      );
      expect(id).toBe('test-id-123');
    });
  });

  describe('recordTradeOutcome', () => {
    it('should update decision with post-trade outcome and lessons', async () => {
      const lessons = {
        correct_components: ['spyTrend', 'volume'],
        recommendation: 'Setup was clean',
      };

      await integration.recordTradeOutcome(
        'decision-id',
        'PROFITABLE',
        245.50,
        2.5,
        lessons,
      );

      expect(auditService.updateDecisionOutcome).toHaveBeenCalledWith(
        'decision-id',
        expect.objectContaining({
          outcome: 'PROFITABLE',
          profitLoss: 245.50,
          profitLossPercent: 2.5,
          lessons,
        }),
      );
    });
  });

  describe('Risk level calculation', () => {
    it('should calculate risk level from confidence', async () => {
      // HIGH confidence = LOW risk
      await integration.recordEnterDecision(
        mockContext,
        85, // HIGH confidence
        80,
        {},
        578.45,
        582.00,
        575.50,
      );

      expect(auditService.recordDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          riskLevel: 'LOW', // >= 80 = LOW risk
        }),
      );

      // MEDIUM confidence = MEDIUM risk
      await integration.recordWaitDecision(mockContext, 65, 'Test reason');

      expect(auditService.recordDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          riskLevel: 'MEDIUM', // 60-79 = MEDIUM risk
        }),
      );

      // LOW confidence = HIGH risk
      await integration.recordAvoidDecision(mockContext, 35, ['Test']);

      expect(auditService.recordDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          riskLevel: 'HIGH', // 40-59 would be HIGH
        }),
      );
    });
  });
});
