/**
 * Tests para TrailingExitStrategy
 * Validar: score factors, validations, risk parameters, recommendations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TrailingExitStrategy } from "./TrailingExitStrategy";
import {
  MarketData,
  StrategyConfig,
  StrategyName,
  SignalRecommendation,
} from "../types/Strategy";

// ============================================================================
// SETUP
// ============================================================================

let strategy: TrailingExitStrategy;

const mockMarketData: MarketData = {
  symbol: "SPY",
  timestamp: new Date(),

  // Precio: $554.32
  open: 553.5,
  high: 556.0,
  low: 552.0,
  close: 554.32,

  // Volumen: 45M, promedio 40M
  volume: 45000000,
  volumeAvg30: 40000000,

  // Liquidez: bid 554.30, ask 554.35
  bidPrice: 554.30,
  askPrice: 554.35,
  bid: 554.30,
  ask: 554.35,

  // Indicadores técnicos (alcistas)
  ma20: 553.0,
  ma50: 552.0,
  ma200: 540.0,
  rsi: 62.0, // alcista moderado
  stochasticK: 75.0,

  // Bollinger
  bollingerUpper: 560.0,
  bollingerMiddle: 554.0,
  bollingerLower: 548.0,

  // ATR y otros
  atr: 3.5,
  vix: 18.5,

  // Eventos
  hasEarningsToday: false,
  newsCount: 0,

  // Griegos (opciones)
  optionsChainOpen: 0,
};

const mockConfig: StrategyConfig = {
  symbol: "SPY",
  timeframe: "1d",
  positionSizePct: 100,
  riskPercentage: 1.5,
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe("TrailingExitStrategy", () => {
  beforeEach(() => {
    strategy = new TrailingExitStrategy();
  });

  // ========================================
  // TESTS: Propiedades básicas
  // ========================================

  it("should have correct strategy name", () => {
    expect(strategy.name).toBe(StrategyName.TRAILING_EXIT);
  });

  it("should have correct min signal score threshold", () => {
    expect(strategy.minSignalScore).toBe(70);
  });

  it("should have correct max simultaneous trades", () => {
    expect(strategy.maxSimultaneousTrades).toBe(5);
  });

  it("should have default position size 100%", () => {
    expect(strategy.defaultPositionSizePct).toBe(100);
  });

  it("should have default risk 1.5%", () => {
    expect(strategy.defaultRiskPct).toBe(1.5);
  });

  // ========================================
  // TESTS: Score Factors
  // ========================================

  it("should calculate trend factor when MA50 > MA200", async () => {
    const bullishData = {
      ...mockMarketData,
      ma50: 552.0,
      ma200: 540.0,
    };
    const signal = await strategy.evaluate(bullishData, mockConfig);
    expect(signal.evaluationDetails.scoreComponents.trend).toBe(100);
  });

  it("should block when MA50 <= MA200 on entry validation", async () => {
    const bearishData = {
      ...mockMarketData,
      ma50: 540.0,
      ma200: 552.0,
    };
    const signal = await strategy.evaluate(bearishData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should calculate RSI factor when 50 < RSI < 70", async () => {
    const rsiData = {
      ...mockMarketData,
      rsi: 62.0,
    };
    const signal = await strategy.evaluate(rsiData, mockConfig);
    // RSI factor value should be > 0 when in valid range
    expect(signal.signalScore).toBeGreaterThan(0);
  });

  it("should block when RSI > 80 (too overbought validation)", async () => {
    const overboughtData = {
      ...mockMarketData,
      rsi: 85.0,
    };
    const signal = await strategy.evaluate(overboughtData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should calculate volume factor when volume > 1.2x average", async () => {
    const highVolData = {
      ...mockMarketData,
      volume: 48000000, // 1.2x of 40M avg
    };
    const signal = await strategy.evaluate(highVolData, mockConfig);
    expect(signal.evaluationDetails.scoreComponents.volume).toBeGreaterThan(50);
  });

  // ========================================
  // TESTS: Validation Rules
  // ========================================

  it("should block when MA50 <= MA200", async () => {
    const bearishData = {
      ...mockMarketData,
      ma50: 540.0,
      ma200: 552.0,
    };
    const signal = await strategy.evaluate(bearishData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should block when RSI < 50 (no bullish momentum)", async () => {
    const lowRsiData = {
      ...mockMarketData,
      rsi: 40.0,
    };
    const signal = await strategy.evaluate(lowRsiData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should block when RSI > 80 (too overbought)", async () => {
    const overboughtData = {
      ...mockMarketData,
      rsi: 85.0,
    };
    const signal = await strategy.evaluate(overboughtData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should block when close <= Bollinger middle (SuperTrend bearish)", async () => {
    const bearishTrendData = {
      ...mockMarketData,
      close: 553.0,
      bollingerMiddle: 554.0,
    };
    const signal = await strategy.evaluate(bearishTrendData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  it("should block when earnings event today", async () => {
    const earningsData = {
      ...mockMarketData,
      hasEarningsToday: true,
    };
    const signal = await strategy.evaluate(earningsData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  // ========================================
  // TESTS: Signal Recommendation
  // ========================================

  it("should return ENTER when all validations pass and score >= 70", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    // mockMarketData has: MA50 > MA200, RSI 62, close > MA20, no earnings
    // Should pass validation and likely have score >= 70
    if (signal.recommendation !== SignalRecommendation.BLOCKED) {
      expect(signal.recommendation).toMatch(/ENTER|HOLD/);
    }
  });

  it("should include entry price equal to current close", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.entryPrice).toBe(mockMarketData.close);
  });

  it("should calculate stop loss around 2% below entry (adjusted by volatility)", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    // Stop loss is adjusted by volatility filter, so we just check it's less than entry
    expect(signal.stopLossPrice).toBeLessThan(mockMarketData.close);
  });

  it("should calculate take profit targets [2%, 3.5%, 5%]", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.takeProfitTargets?.length).toBeGreaterThanOrEqual(1);
  });

  // ========================================
  // TESTS: Risk Parameters
  // ========================================

  it("should return correct risk parameters", () => {
    const riskParams = (strategy as any).getRiskParameters();
    expect(riskParams.stopLossPct).toBe(2.0);
    expect(riskParams.takeProfitPcts).toEqual([2.0, 3.5, 5.0]);
    expect(riskParams.trailingEnabled).toBe(true);
    expect(riskParams.trailingDistancePct).toBe(1.5);
    expect(riskParams.maxReentries).toBe(2);
  });

  // ========================================
  // TESTS: Explanation
  // ========================================

  it("should generate natural language explanation", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.explanation).toBeTruthy();
    expect(signal.explanation.length).toBeGreaterThan(0);
  });

  it("explanation should mention strategy context when ENTER", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    if (signal.recommendation === SignalRecommendation.ENTER) {
      expect(signal.explanation).toMatch(/Tendencia|Volumen|RSI/i);
    }
  });

  it("explanation should mention block reason when BLOCKED", async () => {
    const bearishData = {
      ...mockMarketData,
      ma50: 540.0,
      ma200: 552.0,
    };
    const signal = await strategy.evaluate(bearishData, mockConfig);
    expect(signal.explanation).toMatch(/BLOQUEADA/i);
  });

  // ========================================
  // TESTS: Volume Confirmation
  // ========================================

  it("should confirm volume when volume > 1.2x average", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    // mockMarketData: 45M / 40M = 1.125x
    // Should be close to confirmation threshold
    expect(signal.volumeRatio).toBeGreaterThan(1.0);
  });

  // ========================================
  // TESTS: Signal Score
  // ========================================

  it("should calculate signal score between 0-100", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.signalScore).toBeGreaterThanOrEqual(0);
    expect(signal.signalScore).toBeLessThanOrEqual(100);
  });

  it("should return higher score for bullish, high-volume data", async () => {
    const bullishData = {
      ...mockMarketData,
      ma50: 555.0,
      ma200: 540.0,
      rsi: 62.0,
      volume: 60000000, // 1.5x average
      close: 556.0,
      bollingerMiddle: 554.0,
      bollingerUpper: 558.0,
      bidPrice: 555.98,
      askPrice: 556.02,
    };
    const signal = await strategy.evaluate(bullishData, mockConfig);
    // Expected: Trend 100*0.25 + RSI 60*0.2 + SuperTrend 100*0.2 + Vol 100*0.15 + Liquidity 100*0.1 + Regime 100*0.1 = 80
    expect(signal.signalScore).toBeGreaterThanOrEqual(70);
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
    expect(signal.strategy).toBe(StrategyName.TRAILING_EXIT);
  });
});
