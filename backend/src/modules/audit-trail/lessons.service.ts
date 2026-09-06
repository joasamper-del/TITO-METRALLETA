import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../database/entities/lesson.entity';
import { DecisionFeedback } from '../database/entities/feedback.entity';

export interface LessonSearchCriteria {
  mliScore?: number;
  vixValue?: number;
  symbol?: string;
  action?: string;
  confidenceMin?: number;
  lessonType?: string;
}

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(DecisionFeedback)
    private feedbackRepository: Repository<DecisionFeedback>,
  ) {}

  /**
   * Search for relevant lessons based on market conditions
   * Returns lessons that match the current decision context
   */
  async searchRelevantLessons(criteria: LessonSearchCriteria): Promise<Lesson[]> {
    let query = this.lessonRepository.createQueryBuilder('lesson');

    // Filter by confidence minimum
    if (criteria.confidenceMin !== undefined) {
      query = query.where('lesson.confidence >= :confidenceMin', {
        confidenceMin: criteria.confidenceMin,
      });
    } else {
      // Default: only lessons with at least 60% confidence
      query = query.where('lesson.confidence >= 60');
    }

    // Filter by lesson type (PRELIMINARY, VALIDATED, REFINED)
    if (criteria.lessonType) {
      query = query.andWhere('lesson.lessonType = :lessonType', {
        lessonType: criteria.lessonType,
      });
    } else {
      // Default: show PRELIMINARY and above
      query = query.andWhere('lesson.lessonType IN (:...types)', {
        types: ['PRELIMINARY', 'VALIDATED', 'REFINED'],
      });
    }

    // Filter by action if specified
    if (criteria.action) {
      query = query.andWhere('lesson.action = :action', { action: criteria.action });
    }

    // Filter by symbol if specified
    if (criteria.symbol) {
      query = query.andWhere(
        '(lesson.conditionSymbol = :symbol OR lesson.conditionSymbol IS NULL)',
        { symbol: criteria.symbol },
      );
    }

    // Filter by MLI range if specified
    if (criteria.mliScore !== undefined) {
      query = query.andWhere('(lesson.conditionMli IS NULL OR lesson.conditionMli >= :mli)', {
        mli: criteria.mliScore * 0.9, // 90% tolerance
      });
      query = query.andWhere('(lesson.conditionMli IS NULL OR lesson.conditionMli <= :mli2)', {
        mli2: criteria.mliScore * 1.1, // 110% tolerance
      });
    }

    // Filter by VIX range if specified
    if (criteria.vixValue !== undefined) {
      query = query.andWhere('(lesson.conditionVix IS NULL OR lesson.conditionVix >= :vix)', {
        vix: criteria.vixValue * 0.8, // 80% tolerance
      });
      query = query.andWhere('(lesson.conditionVix IS NULL OR lesson.conditionVix <= :vix2)', {
        vix2: criteria.vixValue * 1.2, // 120% tolerance
      });
    }

    // Order by confidence descending, then by sample size
    query = query.orderBy('lesson.confidence', 'DESC').addOrderBy('lesson.sampleSize', 'DESC');

    return await query.getMany();
  }

  /**
   * Create a lesson from a confirmed feedback
   * Called when feedback is promoted to CONFIRMED status
   */
  async createFromConfirmedFeedback(
    feedbackId: string,
    title: string,
    description?: string,
  ): Promise<Lesson> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new Error(`Feedback ${feedbackId} not found`);
    }

    // Extract conditions from auditHistory
    const conditions = this.extractConditionsFromAuditTrail(feedback.auditHistory as any);

    const lesson = this.lessonRepository.create({
      feedbackId,
      title,
      description,
      conditionMli: conditions.mli,
      conditionVix: conditions.vix,
      conditionSymbol: conditions.symbol,
      action: conditions.action || 'ESPERAR',
      confidence: this.calculateConfidence(feedback),
      sampleSize: feedback.validationEvidenceFavor + feedback.validationEvidenceAgainst,
      favorableCount: feedback.validationEvidenceFavor,
      unfavorableCount: feedback.validationEvidenceAgainst,
      lessonType: 'PRELIMINARY',
      confirmedAt: new Date(),
      auditTrail: [
        {
          timestamp: new Date(),
          action: 'LESSON_CREATED_FROM_FEEDBACK',
          actor: 'System',
          feedbackId,
        },
      ],
    });

    return await this.lessonRepository.save(lesson);
  }

  /**
   * Get full lineage of a lesson (for traceability)
   * Shows: Lesson → Feedback → Decision → Validations
   */
  async getLessonLineage(lessonId: string): Promise<any> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['feedback'],
    });

    if (!lesson) {
      throw new Error(`Lesson ${lessonId} not found`);
    }

    return {
      lesson: {
        id: lesson.id,
        title: lesson.title,
        confidence: lesson.confidence,
        sampleSize: lesson.sampleSize,
        lessonType: lesson.lessonType,
        confirmedAt: lesson.confirmedAt,
      },
      originatingFeedback: lesson.feedback,
      auditTrail: lesson.auditTrail,
    };
  }

  /**
   * Update lesson evidence when a new validation occurs
   * Called automatically when a decision is evaluated against a lesson
   */
  async recordValidationOutcome(
    lessonId: string,
    hypothesisAppliedCorrectly: boolean,
    outcomeWasProfitable: boolean,
  ): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });

    if (!lesson) {
      throw new Error(`Lesson ${lessonId} not found`);
    }

    if (hypothesisAppliedCorrectly && outcomeWasProfitable) {
      lesson.favorableCount++;
    } else if (hypothesisAppliedCorrectly && !outcomeWasProfitable) {
      lesson.unfavorableCount++;
    }

    lesson.sampleSize = lesson.favorableCount + lesson.unfavorableCount;
    lesson.confidence = this.calculateLessonConfidence(lesson.favorableCount, lesson.sampleSize);

    // Update audit trail
    const auditTrail = (lesson.auditTrail as any) || [];
    auditTrail.push({
      timestamp: new Date(),
      action: 'VALIDATION_RECORDED',
      favorable: hypothesisAppliedCorrectly && outcomeWasProfitable,
      sampleSize: lesson.sampleSize,
      confidence: lesson.confidence,
    });
    lesson.auditTrail = auditTrail;

    return await this.lessonRepository.save(lesson);
  }

  /**
   * Get all confirmed lessons
   */
  async getConfirmedLessons(): Promise<Lesson[]> {
    return this.lessonRepository.find({
      where: { lessonType: 'PRELIMINARY' },
      order: { confidence: 'DESC', confirmedAt: 'DESC' },
    });
  }

  /**
   * Calculate confidence percentage: favorable / total
   * Returns 0 if no evaluations yet
   */
  private calculateConfidence(feedback: DecisionFeedback): number {
    const total = feedback.validationEvidenceFavor + feedback.validationEvidenceAgainst;
    if (total === 0) return 0;
    return (feedback.validationEvidenceFavor / total) * 100;
  }

  private calculateLessonConfidence(favorable: number, total: number): number {
    if (total === 0) return 0;
    return (favorable / total) * 100;
  }

  /**
   * Extract decision context from feedback audit trail
   */
  private extractConditionsFromAuditTrail(auditTrail: any): any {
    // This would parse the audit trail to extract original MLI, VIX, symbol
    // For now, return defaults
    return {
      mli: undefined,
      vix: undefined,
      symbol: undefined,
      action: 'ESPERAR',
    };
  }
}
