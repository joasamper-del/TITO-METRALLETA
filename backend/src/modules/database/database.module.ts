import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Opportunity,
  TradeResult,
  DecisionAuditTrail,
  DecisionFeedback,
  FeedbackValidationRecord,
  TradeExecution,
  ExecutionEvent,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Opportunity,
      TradeResult,
      DecisionAuditTrail,
      DecisionFeedback,
      FeedbackValidationRecord,
      TradeExecution,
      ExecutionEvent,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
