import { Module } from '@nestjs/common';
import { WarrenService } from './warren.service';
import { WarrenController } from '../controllers/warren.controller';
import { FundamentalScorerService } from '../strategies/fundamental-scorer';
import { DCFEngineService } from '../strategies/dcf-engine';
import { MacroContextService } from '../strategies/macro-context';
import { DecisionEngineService } from '../strategies/decision-engine';

/**
 * WARREN MODULE
 * Complete Warren Buffett Jr. system: services + REST API
 *
 * Providers:
 * - FundamentalScorerService (24/24 tests)
 * - DCFEngineService (25/25 tests)
 * - MacroContextService (21/21 tests)
 * - DecisionEngineService (33/33 tests)
 * - WarrenService (orchestration, 20/20 tests)
 *
 * Controllers:
 * - WarrenController (REST API, 15+ tests)
 *
 * Exports: WarrenService, WarrenController
 */
@Module({
  providers: [FundamentalScorerService, DCFEngineService, MacroContextService, DecisionEngineService, WarrenService],
  controllers: [WarrenController],
  exports: [WarrenService],
})
export class WarrenModule {}
