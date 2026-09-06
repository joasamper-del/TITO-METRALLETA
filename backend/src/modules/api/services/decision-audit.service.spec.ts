import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DecisionAuditService } from './decision-audit.service';
import { DecisionAuditTrail } from '../../../modules/database/entities';

describe('DecisionAuditService', () => {
  let service: DecisionAuditService;
  let repository: Repository<DecisionAuditTrail>;

  const mockDecisionAuditTrail = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    timestamp: new Date('2026-09-05T10:30:00Z'),
    symbol: 'SPY',
    strategy: 'mean-reversion',
    decision: 'ENTER',
    confidence: 75,
    riskLevel: 'MEDIUM',
    riskGatesApplied: {},
    mliScore: 82,
    mliBreakdown: {},
    marketData: {},
    dataAvailability: {},
    filtersApplied: {},
    blockedReason: null,
    proposedEntry: 578.5,
    proposedTarget: 580.5,
    proposedStop: 577.5,
    executionStatus: 'PENDING',
    executionId: null,
    outcome: null,
    profitLoss: null,
    profitLossPercent: null,
    lessons: null,
    notes: 'Test decision',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecisionAuditService,
        {
          provide: getRepositoryToken(DecisionAuditTrail),
          useValue: {
            create: vi.fn().mockReturnValue(mockDecisionAuditTrail),
            save: vi.fn().mockResolvedValue(mockDecisionAuditTrail),
            update: vi.fn().mockResolvedValue({ affected: 1 }),
            findOneOrFail: vi.fn().mockResolvedValue(mockDecisionAuditTrail),
            createQueryBuilder: vi.fn(() => ({
              where: vi.fn().mockReturnThis(),
              andWhere: vi.fn().mockReturnThis(),
              orderBy: vi.fn().mockReturnThis(),
              getMany: vi.fn().mockResolvedValue([mockDecisionAuditTrail]),
              delete: vi.fn().mockReturnThis(),
              execute: vi.fn().mockResolvedValue({ affected: 1 }),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<DecisionAuditService>(DecisionAuditService);
    repository = module.get<Repository<DecisionAuditTrail>>(
      getRepositoryToken(DecisionAuditTrail),
    );
  });

  describe('recordDecision', () => {
    it('should create and save a new decision audit record', async () => {
      const input = {
        symbol: 'SPY',
        strategy: 'mean-reversion',
        decision: 'ENTER',
        confidence: 75,
        mliScore: 82,
      };

      const result = await service.recordDecision(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'SPY',
          decision: 'ENTER',
          executionStatus: 'PENDING',
        }),
      );
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(mockDecisionAuditTrail);
    });

    it('should use current timestamp if not provided', async () => {
      const input = {
        symbol: 'QQQ',
        decision: 'ESPERAR',
      };

      await service.recordDecision(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
        }),
      );
    });
  });

  describe('updateDecisionOutcome', () => {
    it('should update decision with execution outcome', async () => {
      const update = {
        executionStatus: 'EXECUTED',
        outcome: 'PROFITABLE',
        profitLoss: 125.5,
        profitLossPercent: 2.5,
      };

      const result = await service.updateDecisionOutcome('123', update);

      expect(repository.update).toHaveBeenCalledWith('123', update);
      expect(repository.findOneOrFail).toHaveBeenCalled();
      expect(result).toEqual(mockDecisionAuditTrail);
    });
  });

  describe('getDecisionsByDateRange', () => {
    it('should retrieve decisions within date range', async () => {
      const startDate = new Date('2026-09-05T00:00:00Z');
      const endDate = new Date('2026-09-05T23:59:59Z');

      const result = await service.getDecisionsByDateRange(startDate, endDate);

      expect(repository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual([mockDecisionAuditTrail]);
    });
  });

  describe('getDecisionsBySymbol', () => {
    it('should retrieve decisions for specific symbol', async () => {
      const result = await service.getDecisionsBySymbol('SPY');

      expect(repository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual([mockDecisionAuditTrail]);
    });

    it('should include date range if provided', async () => {
      const startDate = new Date('2026-09-05T00:00:00Z');
      const endDate = new Date('2026-09-05T23:59:59Z');

      const result = await service.getDecisionsBySymbol('SPY', startDate, endDate);

      expect(result).toEqual([mockDecisionAuditTrail]);
    });
  });

  describe('getDecisionStats', () => {
    it('should calculate decision statistics', async () => {
      const startDate = new Date('2026-09-05T00:00:00Z');
      const endDate = new Date('2026-09-05T23:59:59Z');

      const result = await service.getDecisionStats(startDate, endDate);

      expect(result).toHaveProperty('totalDecisions');
      expect(result).toHaveProperty('byDecision');
      expect(result).toHaveProperty('averageConfidence');
      expect(result).toHaveProperty('executedCount');
      expect(result).toHaveProperty('profitableCount');
    });

    it('should handle empty results', async () => {
      vi.spyOn(service, 'getDecisionsByDateRange').mockResolvedValue([]);

      const startDate = new Date('2026-09-06T00:00:00Z');
      const endDate = new Date('2026-09-06T23:59:59Z');

      const result = await service.getDecisionStats(startDate, endDate);

      expect(result.totalDecisions).toBe(0);
      expect(result.averageConfidence).toBe(0);
    });
  });

  describe('getMliAccuracy', () => {
    it('should return MLI accuracy percentage', async () => {
      vi.spyOn(service, 'getDecisionsByDateRange').mockResolvedValue([mockDecisionAuditTrail]);

      const startDate = new Date('2026-09-05T00:00:00Z');
      const endDate = new Date('2026-09-05T23:59:59Z');

      const result = await service.getMliAccuracy(startDate, endDate);

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('cleanupOldRecords', () => {
    it('should delete records older than specified days', async () => {
      const result = await service.cleanupOldRecords(30);

      expect(repository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
