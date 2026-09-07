/**
 * Economic Calendar Provider - Macro Events
 *
 * Fetches economic events:
 * - FOMC meetings
 * - Economic indicators (CPI, jobs report, etc)
 * - Central bank announcements
 *
 * Returns events with impact classification (high/medium/low)
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EconomicEvent, EventProvider } from '../types/research.types';

@Injectable()
export class CalendarProvider implements EventProvider {
  private readonly logger = new Logger(CalendarProvider.name);
  private readonly rateLimitDelay = 200;
  private lastRequestTime = 0;

  // Hardcoded 2024-2025 economic events (in production, use live API)
  private economicEvents: EconomicEvent[] = [
    {
      title: 'FOMC Meeting & Decision',
      date: new Date('2026-01-28'),
      impact: 'high',
      description: 'Federal Reserve interest rate decision',
      country: 'US',
      expectedDate: true,
      source: 'Federal Reserve',
    },
    {
      title: 'CPI (Consumer Price Index)',
      date: new Date('2026-02-12'),
      impact: 'high',
      description: 'Inflation data - monthly consumer prices',
      country: 'US',
      expectedDate: true,
      source: 'Bureau of Labor Statistics',
    },
    {
      title: 'Non-Farm Payroll',
      date: new Date('2026-03-06'),
      impact: 'high',
      description: 'Monthly employment data (first Friday)',
      country: 'US',
      expectedDate: true,
      source: 'Bureau of Labor Statistics',
    },
    {
      title: 'Unemployment Rate',
      date: new Date('2026-03-06'),
      impact: 'medium',
      description: 'Monthly unemployment rate',
      country: 'US',
      expectedDate: true,
      source: 'Bureau of Labor Statistics',
    },
    {
      title: 'Retail Sales',
      date: new Date('2026-02-17'),
      impact: 'medium',
      description: 'Monthly retail sales data',
      country: 'US',
      expectedDate: true,
      source: 'Census Bureau',
    },
  ];

  constructor(private readonly http: HttpService) {}

  async fetchUpcomingEvents(ticker: string): Promise<EconomicEvent[]> {
    try {
      await this.respectRateLimit();

      this.logger.debug('Fetching economic calendar events');

      // Filter to upcoming events (next 90 days)
      const now = new Date();
      const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const upcomingEvents = this.economicEvents.filter(
        event => event.date > now && event.date < in90Days
      );

      this.logger.log(`Fetched ${upcomingEvents.length} upcoming economic events`);
      return upcomingEvents;
    } catch (error) {
      this.logger.error(`Calendar fetch failed: ${error.message}`);
      throw new HttpException(
        `Calendar provider error: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  async fetchRecentEvents(days: number = 7): Promise<EconomicEvent[]> {
    try {
      await this.respectRateLimit();

      const now = new Date();
      const pastDays = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const recentEvents = this.economicEvents.filter(
        event => event.date > pastDays && event.date < now
      );

      return recentEvents;
    } catch (error) {
      this.logger.error(`Recent events fetch failed: ${error.message}`);
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
    return 'EconomicCalendar';
  }

  getType(): string {
    return 'economic_events';
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
    return 100;
  }
}
