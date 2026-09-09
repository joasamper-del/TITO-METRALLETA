import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DecisionFeedback, FeedbackStatus } from '../database/entities/feedback.entity';
import { FeedbackValidationRecord, ValidationOutcome } from '../database/entities/feedback-validation.entity';
import { DecisionAuditTrail } from '../database/entities/decision-audit-trail.entity';

export interface RespondToQuestionInput {
  decisionId: string;
  jayResponse: string;
}

export interface RecordValidationInput {
  feedbackId: string;
  decisionId: string;
  hypothesisAppliedCorrectly?: boolean;
  outcome?: ValidationOutcome;
  conditionsMatching?: boolean;
  notes?: string;
}

export interface PromoteLessonInput {
  feedbackId: string;
  shouldPromote: boolean;
  comment?: string;
}

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(DecisionFeedback)
    private feedbackRepo: Repository<DecisionFeedback>,
    @InjectRepository(FeedbackValidationRecord)
    private validationRecordRepo: Repository<FeedbackValidationRecord>,
    @InjectRepository(DecisionAuditTrail)
    private auditTrailRepo: Repository<DecisionAuditTrail>
  ) {}

  /**
   * Create feedback in HYPOTHESIS state
   * Only stores the response, never modifies any trading rules
   */
  async respondToQuestion(input: RespondToQuestionInput): Promise<DecisionFeedback> {
    const existing = await this.feedbackRepo.findOne({
      where: { decisionId: input.decisionId },
    });

    if (existing) {
      throw new Error(`Feedback already exists for decision ${input.decisionId}`);
    }

    const decision = await this.auditTrailRepo.findOne({
      where: { id: input.decisionId },
    });

    if (!decision) {
      throw new Error(`Decision ${input.decisionId} not found`);
    }

    const feedback = this.feedbackRepo.create({
      decisionId: input.decisionId,
      jayResponse: input.jayResponse,
      status: FeedbackStatus.HYPOTHESIS,
      respondedBy: 'Jay',
      auditHistory: [
        {
          timestamp: new Date(),
          action: 'RESPONSE_ADDED',
          actor: 'Jay',
          details: `Response to decision ${input.decisionId}`,
        },
      ],
    });

    return this.feedbackRepo.save(feedback);
  }

  /**
   * Get feedback for a decision
   * Returns full validation history
   */
  async getFeedback(decisionId: string): Promise<DecisionFeedback | null> {
    return this.feedbackRepo.findOne({
      where: { decisionId },
      relations: ['validationRecords'],
    });
  }

  /**
   * Record validation: accumulate evidence without modifying rules
   */
  async recordValidation(input: RecordValidationInput): Promise<FeedbackValidationRecord> {
    const feedback = await this.feedbackRepo.findOne({
      where: { id: input.feedbackId },
    });

    if (!feedback) {
      throw new Error(`Feedback ${input.feedbackId} not found`);
    }

    const decision = await this.auditTrailRepo.findOne({
      where: { id: input.decisionId },
    });

    if (!decision) {
      throw new Error(`Decision ${input.decisionId} not found`);
    }

    // Create validation record
    const record = this.validationRecordRepo.create({
      feedbackId: input.feedbackId,
      decisionId: input.decisionId,
      hypothesisAppliedCorrectly: input.hypothesisAppliedCorrectly ?? null,
      outcome: input.outcome ?? ValidationOutcome.PENDING,
      conditionsMatching: input.conditionsMatching ?? null,
      notes: input.notes ?? null,
    });

    const savedRecord = await this.validationRecordRepo.save(record);

    // Update evidence counts based on outcome
    if (input.hypothesisAppliedCorrectly === true && input.outcome === ValidationOutcome.PROFITABLE) {
      feedback.validationEvidenceFavor += 1;
    } else if (input.hypothesisAppliedCorrectly === false || input.outcome === ValidationOutcome.LOSS) {
      feedback.validationEvidenceAgainst += 1;
    }

    // Move to IN_VALIDATION if not already
    if (feedback.status === FeedbackStatus.HYPOTHESIS) {
      feedback.status = FeedbackStatus.IN_VALIDATION;
    }

    // Add to audit history
    if (!feedback.auditHistory) {
      feedback.auditHistory = [];
    }
    feedback.auditHistory.push({
      timestamp: new Date(),
      action: 'VALIDATION_RECORDED',
      details: `Evidence recorded: outcome=${input.outcome}`,
      changedTo: `favor=${feedback.validationEvidenceFavor}, against=${feedback.validationEvidenceAgainst}`,
    });

    await this.feedbackRepo.save(feedback);
    return savedRecord;
  }

  /**
   * Move feedback to PROPOSED_LESSON state
   * Only changes state, no rule modifications
   */
  async moveToProposedLesson(feedbackId: string): Promise<DecisionFeedback> {
    const feedback = await this.feedbackRepo.findOne({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new Error(`Feedback ${feedbackId} not found`);
    }

    if (feedback.status === FeedbackStatus.CONFIRMED || feedback.status === FeedbackStatus.REJECTED) {
      throw new Error(`Cannot move feedback from ${feedback.status} to PROPOSED_LESSON`);
    }

    feedback.status = FeedbackStatus.PROPOSED_LESSON;

    if (!feedback.auditHistory) {
      feedback.auditHistory = [];
    }
    feedback.auditHistory.push({
      timestamp: new Date(),
      action: 'MOVED_TO_PROPOSED_LESSON',
      details: `Evidence summary: ${feedback.validationEvidenceFavor} in favor, ${feedback.validationEvidenceAgainst} against`,
    });

    return this.feedbackRepo.save(feedback);
  }

  /**
   * Promote or reject feedback as lesson
   * Only changes state, NEVER modifies trading rules
   */
  async promoteToLesson(input: PromoteLessonInput): Promise<DecisionFeedback> {
    const feedback = await this.feedbackRepo.findOne({
      where: { id: input.feedbackId },
    });

    if (!feedback) {
      throw new Error(`Feedback ${input.feedbackId} not found`);
    }

    if (input.shouldPromote) {
      feedback.status = FeedbackStatus.CONFIRMED;
    } else {
      feedback.status = FeedbackStatus.REJECTED;
    }

    if (!feedback.auditHistory) {
      feedback.auditHistory = [];
    }
    feedback.auditHistory.push({
      timestamp: new Date(),
      action: input.shouldPromote ? 'PROMOTED_TO_LESSON' : 'REJECTED',
      actor: 'Jay',
      details: input.comment ?? 'No comment',
      changedTo: feedback.status,
    });

    return this.feedbackRepo.save(feedback);
  }

  /**
   * Get all feedback for a decision with validation records
   */
  async getFeedbackWithValidations(decisionId: string): Promise<DecisionFeedback | null> {
    return this.feedbackRepo.findOne({
      where: { decisionId },
      relations: ['validationRecords', 'validationRecords.subsequentDecision'],
    });
  }

  /**
   * Get all confirmed lessons (for read-only display)
   */
  async getConfirmedLessons(): Promise<DecisionFeedback[]> {
    return this.feedbackRepo.find({
      where: { status: FeedbackStatus.CONFIRMED },
      relations: ['validationRecords'],
    });
  }

  /**
   * Get feedback in validation state for active monitoring
   */
  async getFeedbackInValidation(): Promise<DecisionFeedback[]> {
    return this.feedbackRepo.find({
      where: [
        { status: FeedbackStatus.IN_VALIDATION },
        { status: FeedbackStatus.HYPOTHESIS },
      ],
      relations: ['validationRecords'],
    });
  }
}
