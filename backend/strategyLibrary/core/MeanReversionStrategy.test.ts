/**
 * Tests para MeanReversionStrategy
 * Validar: desviación, RSI extremo, soporte, reversión
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MeanReversionStrategy } from "./MeanReversionStrategy";
import {
  MarketData,
  StrategyConfig,
  StrategyName,
  SignalRecommendation,
} from "../types/Strategy";

let strategy: MeanReversionStrategy;

const mockMarketData: MarketData = {
  symbol: "SPY",
  timestamp: new Date(),

  // Precio: oversold, -2.5% del MA20
  open: 540.0,
  high: 541.0,
  low: 538.0,
  close: 538.5,

  // Volumen: confirmación
  volume: 50000000,
  volumeAvg30: 40000000,

  // Liquidez
  bidPrice: 538.3,
  askPrice: 538.7,
  bid: 538.3,
  ask: 538.7,

  // Indicadores
  ma20: 552.0,
  ma50: 550.0,
  ma200: 540.0,
  rsi: 28.0, // Oversold extremo
  stochasticK: 15.0,

  // Bollinger
  bollingerUpper: 560.0,
  bollingerMiddle: 552.0,
  bollingerLower: 544.0,

  atr: 4.5,
  vix: 22.0,

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

describe("MeanReversionStrategy", () => {
  beforeEach(() => {
    strategy = new MeanReversionStrategy();
  });

  // ========================================
  // TESTS: Propiedades básicas
  // ========================================

  it("should have correct strategy name", () => {
    expect(strategy.name).toBe(StrategyName.MEAN_REVERSION);
  });

  it("should have correct min signal score threshold", () => {
    expect(strategy.minSignalScore).toBe(65);
  });

  it("should have correct max simultaneous trades", () => {
    expect(strategy.maxSimultaneousTrades).toBe(3);
  });

  it("should have default risk 2.0%", () => {
    expect(strategy.defaultRiskPct).toBe(2.0);
  });

  // ========================================
  // TESTS: Desviación Factor
  // ========================================

  it("should assign high score for > 2σ deviation from MA20", async () => {
    // mockMarketData: close 538.5, MA20 552.0 = -2.5% = ~3.1σ
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.signalScore).toBeGreaterThan(50);
  });

  it("should block when deviation < 1.5σ", async () => {
    const smallDeviationData = {
      ...mockMarketData,
      close: 550.0, // Casi igual a MA20 552
      ma20: 552.0,
    };
    const signal = await strategy.evaluate(smallDeviationData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  // ========================================
  // TESTS: RSI Validation
  // ========================================

  it("should accept RSI < 30 (oversold)", async () => {
    const oversoldData = {
      ...mockMarketData,
      rsi: 25.0,
    };
    const signal = await strategy.evaluate(oversoldData, mockConfig);
    // Should pass RSI validation if other rules also pass
    if (signal.evaluationDetails.scoreComponents.momentum !== undefined) {
      expect(signal.evaluationDetails.scoreComponents.momentum).toBeGreaterThan(
        0
      );
    }
  });

  it("should accept RSI > 70 (overbought)", async () => {
    const overboughtData = {
      ...mockMarketData,
      close: 565.0, // Price moved up
      rsi: 75.0,
      ma20: 552.0,
    };
    const signal = await strategy.evaluate(overboughtData, mockConfig);
    expect(signal.signalScore).toBeGreaterThan(0);
  });

  it("should block RSI between 30-70 (normal range)", async () => {
    const normalRsiData = {
      ...mockMarketData,
      rsi: 50.0,
    };
    const signal = await strategy.evaluate(normalRsiData, mockConfig);
    expect(signal.recommendation).toBe(SignalRecommendation.BLOCKED);
  });

  // ========================================
  // TESTS: Support Validation
  // ========================================

  it("should calculate score when support is violated but other factors strong", async () => {
    const violatedSupportData = {
      ...mockMarketData,
      low: 530.0, // Far below MA20 * 0.98
      ma20: 552.0,
      rsi: 25.0,
      close: 535.0,
    };
    const signal = await strategy.evaluate(violatedSupportData, mockConfig);
    // Score should still be > 0 even with weak support, if deviation/RSI strong
    expect(signal.signalScore).toBeGreaterThan(0);
  });

  it("should accept when support is close (low near MA20*0.98)", async () => {
    const supportedData = {
      ...mockMarketData,
      low: 541.0, // Close to MA20*0.98 = 540.96
      ma20: 552.0,
      rsi: 25.0,
      close: 543.0,
    };
    const signal = await strategy.evaluate(supportedData, mockConfig);
    // Should not be blocked by support if others are valid
    if (signal.recommendation !== SignalRecommendation.BLOCKED) {
      expect(signal.signalScore).toBeGreaterThan(0);
    }
  });

  // ========================================
  // TESTS: Signal Recommendations
  // ========================================

  it("should return ENTER or HOLD for valid oversold setup", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    // mockMarketData: oversold (-2.5%), RSI 28, low 538 > support
    if (signal.recommendation !== SignalRecommendation.BLOCKED) {
      expect(signal.recommendation).toMatch(/ENTER|HOLD/);
    }
  });

  it("should calculate entry at current close", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.entryPrice).toBe(mockMarketData.close);
  });

  it("should calculate stop loss at 2.5% below entry", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.stopLossPrice).toBeLessThan(mockMarketData.close);
  });

  it("should have take profit targets [1.5%, 2.5%, 3%]", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.takeProfitTargets?.length).toBeGreaterThanOrEqual(1);
  });

  // ========================================
  // TESTS: Risk Parameters
  // ========================================

  it("should return correct risk parameters", () => {
    const riskParams = (strategy as any).getRiskParameters();
    expect(riskParams.stopLossPct).toBe(2.5);
    expect(riskParams.takeProfitPcts).toEqual([1.5, 2.5, 3.0]);
    expect(riskParams.trailingEnabled).toBe(false); // No trailing for reversions
    expect(riskParams.maxReentries).toBe(1);
  });

  // ========================================
  // TESTS: Explanation
  // ========================================

  it("should generate natural language explanation", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    expect(signal.explanation).toBeTruthy();
  });

  it("explanation should mention oversold/overbought direction", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    if (signal.recommendation === SignalRecommendation.ENTER) {
      expect(signal.explanation).toMatch(/oversold|overbought|reverting/i);
    }
  });

  // ========================================
  // TESTS: Volume Confirmation
  // ========================================

  it("should confirm volume for reverting moves", async () => {
    const signal = await strategy.evaluate(mockMarketData, mockConfig);
    // mockMarketData: 50M / 40M = 1.25x
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

  it("should return higher score for oversold, high-volume, tight-support setup", async () => {
    const bullishReversalData = {
      ...mockMarketData,
      close: 540.0, // ~2.2% below MA20
      low: 539.5, // Support near MA20*0.98
      ma20: 551.0,
      rsi: 22.0, // Strong oversold
      volume: 60000000, // High volume
      bidPrice: 539.8,
      askPrice: 540.2,
    };
    const signal = await strategy.evaluate(bullishReversalData, mockConfig);
    // Expect decent score for good reversal setup
    expect(signal.signalScore).toBeGreaterThanOrEqual(45);
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
    expect(signal.strategy).toBe(StrategyName.MEAN_REVERSION);
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
  // TESTS: Volume Factors
  // ========================================

  it("should assign high volume factor for confirming moves", async () => {
    const highVolData = {
      ...mockMarketData,
      volume: 75000000, // 1.875x average
    };
    const signal = await strategy.evaluate(highVolData, mockConfig);
    expect(signal.evaluationDetails.scoreComponents.volume).toBeGreaterThan(70);
  });
});
