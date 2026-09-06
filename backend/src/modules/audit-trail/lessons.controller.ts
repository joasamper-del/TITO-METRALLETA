import { Controller, Get, Query, Param, NotFoundException } from '@nestjs/common';
import { LessonsService, LessonSearchCriteria } from './lessons.service';

@Controller('api/audit-trail/lessons')
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

  /**
   * GET /api/audit-trail/lessons/search
   * Search for relevant lessons based on market conditions
   *
   * Query params:
   * - mliScore: float (optional)
   * - vix: float (optional)
   * - symbol: string (optional, e.g., SPY)
   * - action: string (optional, e.g., ENTRAR, ESPERAR)
   * - confidenceMin: float (optional, default 60)
   * - lessonType: string (optional, default PRELIMINARY)
   *
   * Response:
   * {
   *   lessons: [...],
   *   consultedAt: timestamp,
   *   matchCount: number
   * }
   */
  @Get('search')
  async searchLessons(
    @Query('mliScore') mliScore?: string,
    @Query('vix') vix?: string,
    @Query('symbol') symbol?: string,
    @Query('action') action?: string,
    @Query('confidenceMin') confidenceMin?: string,
    @Query('lessonType') lessonType?: string,
  ) {
    const criteria: LessonSearchCriteria = {
      mliScore: mliScore ? parseFloat(mliScore) : undefined,
      vixValue: vix ? parseFloat(vix) : undefined,
      symbol,
      action,
      confidenceMin: confidenceMin ? parseFloat(confidenceMin) : 60,
      lessonType,
    };

    const consultedAt = new Date();
    const lessons = await this.lessonsService.searchRelevantLessons(criteria);

    return {
      success: true,
      consultedAt,
      matchCount: lessons.length,
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        action: l.action,
        confidence: l.confidence,
        sampleSize: l.sampleSize,
        favorableCount: l.favorableCount,
        unfavorableCount: l.unfavorableCount,
        lessonType: l.lessonType,
        bestCondition: l.bestCondition,
        worstCondition: l.worstCondition,
        confirmedAt: l.confirmedAt,
      })),
    };
  }

  /**
   * GET /api/audit-trail/lessons/:lessonId/lineage
   * Get full lineage and traceability of a lesson
   * Shows: Lesson → Feedback → Decision → Validations
   */
  @Get(':lessonId/lineage')
  async getLessonLineage(@Param('lessonId') lessonId: string) {
    try {
      const lineage = await this.lessonsService.getLessonLineage(lessonId);
      return {
        success: true,
        data: lineage,
      };
    } catch (error: any) {
      throw new NotFoundException(error.message);
    }
  }

  /**
   * GET /api/audit-trail/lessons/confirmed
   * Get all confirmed lessons (read-only)
   */
  @Get('confirmed')
  async getConfirmedLessons() {
    const lessons = await this.lessonsService.getConfirmedLessons();
    return {
      success: true,
      count: lessons.length,
      data: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        action: l.action,
        confidence: l.confidence,
        sampleSize: l.sampleSize,
        lessonType: l.lessonType,
      })),
    };
  }

  /**
   * Health check: verify lessons are READ-ONLY
   */
  @Get('health/safety-check')
  healthCheck() {
    return {
      success: true,
      safety: {
        canModifyRules: false,
        canExecuteOrders: false,
        canModifyMLI: false,
        canBlockOrders: false,
        lessonsAreContextOnly: true,
        lessonsAreReadOnly: true,
        message: 'All lessons endpoints are READ-ONLY. Lessons influence decisions via context only, never execute.',
      },
    };
  }
}
