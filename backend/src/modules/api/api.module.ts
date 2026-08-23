import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CoreModule } from '../core/core.module';
import { AnalyzeService, RulesService, ResultsService, StatsService } from './services';
import {
  AnalyzeController,
  RulesController,
  ResultsController,
  StatsController,
  HealthController,
} from './controllers';

@Module({
  imports: [DatabaseModule, CoreModule],
  controllers: [
    HealthController,
    AnalyzeController,
    RulesController,
    ResultsController,
    StatsController,
  ],
  providers: [AnalyzeService, RulesService, ResultsService, StatsService],
})
export class ApiModule {}
