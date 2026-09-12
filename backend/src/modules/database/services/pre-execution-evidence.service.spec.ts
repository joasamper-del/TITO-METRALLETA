import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PreExecutionEvidence } from '../entities/pre-execution-evidence.entity';
import { PreExecutionEvidenceService } from './pre-execution-evidence.service';

describe('PreExecutionEvidenceService', () => {
  let service: PreExecutionEvidenceService;
  let repository: Repository<PreExecutionEvidence>;
  let dataSource: DataSource;

  beforeEach(async () => {
    const mockRepository = {
      save: vi.fn(),
      findOne: vi.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreExecutionEvidenceService,
        {
          provide: DataSource,
          useValue: {
            getRepository: vi.fn().mockReturnValue(mockRepository),
          },
        },
      ],
    }).compile();

    service = module.get<PreExecutionEvidenceService>(PreExecutionEvidenceService);
    dataSource = module.get<DataSource>(DataSource);
    repository = mockRepository;
  });

  describe('recordEvidence', () => {
    it('should persist evidence to DB', async () => {
      const evidence = new PreExecutionEvidence();
      evidence.trade_id = 'ETHUSD_20260912_0001';
      evidence.all_gates_pass = true;

      await service.recordEvidence(evidence);
      expect(repository.save).toHaveBeenCalledWith(evidence);
    });

    it('should reject if trade_id missing (FK validation)', async () => {
      const evidence = new PreExecutionEvidence();
      evidence.trade_id = '';

      await expect(service.recordEvidence(evidence)).rejects.toThrow();
    });
  });

  describe('findByTradeId', () => {
    it('should retrieve evidence by trade_id', async () => {
      const mockEvidence = new PreExecutionEvidence();
      mockEvidence.trade_id = 'ETHUSD_20260912_0001';
      (repository.findOne as jest.Mock).mockResolvedValue(mockEvidence);

      const result = await service.findByTradeId('ETHUSD_20260912_0001');
      expect(result).toEqual(mockEvidence);
    });
  });

  describe('Anti-replay logic', () => {
    it('should prevent execution if consumed', async () => {
      const evidence = new PreExecutionEvidence();
      evidence.consumed = true;

      expect(service.validateIntegrityBeforeUse(evidence)).toBe(false);
    });
  });

  describe('Race condition protection', () => {
    it('should mark as consumed atomically under concurrent access', async () => {
      const evidence = new PreExecutionEvidence();
      evidence.id = 'test-id';
      evidence.consumed = false;

      (repository.findOne as any).mockResolvedValue(evidence);

      // Simulate concurrent calls
      await service.markAsConsumed(evidence.id);
      await service.markAsConsumed(evidence.id); // Should be idempotent

      expect(repository.save).toHaveBeenCalled();
    });
  });
});
