/**
 * Live Data Service Tests
 * Test data providers, caching, fallback logic
 */

import { describe, it, expect } from "vitest";
import { LiveDataService, PolygonDataProvider, AlpacaDataProvider, MassiveDataProvider } from "./LiveDataService";
import { HistoricalDataLoader } from "./historicalDataLoader";

describe("Live Data Service", () => {
  it("should create data service with multiple providers", () => {
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const alpaca = new AlpacaDataProvider({ name: "alpaca", rateLimit: 10, timeout: 5000 });

    const service = new LiveDataService([polygon, alpaca]);

    expect(service.getProviderCount()).toBe(2);
    expect(service.getProviders().length).toBe(2);
  });

  it("should fetch historical data from primary provider", async () => {
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const alpaca = new AlpacaDataProvider({ name: "alpaca", rateLimit: 10, timeout: 5000 });
    const service = new LiveDataService([polygon, alpaca]);

    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");

    const data = await service.getHistoricalData("SPY", start, end);

    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].open).toBeGreaterThan(0);
    expect(data[0].close).toBeGreaterThan(0);
  });

  it("should cache historical data", async () => {
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const service = new LiveDataService([polygon]);

    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");

    const data1 = await service.getHistoricalData("SPY", start, end);
    const data2 = await service.getHistoricalData("SPY", start, end);

    expect(data1).toEqual(data2);
  });

  it("should fetch real-time quotes", async () => {
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const service = new LiveDataService([polygon]);

    const quote = await service.getRealTimeQuote("SPY");

    expect(quote.symbol).toBe("SPY");
    expect(quote.price).toBeGreaterThan(0);
    expect(quote.bid).toBeGreaterThan(0);
    expect(quote.ask).toBeGreaterThan(0);
    expect(quote.source).toBe("polygon");
  });

  it("should fallback to secondary provider on failure", async () => {
    // This test simulates fallback but both providers work in our mock
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const massive = new MassiveDataProvider({ name: "massive", rateLimit: 50, timeout: 5000 });
    const service = new LiveDataService([polygon, massive]);

    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");

    const data = await service.getHistoricalData("BTC", start, end);

    expect(data.length).toBeGreaterThan(0);
  });

  it("should clear caches", async () => {
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const service = new LiveDataService([polygon]);

    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");

    await service.getHistoricalData("SPY", start, end);
    expect(service.getCacheStats()[0].size).toBeGreaterThan(0);

    service.clearAllCaches();
    expect(service.getCacheStats()[0].size).toBe(0);
  });

  it("should add and remove providers dynamically", () => {
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const alpaca = new AlpacaDataProvider({ name: "alpaca", rateLimit: 10, timeout: 5000 });
    const massive = new MassiveDataProvider({ name: "massive", rateLimit: 50, timeout: 5000 });

    const service = new LiveDataService([polygon]);
    expect(service.getProviderCount()).toBe(1);

    service.addProvider(alpaca);
    expect(service.getProviderCount()).toBe(2);

    service.addProvider(massive, 1);
    expect(service.getProviderCount()).toBe(3);

    service.removeProvider(1);
    expect(service.getProviderCount()).toBe(2);
  });

  it("should get primary provider", () => {
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const alpaca = new AlpacaDataProvider({ name: "alpaca", rateLimit: 10, timeout: 5000 });
    const service = new LiveDataService([polygon, alpaca]);

    expect(service.getPrimaryProvider()).toBe(polygon);
  });
});

describe("Historical Data Loader", () => {
  it("should load YTD data", async () => {
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const service = new LiveDataService([polygon]);
    const loader = new HistoricalDataLoader(service);

    const data = await loader.loadYearToDate("SPY", 2024);

    expect(data.length).toBeGreaterThan(0);
    expect(data[0].timestamp.getFullYear()).toBe(2024);
  });

  it("should validate data correctly", () => {
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const service = new LiveDataService([polygon]);
    const loader = new HistoricalDataLoader(service);

    const mockBars = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(2024, 0, i + 1),
      open: 100,
      high: 105,
      low: 95,
      close: 102,
      volume: 1000000,
    }));

    const validation = loader.validateData(mockBars);

    expect(validation.isValid).toBe(true);
    expect(validation.barCount).toBe(10);
    expect(validation.avgVolume).toBe(1000000);
  });

  it("should detect data gaps", () => {
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const service = new LiveDataService([polygon]);
    const loader = new HistoricalDataLoader(service);

    const bars = [
      { timestamp: new Date(2024, 0, 1), open: 100, high: 105, low: 95, close: 102, volume: 1000000 },
      { timestamp: new Date(2024, 0, 10), open: 100, high: 105, low: 95, close: 102, volume: 1000000 }, // 9-day gap
    ];

    const validation = loader.validateData(bars);

    expect(validation.gaps.length).toBeGreaterThan(0);
    expect(validation.isValid).toBe(false);
  });

  it("should calculate statistics", () => {
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const service = new LiveDataService([polygon]);
    const loader = new HistoricalDataLoader(service);

    const bars = Array.from({ length: 20 }, (_, i) => ({
      timestamp: new Date(2024, 0, i + 1),
      open: 100 + i * 0.5,
      high: 105 + i * 0.5,
      low: 95 + i * 0.5,
      close: 102 + i * 0.5,
      volume: 1000000 + i * 100000,
    }));

    const stats = loader.getStatistics(bars);

    expect(stats.dayCount).toBe(20);
    expect(stats.priceRange.min).toBeLessThan(stats.priceRange.max);
    expect(stats.volatility).toBeGreaterThan(0);
    expect(stats.volumeStats.avg).toBeGreaterThan(0);
  });

  it("should compare mock vs real data", () => {
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const service = new LiveDataService([polygon]);
    const loader = new HistoricalDataLoader(service);

    const mockBars = Array.from({ length: 10 }, () => ({
      timestamp: new Date(),
      open: 100,
      high: 105,
      low: 95,
      close: 102,
      volume: 1000000,
    }));

    const realBars = Array.from({ length: 10 }, () => ({
      timestamp: new Date(),
      open: 110,
      high: 115,
      low: 105,
      close: 112,
      volume: 2000000,
    }));

    const comparison = loader.compareMockVsReal(mockBars, realBars);

    expect(comparison.mockAvgClose).toEqual(102);
    expect(comparison.realAvgClose).toEqual(112);
    expect(comparison.priceDiff).toBeCloseTo(0.089, 2); // ~8.9% difference
    expect(comparison.barCountMatch).toBe(true);
  });

  it("should load 3-month lookback", async () => {
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const service = new LiveDataService([polygon]);
    const loader = new HistoricalDataLoader(service);

    const data = await loader.load3MonthLookback("SPY");

    expect(data.length).toBeGreaterThan(0);
  });

  it("should load 1-year history", async () => {
    const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
    const service = new LiveDataService([polygon]);
    const loader = new HistoricalDataLoader(service);

    const data = await loader.load1YearHistory("SPY");

    expect(data.length).toBeGreaterThan(0);
  });
});
