/**
 * Data Service Types
 */

export interface Quote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: Date;
  source: "polygon" | "alpaca" | "massive";
}

export interface HistoricalBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface DataSourceConfig {
  name: "polygon" | "alpaca" | "massive";
  apiKey?: string;
  baseUrl?: string;
  rateLimit: number; // requests per minute
  timeout: number; // milliseconds
}

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number; // seconds
}

export interface DataValidationResult {
  isValid: boolean;
  gaps: { start: Date; end: Date; days: number }[];
  avgVolume: number;
  minVolume: number;
  maxVolume: number;
  barCount: number;
  issues: string[];
}

export interface WalkForwardResult {
  strategy: string;
  symbol: string;
  trainPeriod: { start: Date; end: Date };
  testPeriod: { start: Date; end: Date };
  trainStats: {
    trades: number;
    winRate: number;
    sharpe: number;
    pnl: number;
  };
  testStats: {
    trades: number;
    winRate: number;
    sharpe: number;
    pnl: number;
  };
  overfittingScore: number; // 0-100, higher = more overfit
  generalization: "excellent" | "good" | "fair" | "poor";
}

export interface BacktestComparison {
  strategy: string;
  mockData: {
    winRate: number;
    sharpe: number;
    pnl: number;
  };
  realData: {
    winRate: number;
    sharpe: number;
    pnl: number;
  };
  variance: {
    winRateDiff: number;
    sharpeDiff: number;
    pnlDiff: number;
  };
  reliable: boolean; // true if variance <20%
}
