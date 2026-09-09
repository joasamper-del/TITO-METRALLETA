/**
 * Live Data Service
 * Integrates 3 data sources: Polygon (primary), Alpaca (secondary), Massive (tertiary)
 */

import { HistoricalBar, Quote, CacheEntry, DataSourceConfig } from "./types";

export abstract class DataProvider {
  protected config: DataSourceConfig;
  protected cache: Map<string, CacheEntry<any>> = new Map();

  constructor(config: DataSourceConfig) {
    this.config = config;
  }

  abstract fetchHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<HistoricalBar[]>;
  abstract fetchRealTimeQuote(symbol: string): Promise<Quote>;

  protected getCacheKey(symbol: string, startDate: Date, endDate: Date): string {
    return `${symbol}-${startDate.toISOString()}-${endDate.toISOString()}`;
  }

  protected getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const entryAge = (now - entry.timestamp.getTime()) / 1000;

    if (entryAge > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  protected setCache<T>(key: string, data: T, ttlSeconds: number = 86400): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl: ttlSeconds,
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export class LiveDataService {
  private providers: DataProvider[] = [];
  private primaryProvider: DataProvider;

  constructor(providers: DataProvider[]) {
    if (providers.length === 0) {
      throw new Error("At least one data provider required");
    }
    this.providers = providers;
    this.primaryProvider = providers[0];
  }

  async getHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<HistoricalBar[]> {
    for (const provider of this.providers) {
      try {
        const data = await provider.fetchHistoricalData(symbol, startDate, endDate);
        if (data && data.length > 0) {
          return data;
        }
      } catch (error) {
        console.warn(`Provider ${provider.constructor.name} failed for ${symbol}, trying next...`);
        continue;
      }
    }

    throw new Error(`All data providers failed for ${symbol}`);
  }

  async getRealTimeQuote(symbol: string): Promise<Quote> {
    for (const provider of this.providers) {
      try {
        const quote = await provider.fetchRealTimeQuote(symbol);
        if (quote) {
          return quote;
        }
      } catch (error) {
        console.warn(`Provider ${provider.constructor.name} failed for ${symbol} quote, trying next...`);
        continue;
      }
    }

    throw new Error(`All data providers failed to get quote for ${symbol}`);
  }

  addProvider(provider: DataProvider, index?: number): void {
    if (index !== undefined) {
      this.providers.splice(index, 0, provider);
    } else {
      this.providers.push(provider);
    }
  }

  removeProvider(index: number): void {
    this.providers.splice(index, 1);
  }

  getProviders(): DataProvider[] {
    return this.providers;
  }

  getProviderCount(): number {
    return this.providers.length;
  }

  getPrimaryProvider(): DataProvider {
    return this.primaryProvider;
  }

  clearAllCaches(): void {
    this.providers.forEach((p) => p.clearCache());
  }

  getCacheStats(): { provider: string; size: number }[] {
    return this.providers.map((p) => ({
      provider: p.constructor.name,
      size: p.getCacheSize(),
    }));
  }
}

/**
 * Polygon.io Data Provider
 */
export class PolygonDataProvider extends DataProvider {
  async fetchHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<HistoricalBar[]> {
    const cacheKey = this.getCacheKey(symbol, startDate, endDate);
    const cached = this.getFromCache<HistoricalBar[]>(cacheKey);
    if (cached) return cached;

    // Mock implementation - in production would call polygon.io API
    const bars: HistoricalBar[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        bars.push({
          timestamp: new Date(current),
          open: 100 + Math.random() * 50,
          high: 105 + Math.random() * 50,
          low: 95 + Math.random() * 50,
          close: 100 + Math.random() * 50,
          volume: 1000000 + Math.random() * 5000000,
        });
      }
      current.setDate(current.getDate() + 1);
    }

    this.setCache(cacheKey, bars, 86400);
    return bars;
  }

  async fetchRealTimeQuote(symbol: string): Promise<Quote> {
    // Mock implementation
    return {
      symbol,
      price: 100 + Math.random() * 50,
      bid: 99 + Math.random() * 50,
      ask: 101 + Math.random() * 50,
      volume: 1000000,
      timestamp: new Date(),
      source: "polygon",
    };
  }
}

/**
 * Alpaca Data Provider
 */
export class AlpacaDataProvider extends DataProvider {
  async fetchHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<HistoricalBar[]> {
    const cacheKey = this.getCacheKey(symbol, startDate, endDate);
    const cached = this.getFromCache<HistoricalBar[]>(cacheKey);
    if (cached) return cached;

    // Mock implementation - in production would call alpaca API
    const bars: HistoricalBar[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        bars.push({
          timestamp: new Date(current),
          open: 100 + Math.random() * 50,
          high: 105 + Math.random() * 50,
          low: 95 + Math.random() * 50,
          close: 100 + Math.random() * 50,
          volume: 500000 + Math.random() * 4000000,
        });
      }
      current.setDate(current.getDate() + 1);
    }

    this.setCache(cacheKey, bars, 86400);
    return bars;
  }

  async fetchRealTimeQuote(symbol: string): Promise<Quote> {
    // Mock implementation
    return {
      symbol,
      price: 100 + Math.random() * 50,
      bid: 99 + Math.random() * 50,
      ask: 101 + Math.random() * 50,
      volume: 500000,
      timestamp: new Date(),
      source: "alpaca",
    };
  }
}

/**
 * Massive Data Provider
 */
export class MassiveDataProvider extends DataProvider {
  async fetchHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<HistoricalBar[]> {
    const cacheKey = this.getCacheKey(symbol, startDate, endDate);
    const cached = this.getFromCache<HistoricalBar[]>(cacheKey);
    if (cached) return cached;

    // Mock implementation - in production would call massive API
    const bars: HistoricalBar[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        bars.push({
          timestamp: new Date(current),
          open: 100 + Math.random() * 50,
          high: 105 + Math.random() * 50,
          low: 95 + Math.random() * 50,
          close: 100 + Math.random() * 50,
          volume: 2000000 + Math.random() * 8000000,
        });
      }
      current.setDate(current.getDate() + 1);
    }

    this.setCache(cacheKey, bars, 86400);
    return bars;
  }

  async fetchRealTimeQuote(symbol: string): Promise<Quote> {
    // Mock implementation
    return {
      symbol,
      price: 100 + Math.random() * 50,
      bid: 99 + Math.random() * 50,
      ask: 101 + Math.random() * 50,
      volume: 2000000,
      timestamp: new Date(),
      source: "massive",
    };
  }
}
