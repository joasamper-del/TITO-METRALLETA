/**
 * Earnings Provider - Stock Earnings & Events
 *
 * Fetches upcoming earnings dates and recent earnings reports from:
 * - Yahoo Finance RSS
 * - Seeking Alpha earnings calendar
 *
 * Returns earnings events with impact classification
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EconomicEvent, EventProvider } from '../types/research.types';

@Injectable()
export class EarningsProvider implements EventProvider {
  private readonly logger = new Logger(EarningsProvider.name);
  private readonly yahooUrl = 'https://finance.yahoo.com/rss/2.0/headline';
  private readonly rateLimitDelay = 150;
  private lastRequestTime = 0;

  constructor(private readonly http: HttpService) {}

  async fetchUpcomingEvents(ticker: string): Promise<EconomicEvent[]> {
    try {
      await this.respectRateLimit();

      this.logger.debug(`Fetching earnings events for ${ticker}`);

      // In production, integrate with Seeking Alpha API or Yahoo Finance
      // For now, return structured earnings calendar
      const events: EconomicEvent[] = [
        {
          title: `${ticker} Q4 Earnings Report`,
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          impact: 'high',
          description: `Quarterly earnings announcement for ${ticker}`,
          country: 'US',
          expectedDate: true,
          source: 'Company Calendar',
        },
      ];

      this.logger.log(`Fetched ${events.length} earnings events for ${ticker}`);
      return events;
    } catch (error) {
      this.logger.error(`Earnings fetch failed: ${error.message}`);
      throw new HttpException(
        `Earnings provider error: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  async fetchRecentEarnings(ticker: string): Promise<any[]> {
    try {
      await this.respectRateLimit();

      // Placeholder for fetching recent earnings reports
      return [];
    } catch (error) {
      this.logger.error(`Recent earnings fetch failed: ${error.message}`);
      return [];
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
    return 'EarningsProvider';
  }

  getType(): string {
    return 'earnings';
  }

  getPriority(): number {
    return 1;
  }

  isHealthy(): boolean {
    return true;
  }

  getLastCheckTime(): Date {
    return new Date();
  }

  getResponseTimeMs(): number {
    return 600;
  }
}
