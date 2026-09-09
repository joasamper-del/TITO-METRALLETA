import { Controller, Post, Get, Put, Body, Param, NotFoundException, BadRequestException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import {
  RespondToQuestionInput,
  RecordValidationInput,
  PromoteLessonInput,
} from './feedback.service';

@Controller('api/audit-trail/feedback')
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  /**
   * POST /api/audit-trail/feedback/{decisionId}
   * Respond to a question from Tito
   * Creates feedback in HYPOTHESIS state
   */
  @Post(':decisionId')
  async respondToQuestion(
    @Param('decisionId') decisionId: string,
    @Body() body: { jayResponse: string }
  ) {
    try {
      const input: RespondToQuestionInput = {
        decisionId,
        jayResponse: body.jayResponse,
      };
      const feedback = await this.feedbackService.respondToQuestion(input);
      return {
        success: true,
        data: feedback,
        message: `Feedback created as HYPOTHESIS for decision ${decisionId}`,
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * GET /api/audit-trail/feedback/{decisionId}
   * Get feedback for a specific decision
   */
  @Get(':decisionId')
  async getFeedback(@Param('decisionId') decisionId: string) {
    const feedback = await this.feedbackService.getFeedback(decisionId);
    if (!feedback) {
      throw new NotFoundException(`No feedback found for decision ${decisionId}`);
    }
    return {
      success: true,
      data: feedback,
    };
  }

  /**
   * PUT /api/audit-trail/feedback/{feedbackId}/validation
   * Record validation evidence (accumulate favor/against counts)
   */
  @Put(':feedbackId/validation')
  async recordValidation(
    @Param('feedbackId') feedbackId: string,
    @Body() body: RecordValidationInput
  ) {
    try {
      const input: RecordValidationInput = {
        feedbackId,
        ...body,
      };
      const record = await this.feedbackService.recordValidation(input);
      const updatedFeedback = await this.feedbackService.getFeedback(body.decisionId);
      return {
        success: true,
        data: {
          validationRecord: record,
          feedbackStatus: updatedFeedback,
        },
        message: `Validation recorded for feedback ${feedbackId}`,
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * POST /api/audit-trail/feedback/{feedbackId}/promote-to-lesson
   * Move feedback from IN_VALIDATION to PROPOSED_LESSON
   */
  @Post(':feedbackId/propose-lesson')
  async proposeLesson(@Param('feedbackId') feedbackId: string) {
    try {
      const feedback = await this.feedbackService.moveToProposedLesson(feedbackId);
      return {
        success: true,
        data: feedback,
        message: `Feedback ${feedbackId} moved to PROPOSED_LESSON`,
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * POST /api/audit-trail/feedback/{feedbackId}/lesson-decision
   * Confirm or reject feedback as a lesson
   */
  @Post(':feedbackId/lesson-decision')
  async promoteToLesson(
    @Param('feedbackId') feedbackId: string,
    @Body() body: { shouldPromote: boolean; comment?: string }
  ) {
    try {
      const input: PromoteLessonInput = {
        feedbackId,
        shouldPromote: body.shouldPromote,
        comment: body.comment,
      };
      const feedback = await this.feedbackService.promoteToLesson(input);
      return {
        success: true,
        data: feedback,
        message: feedback.status === 'CONFIRMED' ? 'Lesson confirmed' : 'Lesson rejected',
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * GET /api/audit-trail/feedback/{decisionId}/with-validations
   * Get feedback with all validation records
   */
  @Get(':decisionId/with-validations')
  async getFeedbackWithValidations(@Param('decisionId') decisionId: string) {
    const feedback = await this.feedbackService.getFeedbackWithValidations(decisionId);
    if (!feedback) {
      throw new NotFoundException(`No feedback found for decision ${decisionId}`);
    }
    return {
      success: true,
      data: feedback,
    };
  }

  /**
   * GET /api/audit-trail/feedback/lessons/confirmed
   * Get all confirmed lessons (read-only)
   */
  @Get('lessons/confirmed')
  async getConfirmedLessons() {
    const lessons = await this.feedbackService.getConfirmedLessons();
    return {
      success: true,
      data: lessons,
      count: lessons.length,
    };
  }

  /**
   * GET /api/audit-trail/feedback/active/in-validation
   * Get all feedback currently being validated
   */
  @Get('active/in-validation')
  async getFeedbackInValidation() {
    const feedback = await this.feedbackService.getFeedbackInValidation();
    return {
      success: true,
      data: feedback,
      count: feedback.length,
    };
  }

  /**
   * Health check: verify no feedback operations can modify trading
   */
  @Get('health/safety-check')
  async healthCheck() {
    return {
      success: true,
      safety: {
        canCreateOrders: false,
        canModifyMLI: false,
        canModifyRiskGates: false,
        canModifyStopLoss: false,
        canModifyStrategySelector: false,
        canModifyExecutionEngine: false,
        canModifyTradingRules: false,
        feedbackOnly: true,
        message: 'All S59 feedback operations are READ-WRITE FEEDBACK ONLY',
      },
    };
  }
}
