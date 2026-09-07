/**
 * Web Research Module - Type Definitions
 *
 * Multi-source research architecture:
 * - Modular providers (any source can be added/removed)
 * - Fallback chain (if source 1 fails, try source 2)
 * - Single unified interface (ResearchResult)
 * - No single-source dependency
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BASE TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ResearchContext {
  ticker: string;
  timeframe?: 'today' | '1week' | '1month';
  focusAreas?: ('news' | 'earnings' | 'economics' | 'fundamentals')[];
  maxResults?: number;
}

export interface ResearchResult {
  ticker: string;
  requestedAt: Date;
  completedAt: Date;
  executionTimeMs: number;

  // Core data
  news: NewsItem[];
  economicEvents: EconomicEvent[];
  upcomingEvents: UpcomingEvents;
  fundamentals: FundamentalData;

  // Metadata
  sources: SourceCitation[];
  dataQuality: DataQualityScore;
  warnings: string[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NEWS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface NewsItem {
  id: string;
  title: string;
  description?: string;
  content?: string;
  url: string;

  // Source
  outlet: string;           // Reuters, Bloomberg, MarketWatch, etc.
  author?: string;
  publishedAt: Date;

  // Analysis
  sentiment: 'positive' | 'negative' | 'neutral';
  relevanceScore: number;   // 0-100 (how relevant to ticker)
  confidenceScore: number;  // 0-100 (how confident in sentiment)

  // Categorization
  categories: string[];     // 'earnings', 'regulation', 'product', etc.
  tags: string[];
}

export interface NewsProvider {
  name: string;
  priority: number;         // 1 = primary, 2 = fallback, etc.
  isAvailable: () => Promise<boolean>;
  search(ticker: string, limit?: number): Promise<NewsItem[]>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ECONOMIC EVENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface EconomicEvent {
  id: string;
  name: string;             // 'CPI', 'Fed Rate Decision', etc.
  country: string;
  date: Date;
  time?: string;            // HH:MM UTC

  // Impact assessment
  impact: 'high' | 'medium' | 'low';
  previous?: number;
  forecast?: number;
  actual?: number;

  // Relevance
  affectsAsset: boolean;    // Does this event affect the ticker?
  affectedMarkets: string[]; // 'USD', 'rates', 'commodities', etc.
}

export interface EconomicCalendarProvider {
  name: string;
  priority: number;
  isAvailable: () => Promise<boolean>;
  getEventsForDate(date: Date): Promise<EconomicEvent[]>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UPCOMING EVENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface UpcomingEvents {
  earnings?: EarningsEvent;
  stockSplit?: SplitEvent;
  dividendDate?: Date;
  exDividendDate?: Date;
  recordDate?: Date;
  regulatoryEvents?: RegulatoryEvent[];
  productLaunches?: ProductLaunch[];
}

export interface EarningsEvent {
  date: Date;
  quarter: string;          // 'Q3 2024'
  isBeforeMarketOpen: boolean;
  isAfterMarketClose: boolean;
  estimatedEPS?: number;
  lastEPS?: number;
}

export interface SplitEvent {
  date: Date;
  ratio: string;            // '2:1', '3:1', etc.
}

export interface RegulatoryEvent {
  date: Date;
  type: string;             // 'SEC filing', 'FDA approval', 'antitrust', etc.
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ProductLaunch {
  date: Date;
  productName: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
}

export interface EventProvider {
  name: string;
  priority: number;
  isAvailable: () => Promise<boolean>;
  getUpcomingEvents(ticker: string): Promise<UpcomingEvents>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FUNDAMENTALS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface FundamentalData {
  // Valuation
  peRatio?: number;
  pbRatio?: number;
  priceToSales?: number;
  enterpriseValue?: number;
  marketCap?: number;

  // Profitability
  roe?: number;             // Return on Equity %
  roic?: number;            // Return on Invested Capital %
  marginNet?: number;
  marginOperating?: number;

  // Growth
  revenueGrowth?: number;   // %
  earningsGrowth?: number;  // %
  fcfGrowth?: number;       // %

  // Debt
  debtToEquity?: number;
  debtToAssets?: number;
  currentRatio?: number;

  // Dividend
  dividendYield?: number;   // %
  payoutRatio?: number;

  // Metadata
  source: 'yahoo' | 'sec' | 'google' | 'cached' | 'unknown';
  lastUpdate: Date;
  freshness: 'realtime' | 'today' | 'stale';
  dataAge: number;          // Days old
}

export interface FundamentalProvider {
  name: string;
  priority: number;
  isAvailable: () => Promise<boolean>;
  getFundamentals(ticker: string): Promise<FundamentalData>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SOURCE CITATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SourceCitation {
  type: 'news' | 'official' | 'calendar' | 'market';
  outlet: string;           // Reuters, SEC, Yahoo Finance, etc.
  url: string;
  timestamp: Date;
  reliability: 'high' | 'medium' | 'low';
  providerName: string;     // Which provider gave us this
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATA QUALITY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface DataQualityScore {
  overall: number;          // 0-100
  news: number;             // 0-100 (freshness, count, sentiment reliability)
  events: number;           // 0-100 (completeness, accuracy)
  fundamentals: number;     // 0-100 (freshness, official source)
  sourceRedundancy: number; // 0-100 (how many independent sources confirm data)
  recommendations: string[]; // "Get fresher fundamentals", "High sentiment agreement", etc.
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROVIDER CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ProviderConfig {
  name: string;
  type: 'news' | 'events' | 'fundamentals';
  enabled: boolean;
  priority: number;         // Lower number = higher priority
  timeout: number;          // MS
  cacheSeconds: number;     // Cache result for N seconds
  maxRetries: number;
  backoffMultiplier: number;
}

export interface ResearchModuleConfig {
  newsProviders: ProviderConfig[];
  eventProviders: ProviderConfig[];
  fundamentalProviders: ProviderConfig[];

  // Defaults
  defaultTimeout: number;
  defaultCacheSeconds: number;
  maxConcurrentRequests: number;

  // Feature flags
  enableCaching: boolean;
  enableFallback: boolean;
  enableParallel: boolean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ERROR HANDLING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class ResearchProviderError extends Error {
  constructor(
    public providerName: string,
    public originalError: Error,
    public isRecoverable: boolean
  ) {
    super(`Provider ${providerName} failed: ${originalError.message}`);
  }
}

export interface ProviderFailure {
  providerName: string;
  error: string;
  timestamp: Date;
  isRecoverable: boolean;
  nextRetryAt?: Date;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUDIT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ResearchAuditLog {
  tickerResearched: string;
  requestedAt: Date;
  completedAt: Date;

  // Providers used
  newsProvidersUsed: string[];
  newsProvidersFailled: ProviderFailure[];

  eventProvidersUsed: string[];
  eventProvidersFailled: ProviderFailure[];

  fundamentalProvidersUsed: string[];
  fundamentalProvidersFailled: ProviderFailure[];

  // Results
  newsCount: number;
  eventsCount: number;
  fundamentalsRetrieved: boolean;

  // Quality
  dataQualityScore: number;
  sourcesUsed: number;

  // Performance
  executionTimeMs: number;
  cacheHits: number;
  cachesMisses: number;
}
