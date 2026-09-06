/**
 * Audit Trail Module (S58 + S59)
 * S58: Provides READ-ONLY access to decision audit trail
 * S59: Feedback & Learning Loop - accumulate evidence, validate hypotheses
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DecisionAuditTrail, DecisionFeedback, FeedbackValidationRecord } from '../database/entities';
import { AuditTrailService } from './audit-trail.service';
import { AuditTrailController } from './audit-trail.controller';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DecisionAuditTrail,
      DecisionFeedback,
      FeedbackValidationRecord,
    ]),
  ],
  providers: [AuditTrailService, FeedbackService],
  controllers: [AuditTrailController, FeedbackController],
  exports: [AuditTrailService, FeedbackService],
})
export class AuditTrailModule {}
