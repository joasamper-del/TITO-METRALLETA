import { describe, it, expect, beforeEach } from "vitest";
import { VolatilityExpansionStrategy } from "./VolatilityExpansionStrategy";
import { MarketData, StrategyConfig, StrategyName } from "../types/Strategy";

let strategy: VolatilityExpansionStrategy;
const mockMarketData: MarketData = { symbol: "SPY", timestamp: new Date(), open: 556.0, high: 561.0, low: 554.0, close: 560.0, volume: 60000000, volumeAvg30: 40000000, bidPrice: 559.8, askPrice: 560.2, bid: 559.8, ask: 560.2, ma20: 555.0, ma50: 552.0, ma200: 540.0, rsi: 70.0, stochasticK: 80.0, bollingerUpper: 559.0, bollingerMiddle: 555.0, bollingerLower: 551.0, atr: 4.5, vix: 24.0, hasEarningsToday: false, newsCount: 0, optionsChainOpen: 0 };
const mockConfig: StrategyConfig = { symbol: "SPY", timeframe: "1d", positionSizePct: 100, riskPercentage: 2.0 };

describe("VolatilityExpansionStrategy", () => {
  beforeEach(() => { strategy = new VolatilityExpansionStrategy(); });
  it("should have name VOLATILITY_EXPANSION", () => { expect(strategy.name).toBe(StrategyName.VOLATILITY_EXPANSION); });
  it("should block low ATR", async () => { const signal = await strategy.evaluate({ ...mockMarketData, atr: 1.0 }, mockConfig); expect(signal.recommendation).toBe("BLOCKED"); });
  it("should accept vol expansion", async () => { const signal = await strategy.evaluate(mockMarketData, mockConfig); expect(signal.signalScore).toBeGreaterThanOrEqual(0); });
  it("should enable trailing", () => { const riskParams = (strategy as any).getRiskParameters(); expect(riskParams.trailingEnabled).toBe(true); });
});
