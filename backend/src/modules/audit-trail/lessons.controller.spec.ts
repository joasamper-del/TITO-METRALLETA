import { Test, TestingModule } from '@nestjs/testing';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('LessonsController (S59 API Testing)', () => {
  let controller: LessonsController;
  let service: LessonsService;

  const mockLesson = {
    id: 'lesson-1',
    title: 'Espera cuando VIX < 15',
    description: 'When VIX is below 15, wait for better entry',
    action: 'ESPERAR',
    confidence: 75,
    sampleSize: 4,
    favorableCount: 3,
    unfavorableCount: 1,
    lessonType: 'PRELIMINARY',
    confirmedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonsController],
      providers: [
        {
          provide: LessonsService,
          useValue: {
            searchRelevantLessons: vi.fn(),
            getLessonLineage: vi.fn(),
            getConfirmedLessons: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LessonsController>(LessonsController);
    service = module.get<LessonsService>(LessonsService);
  });

  describe('🔒 READ-ONLY ENDPOINTS', () => {
    it('✅ GET /lessons/search returns lessons (read-only)', async () => {
      vi.spyOn(service, 'searchRelevantLessons').mockResolvedValue([mockLesson] as any);

      const result = await controller.searchLessons('58', '22', 'SPY', 'ESPERAR', '60', 'PRELIMINARY');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('consultedAt');
      expect(result).toHaveProperty('matchCount', 1);
      expect(result.lessons).toHaveLength(1);
    });

    it('✅ GET /lessons/{id}/lineage returns traceability (read-only)', async () => {
      vi.spyOn(service, 'getLessonLineage').mockResolvedValue({
        lesson: mockLesson,
        originatingFeedback: { id: 'feedback-1', jayResponse: 'Espera VIX < 15' },
        auditTrail: [{ timestamp: new Date(), action: 'CREATED' }],
      });

      const result = await controller.getLessonLineage('lesson-1');

      expect(result).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('lesson');
      expect(result.data).toHaveProperty('originatingFeedback');
      expect(result.data).toHaveProperty('auditTrail');
    });

    it('✅ GET /lessons/confirmed returns confirmed lessons (read-only)', async () => {
      vi.spyOn(service, 'getConfirmedLessons').mockResolvedValue([mockLesson] as any);

      const result = await controller.getConfirmedLessons();

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('count', 1);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('🔐 SAFETY VERIFICATION', () => {
    it('✅ Health check confirms READ-ONLY mode', async () => {
      const result = controller.healthCheck();

      expect(result.success).toBe(true);
      expect(result.safety.canModifyRules).toBe(false);
      expect(result.safety.canExecuteOrders).toBe(false);
      expect(result.safety.canModifyMLI).toBe(false);
      expect(result.safety.canBlockOrders).toBe(false);
      expect(result.safety.lessonsAreContextOnly).toBe(true);
      expect(result.safety.lessonsAreReadOnly).toBe(true);
    });

    it('✅ No write endpoints exist', () => {
      const methods = Object.getOwnPropertyNames(LessonsController.prototype);
      const writeMethodPatterns = ['create', 'update', 'delete', 'execute', 'modify'];

      writeMethodPatterns.forEach((pattern) => {
        const writeMethod = methods.find((m) => m.toLowerCase().includes(pattern));
        expect(writeMethod).toBeUndefined();
      });
    });

    it('✅ Controller has NO order execution capability', () => {
      const methods = Object.getOwnPropertyNames(controller);
      expect(methods).not.toContain('createOrder');
      expect(methods).not.toContain('executeOrder');
      expect(methods).not.toContain('cancelOrder');
    });

    it('✅ Controller has NO MLI modification capability', () => {
      const methods = Object.getOwnPropertyNames(controller);
      expect(methods).not.toContain('modifyMLI');
      expect(methods).not.toContain('updateWeights');
      expect(methods).not.toContain('changeRules');
    });
  });

  describe('📊 QUERY PARAMETER TESTS', () => {
    it('✅ Accepts all search criteria parameters', async () => {
      vi.spyOn(service, 'searchRelevantLessons').mockResolvedValue([]);

      await controller.searchLessons('58', '22', 'SPY', 'ESPERAR', '70', 'PRELIMINARY');

      expect(service.searchRelevantLessons).toHaveBeenCalledWith(
        expect.objectContaining({
          mliScore: 58,
          vixValue: 22,
          symbol: 'SPY',
          action: 'ESPERAR',
          confidenceMin: 70,
          lessonType: 'PRELIMINARY',
        }),
      );
    });

    it('✅ Handles missing optional parameters', async () => {
      vi.spyOn(service, 'searchRelevantLessons').mockResolvedValue([]);

      await controller.searchLessons(undefined, undefined, undefined, undefined, undefined, undefined);

      expect(service.searchRelevantLessons).toHaveBeenCalledWith(
        expect.objectContaining({
          mliScore: undefined,
          vixValue: undefined,
          symbol: undefined,
          action: undefined,
          confidenceMin: 60, // default value
          lessonType: undefined,
        }),
      );
    });

    it('✅ Parses numeric parameters correctly', async () => {
      vi.spyOn(service, 'searchRelevantLessons').mockResolvedValue([]);

      await controller.searchLessons('58.5', '22.3', 'SPY', 'ESPERAR', '65.2');

      expect(service.searchRelevantLessons).toHaveBeenCalledWith(
        expect.objectContaining({
          mliScore: 58.5,
          vixValue: 22.3,
          confidenceMin: 65.2,
        }),
      );
    });
  });

  describe('🚨 ERROR HANDLING', () => {
    it('❌ Returns 404 when lesson not found', async () => {
      vi.spyOn(service, 'getLessonLineage').mockRejectedValue(new Error('Lesson not found'));

      await expect(controller.getLessonLineage('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('❌ Returns 400 for invalid parameters', async () => {
      vi.spyOn(service, 'searchRelevantLessons').mockRejectedValue(new Error('Invalid parameter'));

      await expect(
        controller.searchLessons('invalid-mli', '22', 'SPY', 'ESPERAR'),
      ).rejects.toThrow();
    });

    it('❌ Handles service errors gracefully', async () => {
      vi.spyOn(service, 'getConfirmedLessons').mockRejectedValue(new Error('Database error'));

      await expect(controller.getConfirmedLessons()).rejects.toThrow();
    });
  });

  describe('📋 RESPONSE FORMAT', () => {
    it('✅ Search response includes metadata', async () => {
      vi.spyOn(service, 'searchRelevantLessons').mockResolvedValue([mockLesson] as any);

      const result = await controller.searchLessons('58', '22', 'SPY');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('consultedAt');
      expect(result).toHaveProperty('matchCount');
      expect(result).toHaveProperty('lessons');
    });

    it('✅ Lineage response includes full traceability', async () => {
      vi.spyOn(service, 'getLessonLineage').mockResolvedValue({
        lesson: mockLesson,
        originatingFeedback: { id: 'fb-1' },
        auditTrail: [{ action: 'CREATED' }],
      });

      const result = await controller.getLessonLineage('lesson-1');

      expect(result.data.lesson).toBeDefined();
      expect(result.data.originatingFeedback).toBeDefined();
      expect(Array.isArray(result.data.auditTrail)).toBe(true);
    });

    it('✅ Confirmed lessons response includes count', async () => {
      vi.spyOn(service, 'getConfirmedLessons').mockResolvedValue([mockLesson, mockLesson] as any);

      const result = await controller.getConfirmedLessons();

      expect(result.count).toBe(2);
      expect(result.data).toHaveLength(2);
    });
  });
});
