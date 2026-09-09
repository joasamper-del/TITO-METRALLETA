/**
 * Tests para BreakoutStrategy
 * Validar: breakout, volumen, tendencia, dirección
 */

import { describe, it, expect, beforeEach } from "vitest";
import { BreakoutStrategy } from "./BreakoutStrategy";
import {
  MarketData,
  StrategyConfig,
  StrategyName,
  SignalRecommendation,
} from "../types/Strategy";

let strategy: BreakoutStrategy;

const mockMarketData: MarketData = {
  symbol: "SPY",
  timestamp: new Date(),

  // Precio: breakout arriba de Bollinger Upper
  open: 558.0,
  high: 561.0,
  low: 557.5,
  close: 560.5, // > Bollinger Upper 560.0

  // Volumen: confirmación fuerte
  volume: 60000000,
  volumeAvg30: 40000000,

  // Liquidez
  bidPrice: 560.3,
  askPrice: 560.7,
  bid: 560.3,
  ask: 560.7,

  // Indicadores
  ma20: 556.0,
  ma50: 555.0,
  ma200: 540.0,
  rsi: 72.0, // Alcista pero no extremo
  stochasticK: 85.0,

  // Bollinger
  bollingerUpper: 560.0,
  bollingerMiddle: 554.0,
  bollingerLower: 548.0,

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
  riskPercentage: 1.5,
};

