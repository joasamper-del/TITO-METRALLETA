import { describe, it, expect, beforeEach } from "vitest";
import { OperationManager } from "./OperationManager";
import { MarketData, StrategyConfig, MarketRegime, StrategyName } from "../types/Strategy";

let manager: OperationManager;
const mockBullishData: MarketData = {
  symbol: "SPY", timestamp: new Date(),
  open: 555.0, high: 558.0, low: 554.0, close: 557.0,
  volume: 50000000, volumeAvg30: 40000000,
  bidPrice: 556.8, askPrice: 557.2, bid: 556.8, ask: 557.2,
  ma20: 556.0, ma50: 555.0, ma200: 540.0,
  rsi: 65.0, stochasticK: 70.0,
  bollingerUpper: 560.0, bollingerMiddle: 556.0, bollingerLower: 552.0,
  atr: 3.0, vix: 18.0, hasEarningsToday: false, newsCount: 0, optionsChainOpen: 0,
};
const mockConfig: StrategyConfig = { symbol: "SPY", timeframe: "1d", positionSizePct: 100, riskPercentage: 1.5 };

describe("OperationManager", () => {
  beforeEach(() => { manager = new OperationManager(); });

  it("should detect regime", async () => {
    const decision = await manager.makeDecision(mockBullishData, mockConfig);
    expect(decision.regime).toBeTruthy();
  });

  it("should select strategy for regime", async () => {
    const decision = await manager.makeDecision(mockBullishData, mockConfig);
    expect(decision.selectedStrategy).toBeTruthy();
  });

  it("should have confidence score", async () => {
    const decision = await manager.makeDecision(mockBullishData, mockConfig);
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.confidence).toBeLessThanOrEqual(10);
  });

  it("should log decisions", async () => {
    await manager.makeDecision(mockBullishData, mockConfig);
    const log = manager.getOperationLog();
    expect(log.length).toBe(1);
  });

  it("should provide stats", async () => {
    await manager.makeDecision(mockBullishData, mockConfig);
    const stats = manager.getStats();
    expect(stats.totalOperations).toBe(1);
    expect(Object.keys(stats.by_regime).length).toBeGreaterThan(0);
  });

  it("should detect high volatility", async () => {
    const highVolData = { ...mockBullishData, vix: 35.0 };
    const decision = await manager.makeDecision(highVolData, mockConfig);
    expect(decision.regime).toBe(MarketRegime.HIGH_VOLATILITY);
  });

  it("should detect lateral market", async () => {
    const lateralData = { ...mockBullishData, close: 556.0, ma20: 556.5, atr: 1.0 };
    const decision = await manager.makeDecision(lateralData, mockConfig);
    expect(decision.regime).toBe(MarketRegime.LATERAL);
  });

  it("should have recommendation", async () => {
    const decision = await manager.makeDecision(mockBullishData, mockConfig);
    expect(decision.recommendation).toBeTruthy();
  });
});
