/**
 * Historical Data Loader & Validator
 * Loads and validates historical data from data service
 */

import { LiveDataService } from "./LiveDataService";
import { HistoricalBar, DataValidationResult } from "./types";

export interface MarketDataSet {
  spy: HistoricalBar[];
  qqq: HistoricalBar[];
  btc: HistoricalBar[];
  vix: HistoricalBar[]; // Context variable: regime/volatility indicator
}

export class HistoricalDataLoader {
  constructor(private dataService: LiveDataService) {}

  async loadYearToDate(symbol: string, year: number = 2024): Promise<HistoricalBar[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date();

    return this.dataService.getHistoricalData(symbol, startDate, endDate);
  }

  async load3MonthLookback(symbol: string, endDate: Date = new Date()): Promise<HistoricalBar[]> {
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 3);

    return this.dataService.getHistoricalData(symbol, startDate, endDate);
  }

  async load1YearHistory(symbol: string, endDate: Date = new Date()): Promise<HistoricalBar[]> {
    const startDate = new Date(endDate);
    startDate.setFullYear(startDate.getFullYear() - 1);

    return this.dataService.getHistoricalData(symbol, startDate, endDate);
  }

  async loadCustomPeriod(symbol: string, startDate: Date, endDate: Date): Promise<HistoricalBar[]> {
    return this.dataService.getHistoricalData(symbol, startDate, endDate);
  }

  async loadFullDataSet(year: number = 2024): Promise<MarketDataSet> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date();

    const [spy, qqq, btc, vix] = await Promise.all([
      this.dataService.getHistoricalData("SPY", startDate, endDate),
      this.dataService.getHistoricalData("QQQ", startDate, endDate),
      this.dataService.getHistoricalData("BTC", startDate, endDate),
      this.dataService.getHistoricalData("VIX", startDate, endDate),
    ]);

    return { spy, qqq, btc, vix };
  }

  validateDataSet(data: MarketDataSet): {
    spy: DataValidationResult;
    qqq: DataValidationResult;
    btc: DataValidationResult;
    vix: DataValidationResult;
    allValid: boolean;
  } {
    return {
      spy: this.validateData(data.spy),
      qqq: this.validateData(data.qqq),
      btc: this.validateData(data.btc),
      vix: this.validateData(data.vix),
      allValid:
        this.validateData(data.spy).isValid &&
        this.validateData(data.qqq).isValid &&
        this.validateData(data.btc).isValid &&
        this.validateData(data.vix).isValid,
    };
  }

  validateData(bars: HistoricalBar[]): DataValidationResult {
    const issues: string[] = [];
    const gaps: { start: Date; end: Date; days: number }[] = [];

    if (bars.length === 0) {
      return {
        isValid: false,
        gaps,
        avgVolume: 0,
        minVolume: 0,
        maxVolume: 0,
        barCount: 0,
        issues: ["No data available"],
      };
    }

    // Check for gaps > 1 day
    for (let i = 1; i < bars.length; i++) {
      const prevDate = new Date(bars[i - 1].timestamp);
      const currDate = new Date(bars[i].timestamp);

      const diffMs = currDate.getTime() - prevDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      // Expected gap between trading days is 1 day (weekends/holidays can be 2-3)
      if (diffDays > 4) {
        gaps.push({
          start: prevDate,
          end: currDate,
          days: Math.floor(diffDays),
        });
        issues.push(`Gap of ${Math.floor(diffDays)} days detected`);
      }
    }

    // Check volumes
    const volumes = bars.map((b) => b.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const minVolume = Math.min(...volumes);
    const maxVolume = Math.max(...volumes);

    // Check for suspiciously low volume
    const lowVolumeCount = volumes.filter((v) => v < avgVolume * 0.3).length;
    if (lowVolumeCount > bars.length * 0.1) {
      issues.push(`${lowVolumeCount} bars with volume <30% of average`);
    }

    // Check for OHLC validity
    for (const bar of bars) {
      if (!(bar.low <= bar.close && bar.close <= bar.high)) {
        issues.push(`Invalid OHLC at ${bar.timestamp}: O=${bar.open} H=${bar.high} L=${bar.low} C=${bar.close}`);
      }
      if (bar.high < bar.low) {
        issues.push(`High < Low at ${bar.timestamp}`);
      }
    }

    return {
      isValid: issues.length === 0,
      gaps,
      avgVolume,
      minVolume,
      maxVolume,
      barCount: bars.length,
      issues,
    };
  }

  compareMockVsReal(mockBars: HistoricalBar[], realBars: HistoricalBar[]): {
    mockAvgClose: number;
    realAvgClose: number;
    priceDiff: number;
    mockAvgVolume: number;
    realAvgVolume: number;
    volumeDiff: number;
    barCountMatch: boolean;
  } {
    const mockCloses = mockBars.map((b) => b.close);
    const realCloses = realBars.map((b) => b.close);

    const mockAvgClose = mockCloses.reduce((a, b) => a + b, 0) / mockCloses.length;
    const realAvgClose = realCloses.reduce((a, b) => a + b, 0) / realCloses.length;
    const priceDiff = Math.abs(mockAvgClose - realAvgClose) / realAvgClose;

    const mockVolumes = mockBars.map((b) => b.volume);
    const realVolumes = realBars.map((b) => b.volume);

    const mockAvgVolume = mockVolumes.reduce((a, b) => a + b, 0) / mockVolumes.length;
    const realAvgVolume = realVolumes.reduce((a, b) => a + b, 0) / realVolumes.length;
    const volumeDiff = Math.abs(mockAvgVolume - realAvgVolume) / realAvgVolume;

    return {
      mockAvgClose,
      realAvgClose,
      priceDiff,
      mockAvgVolume,
      realAvgVolume,
      volumeDiff,
      barCountMatch: mockBars.length === realBars.length,
    };
  }

  getStatistics(bars: HistoricalBar[]): {
    dayCount: number;
    priceRange: { min: number; max: number };
    volatility: number;
    volumeStats: { avg: number; min: number; max: number };
  } {
    const closes = bars.map((b) => b.close);
    const volumes = bars.map((b) => b.volume);

    const minPrice = Math.min(...closes);
    const maxPrice = Math.max(...closes);

    // Simple volatility (std dev of daily returns)
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }

    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    return {
      dayCount: bars.length,
      priceRange: { min: minPrice, max: maxPrice },
      volatility,
      volumeStats: {
        avg: volumes.reduce((a, b) => a + b, 0) / volumes.length,
        min: Math.min(...volumes),
        max: Math.max(...volumes),
      },
    };
  }
}
