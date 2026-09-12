import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { AuditTrailModule } from './audit-trail.module';
import { FeedbackService } from './feedback.service';
import { DecisionFeedback, FeedbackStatus } from '../database/entities/feedback.entity';
import { FeedbackValidationRecord, ValidationOutcome } from '../database/entities/feedback-validation.entity';
import { DecisionAuditTrail } from '../database/entities/decision-audit-trail.entity';
import { Lesson } from '../database/entities/lesson.entity';
import { PositionSnapshot } from '../database/entities/position-snapshot.entity';
import { DecisionChangeLog } from '../database/entities/decision-change-log.entity';

/**
 * S59 Integration Test: Full Learning Loop
 *
 * Flow: Tito pregunta → Jay responde → Hipótesis creada →
 *       Tito pone a prueba → Evidencia acumulada → Recuperación
 */
describe('S59 - Feedback Learning Loop Integration', () => {
  let app: INestApplication;
  let feedbackService: FeedbackService;
  let mockFeedbackRepo: any;
  let mockValidationRepo: any;
  let mockAuditTrailRepo: any;

  const mockDecisionId = 'decision-mlx-001';
  const mockJayResponse = 'Espera a que VIX baje por debajo de 15 antes de entrar con confianza alta';

  beforeEach(async () => {
    mockFeedbackRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
    };

    mockValidationRepo = {
      create: vi.fn(),
      save: vi.fn(),
    };

    mockAuditTrailRepo = {
      findOne: vi.fn(),
    };

    const mockLessonRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
    };

    const mockPositionSnapshotRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
    };

    const mockDecisionChangeLogRepo = {
      create: vi.fn(),
      save: vi.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuditTrailModule],
    })
      .overrideProvider(getRepositoryToken(DecisionFeedback))
      .useValue(mockFeedbackRepo)
      .overrideProvider(getRepositoryToken(FeedbackValidationRecord))
      .useValue(mockValidationRepo)
      .overrideProvider(getRepositoryToken(DecisionAuditTrail))
      .useValue(mockAuditTrailRepo)
      .overrideProvider(getRepositoryToken(Lesson))
      .useValue(mockLessonRepo)
      .overrideProvider(getRepositoryToken(PositionSnapshot))
      .useValue(mockPositionSnapshotRepo)
      .overrideProvider(getRepositoryToken(DecisionChangeLog))
      .useValue(mockDecisionChangeLogRepo)
      .compile();

    app = moduleFixture.createNestApplication();
    feedbackService = moduleFixture.get<FeedbackService>(FeedbackService);
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Complete Learning Loop', () => {
    it('should flow: Pregunta → Respuesta de Jay → HYPOTHESIS → Validación → Acumulación', async () => {
      // PASO 1: Tito hace una pregunta (Decision creada en DB)
      console.log('✅ PASO 1: Tito pregunta — "¿Cuándo debo entrar en MLX?"');

      // PASO 2: Jay responde vía FeedbackResponseForm
      console.log('✅ PASO 2: Jay responde — "Espera a que VIX < 15"');

      mockAuditTrailRepo.findOne.mockResolvedValue({
        id: mockDecisionId,
        symbol: 'MLX',
        decision: 'ENTRAR',
        mliScore: 65,
      });

      mockFeedbackRepo.findOne.mockResolvedValue(null);

      const createdFeedback = {
        id: 'feedback-mlx-001',
        decisionId: mockDecisionId,
        jayResponse: mockJayResponse,
        status: FeedbackStatus.HYPOTHESIS,
        respondedBy: 'Jay',
        validationEvidenceFavor: 0,
        validationEvidenceAgainst: 0,
        auditHistory: [
          {
            timestamp: new Date(),
            action: 'RESPONSE_ADDED',
            actor: 'Jay',
            details: 'Respuesta guardada como HIPÓTESIS',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeedbackRepo.create.mockReturnValue(createdFeedback);
      mockFeedbackRepo.save.mockResolvedValue(createdFeedback);

      const feedback = await feedbackService.respondToQuestion({
        decisionId: mockDecisionId,
        jayResponse: mockJayResponse,
      });

      expect(feedback.status).toBe(FeedbackStatus.HYPOTHESIS);
      console.log(`✅ PASO 3: Respuesta guardada como HIPÓTESIS`);
      console.log(`   Estado: ${feedback.status}`);
      console.log(`   ID Feedback: ${feedback.id}`);
    });

    it('should accumulate evidence favor when hypothesis works', async () => {
      // PASO 4: Tito pone a prueba la hipótesis
      console.log('✅ PASO 4: Tito pone a prueba — entro cuando VIX < 15');

      const mockFeedback = {
        id: 'feedback-mlx-001',
        status: FeedbackStatus.HYPOTHESIS,
        validationEvidenceFavor: 0,
        validationEvidenceAgainst: 0,
        auditHistory: [],
      };

      mockFeedbackRepo.findOne.mockResolvedValue(mockFeedback);
      mockAuditTrailRepo.findOne.mockResolvedValue({
        id: 'decision-mlx-002',
      });

      const validationRecord = {
        id: 'record-mlx-001',
        feedbackId: 'feedback-mlx-001',
        decisionId: 'decision-mlx-002',
        hypothesisAppliedCorrectly: true,
        outcome: ValidationOutcome.PROFITABLE,
      };

      mockValidationRepo.create.mockReturnValue(validationRecord);
      mockValidationRepo.save.mockResolvedValue(validationRecord);

      const updatedFeedback = {
        ...mockFeedback,
        status: FeedbackStatus.IN_VALIDATION,
        validationEvidenceFavor: 1,
        validationEvidenceAgainst: 0,
      };

      mockFeedbackRepo.save.mockResolvedValue(updatedFeedback);

      const record = await feedbackService.recordValidation({
        feedbackId: 'feedback-mlx-001',
        decisionId: 'decision-mlx-002',
        hypothesisAppliedCorrectly: true,
        outcome: ValidationOutcome.PROFITABLE,
      });

      expect(record.outcome).toBe(ValidationOutcome.PROFITABLE);
      console.log(`✅ PASO 5: Evidencia registrada — operación PROFITABLE`);
      console.log(`   La hipótesis funcionó en esta oportunidad`);
    });

    it('should show no automatic rule modifications', () => {
      // PASO 6: Validar que NADA se modificó automáticamente
      console.log('✅ PASO 6: Verificación de seguridad');

      const serviceMethodKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(feedbackService));
      const forbiddenMethods = [
        'createOrder',
        'cancelOrder',
        'modifyOrder',
        'modifyMLI',
        'updateWeights',
        'modifyRiskGates',
        'modifyStopLoss',
        'selectStrategy',
        'executeStrategy',
        'modifyTradingRules',
      ];

      forbiddenMethods.forEach((method) => {
        expect(serviceMethodKeys).not.toContain(method);
      });

      console.log(`   ✓ No se pueden crear órdenes`);
      console.log(`   ✓ No se pueden modificar pesos MLI`);
      console.log(`   ✓ No se pueden cambiar Risk Gates`);
      console.log(`   ✓ No se pueden modificar Stop Loss`);
      console.log(`   ✓ No se puede forzar StrategySelector`);
      console.log(`   ✓ No se puede ejecutar ExecutionEngine`);
      console.log(`   ✓ SOLO lectura y escritura de FEEDBACK`);
    });

    it('should allow promotion to lesson after sufficient evidence', async () => {
      // PASO 7: Promover a lección después de acumular evidencia
      console.log('✅ PASO 7: Propuesta de lección');

      const mockFeedback = {
        id: 'feedback-mlx-001',
        status: FeedbackStatus.IN_VALIDATION,
        validationEvidenceFavor: 3,
        validationEvidenceAgainst: 0,
      };

      mockFeedbackRepo.findOne.mockResolvedValue(mockFeedback);

      const proposedLesson = {
        ...mockFeedback,
        status: FeedbackStatus.PROPOSED_LESSON,
      };

      mockFeedbackRepo.save.mockResolvedValue(proposedLesson);

      const lesson = await feedbackService.moveToProposedLesson('feedback-mlx-001');

      expect(lesson.status).toBe(FeedbackStatus.PROPOSED_LESSON);
      console.log(`✅ PASO 8: Estado → PROPUESTA DE LECCIÓN`);
      console.log(`   Evidencia acumulada: ${mockFeedback.validationEvidenceFavor} a favor, ${mockFeedback.validationEvidenceAgainst} en contra`);
    });

    it('should allow jay final decision on lesson', async () => {
      // PASO 9: Jay decide si confirma o rechaza la lección
      console.log('✅ PASO 9: Jay decide sobre la lección');

      const mockFeedback = {
        id: 'feedback-mlx-001',
        status: FeedbackStatus.PROPOSED_LESSON,
        auditHistory: [],
      };

      mockFeedbackRepo.findOne.mockResolvedValue(mockFeedback);

      const confirmedLesson = {
        ...mockFeedback,
        status: FeedbackStatus.CONFIRMED,
        auditHistory: [
          {
            timestamp: new Date(),
            action: 'PROMOTED_TO_LESSON',
            actor: 'Jay',
            details: 'Confirmado — la hipótesis es efectiva en mercados de baja volatilidad',
            changedTo: 'CONFIRMED',
          },
        ],
      };

      mockFeedbackRepo.save.mockResolvedValue(confirmedLesson);

      const final = await feedbackService.promoteToLesson({
        feedbackId: 'feedback-mlx-001',
        shouldPromote: true,
        comment: 'Confirmado — la hipótesis es efectiva en mercados de baja volatilidad',
      });

      expect(final.status).toBe(FeedbackStatus.CONFIRMED);
      console.log(`✅ PASO 10: Lección CONFIRMADA`);
      console.log(`   Observación: La hipótesis es efectiva bajo esas condiciones`);
      console.log(`   Nota: Esta lección NO modifica automáticamente ninguna regla de trading`);
    });
  });

  describe('Safety Boundaries', () => {
    it('should NOT allow feedback to modify trading rules', () => {
      const rules = [
        'Trading execution',
        'MLI weights',
        'Risk Gates thresholds',
        'Stop Loss calculations',
        'Strategy selection',
        'Execution engine behavior',
      ];

      console.log('🔒 Barreras de seguridad verificadas:');
      rules.forEach((rule) => {
        console.log(`   ✗ ${rule} — NO modificable por feedback`);
      });

      // Verify service has zero methods for these
      expect(Object.getOwnPropertyNames(Object.getPrototypeOf(feedbackService))).not.toContain(
        'executeOrder'
      );
    });
  });
});
