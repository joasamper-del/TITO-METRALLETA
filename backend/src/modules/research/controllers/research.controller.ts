/**
 * Research API Controller
 *
 * Endpoints for web research functionality
 * Integrates with /strategy dashboard and pre-operation validation
 */

import { Controller, Get, Query, Param, Logger } from '@nestjs/common';
import { WebResearchService } from '../services/web-research.service';
import { ResearchContext } from '../types/research.types';

@Controller('api/research')
export class ResearchController {
  private readonly logger = new Logger(ResearchController.name);

  constructor(
    private webResearch: WebResearchService,
    // Guardian will be injected here once integrated
    // private guardian: SystemGuardian
  ) {}

  /**
   * GET /api/research/:ticker/context
   *
   * Complete research context for a ticker
   * Used by:
   * - /strategy dashboard (show "Contexto del mercado" block)
   * - PreOperationValidator (check for news/events/earnings)
   * - OperationSequenceOrchestrator (step 3: investigate)
   */
  @Get(':ticker/context')
  async getResearchContext(
    @Param('ticker') ticker: string,
    @Query('focusAreas') focusAreasStr?: string,
    @Query('timeframe') timeframe?: 'today' | '1week' | '1month'
  ) {
    const focusAreas = focusAreasStr
      ? focusAreasStr.split(',').filter(f => ['news', 'earnings', 'economics', 'fundamentals'].includes(f))
      : ['news', 'earnings', 'economics', 'fundamentals'];

    const context: ResearchContext = {
      ticker: ticker.toUpperCase(),
      timeframe: timeframe || 'today',
      focusAreas: focusAreas as any,
      maxResults: 10,
    };

    this.logger.log(`Research requested for ${ticker} with focus: ${focusAreas.join(',')}`);

    try {
      const result = await this.webResearch.investigate(context);
      return result;
    } catch (error) {
      this.logger.error(`Research failed for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * GET /api/research/:ticker/news
   *
   * Recent news only
   */
  @Get(':ticker/news')
  async getRecentNews(
    @Param('ticker') ticker: string,
    @Query('days') daysStr: string = '1'
  ) {
    const days = parseInt(daysStr);
    const context: ResearchContext = {
      ticker: ticker.toUpperCase(),
      timeframe: days <= 1 ? 'today' : days <= 7 ? '1week' : '1month',
      focusAreas: ['news'],
      maxResults: 15,
    };

    this.logger.log(`News research for ${ticker} (last ${days} day(s))`);

    try {
      const result = await this.webResearch.investigate(context);
      return {
        ticker: result.ticker,
        news: result.news,
        lastUpdate: result.completedAt,
        sources: result.sources.filter(s => s.type === 'news'),
      };
    } catch (error) {
      this.logger.error(`News research failed for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * GET /api/research/:ticker/events
   *
   * Upcoming events (earnings, splits, regulatory, etc.)
   */
  @Get(':ticker/events')
  async getUpcomingEvents(@Param('ticker') ticker: string) {
    const context: ResearchContext = {
      ticker: ticker.toUpperCase(),
      focusAreas: ['earnings'],
      maxResults: 5,
    };

    this.logger.log(`Events research for ${ticker}`);

    try {
      const result = await this.webResearch.investigate(context);
      return {
        ticker: result.ticker,
        earnings: result.upcomingEvents.earnings,
        splits: result.upcomingEvents.stockSplit,
        dividends: {
          exDate: result.upcomingEvents.exDividendDate,
          recordDate: result.upcomingEvents.recordDate,
          paymentDate: result.upcomingEvents.dividendDate,
        },
        regulatory: result.upcomingEvents.regulatoryEvents,
        products: result.upcomingEvents.productLaunches,
        lastUpdate: result.completedAt,
      };
    } catch (error) {
      this.logger.error(`Events research failed for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * GET /api/research/:ticker/fundamentals
   *
   * Financial data from official sources
   */
  @Get(':ticker/fundamentals')
  async getFundamentals(@Param('ticker') ticker: string) {
    const context: ResearchContext = {
      ticker: ticker.toUpperCase(),
      focusAreas: ['fundamentals'],
    };

    this.logger.log(`Fundamentals research for ${ticker}`);

    try {
      const result = await this.webResearch.investigate(context);
      return {
        ticker: result.ticker,
        fundamentals: result.fundamentals,
        source: result.fundamentals.source,
        freshness: result.fundamentals.freshness,
        lastUpdate: result.fundamentals.lastUpdate,
        dataAge: result.fundamentals.dataAge,
        sources: result.sources.filter(s => s.type === 'official'),
      };
    } catch (error) {
      this.logger.error(`Fundamentals research failed for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * GET /api/research/:ticker/risk-assessment
   *
   * Assess research-based risks for pre-operation validator
   */
  @Get(':ticker/risk-assessment')
  async assessRisks(@Param('ticker') ticker: string) {
    const context: ResearchContext = {
      ticker: ticker.toUpperCase(),
      timeframe: 'today',
      focusAreas: ['news', 'earnings', 'economics'],
    };

    this.logger.log(`Risk assessment for ${ticker}`);

    try {
      const result = await this.webResearch.investigate(context);

      const risks = [];

      // Risk 1: Earnings imminent
      if (result.upcomingEvents.earnings) {
        const daysUntil = Math.ceil(
          (result.upcomingEvents.earnings.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil <= 5) {
          risks.push({
            type: 'earnings_imminent',
            severity: daysUntil === 0 ? 'critical' : 'high',
            daysUntil,
            description: `Earnings in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
            recommendation: 'HOLD - Wait for earnings to reduce volatility',
          });
        }
      }

      // Risk 2: Negative news (24h window)
      const negativeNews = result.news.filter(
        n =>
          n.sentiment === 'negative' &&
          Date.now() - n.publishedAt.getTime() < 24 * 60 * 60 * 1000
      );
      if (negativeNews.length > 0) {
        risks.push({
          type: 'negative_news',
          severity: negativeNews.length > 2 ? 'high' : 'medium',
          count: negativeNews.length,
          description: `${negativeNews.length} negative articles in last 24h`,
          articles: negativeNews.slice(0, 3),
          recommendation:
            'CAUTION - Verify trade has edge after negative news',
        });
      }

      // Risk 3: Economic event today
      const highImpactEvents = result.economicEvents.filter(e => e.impact === 'high');
      if (highImpactEvents.length > 0) {
        risks.push({
          type: 'economic_event',
          severity: 'high',
          count: highImpactEvents.length,
          description: `${highImpactEvents.length} high-impact event${
            highImpactEvents.length === 1 ? '' : 's'
          } today`,
          events: highImpactEvents,
          recommendation: 'CAUTION - Wait after economic events',
        });
      }

      // Risk 4: Stale fundamentals
      if (
        result.fundamentals.freshness === 'stale' ||
        (result.fundamentals.dataAge && result.fundamentals.dataAge > 7)
      ) {
        risks.push({
          type: 'stale_fundamentals',
          severity: 'low',
          description: 'Fundamental data is stale',
          recommendation: 'INFO - Seek fresh fundamentals',
        });
      }

      return {
        ticker: result.ticker,
        riskLevel:
          risks.length === 0
            ? 'LOW'
            : risks.some(r => r.severity === 'critical')
            ? 'CRITICAL'
            : risks.some(r => r.severity === 'high')
            ? 'HIGH'
            : 'MEDIUM',
        risks,
        dataQuality: result.dataQuality,
        sources: result.sources.length,
        lastUpdate: result.completedAt,
      };
    } catch (error) {
      this.logger.error(`Risk assessment failed for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * GET /api/research/status/providers
   *
   * Check which research providers are available
   * Used for system health monitoring
   */
  @Get('status/providers')
  async getProviderStatus() {
    this.logger.log('Provider status requested');
    return await this.webResearch.getProviderStatus();
  }

  /**
   * GET /api/research/audit/:ticker
   *
   * View what sources were used for a ticker
   * Transparency: see all data origins
   */
  @Get('audit/:ticker')
  async getAuditLog(@Param('ticker') ticker: string) {
    this.logger.log(`Audit log requested for ${ticker}`);
    return this.webResearch.getAuditLogs(ticker.toUpperCase());
  }

  /**
   * POST /api/research/cache/clear/:ticker
   *
   * Clear cache for a ticker (force refresh)
   * DEV ONLY
   */
  @Get('cache/clear/:ticker')
  async clearCache(@Param('ticker') ticker: string) {
    this.logger.warn(`Cache clear requested for ${ticker}`);
    this.webResearch.clearCache(ticker.toUpperCase());
    return { message: `Cache cleared for ${ticker}` };
  }
}
