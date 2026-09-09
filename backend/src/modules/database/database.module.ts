import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity, TradeResult, DecisionAuditTrail, DecisionFeedback, FeedbackValidationRecord } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([Opportunity, TradeResult, DecisionAuditTrail, DecisionFeedback, FeedbackValidationRecord])],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
