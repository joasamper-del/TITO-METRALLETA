/**
 * Investor Relations Financial Data Provider
 * Public access - no authentication required
 */

import axios from 'axios';

export interface InvestorRelationsData {
  ticker: string;
  company: string;
  nextEarningsDate: {
    date: string | null;
    source: string;
    timestamp: string;
    freshness: 'LIVE' | 'DELAYED' | 'CACHED' | 'STALE';
    confidence: number;
  };
  guidance: {
    text: string | null;
    source: string;
    timestamp: string;
    freshness: 'LIVE' | 'DELAYED' | 'CACHED' | 'STALE';
    confidence: number;
  };
  lastUpdate: {
    date: string | null;
    source: string;
    timestamp: string;
  };
  success: boolean;
  error?: string;
}

export class InvestorRelationsProvider {
  private readonly tickerToIrUrl: Record<string, string> = {
    GOOGL: 'https://investor.google.com',
    GOOG: 'https://investor.google.com',
    MSFT: 'https://investor.microsoft.com',
    AAPL: 'https://investor.apple.com',
  };

  async getIrData(ticker: string): Promise<InvestorRelationsData> {
    const irUrl = this.tickerToIrUrl[ticker.toUpperCase()];
    const timestamp = new Date().toISOString();

    if (!irUrl) {
      return this.createErrorResponse(ticker, timestamp, `IR URL not found for ${ticker}`);
    }

    try {
      const response = await axios.get(irUrl, {
        headers: { 'User-Agent': 'Tito-Research-Agent-Educational' },
        timeout: 10000,
      });

      if (!response.data || response.status !== 200) {
        return this.createErrorResponse(ticker, timestamp, 'Failed to fetch IR');
      }

      const metrics = this.extractIrMetrics(response.data, ticker, timestamp);
      return {
        ticker,
        company: this.getCompanyName(ticker),
        nextEarningsDate: metrics.nextEarningsDate,
        guidance: metrics.guidance,
        lastUpdate: metrics.lastUpdate,
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(ticker, timestamp, `Failed: ${msg}`);
    }
  }

  private extractIrMetrics(html: string, ticker: string, timestamp: string): Partial<InvestorRelationsData> {
    const metrics: any = {
      nextEarningsDate: this.nullMetric('investor-relations', timestamp),
      guidance: this.nullMetric('investor-relations', timestamp),
      lastUpdate: { date: new Date().toISOString().split('T')[0], source: 'investor-relations', timestamp },
    };

    const earningsPattern = /earnings\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i;
    const match = html.match(earningsPattern);
    if (match && match[1]) {
      const parsed = this.parseDate(match[1]);
      if (parsed) {
        metrics.nextEarningsDate = {
          date: parsed,
          source: 'investor-relations',
          timestamp,
          freshness: this.determineFreshness(new Date(parsed)),
          confidence: 85,
        };
      }
    }

    const guidancePattern = /guidance\s*:?\s*([^<.]{20,150})/i;
    const gMatch = html.match(guidancePattern);
    if (gMatch && gMatch[1]) {
      metrics.guidance = {
        text: gMatch[1].trim(),
        source: 'investor-relations',
        timestamp,
        freshness: 'LIVE',
        confidence: 75,
      };
    }

    return metrics;
  }

  private parseDate(dateStr: string): string | null {
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  private determineFreshness(date: Date): 'LIVE' | 'DELAYED' | 'CACHED' | 'STALE' {
    const daysUntil = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntil <= 14) return 'LIVE';
    if (daysUntil <= 60) return 'DELAYED';
    if (daysUntil <= 180) return 'CACHED';
    return 'STALE';
  }

  private nullMetric(source: string, timestamp: string) {
    return { date: null, source, timestamp, freshness: 'STALE' as const, confidence: 0 };
  }

  private createErrorResponse(ticker: string, timestamp: string, error: string): InvestorRelationsData {
    return {
      ticker,
      company: this.getCompanyName(ticker),
      nextEarningsDate: this.nullMetric('investor-relations', timestamp),
      guidance: this.nullMetric('investor-relations', timestamp),
      lastUpdate: { date: null, source: 'investor-relations', timestamp },
      success: false,
      error,
    };
  }

  private getCompanyName(ticker: string): string {
    const names: Record<string, string> = {
      GOOGL: 'Alphabet (Google)',
      GOOG: 'Alphabet (Google)',
      MSFT: 'Microsoft',
      AAPL: 'Apple',
    };
    return names[ticker.toUpperCase()] || ticker;
  }
}
