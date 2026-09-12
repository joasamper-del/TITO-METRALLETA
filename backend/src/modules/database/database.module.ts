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
import { TradeExecutionService } from './services/trade-execution.service';
import { ExecutionEventService } from './services/execution-event.service';

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
  providers: [TradeExecutionService, ExecutionEventService],
  exports: [TypeOrmModule, TradeExecutionService, ExecutionEventService],
})
export class DatabaseModule {}
