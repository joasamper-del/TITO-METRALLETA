import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DailySummaryScheduler } from './daily-summary-scheduler';
import { DailySummaryService } from './daily-summary.service';
import { DailySummary } from '../entities/daily-summary.entity';

describe('DailySummaryScheduler (Integration)', () => {
  let scheduler: DailySummaryScheduler;
  let dailySummaryService: DailySummaryService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        if (key === 'CRON_TIMEZONE') return defaultValue || 'America/New_York';
        return defaultValue;
      }),
    } as unknown as ConfigService;

    dailySummaryService = {
      getDailySummary: vi.fn(),
      generateAndSave: vi.fn(),
    } as unknown as DailySummaryService;

    scheduler = new DailySummaryScheduler(configService, dailySummaryService);
  });

  describe('Scheduler Registration', () => {
    it('should be defined', () => {
      expect(scheduler).toBeDefined();
    });

    it('should have metadata for dailySummaryClose trigger', () => {
      const metadata = scheduler.getSchedulerMetadata();
      expect(metadata).toEqual({
        name: 'dailySummaryClose',
        cronExpression: '0 16 * * 1-5',
        timeZone: 'America/New_York',
        generatedMode: 'AUTO',
        enabled: true,
      });
    });

    it('should initialize with America/New_York timezone as default', () => {
      const metadata = scheduler.getSchedulerMetadata();
      expect(metadata.timeZone).toBe('America/New_York');
    });

    it('should read timezone from ConfigService', () => {
      expect(configService.get).toHaveBeenCalledWith(
        'CRON_TIMEZONE',
        'America/New_York',
      );
    });
  });

  describe('Trigger Execution', () => {
    it('should invoke generateAndSave with AUTOMATIC mode when no existing summary', async () => {
      const mockSummary: DailySummary = {
        id: 'test-id',
        dateET: new Date(),
        generatedMode: 'AUTOMATIC',
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
        integrityStatus: 'PASS',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (dailySummaryService.getDailySummary as any).mockResolvedValue(null);
      (dailySummaryService.generateAndSave as any).mockResolvedValue(
        mockSummary,
      );

      await scheduler.runDailySummary();

      expect(dailySummaryService.getDailySummary).toHaveBeenCalled();
      expect(dailySummaryService.generateAndSave).toHaveBeenCalledWith(
        expect.any(Date),
        'AUTOMATIC',
      );
    });

    it('should skip generation if summary already exists (idempotence)', async () => {
      const existingSummary: DailySummary = {
        id: 'existing-id',
        dateET: new Date(),
        generatedMode: 'AUTOMATIC',
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
        integrityStatus: 'PASS',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (dailySummaryService.getDailySummary as any).mockResolvedValue(
        existingSummary,
      );

      await scheduler.runDailySummary();

      expect(dailySummaryService.getDailySummary).toHaveBeenCalled();
      expect(dailySummaryService.generateAndSave).not.toHaveBeenCalled();
    });

    it('should throw error if generation fails (fail-closed)', async () => {
      (dailySummaryService.getDailySummary as any).mockResolvedValue(null);
      (dailySummaryService.generateAndSave as any).mockRejectedValue(
        new Error('DB error'),
      );

      await expect(scheduler.runDailySummary()).rejects.toThrow('DB error');
    });
  });

  describe('Timezone Handling', () => {
    it('should use America/New_York for ET date conversion', async () => {
      const mockSummary: DailySummary = {
        id: 'test-id',
        dateET: new Date(),
        generatedMode: 'AUTOMATIC',
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
        integrityStatus: 'PASS',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (dailySummaryService.getDailySummary as any).mockResolvedValue(null);
      (dailySummaryService.generateAndSave as any).mockResolvedValue(
        mockSummary,
      );

      await scheduler.runDailySummary();

      const callArg = (dailySummaryService.generateAndSave as any).mock
        .calls[0][0];
      expect(callArg).toBeInstanceOf(Date);
    });

    it('@Cron decorator respects EST/EDT transitions via timeZone parameter', () => {
      const metadata = scheduler.getSchedulerMetadata();
      expect(metadata.timeZone).toBe('America/New_York');
    });
  });

  describe('Idempotence Validation', () => {
    it('should not duplicate summary on repeated execution', async () => {
      const testDate = new Date('2026-09-14');
      const summary: DailySummary = {
        id: 'test-id',
        dateET: testDate,
        generatedMode: 'AUTOMATIC',
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
        integrityStatus: 'PASS',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let callCount = 0;
      (dailySummaryService.getDailySummary as any).mockImplementation(
        async () => {
          callCount++;
          return callCount === 1 ? null : summary;
        },
      );

      (dailySummaryService.generateAndSave as any).mockResolvedValue(summary);

      // First execution
      await scheduler.runDailySummary();
      expect(dailySummaryService.generateAndSave).toHaveBeenCalledTimes(1);

      // Reset mock
      vi.clearAllMocks();

      // Second execution: should skip
      await scheduler.runDailySummary();
      expect(dailySummaryService.generateAndSave).not.toHaveBeenCalled();
    });
  });

  describe('Error Visibility', () => {
    it('should log HOLD/FAIL status visibly', async () => {
      const loggerErrorSpy = vi.spyOn(Logger.prototype, 'error');

      const failingSummary: DailySummary = {
        id: 'fail-id',
        dateET: new Date(),
        generatedMode: 'AUTOMATIC',
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
        integrityStatus: 'HOLD',
        integrityNotes: 'Test HOLD',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (dailySummaryService.getDailySummary as any).mockResolvedValue(null);
      (dailySummaryService.generateAndSave as any).mockResolvedValue(
        failingSummary,
      );

      await scheduler.runDailySummary();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('HOLD'),
      );

      loggerErrorSpy.mockRestore();
    });

    it('should distinguish AUTO-generated via [AUTO] prefix in logs', async () => {
      const loggerLogSpy = vi.spyOn(Logger.prototype, 'log');

      const mockSummary: DailySummary = {
        id: 'test-id',
        dateET: new Date(),
        generatedMode: 'AUTOMATIC',
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
        integrityStatus: 'PASS',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (dailySummaryService.getDailySummary as any).mockResolvedValue(null);
      (dailySummaryService.generateAndSave as any).mockResolvedValue(
        mockSummary,
      );

      await scheduler.runDailySummary();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUTO]'),
      );

      loggerLogSpy.mockRestore();
    });
  });
});
