/**
 * SEC/EDGAR Financial Data Provider
 * Fetches official financial metrics from SEC EDGAR API (public access, no auth required)
 */

import axios from 'axios';

export interface SecEdgarData {
  ticker: string;
  cik: string;
  eps: {
    value: number | null;
    source: string;
    timestamp: string;
    freshness: 'LIVE' | 'DELAYED' | 'CACHED' | 'STALE';
    confidence: number;
  };
  revenueTtm: {
    value: number | null;
    source: string;
    timestamp: string;
    freshness: 'LIVE' | 'DELAYED' | 'CACHED' | 'STALE';
    confidence: number;
  };
  netIncome: {
    value: number | null;
    source: string;
    timestamp: string;
    freshness: 'LIVE' | 'DELAYED' | 'CACHED' | 'STALE';
    confidence: number;
  };
  latestFilingDate: string | null;
  success: boolean;
  error?: string;
}

export class SecEdgarProvider {
  private readonly tickerCikMap: Record<string, string> = {
    GOOGL: '0001652044',
    GOOG: '0001652044',
    MSFT: '0000789019',
    AAPL: '0000320193',
    AMZN: '0001018724',
  };

  async getFinancialData(ticker: string): Promise<SecEdgarData> {
    const cik = this.tickerCikMap[ticker.toUpperCase()];
    const timestamp = new Date().toISOString();

    if (!cik) {
      return this.createErrorResponse(ticker, 'UNKNOWN', timestamp, `CIK not found for ${ticker}`);
    }

    try {
      // Fetch company facts (financial metrics)
      const factsResponse = await axios.get(
        `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`,
        { timeout: 10000 }
      );

      if (!factsResponse.data?.facts?.['us-gaap']) {
        return this.createErrorResponse(ticker, cik, timestamp, 'No financial facts found');
      }

      const gaapData = factsResponse.data.facts['us-gaap'];
      const latestFilingDate = factsResponse.data.filings?.recent?.filingDate?.[0] || null;
      const metrics = this.extractMetrics(gaapData, timestamp);

      return {
        ticker,
        cik,
        eps: metrics.eps,
        revenueTtm: metrics.revenueTtm,
        netIncome: metrics.netIncome,
        latestFilingDate,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(ticker, cik, timestamp, `Failed to fetch: ${errorMessage}`);
    }
  }

  private extractMetrics(gaapData: any, timestamp: string): Partial<SecEdgarData> {
    const metrics: any = {
      eps: this.nullMetric('sec-edgar', timestamp),
      revenueTtm: this.nullMetric('sec-edgar', timestamp),
      netIncome: this.nullMetric('sec-edgar', timestamp),
    };

    // Extract EPS
    if (gaapData.EarningsPerShareBasic) {
      const epsData = gaapData.EarningsPerShareBasic.units.USD?.[0];
      if (epsData?.val) {
        metrics.eps = {
          value: parseFloat(epsData.val.toFixed(2)),
          source: 'sec-edgar',
          timestamp: epsData.end,
          freshness: this.determineFreshness(epsData.end),
          confidence: 95,
        };
      }
    }

    // Extract Revenue
    if (gaapData.Revenues) {
      const revenueData = gaapData.Revenues.units.USD?.[0];
      if (revenueData?.val) {
        metrics.revenueTtm = {
          value: parseFloat((revenueData.val / 1e9).toFixed(2)),
          source: 'sec-edgar',
          timestamp: revenueData.end,
          freshness: this.determineFreshness(revenueData.end),
          confidence: 95,
        };
      }
    }

    // Extract Net Income
    if (gaapData.NetIncomeLoss) {
      const netIncomeData = gaapData.NetIncomeLoss.units.USD?.[0];
      if (netIncomeData?.val) {
        metrics.netIncome = {
          value: parseFloat((netIncomeData.val / 1e9).toFixed(2)),
          source: 'sec-edgar',
          timestamp: netIncomeData.end,
          freshness: this.determineFreshness(netIncomeData.end),
          confidence: 95,
        };
      }
    }

    return metrics;
  }

  private determineFreshness(filingDate: string): 'LIVE' | 'DELAYED' | 'CACHED' | 'STALE' {
    const daysOld = Math.floor((Date.now() - new Date(filingDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOld <= 7) return 'LIVE';
    if (daysOld <= 30) return 'DELAYED';
    if (daysOld <= 90) return 'CACHED';
    return 'STALE';
  }

  private nullMetric(source: string, timestamp: string): SecEdgarData['eps'] {
    return { value: null, source, timestamp, freshness: 'STALE', confidence: 0 };
  }

  private createErrorResponse(ticker: string, cik: string, timestamp: string, error: string): SecEdgarData {
    return {
      ticker,
      cik,
      eps: this.nullMetric('sec-edgar', timestamp),
      revenueTtm: this.nullMetric('sec-edgar', timestamp),
      netIncome: this.nullMetric('sec-edgar', timestamp),
      latestFilingDate: null,
      success: false,
      error,
    };
  }
}
