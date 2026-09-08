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

// Execution Engines (S62 Implementation)
import { AlpacaPaperExecutor } from './services/alpaca-paper-executor';
import { AlpacaValidationController } from './controllers/alpaca-validation.controller';

// Data Providers (S61 Implementation)
import { NewsAPIProvider } from './providers/news-api.provider';
import { EarningsProvider } from './providers/earnings.provider';
import { CalendarProvider } from './providers/calendar.provider';
import { SECEdgarProvider } from './providers/sec-edgar.provider';
import { YahooProvider } from './providers/yahoo.provider';

// Additional Providers (S62 Implementation)
import { MarketSnacksProvider } from './providers/market-snacks.provider';
import { TradingViewProvider } from './providers/trading-view.provider';
import { VIXProvider } from './providers/vix.provider';

// Guardian & Operations (S60-S61 Implementation)
import { OperationsTaskList } from './guardians/operations-task-list';

@Module({
  imports: [HttpModule],
  providers: [
    WebResearchService,

    // Execution Engines (S62)
    {
      provide: AlpacaPaperExecutor,
      useFactory: () => {
        const apiKey = process.env.ALPACA_API_KEY;
        const secretKey = process.env.ALPACA_SECRET_KEY;
        if (!apiKey || !secretKey) {
          console.warn('⚠️  ALPACA credentials not configured - Paper Trading disabled');
          return null;
        }
        return new AlpacaPaperExecutor(apiKey, secretKey);
      },
    },

    // News Providers
    NewsAPIProvider,
    MarketSnacksProvider,

    // Event Providers
    EarningsProvider,
    CalendarProvider,

    // Fundamental Providers
    YahooProvider,
    SECEdgarProvider,

    // Technical & Market Regime Providers
    TradingViewProvider,
    VIXProvider,

    // Guardian & Operations
    OperationsTaskList,
  ],
  controllers: [ResearchController, AlpacaValidationController],
  exports: [WebResearchService, AlpacaPaperExecutor], // Export for other modules
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
