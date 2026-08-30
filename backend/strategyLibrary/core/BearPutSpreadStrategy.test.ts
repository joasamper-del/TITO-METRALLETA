import { describe, it, expect, beforeEach } from "vitest";
import { BearPutSpreadStrategy } from "./BearPutSpreadStrategy";
import { MarketData, StrategyConfig, StrategyName, SignalRecommendation } from "../types/Strategy";

let strategy: BearPutSpreadStrategy;

const mockMarketData: MarketData = {
  symbol: "SPY", timestamp: new Date(),
  open: 555.0, high: 558.0, low: 554.0, close: 556.5,
  volume: 55000000, volumeAvg30: 40000000,
  bidPrice: 556.3, askPrice: 556.7, bid: 556.3, ask: 556.7,
  ma20: 555.0, ma50: 555.0, ma200: 540.0,
  rsi: 55.0, stochasticK: 60.0,
  bollingerUpper: 560.0, bollingerMiddle: 556.0, bollingerLower: 552.0,
  atr: 3.5, vix: 20.0, hasEarningsToday: false, newsCount: 0, optionsChainOpen: 0,
};

const mockConfig: StrategyConfig = { symbol: "SPY", timeframe: "1d", positionSizePct: 100, riskPercentage: 2.5 };

describe("BearPutSpreadStrategy", () => {
  beforeEach(() => { strategy = new BearPutSpreadStrategy(); });

  it("should have correct strategy name", () => {
    expect(strategy.name).toBe(StrategyName.BEAR_PUT_SPREAD);
  });

  it("should have min signal score 60", () => {
    expect(strategy.minSignalScore).toBe(60);
  });

  it("should block when VIX > 40", async () => {
    const signal = await strategy.evaluate({ ...mockMarketData, vix: 41.0 }, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should block when RSI > 80", async () => {
    const signal = await strategy.evaluate({ ...mockMarketData, rsi: 81.0 }, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should accept neutral to bullish setup", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.signalScore).toBeGreaterThan(0);
  });

  it("should disable trailing", () => {
    const riskParams = (strategy as any).getRiskParameters();
    expect(riskParams.trailingEnabled).toBe(false);
  });

  it("should include timestamp", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.timestamp).toBeTruthy();
  });
});
