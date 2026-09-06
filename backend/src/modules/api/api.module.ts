import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CoreModule } from '../core/core.module';
import { AnalyzeService, RulesService, ResultsService, StatsService, DecisionAuditService } from './services';
import {
  AnalyzeController,
  RulesController,
  ResultsController,
  StatsController,
  HealthController,
  DecisionAuditController,
} from './controllers';

@Module({
  imports: [DatabaseModule, CoreModule],
  controllers: [
    HealthController,
    AnalyzeController,
    RulesController,
    ResultsController,
    StatsController,
    DecisionAuditController,
  ],
  providers: [AnalyzeService, RulesService, ResultsService, StatsService, DecisionAuditService],
  exports: [DecisionAuditService],
})
export class ApiModule {}