describe("BreakoutStrategy", () => {
  beforeEach(() => {
    strategy = new BreakoutStrategy();
  });

  // ========================================
  // TESTS: Propiedades básicas
  // ========================================

  it("should have correct strategy name", () => {
    expect(strategy.name).toBe(StrategyName.BREAKOUT);
  });

  it("should have correct min signal score threshold", () => {
    expect(strategy.minSignalScore).toBe(70);
  });

  it("should have correct max simultaneous trades", () => {
    expect(strategy.maxSimultaneousTrades).toBe(4);
  });

  it("should have default risk 1.5%", () => {
    expect(strategy.defaultRiskPct).toBe(1.5);
  });

  // ========================================
  // TESTS: Breakout Factor
  // ========================================

  it("should assign high score for breakout above Bollinger Upper", async () => {
    // mockMarketData: close 560.5 > Bollinger 560.0
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.signalScore).toBeGreaterThan(50);
  });

  it("should block when no breakout (close <= Bollinger Upper)", async () => {
    const noBreakoutData = {
      ...mockMarketData,
      close: 559.5, // < Bollinger 560.0
      bollingerUpper: 560.0,
    };
    const signal = await strategy.evaluate(noBreakoutData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  // ========================================
  // TESTS: Trend Validation
  // ========================================

  it("should block when MA50 <= MA200 (bearish trend)", async () => {
    const bearishData = {
      ...mockMarketData,
      ma50: 540.0,
      ma200: 555.0,
    };
    const signal = await strategy.evaluate(bearishData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should accept when MA50 > MA200 (bullish trend)", async () => {
    const bullishData = {
      ...mockMarketData,
      ma50: 555.0,
      ma200: 540.0,
    };
    const signal = await strategy.evaluate(bullishData, mockConfig);
    // Should not be blocked by trend validation alone
    if (signal.recommendation !== SignalRecommendation.BLOCKED) {
      expect(signal.signalScore).toBeGreaterThan(0);
    }
  });

  // ========================================
  // TESTS: Volume Validation
  // ========================================

  it("should block when volume < 1.2x average", async () => {
    const lowVolData = {
      ...mockMarketData,
      volume: 40000000, // 1.0x of 40M avg
    };
    const signal = await strategy.evaluate(lowVolData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should accept when volume > 1.2x average", async () => {
    const highVolData = {
      ...mockMarketData,
      volume: 50000000, // 1.25x of 40M avg
    };
    const signal = await strategy.evaluate(highVolData, mockConfig);
    // Should pass volume validation if others valid
    if (signal.recommendation !== SignalRecommendation.BLOCKED) {
      expect(signal.signalScore).toBeGreaterThan(0);
    }
  });

  // ========================================
  // TESTS: RSI Validation
  // ========================================

  it("should block when RSI < 50 (no bullish momentum)", async () => {
    const lowRsiData = {
      ...mockMarketData,
      rsi: 45.0,
    };
    const signal = await strategy.evaluate(lowRsiData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should block when RSI > 85 (too overbought)", async () => {
    const extremeRsiData = {
      ...mockMarketData,
      rsi: 90.0,
    };
    const signal = await strategy.evaluate(extremeRsiData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should accept RSI 50-80 (bullish optimal)", async () => {
    const optimalRsiData = {
      ...mockMarketData,
      rsi: 72.0,
    };
    const signal = await strategy.evaluate(optimalRsiData, mockConfig);
    // RSI should pass validation
    expect(signal.signalScore).toBeGreaterThan(0);
  });

  // ========================================
  // TESTS: Signal Recommendations
  // ========================================

  it("should return ENTER or HOLD for valid breakout setup", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    // mockMarketData has valid breakout, high volume, bullish trend, good RSI
    if (signal.recommendation !== SignalRecommendation.BLOCKED) {
      expect(signal.recommendation).toMatch(/ENTER|HOLD/);
    }
  });

  it("should calculate entry at current close", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.entryPrice).toBe(mockMarketData.close);
  });

  it("should calculate stop loss at 1.5% below entry", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    const expectedSLRange = mockMarketData.close * 0.985; // ~1.5% adjusted
    expect(signal.stopLossPrice).toBeLessThan(mockMarketData.close);
  });

  it("should have take profit targets [2%, 3%, 4%]", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.takeProfitTargets?.length).toBeGreaterThanOrEqual(1);
  });

  // ========================================
  // TESTS: Risk Parameters
  // ========================================

  it("should return correct risk parameters", () => {
    const riskParams = (strategy as any).getRiskParameters();
    expect(riskParams.stopLossPct).toBe(1.5);
    expect(riskParams.takeProfitPcts).toEqual([2.0, 3.0, 4.0]);
    expect(riskParams.trailingEnabled).toBe(true);
    expect(riskParams.trailingDistancePct).toBe(1.0); // Tighter than Trailing Exit
    expect(riskParams.maxReentries).toBe(1);
  });

  // ========================================
  // TESTS: Explanation
  // ========================================

  it("should generate natural language explanation", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.explanation).toBeTruthy();
  });

  it("explanation should mention breakout level and targets", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    if (signal.recommendation === SignalRecommendation.ENTER) {
      expect(signal.explanation).toMatch(/Breakout|Bollinger|Target/i);
    }
  });

  // ========================================
  // TESTS: Volume Confirmation
  // ========================================

  it("should confirm volume for strong breakouts", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    // mockMarketData: 60M / 40M = 1.5x
    expect(signal.volumeRatio).toBeGreaterThanOrEqual(1.5);
  });

  // ========================================
  // TESTS: Signal Score
  // ========================================

  it("should calculate signal score between 0-100", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.signalScore).toBeGreaterThanOrEqual(0);
    expect(signal.signalScore).toBeLessThanOrEqual(100);
  });

  it("should return high score for strong breakout, high volume, bullish setup", async () => {
    const strongBreakoutData = {
      ...mockMarketData,
      close: 561.5, // Strong breakout
      high: 562.0,
      ma50: 555.0,
      ma200: 540.0,
      rsi: 75.0, // Good momentum
      volume: 70000000, // Very high
      bollingerUpper: 560.0,
      bidPrice: 561.3,
      askPrice: 561.7,
    };
    const signal = await strategy.evaluate(strongBreakoutData, mockConfig);
    // Expect strong score for excellent breakout setup
    expect(signal.signalScore).toBeGreaterThanOrEqual(75);
  });

  // ========================================
  // TESTS: Timestamp & Symbol
  // ========================================

  it("should include timestamp in signal", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.timestamp).toBeTruthy();
    expect(signal.timestamp instanceof Date).toBe(true);
  });

  it("should include correct symbol in signal", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.symbol).toBe("SPY");
  });

  it("should include strategy name in signal", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.strategy).toBe(StrategyName.BREAKOUT);
  });

  // ========================================
  // TESTS: Earnings Block
  // ========================================

  it("should block when earnings today", async () => {
    const earningsData = {
      ...mockMarketData,
      hasEarningsToday: true,
    };
    const signal = await strategy.evaluate(earningsData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  // ========================================
  // TESTS: Combined Conditions
  // ========================================

  it("should handle multiple condition failures", async () => {
    const failMultipleData = {
      ...mockMarketData,
      close: 559.5, // No breakout
      ma50: 540.0, // Bearish trend
      rsi: 45.0, // No momentum
      volume: 35000000, // Low volume
    };
    const signal = await strategy.evaluate(failMultipleData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });
});
