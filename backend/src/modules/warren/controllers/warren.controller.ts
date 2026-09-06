import { Controller, Post, Get, Body, HttpCode, HttpStatus, ValidationPipe } from '@nestjs/common';
import { WarrenService, WarrenAnalysisRequest, WarrenAnalysisResponse } from '../services/warren.service';

export interface WarrenAnalysisHttpResponse {
  success: boolean;
  data?: WarrenAnalysisResponse;
  error?: string;
  code?: string;
  timestamp: string;
}

export interface WarrenHealthResponse {
  status: 'ok' | 'error';
  version: string;
  timestamp: string;
}

export interface WarrenValidationRequest {
  ticker: string;
  fundamentalMetrics?: any;
  dcfInputs?: any;
  currentPrice?: number;
  macroIndicators?: any;
}

export interface WarrenValidationResponse {
  success: boolean;
  valid: boolean;
  errors: string[];
  timestamp: string;
}

/**
 * WARREN REST API CONTROLLER
 *
 * CRITICAL:
 * - All responses are ANALYTICAL RECOMMENDATIONS ONLY
 * - ZERO execution methods
 * - ZERO Alpaca connection
 * - ZERO order submission
 * - All responses include explicit disclaimer
 */
@Controller('api/warren')
export class WarrenController {
  constructor(private readonly warrenService: WarrenService) {}

  /**
   * Analyze company using Warren Buffett Jr. framework
   * POST /api/warren/analyze
   *
   * Request: WarrenAnalysisRequest
   * Response: WarrenAnalysisHttpResponse with full analysis
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeCompany(@Body(new ValidationPipe({ whitelist: true })) request: WarrenAnalysisRequest): Promise<WarrenAnalysisHttpResponse> {
    const analysis = await this.warrenService.analyzeCompany(request);

    return {
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate inputs without executing analysis
   * POST /api/warren/validate
   *
   * Request: WarrenValidationRequest (partial)
   * Response: WarrenValidationResponse with validation results
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateInputs(@Body() request: WarrenValidationRequest): Promise<WarrenValidationResponse> {
    const errors: string[] = [];

    // Ticker validation
    if (!request.ticker || request.ticker.trim() === '') {
      errors.push('Ticker is required and must be non-empty');
    } else if (request.ticker.length > 5) {
      errors.push('Ticker must be 5 characters or less');
    } else if (!/^[A-Z0-9]+$/i.test(request.ticker)) {
      errors.push('Ticker must be alphanumeric');
    }

    // Fundamental metrics validation
    if (request.fundamentalMetrics) {
      const requiredFields = [
        'roe',
        'roic',
        'debtToEquity',
        'fcfTrend',
        'priceToBook',
        'priceToEarnings',
        'peHistorical',
        'earningsCagr5y',
        'revenueGrowth',
        'marketVIX',
        'spPE',
      ];
      for (const field of requiredFields) {
        if (!(field in request.fundamentalMetrics)) {
          errors.push(`Fundamental metrics missing required field: ${field}`);
        }
      }

      // Range validations
      if (request.fundamentalMetrics.roe < 0 || request.fundamentalMetrics.roe > 50) {
        errors.push('ROE must be between 0 and 50');
      }
      if (request.fundamentalMetrics.debtToEquity < 0) {
        errors.push('Debt-to-Equity ratio must be non-negative');
      }
    }

    // DCF inputs validation
    if (request.dcfInputs) {
      const requiredFields = ['fcf', 'fcfGrowthRate', 'projectionYears', 'wacc', 'equityShares', 'netDebt', 'fcfQuality', 'earningsQuality'];
      for (const field of requiredFields) {
        if (!(field in request.dcfInputs)) {
          errors.push(`DCF inputs missing required field: ${field}`);
        }
      }

      // Range validations
      if (request.dcfInputs.wacc < 1 || request.dcfInputs.wacc > 15) {
        errors.push('WACC must be between 1% and 15%');
      }
      if (request.dcfInputs.projectionYears < 1 || request.dcfInputs.projectionYears > 20) {
        errors.push('Projection years must be between 1 and 20');
      }
    }

    // Current price validation
    if (typeof request.currentPrice === 'number' && request.currentPrice < 0) {
      errors.push('Current price must be non-negative');
    }

    // Macro indicators validation
    if (request.macroIndicators) {
      const requiredFields = [
        'fedRate',
        'fedRateTimestamp',
        'fedRateSource',
        'cpi',
        'cpiTimestamp',
        'cpiSource',
        'vix',
        'vixTimestamp',
        'vixSource',
        'spPE',
        'spPETimestamp',
        'spPESource',
      ];
      for (const field of requiredFields) {
        if (!(field in request.macroIndicators)) {
          errors.push(`Macro indicators missing required field: ${field}`);
        }
      }

      // Range validations
      if (request.macroIndicators.fedRate < 0 || request.macroIndicators.fedRate > 10) {
        errors.push('Fed rate must be between 0% and 10%');
      }
      if (request.macroIndicators.vix < 0 || request.macroIndicators.vix > 100) {
        errors.push('VIX must be between 0 and 100');
      }
    }

    return {
      success: true,
      valid: errors.length === 0,
      errors,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Health check endpoint
   * GET /api/warren/health
   *
   * Response: WarrenHealthResponse
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  getHealth(): WarrenHealthResponse {
    return {
      status: 'ok',
      version: 'Warren Buffett Jr. v1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
