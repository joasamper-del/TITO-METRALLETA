/**
 * Audit Trail Module (S58 + S59)
 * S58: Provides READ-ONLY access to decision audit trail
 * S59: Feedback & Learning Loop - accumulate evidence, validate hypotheses
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DecisionAuditTrail, DecisionFeedback, FeedbackValidationRecord, Lesson } from '../database/entities';
import { AuditTrailService } from './audit-trail.service';
import { AuditTrailController } from './audit-trail.controller';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DecisionAuditTrail,
      DecisionFeedback,
      FeedbackValidationRecord,
      Lesson,
    ]),
  ],
  providers: [AuditTrailService, FeedbackService, LessonsService],
  controllers: [AuditTrailController, FeedbackController, LessonsController],
  exports: [AuditTrailService, FeedbackService, LessonsService],
})
export class AuditTrailModule {}
