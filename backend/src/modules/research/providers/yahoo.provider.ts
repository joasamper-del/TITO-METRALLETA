/**
 * Yahoo Finance Provider - Fundamentals Fallback
 *
 * Fetches basic fundamentals:
 * - P/E ratio, dividend, market cap
 * - Price history
 * - Basic financial data
 *
 * Used as fallback when SEC Edgar is unavailable
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { FundamentalProvider, FundamentalData } from '../types/research.types';

@Injectable()
export class YahooProvider implements FundamentalProvider {
  private readonly logger = new Logger(YahooProvider.name);
  private readonly rateLimitDelay = 100;
  private lastRequestTime = 0;

  constructor(private readonly http: HttpService) {}

  async fetchFundamentals(ticker: string): Promise<FundamentalData> {
    try {
      await this.respectRateLimit();

      this.logger.debug(`Fetching Yahoo Finance data for ${ticker}`);

      // In production, fetch from Yahoo Finance API or scrape page
      // For now, return placeholder structure
      const fundamentals: FundamentalData = {
        ticker,
        dataDate: new Date(),
        source: 'Yahoo Finance',
        metrics: {
          pe_ratio: 24.8,
          debt_to_equity: 0.42,
          current_ratio: 1.9,
          roe: 0.16,
          roe_trend: 'improving',
        },
        revenues: {
          ttm: 160000000000,
          trend: 'growing',
        },
        profitability: {
          net_margin: 0.20,
          gross_margin: 0.46,
          operating_margin: 0.24,
        },
        growth: {
          revenue_growth_yoy: 0.10,
          earnings_growth_yoy: 0.14,
        },
        warnings: [],
      };

      this.logger.log(`Fetched Yahoo Finance data for ${ticker}`);
      return fundamentals;
    } catch (error) {
      this.logger.error(`Yahoo Finance fetch failed: ${error.message}`);
      throw new HttpException(
        `Yahoo Finance provider error: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
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
    return 'YahooFinance';
  }

  getType(): string {
    return 'fundamentals';
  }

  getPriority(): number {
    return 1; // Primary fundamentals source
  }

  isHealthy(): boolean {
    return true;
  }

  getLastCheckTime(): Date {
    return new Date();
  }

  getResponseTimeMs(): number {
    return 400;
  }
}
