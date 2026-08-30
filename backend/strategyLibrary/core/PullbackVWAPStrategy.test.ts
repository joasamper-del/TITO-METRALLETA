import { describe, it, expect, beforeEach } from "vitest";
import { PullbackVWAPStrategy } from "./PullbackVWAPStrategy";
import { MarketData, StrategyConfig, StrategyName } from "../types/Strategy";

let strategy: PullbackVWAPStrategy;
const mockMarketData: MarketData = { symbol: "SPY", timestamp: new Date(), open: 555.0, high: 559.0, low: 553.0, close: 555.5, volume: 45000000, volumeAvg30: 40000000, bidPrice: 555.3, askPrice: 555.7, bid: 555.3, ask: 555.7, ma20: 555.2, ma50: 552.0, ma200: 540.0, rsi: 55.0, stochasticK: 55.0, bollingerUpper: 559.0, bollingerMiddle: 555.0, bollingerLower: 551.0, atr: 3.0, vix: 18.0, hasEarningsToday: false, newsCount: 0, optionsChainOpen: 0 };
const mockConfig: StrategyConfig = { symbol: "SPY", timeframe: "1d", positionSizePct: 100, riskPercentage: 1.5 };

describe("PullbackVWAPStrategy", () => {
  beforeEach(() => { strategy = new PullbackVWAPStrategy(); });
  it("should have name PULLBACK_VWAP", () => { expect(strategy.name).toBe(StrategyName.PULLBACK_VWAP); });
  it("should block bearish", async () => { const signal = await strategy.evaluate({ ...mockMarketData, ma50: 540.0, ma200: 555.0 }, mockConfig); expect(signal.recommendation).toBe("BLOCKED"); });
  it("should accept pullback setup", async () => { const signal = await strategy.evaluate(mockMarketData, mockConfig); expect(signal.signalScore).toBeGreaterThan(0); });
  it("should enable trailing", () => { const riskParams = (strategy as any).getRiskParameters(); expect(riskParams.trailingEnabled).toBe(true); });
});
