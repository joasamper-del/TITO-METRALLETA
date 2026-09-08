/**
 * Alpaca Validation Controller - S62 READINESS
 *
 * Endpoints to validate Paper Trading capability
 * - Account verification
 * - Options permissions
 * - Order execution validation (no actual orders yet)
 */

import { Controller, Get, Post, Body, HttpCode } from '@nestjs/common';
import { AlpacaPaperExecutor, ExecutionRequest } from '../services/alpaca-paper-executor';

@Controller('api/s62/alpaca-validation')
export class AlpacaValidationController {
  constructor(private alpacaExecutor: AlpacaPaperExecutor) {}

  /**
   * GET /api/s62/alpaca-validation/verify-paper
   * Verify connection to Alpaca Paper Trading
   */
  @Get('verify-paper')
  async verifyPaper() {
    const result = await this.alpacaExecutor.verifyPaperAccount();
    return {
      status: result.isValid ? 'success' : 'error',
      data: result,
    };
  }

  /**
   * GET /api/s62/alpaca-validation/check-options
   * Verify options trading permissions
   */
  @Get('check-options')
  async checkOptions() {
    const result = await this.alpacaExecutor.verifyOptionsPermissions();
    return {
      status: result.hasPermissions ? 'success' : 'warning',
      data: result,
    };
  }

  /**
   * POST /api/s62/alpaca-validation/validate-execution
   * Validate order execution WITHOUT actually placing order
   */
  @Post('validate-execution')
  @HttpCode(200)
  async validateExecution(@Body() request: ExecutionRequest) {
    const result = await this.alpacaExecutor.validateOrderExecution(request);
    return {
      status: result.success ? 'validated' : 'rejected',
      data: result,
    };
  }

  /**
   * GET /api/s62/alpaca-validation/positions
   * Get current positions (read-only)
   */
  @Get('positions')
  async getPositions() {
    const positions = await this.alpacaExecutor.getPositions();
    return {
      status: 'success',
      data: {
        count: positions.length,
        positions,
      },
    };
  }
}
