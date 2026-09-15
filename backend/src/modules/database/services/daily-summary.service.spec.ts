import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DailySummaryService } from './daily-summary.service';
import { DailySummary } from '../entities/daily-summary.entity';
import { DecisionAuditTrail } from '../entities/decision-audit-trail.entity';
import { TradeExecution } from '../entities/trade-execution.entity';
import { ExecutionReport } from '../entities/execution-report.entity';
import { TraceabilityAnomaly } from '../entities/traceability-anomaly.entity';
import { NoOpExplanation } from '../entities/no-op-explanation.entity';

describe('DailySummaryService', () => {
  let service: DailySummaryService;
  let mockSummaryRepo: any;
  let mockDecisionRepo: any;
  let mockTradeRepo: any;
  let mockReportRepo: any;
  let mockTraceabilityRepo: any;
  let mockNoOpRepo: any;

  beforeEach(async () => {
    mockSummaryRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
    };

    mockDecisionRepo = {
      find: vi.fn(),
    };

    mockTradeRepo = {
      find: vi.fn(),
    };

    mockReportRepo = {
      find: vi.fn(),
    };

    mockTraceabilityRepo = {
      find: vi.fn(),
    };

    mockNoOpRepo = {
      find: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailySummaryService,
        { provide: getRepositoryToken(DailySummary), useValue: mockSummaryRepo },
        { provide: getRepositoryToken(DecisionAuditTrail), useValue: mockDecisionRepo },
        { provide: getRepositoryToken(TradeExecution), useValue: mockTradeRepo },
        { provide: getRepositoryToken(ExecutionReport), useValue: mockReportRepo },
        { provide: getRepositoryToken(TraceabilityAnomaly), useValue: mockTraceabilityRepo },
        { provide: getRepositoryToken(NoOpExplanation), useValue: mockNoOpRepo },
      ],
    }).compile();

    service = module.get<DailySummaryService>(DailySummaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateDailySummary', () => {
    const testDate = new Date('2026-09-14T00:00:00Z');

    it('should generate summary for day with CLOSED trades', async () => {
      const decisions = [
        {
          id: '1',
          decision: 'ENTRAR',
          timestamp: testDate,
        } as DecisionAuditTrail,
      ];

      const trades = [
        {
          id: 'trade1',
          status: 'CLOSED',
          createdAt: testDate,
        } as TradeExecution,
      ];

      const reports = [
        {
          id: 'report1',
          outcome: 'PROFITABLE',
          profitLoss: 100,
          profitLossPercent: 5.5,
          createdAt: testDate,
        } as ExecutionReport,
      ];

      mockDecisionRepo.find.mockResolvedValue(decisions);
      mockTradeRepo.find.mockResolvedValue(trades);
      mockReportRepo.find.mockResolvedValue(reports);
      mockTraceabilityRepo.find.mockResolvedValue([]);
      mockNoOpRepo.find.mockResolvedValue([]);

      const result = await service.generateDailySummary(testDate);

      expect(result.totalDecisions).toBe(1);
      expect(result.decidedEnter).toBe(1);
      expect(result.tradesExecuted).toBe(1);
      expect(result.outcomeProfitable).toBe(1);
      expect(result.totalProfitLoss).toBe(100);
      expect(result.hasClosed).toBe(true);
      expect(result.integrityStatus).toBe('PASS');
    });

    it('should generate summary for day with FAILED operations', async () => {
      const decisions = [
        {
          id: '1',
          decision: 'ENTRAR',
          timestamp: testDate,
        } as DecisionAuditTrail,
      ];

      const trades = [
        {
          id: 'trade1',
          status: 'FAILED',
          createdAt: testDate,
        } as TradeExecution,
      ];

      mockDecisionRepo.find.mockResolvedValue(decisions);
      mockTradeRepo.find.mockResolvedValue(trades);
      mockReportRepo.find.mockResolvedValue([]);
      mockTraceabilityRepo.find.mockResolvedValue([]);
      mockNoOpRepo.find.mockResolvedValue([]);

      const result = await service.generateDailySummary(testDate);

      expect(result.operationsFailed).toBe(1);
      expect(result.hasFailed).toBe(true);
      expect(result.integrityStatus).toBe('PASS');
    });

    it('should generate summary for day with only NO-OPERATIONS', async () => {
      const noOps = [
        {
          id: '1',
          decisionId: 'dec1',
          blockageReason: 'SEATBELT_GATE',
          createdAt: testDate,
        } as NoOpExplanation,
        {
          id: '2',
          decisionId: 'dec2',
          blockageReason: 'MARKET_CLOSED',
          createdAt: testDate,
        } as NoOpExplanation,
      ];

      mockDecisionRepo.find.mockResolvedValue([]);
      mockTradeRepo.find.mockResolvedValue([]);
      mockReportRepo.find.mockResolvedValue([]);
      mockTraceabilityRepo.find.mockResolvedValue([]);
      mockNoOpRepo.find.mockResolvedValue(noOps);

      const result = await service.generateDailySummary(testDate);

      expect(result.noOperations).toBe(2);
      expect(result.hasNoOperations).toBe(true);
      expect(result.noOpReasons).toEqual({
        SEATBELT_GATE: 1,
        MARKET_CLOSED: 1,
      });
      expect(result.integrityStatus).toBe('PASS');
    });

    it('should generate summary for day with mixed events', async () => {
      const decisions = [
        { id: '1', decision: 'ENTRAR', timestamp: testDate } as DecisionAuditTrail,
        { id: '2', decision: 'ESPERAR', timestamp: testDate } as DecisionAuditTrail,
        { id: '3', decision: 'NO_ENTRAR', timestamp: testDate } as DecisionAuditTrail,
      ];

      const trades = [
        { id: 'trade1', status: 'CLOSED', createdAt: testDate } as TradeExecution,
        { id: 'trade2', status: 'FAILED', createdAt: testDate } as TradeExecution,
      ];

      const reports = [
        {
          id: 'report1',
          outcome: 'PROFITABLE',
          profitLoss: 100,
          profitLossPercent: 5,
          createdAt: testDate,
        } as ExecutionReport,
      ];

      const noOps = [
        {
          id: 'noop1',
          decisionId: 'dec1',
          blockageReason: 'SEATBELT_GATE',
          createdAt: testDate,
        } as NoOpExplanation,
      ];

      const anomalies = [
        {
          id: 'anom1',
          anomalyType: 'MISSING_TRADE_ID',
          createdAt: testDate,
        } as TraceabilityAnomaly,
      ];

      mockDecisionRepo.find.mockResolvedValue(decisions);
      mockTradeRepo.find.mockResolvedValue(trades);
      mockReportRepo.find.mockResolvedValue(reports);
      mockTraceabilityRepo.find.mockResolvedValue(anomalies);
      mockNoOpRepo.find.mockResolvedValue(noOps);

      const result = await service.generateDailySummary(testDate);

      expect(result.totalDecisions).toBe(3);
      expect(result.decidedEnter).toBe(1);
      expect(result.decidedWait).toBe(1);
      expect(result.decidedSkip).toBe(1);
      expect(result.tradesExecuted).toBe(1);
      expect(result.operationsFailed).toBe(1);
      expect(result.noOperations).toBe(1);
      expect(result.traceabilityAnomalies).toBe(1);
      expect(result.hasClosed).toBe(true);
      expect(result.hasFailed).toBe(true);
      expect(result.hasNoOperations).toBe(true);
      expect(result.hasTraceabilityLoss).toBe(true);
    });

    it('should generate summary for empty day (no activity)', async () => {
      mockDecisionRepo.find.mockResolvedValue([]);
      mockTradeRepo.find.mockResolvedValue([]);
      mockReportRepo.find.mockResolvedValue([]);
      mockTraceabilityRepo.find.mockResolvedValue([]);
      mockNoOpRepo.find.mockResolvedValue([]);

      const result = await service.generateDailySummary(testDate);

      expect(result.totalDecisions).toBe(0);
      expect(result.tradesExecuted).toBe(0);
      expect(result.operationsFailed).toBe(0);
      expect(result.noOperations).toBe(0);
      expect(result.traceabilityAnomalies).toBe(0);
      expect(result.hasClosed).toBe(false);
      expect(result.hasFailed).toBe(false);
      expect(result.hasNoOperations).toBe(false);
      expect(result.hasTraceabilityLoss).toBe(false);
      expect(result.integrityStatus).toBe('PASS');
    });

    it('should handle P&L partial/missing', async () => {
      const trades = [
        { id: 'trade1', status: 'CLOSED', createdAt: testDate } as TradeExecution,
        { id: 'trade2', status: 'CLOSED', createdAt: testDate } as TradeExecution,
      ];

      const reports = [
        {
          id: 'report1',
          outcome: 'PROFITABLE',
          profitLoss: 100,
          profitLossPercent: 5,
          createdAt: testDate,
        } as ExecutionReport,
        {
          id: 'report2',
          outcome: 'LOSS',
          profitLoss: null,
          profitLossPercent: null,
          createdAt: testDate,
        } as ExecutionReport,
      ];

      mockDecisionRepo.find.mockResolvedValue([]);
      mockTradeRepo.find.mockResolvedValue(trades);
      mockReportRepo.find.mockResolvedValue(reports);
      mockTraceabilityRepo.find.mockResolvedValue([]);
      mockNoOpRepo.find.mockResolvedValue([]);

      const result = await service.generateDailySummary(testDate);

      expect(result.tradesExecuted).toBe(2);
      expect(result.pnlCalculationStatus).toBe(0); // Parcial
      expect(result.totalProfitLoss).toBe(100);
      expect(result.integrityStatus).toBe('HOLD');
      expect(result.integrityNotes).toBeDefined();
      expect(result.integrityNotes).toContain('P&L parcial');
    });

    it('should detect traceability anomalies', async () => {
      const anomalies = [
        {
          id: 'anom1',
          anomalyType: 'ORPHAN_EVENT',
          anomalyDescription: 'ExecutionEvent without TradeExecution',
          createdAt: testDate,
        } as TraceabilityAnomaly,
        {
          id: 'anom2',
          anomalyType: 'MISSING_EXECUTION',
          anomalyDescription: 'Decision but no TradeExecution',
          createdAt: testDate,
        } as TraceabilityAnomaly,
      ];

      mockDecisionRepo.find.mockResolvedValue([]);
      mockTradeRepo.find.mockResolvedValue([]);
      mockReportRepo.find.mockResolvedValue([]);
      mockTraceabilityRepo.find.mockResolvedValue(anomalies);
      mockNoOpRepo.find.mockResolvedValue([]);

      const result = await service.generateDailySummary(testDate);

      expect(result.traceabilityAnomalies).toBe(2);
      expect(result.hasTraceabilityLoss).toBe(true);
      expect(result.traceabilityTypes).toEqual({
        ORPHAN_EVENT: 1,
        MISSING_EXECUTION: 1,
      });
    });

    it('should set generationMode correctly', async () => {
      mockDecisionRepo.find.mockResolvedValue([]);
      mockTradeRepo.find.mockResolvedValue([]);
      mockReportRepo.find.mockResolvedValue([]);
      mockTraceabilityRepo.find.mockResolvedValue([]);
      mockNoOpRepo.find.mockResolvedValue([]);

      const automatic = await service.generateDailySummary(testDate, 'AUTOMATIC');
      expect(automatic.generatedMode).toBe('AUTOMATIC');
      expect(automatic.isManualOverride).toBe(false);

      const manual = await service.generateDailySummary(testDate, 'MANUAL');
      expect(manual.generatedMode).toBe('MANUAL');
      expect(manual.isManualOverride).toBe(true);
    });
  });

  describe('saveDailySummary', () => {
    const testDate = new Date('2026-09-14T00:00:00Z');
    const baseData = {
      dateET: testDate,
      generatedMode: 'AUTOMATIC' as const,
      isManualOverride: false,
      totalDecisions: 0,
      decidedEnter: 0,
      decidedWait: 0,
      decidedSkip: 0,
      decidedExit: 0,
      decidedError: 0,
      tradesExecuted: 0,
      tradesClosed: 0,
      outcomeProfitable: 0,
      outcomeLoss: 0,
      outcomeBreakeven: 0,
      operationsFailed: 0,
      noOperations: 0,
      traceabilityAnomalies: 0,
      hasClosed: false,
      hasFailed: false,
      hasTraceabilityLoss: false,
      hasNoOperations: false,
      integrityStatus: 'PASS' as const,
    };

    it('should create new summary when none exists', async () => {
      mockSummaryRepo.findOne.mockResolvedValue(null);
      mockSummaryRepo.create.mockReturnValue(baseData);
      mockSummaryRepo.save.mockResolvedValue({ id: 'summary-1', ...baseData });

      const result = await service.saveDailySummary(baseData);

      expect(mockSummaryRepo.create).toHaveBeenCalledWith(expect.objectContaining(baseData));
      expect(mockSummaryRepo.save).toHaveBeenCalled();
      expect(result.id).toBe('summary-1');
    });

    it('should update existing summary (idempotence)', async () => {
      const existing = { id: 'summary-1', ...baseData, updatedAt: new Date('2026-09-14T10:00:00Z') };
      mockSummaryRepo.findOne.mockResolvedValue(existing);
      mockSummaryRepo.save.mockResolvedValue({ ...existing, tradesExecuted: 5 });

      const updatedData = { ...baseData, tradesExecuted: 5 };
      const result = await service.saveDailySummary(updatedData);

      expect(mockSummaryRepo.save).toHaveBeenCalledWith(expect.objectContaining({ tradesExecuted: 5 }));
      expect(result.tradesExecuted).toBe(5);
    });

    it('should throw error if dateET is missing', async () => {
      const invalidData = { ...baseData };
      delete (invalidData as any).dateET;

      await expect(service.saveDailySummary(invalidData as any)).rejects.toThrow('dateET es requerido');
    });
  });

  describe('generateAndSave', () => {
    const testDate = new Date('2026-09-14T00:00:00Z');

    it('should generate and save in one operation', async () => {
      mockDecisionRepo.find.mockResolvedValue([
        { id: '1', decision: 'ENTRAR', timestamp: testDate } as DecisionAuditTrail,
      ]);
      mockTradeRepo.find.mockResolvedValue([]);
      mockReportRepo.find.mockResolvedValue([]);
      mockTraceabilityRepo.find.mockResolvedValue([]);
      mockNoOpRepo.find.mockResolvedValue([]);
      mockSummaryRepo.findOne.mockResolvedValue(null);
      mockSummaryRepo.create.mockReturnValue({ totalDecisions: 1 });
      mockSummaryRepo.save.mockResolvedValue({ id: 'summary-1', totalDecisions: 1 });

      const result = await service.generateAndSave(testDate, 'AUTOMATIC');

      expect(result.id).toBe('summary-1');
      expect(mockSummaryRepo.save).toHaveBeenCalled();
    });
  });

  describe('getDailySummary', () => {
    const testDate = new Date('2026-09-14T00:00:00Z');

    it('should retrieve existing summary', async () => {
      const summary = { id: 'summary-1', dateET: testDate };
      mockSummaryRepo.findOne.mockResolvedValue(summary);

      const result = await service.getDailySummary(testDate);

      expect(result).toEqual(summary);
    });

    it('should return null if no summary exists', async () => {
      mockSummaryRepo.findOne.mockResolvedValue(null);

      const result = await service.getDailySummary(testDate);

      expect(result).toBeNull();
    });
  });

  describe('listByDateRange', () => {
    const startDate = new Date('2026-09-10T00:00:00Z');
    const endDate = new Date('2026-09-14T00:00:00Z');

    it('should list summaries in date range', async () => {
      const summaries = [
        { id: 'summary-1', dateET: new Date('2026-09-10') },
        { id: 'summary-2', dateET: new Date('2026-09-11') },
      ];
      mockSummaryRepo.find.mockResolvedValue(summaries);

      const result = await service.listByDateRange(startDate, endDate);

      expect(result).toEqual(summaries);
      expect(mockSummaryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { dateET: 'ASC' },
        }),
      );
    });
  });

  describe('checkForDuplicates', () => {
    const testDate = new Date('2026-09-14T00:00:00Z');

    it('should detect duplicates', async () => {
      mockSummaryRepo.count.mockResolvedValue(2);

      const result = await service.checkForDuplicates(testDate);

      expect(result).toBe(true);
    });

    it('should return false for single summary', async () => {
      mockSummaryRepo.count.mockResolvedValue(1);

      const result = await service.checkForDuplicates(testDate);

      expect(result).toBe(false);
    });

    it('should return false for no summaries', async () => {
      mockSummaryRepo.count.mockResolvedValue(0);

      const result = await service.checkForDuplicates(testDate);

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    const testDate = new Date('2026-09-14T00:00:00Z');

    it('should handle multiple outcomes in single day', async () => {
      const reports = [
        { id: 'r1', outcome: 'PROFITABLE', profitLoss: 100, profitLossPercent: 5, createdAt: testDate } as ExecutionReport,
        { id: 'r2', outcome: 'LOSS', profitLoss: -50, profitLossPercent: -3, createdAt: testDate } as ExecutionReport,
        { id: 'r3', outcome: 'BREAKEVEN', profitLoss: 0, profitLossPercent: 0, createdAt: testDate } as ExecutionReport,
      ];

      mockDecisionRepo.find.mockResolvedValue([]);
      mockTradeRepo.find.mockResolvedValue([
        { id: 't1', status: 'CLOSED' } as TradeExecution,
        { id: 't2', status: 'CLOSED' } as TradeExecution,
        { id: 't3', status: 'CLOSED' } as TradeExecution,
      ]);
      mockReportRepo.find.mockResolvedValue(reports);
      mockTraceabilityRepo.find.mockResolvedValue([]);
      mockNoOpRepo.find.mockResolvedValue([]);

      const result = await service.generateDailySummary(testDate);

      expect(result.outcomeProfitable).toBe(1);
      expect(result.outcomeLoss).toBe(1);
      expect(result.outcomeBreakeven).toBe(1);
      expect(result.totalProfitLoss).toBe(50);
      expect(result.totalProfitLossPercent).toBeCloseTo(0.67, 1);
    });

    it('should handle repeated execution same period (idempotence test)', async () => {
      mockDecisionRepo.find.mockResolvedValue([
        { id: '1', decision: 'ENTRAR', timestamp: testDate } as DecisionAuditTrail,
      ]);
      mockTradeRepo.find.mockResolvedValue([]);
      mockReportRepo.find.mockResolvedValue([]);
      mockTraceabilityRepo.find.mockResolvedValue([]);
      mockNoOpRepo.find.mockResolvedValue([]);

      // First run
      const summary1 = await service.generateDailySummary(testDate, 'AUTOMATIC');

      // Same data, second run
      const summary2 = await service.generateDailySummary(testDate, 'AUTOMATIC');

      expect(summary1.dateET).toEqual(summary2.dateET);
      expect(summary1.totalDecisions).toEqual(summary2.totalDecisions);
      expect(summary1.generatedMode).toBe('AUTOMATIC');
      expect(summary2.generatedMode).toBe('AUTOMATIC');
    });
  });
});
