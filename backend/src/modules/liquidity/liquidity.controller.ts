import { Controller, Post, Body } from '@nestjs/common';
import { LiquidityService, LiquidityInput, LiquidityGate } from './liquidity.service';

/**
 * R5: Integration SEATBELT Gate 3
 * Controlador que expone evaluación de liquidez para integración pre-ejecución
 */
@Controller('liquidity')
export class LiquidityController {
  constructor(private readonly liquidityService: LiquidityService) {}

  /**
   * POST /liquidity/evaluate
   * Evalúa liquidez de una opción para SEATBELT Gate 3
   *
   * Si liquidityGate.pass === false:
   *   return { status: 'HOLD', reason: liquidityGate.reason }
   * Else:
   *   proceed to Gate 4
   */
  @Post('evaluate')
  evaluateLiquidity(@Body() input: LiquidityInput): LiquidityGate {
    return this.liquidityService.evaluateLiquidity(input);
  }
}
