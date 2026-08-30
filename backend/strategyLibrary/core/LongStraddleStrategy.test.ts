import { describe, it, expect, beforeEach } from "vitest";
import { LongStraddleStrategy } from "./LongStraddleStrategy";
import { MarketData, StrategyConfig, StrategyName } from "../types/Strategy";

let strategy: LongStraddleStrategy;

const mockMarketData: MarketData = {
  symbol: "SPY", timestamp: new Date(),
  open: 555.0, high: 560.0, low: 550.0, close: 556.5,
  volume: 60000000, volumeAvg30: 40000000,
  bidPrice: 556.3, askPrice: 556.7, bid: 556.3, ask: 556.7,
  ma20: 555.0, ma50: 555.0, ma200: 540.0,
  rsi: 50.0, stochasticK: 50.0,
  bollingerUpper: 560.0, bollingerMiddle: 556.0, bollingerLower: 552.0,
  atr: 4.0, vix: 26.0, hasEarningsToday: false, newsCount: 0, optionsChainOpen: 0,
};

const mockConfig: StrategyConfig = { symbol: "SPY", timeframe: "1d", positionSizePct: 100, riskPercentage: 3.0 };

describe("LongStraddleStrategy", () => {
  beforeEach(() => { strategy = new LongStraddleStrategy(); });

  it("should have correct strategy name", () => {
    expect(strategy.name).toBe(StrategyName.LONG_STRADDLE);
  });

  it("should block when VIX too low", async () => {
    const signal = await strategy.evaluate({ ...mockMarketData, vix: 11.0 }, mockConfig);
    expect(signal.recommendation).toBe("BLOCKED");
  });

  it("should accept high IV setup", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.signalScore).toBeGreaterThan(0);
  });

  it("should have take profit 30-50%", () => {
    const riskParams = (strategy as any).getRiskParameters();
    expect(riskParams.takeProfitPcts).toEqual([30, 50]);
  });

  it("should include timestamp", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.timestamp).toBeTruthy();
  });
});
