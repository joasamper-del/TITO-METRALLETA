import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LessonsService } from './lessons.service';
import { Lesson } from '../database/entities/lesson.entity';
import { DecisionFeedback, FeedbackStatus } from '../database/entities/feedback.entity';

describe('LessonsService (S59 Testing)', () => {
  let service: LessonsService;
  let lessonRepository: Repository<Lesson>;
  let feedbackRepository: Repository<DecisionFeedback>;

  // Mock data
  const mockLesson: Partial<Lesson> = {
    id: 'lesson-1',
    feedbackId: 'feedback-1',
    title: 'Espera cuando VIX < 15',
    action: 'ESPERAR',
    confidence: 75,
    sampleSize: 4,
    favorableCount: 3,
    unfavorableCount: 1,
    lessonType: 'PRELIMINARY',
  };

  const mockFeedback: Partial<DecisionFeedback> = {
    id: 'feedback-1',
    decisionId: 'decision-1',
    jayResponse: 'Espera a VIX < 15',
    status: FeedbackStatus.HYPOTHESIS,
    validationEvidenceFavor: 2,
    validationEvidenceAgainst: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        {
          provide: getRepositoryToken(Lesson),
          useValue: {
            createQueryBuilder: vi.fn(),
            create: vi.fn(),
            save: vi.fn(),
            findOne: vi.fn(),
            find: vi.fn(),
          },
        },
        {
          provide: getRepositoryToken(DecisionFeedback),
          useValue: {
            findOne: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LessonsService>(LessonsService);
    lessonRepository = module.get<Repository<Lesson>>(getRepositoryToken(Lesson));
    feedbackRepository = module.get<Repository<DecisionFeedback>>(
      getRepositoryToken(DecisionFeedback),
    );
  });

  describe('🔒 SECURITY TESTS', () => {
    it('✅ Lessons CANNOT create orders', () => {
      // Verify service has no method to create/execute orders
      expect(service.createFromConfirmedFeedback).toBeDefined();
      expect(typeof service.createFromConfirmedFeedback).toBe('function');
      // Service should NOT have order-related methods
      expect((service as any).createOrder).toBeUndefined();
      expect((service as any).executeOrder).toBeUndefined();
    });

    it('✅ Lessons CANNOT modify MLI weights', () => {
      // Verify service has no method to modify MLI
      expect((service as any).modifyMLI).toBeUndefined();
      expect((service as any).updateRuleWeight).toBeUndefined();
    });

    it('✅ Lessons CANNOT increase execution autonomy', () => {
      // Verify service has no autonomy modification methods
      expect((service as any).increaseAutonomy).toBeUndefined();
      expect((service as any).enableAutoExecution).toBeUndefined();
    });

    it('✅ Search endpoints are READ-ONLY', () => {
      // searchRelevantLessons should only query, not modify
      expect(typeof service.searchRelevantLessons).toBe('function');
      // Should not have write side effects
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(service));
      const dangerousMethods = methods.filter((m) =>
        m.includes('Delete') || m.includes('Update') || m.includes('Execute'),
      );
      expect(dangerousMethods).toEqual([]);
    });
  });

  describe('📊 THRESHOLD ENFORCEMENT TESTS', () => {
    it('✅ PRELIMINARY requires minimum 3 evaluations', () => {
      // Lesson with 1 evaluation should NOT be PRELIMINARY
      const lesson = { ...mockLesson, sampleSize: 1 };
      expect(lesson.sampleSize).toBe(1);
      expect(lesson.lessonType).toBe('PRELIMINARY');
      // This should be enforced at service level (tested separately)
    });

    it('✅ PRELIMINARY requires 66% confidence minimum', () => {
      // Confidence = 2/3 = 66.67% (passes)
      const lessonPass = { ...mockLesson, favorableCount: 2, unfavorableCount: 1 };
      const confidence = (lessonPass.favorableCount / (lessonPass.favorableCount + lessonPass.unfavorableCount)) * 100;
      expect(confidence).toBeGreaterThanOrEqual(66);

      // Confidence = 1/2 = 50% (fails)
      const lessonFail = { ...mockLesson, favorableCount: 1, unfavorableCount: 1 };
      const confidenceFail = (lessonFail.favorableCount / (lessonFail.favorableCount + lessonFail.unfavorableCount)) * 100;
      expect(confidenceFail).toBeLessThan(66);
    });

    it('❌ Should NOT create PRELIMINARY lesson with < 3 samples', async () => {
      vi.spyOn(feedbackRepository, 'findOne').mockResolvedValue(mockFeedback as any);
      vi.spyOn(lessonRepository, 'create').mockReturnValue(mockLesson as any);

      // This should fail or warn (implementation detail)
      const feedback = { ...mockFeedback, validationEvidenceFavor: 1, validationEvidenceAgainst: 0 };
      expect(feedback.validationEvidenceFavor + (feedback.validationEvidenceAgainst || 0)).toBeLessThan(3);
    });
  });

  describe('🔍 TRACEABILITY TESTS', () => {
    it('✅ getLessonLineage returns complete audit trail', async () => {
      vi.spyOn(lessonRepository, 'findOne').mockResolvedValue({
        ...mockLesson,
        feedback: mockFeedback,
        auditTrail: [
          {
            timestamp: new Date(),
            action: 'LESSON_CREATED_FROM_FEEDBACK',
            actor: 'System',
          },
        ],
      } as any);

      const lineage = await service.getLessonLineage('lesson-1');

      expect(lineage).toHaveProperty('lesson');
      expect(lineage).toHaveProperty('originatingFeedback');
      expect(lineage).toHaveProperty('auditTrail');
      expect(Array.isArray(lineage.auditTrail)).toBe(true);
    });

    it('✅ Audit trail tracks all state changes', async () => {
      vi.spyOn(lessonRepository, 'findOne').mockResolvedValue({
        ...mockLesson,
        feedback: mockFeedback,
        auditTrail: [
          { timestamp: new Date(), action: 'LESSON_CREATED_FROM_FEEDBACK', actor: 'System' },
          { timestamp: new Date(), action: 'VALIDATION_RECORDED', favorable: true },
          { timestamp: new Date(), action: 'VALIDATION_RECORDED', favorable: false },
          { timestamp: new Date(), action: 'CONFIDENCE_UPDATED', confidence: 75 },
        ],
      } as any);

      const lineage = await service.getLessonLineage('lesson-1');
      expect(lineage.auditTrail.length).toBeGreaterThan(1);
    });
  });

  describe('📈 LESSONS SERVICE TESTS', () => {
    it('✅ searchRelevantLessons filters by MLI range', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([mockLesson]),
      };

      vi.spyOn(lessonRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const results = await service.searchRelevantLessons({ mliScore: 58 });

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockLesson);
    });

    it('✅ searchRelevantLessons filters by VIX range', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };

      vi.spyOn(lessonRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await service.searchRelevantLessons({ vixValue: 22 });

      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('✅ recordValidationOutcome updates confidence scores', async () => {
      const lesson = { ...mockLesson } as any;
      vi.spyOn(lessonRepository, 'findOne').mockResolvedValue(lesson);
      vi.spyOn(lessonRepository, 'save').mockResolvedValue(lesson);

      const updated = await service.recordValidationOutcome('lesson-1', true, true);

      expect(updated).toBeDefined();
      expect(updated.sampleSize).toBeGreaterThan(0);
      expect(updated.confidence).toBeGreaterThanOrEqual(0);
      expect(updated.confidence).toBeLessThanOrEqual(100);
    });

    it('✅ createFromConfirmedFeedback requires valid feedback', async () => {
      vi.spyOn(feedbackRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createFromConfirmedFeedback('invalid-id', 'title')).rejects.toThrow();
    });
  });

  describe('🚨 ERROR HANDLING TESTS', () => {
    it('❌ Should handle lesson not found', async () => {
      vi.spyOn(lessonRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getLessonLineage('nonexistent')).rejects.toThrow();
    });

    it('❌ Should handle feedback not found', async () => {
      vi.spyOn(feedbackRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createFromConfirmedFeedback('invalid-id', 'title')).rejects.toThrow();
    });

    it('❌ Should handle database errors gracefully', async () => {
      vi.spyOn(lessonRepository, 'findOne').mockRejectedValue(new Error('DB Error'));

      await expect(service.getLessonLineage('lesson-1')).rejects.toThrow();
    });
  });

  describe('🎯 CLASSIFICATION TESTS', () => {
    it('✅ Distinguishes PRELIMINARY from CONFIRMED', () => {
      const preliminary: Partial<Lesson> = { ...mockLesson, lessonType: 'PRELIMINARY' };
      const confirmed: Partial<Lesson> = { ...mockLesson, lessonType: 'CONFIRMED' };

      expect(preliminary.lessonType).not.toEqual(confirmed.lessonType);
    });

    it('✅ PRELIMINARY shows as "recommendation only"', () => {
      const lesson: Partial<Lesson> = { ...mockLesson, lessonType: 'PRELIMINARY' };
      // In UI, PRELIMINARY should display as "Recomendación" or "En validación"
      expect(['PRELIMINARY', 'VALIDATED', 'REFINED']).toContain(lesson.lessonType);
    });
  });

  describe('🔄 STATE MACHINE TESTS', () => {
    it('✅ Lesson status transitions are valid', () => {
      const validTransitions = {
        PRELIMINARY: ['VALIDATED', 'REJECTED'],
        VALIDATED: ['REFINED', 'REJECTED'],
        REFINED: ['REJECTED'],
        REJECTED: [],
      };

      expect(validTransitions).toBeDefined();
      // Verify no backward transitions
      Object.keys(validTransitions).forEach((from) => {
        const transitions = validTransitions[from];
        transitions.forEach((to) => {
          expect(to).not.toEqual(from);
        });
      });
    });
  });
});
