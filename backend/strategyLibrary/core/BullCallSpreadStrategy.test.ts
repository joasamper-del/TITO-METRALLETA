/**
 * Tests para BullCallSpreadStrategy
 */

import { describe, it, expect, beforeEach } from "vitest";
import { BullCallSpreadStrategy } from "./BullCallSpreadStrategy";
import {
  MarketData,
  StrategyConfig,
  StrategyName,
  SignalRecommendation,
} from "../types/Strategy";

let strategy: BullCallSpreadStrategy;

const mockMarketData: MarketData = {
  symbol: "SPY",
  timestamp: new Date(),
  open: 555.0,
  high: 558.0,
  low: 554.0,
  close: 556.5,
  volume: 55000000,
  volumeAvg30: 40000000,
  bidPrice: 556.3,
  askPrice: 556.7,
  bid: 556.3,
  ask: 556.7,
  ma20: 555.0,
  ma50: 555.0,
  ma200: 540.0,
  rsi: 65.0,
  stochasticK: 70.0,
  bollingerUpper: 560.0,
  bollingerMiddle: 556.0,
  bollingerLower: 552.0,
  atr: 3.5,
  vix: 18.0,
  hasEarningsToday: false,
  newsCount: 0,
  optionsChainOpen: 0,
};

const mockConfig: StrategyConfig = {
  symbol: "SPY",
  timeframe: "1d",
  positionSizePct: 100,
  riskPercentage: 2.0,
};

describe("BullCallSpreadStrategy", () => {
  beforeEach(() => {
    strategy = new BullCallSpreadStrategy();
  });

  it("should have correct strategy name", () => {
    expect(strategy.name).toBe(StrategyName.BULL_CALL_SPREAD);
  });

  it("should have min signal score 65", () => {
    expect(strategy.minSignalScore).toBe(65);
  });

  it("should have max 2 simultaneous trades", () => {
    expect(strategy.maxSimultaneousTrades).toBe(2);
  });

  it("should block when MA50 <= MA200", async () => {
    const bearishData = { ...mockMarketData, ma50: 540.0, ma200: 555.0 };
    const signal = await strategy.evaluate(bearishData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should block when VIX > 35", async () => {
    const highVixData = { ...mockMarketData, vix: 36.0 };
    const signal = await strategy.evaluate(highVixData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should block when RSI < 40", async () => {
    const lowRsiData = { ...mockMarketData, rsi: 35.0 };
    const signal = await strategy.evaluate(lowRsiData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should calculate score > 0 for valid setup", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.signalScore).toBeGreaterThan(0);
  });

  it("should have zero max reentries (spreads static)", () => {
    const riskParams = (strategy as any).getRiskParameters();
    expect(riskParams.maxReentries).toBe(0);
  });

  it("should include entry price", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.entryPrice).toBe(mockMarketData.close);
  });

  it("should generate explanation for ENTER", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    if (signal.recommendation === SignalRecommendation.ENTER) {
      expect(signal.explanation).toMatch(/Bull Call Spread|crédito/i);
    }
  });

  it("should include symbol in signal", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.symbol).toBe("SPY");
  });

  it("should include strategy name in signal", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.strategy).toBe(StrategyName.BULL_CALL_SPREAD);
  });

  it("should assign high score when IV low", async () => {
    const lowIvData = { ...mockMarketData, vix: 12.0 };
    const signal = await strategy.evaluate(lowIvData, mockConfig);
    expect(signal.signalScore).toBeGreaterThan(50);
  });

  it("should assign lower score when IV high", async () => {
    const highIvData = { ...mockMarketData, vix: 32.0 };
    const signal = await strategy.evaluate(highIvData, mockConfig);
    // IV alto reduce el score pero otros factores (tendencia, RSI) aún contribuyen
    expect(signal.signalScore).toBeLessThan(75);
  });

  it("should have take profit at 75-80% credit", () => {
    const riskParams = (strategy as any).getRiskParameters();
    expect(riskParams.takeProfitPcts).toEqual([75, 80]);
  });

  it("should disable trailing for spreads", () => {
    const riskParams = (strategy as any).getRiskParameters();
    expect(riskParams.trailingEnabled).toBe(false);
  });
});
