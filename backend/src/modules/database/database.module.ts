import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Opportunity,
  TradeResult,
  DecisionAuditTrail,
  DecisionFeedback,
  FeedbackValidationRecord,
  TradeExecution,
  ExecutionEvent,
  ExecutionReport,
  TraceabilityAnomaly,
  NoOpExplanation,
  DailySummary,
} from './entities';
import { TradeExecutionService } from './services/trade-execution.service';
import { ExecutionEventService } from './services/execution-event.service';
import { ExecutionReportService } from './services/execution-report.service';
import { TraceabilityAnomalyService } from './services/traceability-anomaly.service';
import { NoOpExplanationService } from './services/no-op-explanation.service';
import { DailySummaryService } from './services/daily-summary.service';
import { DailySummaryScheduler } from './services/daily-summary-scheduler';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Opportunity,
      TradeResult,
      DecisionAuditTrail,
      DecisionFeedback,
      FeedbackValidationRecord,
      TradeExecution,
      ExecutionEvent,
      ExecutionReport,
      TraceabilityAnomaly,
      NoOpExplanation,
      DailySummary,
    ]),
  ],
  providers: [
    TradeExecutionService,
    ExecutionEventService,
    ExecutionReportService,
    TraceabilityAnomalyService,
    NoOpExplanationService,
    DailySummaryService,
    DailySummaryScheduler,
  ],
  exports: [
    TypeOrmModule,
    TradeExecutionService,
    ExecutionEventService,
    ExecutionReportService,
    TraceabilityAnomalyService,
    NoOpExplanationService,
    DailySummaryService,
    DailySummaryScheduler,
  ],
})
export class DatabaseModule {}
