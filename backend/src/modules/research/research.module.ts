/**
 * Research Module
 *
 * Modular multi-source research engine
 * Extensible: add/remove providers without touching core
 */

import { Module, Logger } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebResearchService } from './services/web-research.service';
import { ResearchController } from './controllers/research.controller';

// Data Providers (S61 Implementation)
import { NewsAPIProvider } from './providers/news-api.provider';
import { EarningsProvider } from './providers/earnings.provider';
import { CalendarProvider } from './providers/calendar.provider';
import { SECEdgarProvider } from './providers/sec-edgar.provider';
import { YahooProvider } from './providers/yahoo.provider';

@Module({
  imports: [HttpModule],
  providers: [
    WebResearchService,

    // News Provider
    NewsAPIProvider,

    // Event Providers
    EarningsProvider,
    CalendarProvider,

    // Fundamental Providers
    YahooProvider,
    SECEdgarProvider,
  ],
  controllers: [ResearchController],
  exports: [WebResearchService], // Export for other modules
})
export class ResearchModule {
  private readonly logger = new Logger(ResearchModule.name);

  constructor(private webResearch: WebResearchService) {
    this.setupDefaultProviders();
  }

  /**
   * Setup default providers on module initialization
   * This will be replaced with dynamic provider registration
   */
  private setupDefaultProviders(): void {
    this.logger.log('Research Module initialized');
    this.logger.log('Providers will be registered dynamically');

    // TODO: Implement provider factories that can be:
    // 1. Registered via constructor injection
    // 2. Registered via runtime API
    // 3. Configured via environment variables

    /*
    Example (to be implemented):

    const newsAPI = new NewsAPIProvider(httpClient, env.NEWS_API_KEY);
    this.webResearch.registerNewsProvider(newsAPI);

    const yahooFundamental = new YahooFinanceFundamentalProvider(httpClient);
    this.webResearch.registerFundamentalProvider(yahooFundamental);

    const secEdgar = new SECEdgarFundamentalProvider(httpClient);
    this.webResearch.registerFundamentalProvider(secEdgar);

    const investingComCalendar = new InvestingComCalendarProvider(httpClient);
    this.webResearch.registerEventProvider(investingComCalendar);
    */
  }
}
