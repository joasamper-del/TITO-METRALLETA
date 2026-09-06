import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeedbackService } from './feedback.service';
import { DecisionFeedback, FeedbackStatus } from '../database/entities/feedback.entity';
import { FeedbackValidationRecord, ValidationOutcome } from '../database/entities/feedback-validation.entity';
import { DecisionAuditTrail } from '../database/entities/decision-audit-trail.entity';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let mockFeedbackRepo: any;
  let mockValidationRepo: any;
  let mockAuditTrailRepo: any;

  beforeEach(async () => {
    mockFeedbackRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockValidationRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    mockAuditTrailRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: getRepositoryToken(DecisionFeedback),
          useValue: mockFeedbackRepo,
        },
        {
          provide: getRepositoryToken(FeedbackValidationRecord),
          useValue: mockValidationRepo,
        },
        {
          provide: getRepositoryToken(DecisionAuditTrail),
          useValue: mockAuditTrailRepo,
        },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  describe('respondToQuestion', () => {
    it('should create feedback in HYPOTHESIS state', async () => {
      const decisionId = 'decision-123';
      const jayResponse = 'Espera a que VIX baje < 15';

      mockFeedbackRepo.findOne.mockResolvedValue(null);
      mockAuditTrailRepo.findOne.mockResolvedValue({ id: decisionId });

      const createdFeedback = {
        id: 'feedback-123',
        decisionId,
        jayResponse,
        status: FeedbackStatus.HYPOTHESIS,
        respondedBy: 'Jay',
        validationEvidenceFavor: 0,
        validationEvidenceAgainst: 0,
        auditHistory: [],
      };

      mockFeedbackRepo.create.mockReturnValue(createdFeedback);
      mockFeedbackRepo.save.mockResolvedValue(createdFeedback);

      const result = await service.respondToQuestion({
        decisionId,
        jayResponse,
      });

      expect(result.status).toBe(FeedbackStatus.HYPOTHESIS);
      expect(result.jayResponse).toBe(jayResponse);
      expect(mockFeedbackRepo.save).toHaveBeenCalled();
    });

    it('should throw if feedback already exists', async () => {
      const decisionId = 'decision-123';
      mockFeedbackRepo.findOne.mockResolvedValue({ id: 'feedback-123' });

      await expect(
        service.respondToQuestion({
          decisionId,
          jayResponse: 'test',
        })
      ).rejects.toThrow();
    });

    it('should throw if decision not found', async () => {
      const decisionId = 'non-existent';
      mockFeedbackRepo.findOne.mockResolvedValue(null);
      mockAuditTrailRepo.findOne.mockResolvedValue(null);

      await expect(
        service.respondToQuestion({
          decisionId,
          jayResponse: 'test',
        })
      ).rejects.toThrow();
    });
  });

  describe('recordValidation', () => {
    it('should increment evidence favor for profitable outcome', async () => {
      const feedbackId = 'feedback-123';
      const decisionId = 'decision-456';

      mockFeedbackRepo.findOne.mockResolvedValue({
        id: feedbackId,
        status: FeedbackStatus.HYPOTHESIS,
        validationEvidenceFavor: 0,
        validationEvidenceAgainst: 0,
        auditHistory: null,
      });

      mockAuditTrailRepo.findOne.mockResolvedValue({ id: decisionId });

      const record = {
        id: 'record-123',
        feedbackId,
        decisionId,
        outcome: ValidationOutcome.PROFITABLE,
      };

      mockValidationRepo.create.mockReturnValue(record);
      mockValidationRepo.save.mockResolvedValue(record);
      mockFeedbackRepo.save.mockResolvedValue({
        ...mockFeedbackRepo.findOne(),
        validationEvidenceFavor: 1,
      });

      await service.recordValidation({
        feedbackId,
        decisionId,
        hypothesisAppliedCorrectly: true,
        outcome: ValidationOutcome.PROFITABLE,
      });

      expect(mockValidationRepo.save).toHaveBeenCalled();
    });
  });

  describe('safety guarantees', () => {
    it('should never create trading orders', () => {
      // Feedback service has NO methods to create/modify/cancel orders
      expect(typeof (service as any).createOrder).toBe('undefined');
      expect(typeof (service as any).cancelOrder).toBe('undefined');
      expect(typeof (service as any).modifyOrder).toBe('undefined');
    });

    it('should never touch MLI weights', () => {
      expect(typeof (service as any).modifyMLI).toBe('undefined');
      expect(typeof (service as any).updateWeights).toBe('undefined');
    });

    it('should never touch Risk Gates', () => {
      expect(typeof (service as any).modifyRiskGates).toBe('undefined');
    });

    it('should never touch Stop Loss', () => {
      expect(typeof (service as any).modifyStopLoss).toBe('undefined');
    });

    it('should never touch StrategySelector', () => {
      expect(typeof (service as any).selectStrategy).toBe('undefined');
    });

    it('should never touch ExecutionEngine', () => {
      expect(typeof (service as any).executeStrategy).toBe('undefined');
    });
  });
});
