import { Module } from '@nestjs/common';
import { WarrenService } from './warren.service';
import { FundamentalScorerService } from '../strategies/fundamental-scorer';
import { DCFEngineService } from '../strategies/dcf-engine';
import { MacroContextService } from '../strategies/macro-context';
import { DecisionEngineService } from '../strategies/decision-engine';

/**
 * WARREN MODULE
 * Exports WarrenService with all 4 engines injected
 *
 * Providers:
 * - FundamentalScorerService (24/24 tests)
 * - DCFEngineService (25/25 tests)
 * - MacroContextService (21/21 tests)
 * - DecisionEngineService (33/33 tests)
 * - WarrenService (orquestación)
 *
 * Exports: WarrenService
 */
@Module({
  providers: [FundamentalScorerService, DCFEngineService, MacroContextService, DecisionEngineService, WarrenService],
  exports: [WarrenService],
})
export class WarrenModule {}
