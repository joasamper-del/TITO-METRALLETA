import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuditService } from './audit.service';
import { DecisionChangeLog } from '../database/entities/decision-change-log.entity';
import { PositionSnapshot } from '../database/entities/position-snapshot.entity';
import { DecisionAuditTrail } from '../database/entities/decision-audit-trail.entity';

describe('AuditService (S63)', () => {
  let service: AuditService;
  let changeLogRepo: any;
  let snapshotRepo: any;
  let decisionRepo: any;

  beforeEach(async () => {
    changeLogRepo = {
      find: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
    };

    snapshotRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
    };

    decisionRepo = {
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(DecisionChangeLog),
          useValue: changeLogRepo,
        },
        {
          provide: getRepositoryToken(PositionSnapshot),
          useValue: snapshotRepo,
        },
        {
          provide: getRepositoryToken(DecisionAuditTrail),
          useValue: decisionRepo,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  // ========== validateSnapshotIntegrity (5 tests)
  describe('validateSnapshotIntegrity', () => {
    it('1. Snapshot con FK válido → retorna TRUE', async () => {
      const snapshotId = 'snap-123';
      const snapshot = {
        id: snapshotId,
        symbol: 'ETH',
        decisionAuditTrailId: 'dec-456',
      };

      snapshotRepo.findOne.mockResolvedValueOnce(snapshot);
      decisionRepo.findOne.mockResolvedValueOnce({ id: 'dec-456' });

      const result = await service.validateSnapshotIntegrity(snapshotId);
      expect(result).toBe(true);
    });

    it('2. Snapshot sin FK (null) → retorna TRUE (nullable OK)', async () => {
      const snapshotId = 'snap-123';
      const snapshot = {
        id: snapshotId,
        symbol: 'ETH',
        decisionAuditTrailId: null,
      };

      snapshotRepo.findOne.mockResolvedValueOnce(snapshot);

      const result = await service.validateSnapshotIntegrity(snapshotId);
      expect(result).toBe(true);
    });

    it('3. Snapshot con FK a decision NO EXISTENTE → retorna FALSE', async () => {
      const snapshotId = 'snap-123';
      const snapshot = {
        id: snapshotId,
        symbol: 'ETH',
        decisionAuditTrailId: 'dec-456',
      };

      snapshotRepo.findOne.mockResolvedValueOnce(snapshot);
      decisionRepo.findOne.mockResolvedValueOnce(null); // Decision no existe

      const result = await service.validateSnapshotIntegrity(snapshotId);
      expect(result).toBe(false);
    });

    it('4. Snapshot corrupto (sin symbol) → retorna FALSE', async () => {
      const snapshotId = 'snap-123';
      const snapshot = {
        id: snapshotId,
        symbol: null,
        decisionAuditTrailId: 'dec-456',
      };

      snapshotRepo.findOne.mockResolvedValueOnce(snapshot);

      const result = await service.validateSnapshotIntegrity(snapshotId);
      expect(result).toBe(false);
    });

    it('5. ID vacío → retorna FALSE', async () => {
      const result = await service.validateSnapshotIntegrity('');
      expect(result).toBe(false);
    });
  });

  // ========== logDecisionChange (5 tests)
  describe('logDecisionChange', () => {
    it('6. Crear log entry con datos válidos → persiste', async () => {
      const decisionId = 'dec-123';
      const action = 'UPDATED';
      const snapshotCount = 5;

      const mockLog = {
        id: 'log-123',
        decisionAuditTrailId: decisionId,
        action,
        snapshotCount,
        changedAt: new Date(),
      };

      changeLogRepo.save.mockResolvedValueOnce(mockLog);

      const result = await service.logDecisionChange(decisionId, action, snapshotCount);

      expect(result.decisionAuditTrailId).toBe(decisionId);
      expect(result.action).toBe(action);
      expect(result.snapshotCount).toBe(snapshotCount);
    });

    it('7. Log sin decision_id → throw error', async () => {
      await expect(service.logDecisionChange('', 'UPDATED')).rejects.toThrow(
        'decisionAuditTrailId no puede estar vacío',
      );
    });

    it('8. Log sin action → throw error', async () => {
      await expect(service.logDecisionChange('dec-123', '')).rejects.toThrow(
        'action no puede estar vacía',
      );
    });

    it('9. Log con snapshotCount=0 → se crea', async () => {
      const mockLog = {
        id: 'log-123',
        decisionAuditTrailId: 'dec-123',
        action: 'UPDATED',
        snapshotCount: 0,
      };

      changeLogRepo.save.mockResolvedValueOnce(mockLog);

      const result = await service.logDecisionChange('dec-123', 'UPDATED', 0);
      expect(result.snapshotCount).toBe(0);
    });

    it('10. Log sin snapshotCount (undefined) → se permite', async () => {
      const mockLog = {
        id: 'log-123',
        decisionAuditTrailId: 'dec-123',
        action: 'CREATED',
        snapshotCount: undefined,
      };

      changeLogRepo.save.mockResolvedValueOnce(mockLog);

      const result = await service.logDecisionChange('dec-123', 'CREATED');
      expect(result.snapshotCount).toBeUndefined();
    });
  });

  // ========== getDecisionHistory (5 tests)
  describe('getDecisionHistory', () => {
    it('11. Recuperar history de decision con 3 logs → retorna array DESC', async () => {
      const decisionId = 'dec-123';
      const logs = [
        { id: 'log-3', changedAt: new Date('2026-09-07T09:00:00') },
        { id: 'log-2', changedAt: new Date('2026-09-07T08:00:00') },
        { id: 'log-1', changedAt: new Date('2026-09-07T07:00:00') },
      ];

      changeLogRepo.find.mockResolvedValueOnce(logs);

      const result = await service.getDecisionHistory(decisionId);

      expect(result.length).toBe(3);
      expect(result[0].id).toBe('log-3'); // DESC order
    });

    it('12. Decision sin logs → retorna []', async () => {
      changeLogRepo.find.mockResolvedValueOnce([]);

      const result = await service.getDecisionHistory('dec-123');
      expect(result).toEqual([]);
    });

    it('13. Decision NO EXISTENTE → retorna []', async () => {
      const result = await service.getDecisionHistory('');
      expect(result).toEqual([]);
    });

    it('14. History con límite (implícito por DB) → respeta orden', async () => {
      const logs = [
        { id: 'log-5', changedAt: new Date('2026-09-07T05:00:00') },
        { id: 'log-4', changedAt: new Date('2026-09-07T04:00:00') },
      ];

      changeLogRepo.find.mockResolvedValueOnce(logs);

      const result = await service.getDecisionHistory('dec-123');
      expect(result.length).toBe(2);
    });

    it('15. Cambios con mismo timestamp → ordenados consistentemente', async () => {
      const sameTime = new Date('2026-09-07T09:00:00');
      const logs = [
        { id: 'log-1', changedAt: sameTime },
        { id: 'log-2', changedAt: sameTime },
      ];

      changeLogRepo.find.mockResolvedValueOnce(logs);

      const result = await service.getDecisionHistory('dec-123');
      expect(result.length).toBe(2);
    });
  });

  // ========== auditFullHistory (5 tests)
  describe('auditFullHistory', () => {
    it('16. 0 snapshots huérfanos → integrityScore=1.0, orphanCount=0', async () => {
      const snapshots = [
        {
          id: 'snap-1',
          symbol: 'ETH',
          decisionAuditTrailId: 'dec-1',
        },
        {
          id: 'snap-2',
          symbol: 'BTC',
          decisionAuditTrailId: 'dec-1',
        },
      ];

      snapshotRepo.find.mockResolvedValueOnce(snapshots);
      decisionRepo.findOne.mockResolvedValue({ id: 'dec-1' });

      const result = await service.auditFullHistory();

      expect(result.integrityScore).toBe(1.0);
      expect(result.orphanCount).toBe(0);
      expect(result.dangling).toEqual([]);
    });

    it('17. 1 snapshot huérfano (decision_id=null) → integrityScore=1.0 (nullable OK)', async () => {
      const snapshots = [
        {
          id: 'snap-1',
          symbol: 'ETH',
          decisionAuditTrailId: null,
        },
      ];

      snapshotRepo.find.mockResolvedValueOnce(snapshots);

      const result = await service.auditFullHistory();

      expect(result.integrityScore).toBe(1.0);
      expect(result.orphanCount).toBe(0); // Nullable es OK
      expect(result.dangling).toEqual([]);
    });

    it('18. 10 snapshots: 8 vinculados + 2 con decision NO EXISTENTE → integrityScore=0.8', async () => {
      const snapshots = [
        { id: 'snap-1', symbol: 'ETH', decisionAuditTrailId: 'dec-1' },
        { id: 'snap-2', symbol: 'BTC', decisionAuditTrailId: 'dec-1' },
        { id: 'snap-3', symbol: 'ETH', decisionAuditTrailId: 'dec-2' },
        { id: 'snap-4', symbol: 'BTC', decisionAuditTrailId: 'dec-2' },
        { id: 'snap-5', symbol: 'ETH', decisionAuditTrailId: 'dec-3' },
        { id: 'snap-6', symbol: 'BTC', decisionAuditTrailId: 'dec-3' },
        { id: 'snap-7', symbol: 'ETH', decisionAuditTrailId: 'dec-4' },
        { id: 'snap-8', symbol: 'BTC', decisionAuditTrailId: 'dec-4' },
        { id: 'snap-9', symbol: 'ETH', decisionAuditTrailId: 'dec-missing' }, // Missing
        { id: 'snap-10', symbol: 'BTC', decisionAuditTrailId: 'dec-missing' }, // Missing
      ];

      snapshotRepo.find.mockResolvedValueOnce(snapshots);

      // First 8 decisions exist
      decisionRepo.findOne.mockResolvedValueOnce({ id: 'dec-1' });
      decisionRepo.findOne.mockResolvedValueOnce({ id: 'dec-1' });
      decisionRepo.findOne.mockResolvedValueOnce({ id: 'dec-2' });
      decisionRepo.findOne.mockResolvedValueOnce({ id: 'dec-2' });
      decisionRepo.findOne.mockResolvedValueOnce({ id: 'dec-3' });
      decisionRepo.findOne.mockResolvedValueOnce({ id: 'dec-3' });
      decisionRepo.findOne.mockResolvedValueOnce({ id: 'dec-4' });
      decisionRepo.findOne.mockResolvedValueOnce({ id: 'dec-4' });
      // Last 2 don't exist
      decisionRepo.findOne.mockResolvedValueOnce(null);
      decisionRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.auditFullHistory();

      expect(result.integrityScore).toBe(0.8); // 8/10
      expect(result.orphanCount).toBe(2);
      expect(result.dangling).toContain('snap-9');
      expect(result.dangling).toContain('snap-10');
    });

    it('19. BD vacía → integrityScore=undefined, orphanCount=0', async () => {
      snapshotRepo.find.mockResolvedValueOnce([]);

      const result = await service.auditFullHistory();

      expect(result.integrityScore).toBeUndefined();
      expect(result.orphanCount).toBe(0);
      expect(result.dangling).toEqual([]);
    });

    it('20. Snapshot vinculado a decision NO EXISTENTE → cuenta como dangling', async () => {
      const snapshots = [
        {
          id: 'snap-1',
          symbol: 'ETH',
          decisionAuditTrailId: 'dec-missing',
        },
      ];

      snapshotRepo.find.mockResolvedValueOnce(snapshots);
      decisionRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.auditFullHistory();

      expect(result.orphanCount).toBe(1);
      expect(result.dangling).toContain('snap-1');
      expect(result.decisionsMissing).toContain('dec-missing');
    });
  });
});
