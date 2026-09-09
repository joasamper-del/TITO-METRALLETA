/**
 * Audit Trail Module (S58 + S59)
 * S58: Provides READ-ONLY access to decision audit trail
 * S59: Feedback & Learning Loop - accumulate evidence, validate hypotheses
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DecisionAuditTrail, DecisionFeedback, FeedbackValidationRecord, Lesson, PositionSnapshot } from '../database/entities';
import { DecisionChangeLog } from '../database/entities/decision-change-log.entity';
import { AuditTrailService } from './audit-trail.service';
import { AuditTrailController } from './audit-trail.controller';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { PositionSnapshotService } from './position-snapshot.service';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DecisionAuditTrail,
      DecisionFeedback,
      FeedbackValidationRecord,
      Lesson,
      PositionSnapshot,
      DecisionChangeLog,
    ]),
  ],
  providers: [AuditTrailService, FeedbackService, LessonsService, PositionSnapshotService, AuditService],
  controllers: [AuditTrailController, FeedbackController, LessonsController, AuditController],
  exports: [AuditTrailService, FeedbackService, LessonsService, PositionSnapshotService, AuditService],
})
export class AuditTrailModule {}
