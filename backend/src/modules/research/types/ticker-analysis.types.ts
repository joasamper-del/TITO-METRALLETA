/**
 * Ticker Analysis Types - S62 Research Engine
 *
 * Comprehensive data structures for multi-source ticket investigation
 */

// Data source enumeration
export type DataSource =
  | 'alpaca' // Real-time market data
  | 'yahoo' // Fundamentals
  | 'sec-edgar' // SEC filings
  | 'news-api' // News
  | 'earnings-calendar' // Earnings events
  | 'investor-relations' // Official IR
  | 'fred' // Economic data (VIX, etc)
  | 'trading-view' // Technical analysis
  | 'market-snacks' // Insights
  | 'cached' // Previously fetched
  | 'unknown';

// Data freshness
export type DataFreshness = 'LIVE' | 'DELAYED' | 'CACHED' | 'STALE' | 'UNKNOWN';

// Base data point with metadata
export interface DataPoint<T = any> {
  value: T;
  source: DataSource;
  timestamp: Date;
  freshness: DataFreshness;
  confidence: number; // 0-100%
  error?: string;
}

// Market data
export interface MarketData {
  symbol: string;
  price: DataPoint<number>;
  bid: DataPoint<number>;
  ask: DataPoint<number>;
  volume: DataPoint<number>;
  marketCap: DataPoint<number>;
  pe: DataPoint<number>;
  eps: DataPoint<number>;
  lastUpdate: Date;
}

// Fundamental data
export interface FundamentalData {
  symbol: string;
  company: string;
  sector: DataPoint<string>;
  industry: DataPoint<string>;
  employees: DataPoint<number>;
  website: DataPoint<string>;
  earnings: EarningsInfo[];
  lastUpdate: Date;
}

// Earnings information
export interface EarningsInfo {
  date: Date;
  symbol: string;
  consensusEPS: DataPoint<number>;
  actualEPS?: DataPoint<number>;
  consensusRevenue: DataPoint<number>;
  actualRevenue?: DataPoint<number>;
  source: DataSource;
}

// Technical indicators
export interface TechnicalIndicators {
  symbol: string;
  rsi: DataPoint<number>;
  adx: DataPoint<number>;
  superTrend: DataPoint<{
    trend: 'bullish' | 'bearish';
    level: number;
  }>;
  movingAverage50: DataPoint<number>;
  movingAverage200: DataPoint<number>;
  lastUpdate: Date;
}

// News/sentiment
export interface NewsItem {
  title: string;
  source: DataSource;
  url: string;
  timestamp: Date;
  sentiment: DataPoint<'bullish' | 'bearish' | 'neutral'>;
  relevance: DataPoint<number>; // 0-100
}

// Cross-validation result
export interface ValidationResult {
  dataPoint: string;
  primarySource: DataSource;
  primaryValue: any;
  secondarySource: DataSource;
  secondaryValue: any;
  match: boolean;
  discrepancy?: string;
  confidence: number; // 0-100%
}

// Ticker analysis report
export interface TickerAnalysisReport {
  symbol: string;
  timestamp: Date;
  market: MarketData;
  fundamentals: FundamentalData;
  technicals: TechnicalIndicators;
  news: NewsItem[];
  validations: ValidationResult[];
  riskScore: number; // 0-100 (higher = more risky)
  confidenceScore: number; // 0-100 (higher = more confident)
  summary: string;
  readyForExecution: boolean;
  reasons: string[];
}
