/**
 * Ticker Analysis Controller - S62 Research API
 *
 * Endpoints for comprehensive ticker investigation before execution
 */

import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { TickerResearchService } from '../services/ticker-research.service';
import { TickerAnalysisReport } from '../types/ticker-analysis.types';

@Controller('api/s62/ticker-analysis')
export class TickerAnalysisController {
  constructor(private tickerResearch: TickerResearchService) {}

  /**
   * GET /api/s62/ticker-analysis/{symbol}
   * Comprehensive analysis for a ticker
   * Returns: Multi-source report with confidence/risk scores
   */
  @Get(':symbol')
  async analyzeTicker(@Param('symbol') symbol: string): Promise<{
    status: 'success' | 'error';
    data: TickerAnalysisReport;
  }> {
    const analysis = await this.tickerResearch.analyzeTickerComprehensive(
      symbol.toUpperCase(),
    );

    return {
      status: 'success',
      data: analysis,
    };
  }

  /**
   * POST /api/s62/ticker-analysis/batch
   * Analyze multiple tickers at once
   */
  @Post('batch')
  async analyzeMultiple(@Body() { symbols }: { symbols: string[] }): Promise<{
    status: 'success' | 'error';
    data: TickerAnalysisReport[];
  }> {
    const analyses = await Promise.all(
      symbols.map(sym => this.tickerResearch.analyzeTickerComprehensive(sym.toUpperCase())),
    );

    return {
      status: 'success',
      data: analyses,
    };
  }

  /**
   * GET /api/s62/ticker-analysis/{symbol}/ready-to-execute
   * Quick check: is this ticker ready for execution?
   * Returns: GO/NO-GO decision
   */
  @Get(':symbol/ready-to-execute')
  async checkExecutionReadiness(@Param('symbol') symbol: string): Promise<{
    status: 'GO' | 'NO-GO';
    reasons: string[];
  }> {
    const analysis = await this.tickerResearch.analyzeTickerComprehensive(
      symbol.toUpperCase(),
    );

    return {
      status: analysis.readyForExecution ? 'GO' : 'NO-GO',
      reasons: analysis.reasons,
    };
  }
}
