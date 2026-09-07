/**
 * Audit Trail Module (S58 + S59)
 * S58: Provides READ-ONLY access to decision audit trail
 * S59: Feedback & Learning Loop - accumulate evidence, validate hypotheses
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DecisionAuditTrail, DecisionFeedback, FeedbackValidationRecord, Lesson, PositionSnapshot } from '../database/entities';
import { AuditTrailService } from './audit-trail.service';
import { AuditTrailController } from './audit-trail.controller';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { PositionSnapshotService } from './position-snapshot.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DecisionAuditTrail,
      DecisionFeedback,
      FeedbackValidationRecord,
      Lesson,
      PositionSnapshot,
    ]),
  ],
  providers: [AuditTrailService, FeedbackService, LessonsService, PositionSnapshotService],
  controllers: [AuditTrailController, FeedbackController, LessonsController],
  exports: [AuditTrailService, FeedbackService, LessonsService, PositionSnapshotService],
})
export class AuditTrailModule {}
