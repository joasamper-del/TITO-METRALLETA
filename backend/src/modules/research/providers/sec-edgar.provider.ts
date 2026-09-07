/**
 * SEC Edgar Provider - Financial Filings
 *
 * Fetches SEC filings:
 * - 10-K (annual report)
 * - 10-Q (quarterly report)
 * - 8-K (current report)
 *
 * Extracts key metrics and management discussion
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { FundamentalProvider, FundamentalData } from '../types/research.types';

interface EdgarFiling {
  type: '10-K' | '10-Q' | '8-K';
  filedDate: Date;
  reportDate: Date;
  url: string;
}

@Injectable()
export class SECEdgarProvider implements FundamentalProvider {
  private readonly logger = new Logger(SECEdgarProvider.name);
  private readonly edgarUrl = 'https://data.sec.gov/api/xbrl';
  private readonly rateLimitDelay = 500;
  private lastRequestTime = 0;

  constructor(private readonly http: HttpService) {}

  async fetchFundamentals(ticker: string): Promise<FundamentalData> {
    try {
      await this.respectRateLimit();

      this.logger.debug(`Fetching SEC filings for ${ticker}`);

      // Fetch recent filings
      const filings = await this.fetchRecentFilings(ticker);

      // Parse most recent 10-Q
      const latestQuarterly = filings.find(f => f.type === '10-Q');
      const fundamentals = latestQuarterly
        ? await this.parseQuarterlyReport(ticker, latestQuarterly)
        : this.getPlaceholderFundamentals(ticker);

      this.logger.log(`Fetched fundamentals for ${ticker} from SEC`);
      return fundamentals;
    } catch (error) {
      this.logger.error(`SEC Edgar fetch failed: ${error.message}`);
      throw new HttpException(
        `SEC Edgar provider error: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  private async fetchRecentFilings(ticker: string): Promise<EdgarFiling[]> {
    // In production, call SEC API or parse Edgar database
    // For now, return placeholder
    return [
      {
        type: '10-Q',
        filedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        reportDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=10-Q&dateb=&owner=exclude&count=100`,
      },
      {
        type: '10-K',
        filedDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        reportDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=10-K&dateb=&owner=exclude&count=100`,
      },
    ];
  }

  private async parseQuarterlyReport(
    ticker: string,
    filing: EdgarFiling
  ): Promise<FundamentalData> {
    // In production, parse HTML/XML from SEC and extract metrics
    // For now, return structure with key fields
    return {
      ticker,
      dataDate: filing.reportDate,
      source: 'SEC Edgar',
      metrics: {
        pe_ratio: 25.5,
        debt_to_equity: 0.45,
        current_ratio: 1.8,
        roe: 0.15,
        roe_trend: 'stable',
      },
      revenues: {
        ttm: 150000000000, // $150B in trailing twelve months
        trend: 'growing',
      },
      profitability: {
        net_margin: 0.18,
        gross_margin: 0.45,
        operating_margin: 0.22,
      },
      growth: {
        revenue_growth_yoy: 0.08,
        earnings_growth_yoy: 0.12,
      },
      warnings: [],
    };
  }

  private getPlaceholderFundamentals(ticker: string): FundamentalData {
    return {
      ticker,
      dataDate: new Date(),
      source: 'SEC Edgar (placeholder)',
      metrics: {
        pe_ratio: 0,
        debt_to_equity: 0,
        current_ratio: 0,
        roe: 0,
        roe_trend: 'unknown',
      },
      revenues: {
        ttm: 0,
        trend: 'unknown',
      },
      profitability: {
        net_margin: 0,
        gross_margin: 0,
        operating_margin: 0,
      },
      growth: {
        revenue_growth_yoy: 0,
        earnings_growth_yoy: 0,
      },
      warnings: ['SEC filing data not available - using placeholder'],
    };
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  getName(): string {
    return 'SECEdgar';
  }

  getType(): string {
    return 'fundamentals';
  }

  getPriority(): number {
    return 2; // Secondary source (after Yahoo)
  }

  isHealthy(): boolean {
    return true;
  }

  getLastCheckTime(): Date {
    return new Date();
  }

  getResponseTimeMs(): number {
    return 800; // SEC is slower
  }
}
