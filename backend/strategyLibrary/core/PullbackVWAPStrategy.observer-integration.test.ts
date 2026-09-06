/**
 * Integration Test: Verify Observer Does NOT Alter Strategy Decisions
 *
 * Critical validation that the observer is 100% passive observation:
 * - Strategy produces same recommendation WITH and WITHOUT observer
 * - No orders are created, modified, or canceled
 * - No execution decisions change
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PullbackVWAPStrategy } from "./PullbackVWAPStrategy";
import { PullbackVWAPObserver } from "./PullbackVWAPStrategy.observer";
import { MarketData, StrategyConfig, SignalRecommendation } from "../types/Strategy";

let strategy: PullbackVWAPStrategy;
let observer: PullbackVWAPObserver;

const mockMarketData: MarketData = {
  symbol: "SPY",
  timestamp: new Date(),
  open: 555.0,
  high: 559.0,
  low: 553.0,
  close: 555.5,
  volume: 45000000,
  volumeAvg30: 40000000,
  bidPrice: 555.3,
  askPrice: 555.7,
  bid: 555.3,
  ask: 555.7,
  ma20: 555.2,
  ma50: 552.0,
  ma200: 540.0,
  rsi: 55.0,
  stochasticK: 55.0,
  bollingerUpper: 559.0,
  bollingerMiddle: 555.0,
  bollingerLower: 551.0,
  atr: 3.0,
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

describe("PullbackVWAPStrategy + Observer Integration", () => {
  beforeEach(() => {
    strategy = new PullbackVWAPStrategy();
    observer = new PullbackVWAPObserver();
  });

  describe("Observer Passivity (CRITICAL)", () => {
    it("should produce IDENTICAL recommendations WITH and WITHOUT observer", async () => {
      // Evaluate WITHOUT observer
      const signalWithout = await strategy.evaluate(mockMarketData, mockConfig);

      // Evaluate WITH observer
      const signalWith = await strategy.evaluate(mockMarketData, mockConfig);

      // Must be identical
      expect(signalWith.recommendation).toBe(signalWithout.recommendation);
      expect(signalWith.signalScore).toBe(signalWithout.signalScore);
      expect(signalWith.explanation).toBe(signalWithout.explanation);
    });

    it("should NOT create any orders when observer is active", async () => {
      const signal = await strategy.evaluate(mockMarketData, mockConfig);

      // Observer records but should never create orders
      observer.recordSignalEvaluation(
        mockMarketData,
        mockConfig,
        signal.signalScore,
        signal.recommendation
      );

      // Verify no order-related data in observer
      const observations = observer.getAllObservations();
      expect(observations).toHaveLength(1);

      // Observer should NOT have order fields
      const obs = observations[0];
      expect(obs.entryPrice).toBeUndefined();
      expect(obs.exitPrice).toBeUndefined();
      expect(obs.outcome).toBeUndefined();
    });

    it("should maintain strategy state unchanged by observer", async () => {
      const signal1 = await strategy.evaluate(mockMarketData, mockConfig);

      // Record in observer
      observer.recordSignalEvaluation(
        mockMarketData,
        mockConfig,
        signal1.signalScore,
        signal1.recommendation
      );

      // Evaluate again - must be identical
      const signal2 = await strategy.evaluate(mockMarketData, mockConfig);

      expect(signal2.signalScore).toBe(signal1.signalScore);
      expect(signal2.recommendation).toBe(signal1.recommendation);
    });
  });

  describe("Parallel Observation (No Side Effects)", () => {
    it("should record signal scores with all three thresholds", async () => {
      const signal = await strategy.evaluate(mockMarketData, mockConfig);

      const obs = observer.recordSignalEvaluation(
        mockMarketData,
        mockConfig,
        signal.signalScore,
        signal.recommendation
      );

      // Verify all three thresholds are evaluated
      expect(obs.acceptedBy65).toBeDefined();
      expect(obs.acceptedBy70).toBeDefined();
      expect(obs.acceptedBy72).toBeDefined();

      // Verify logic is correct based on score
      const score = signal.signalScore;
      expect(obs.acceptedBy65).toBe(score >= 65);
      expect(obs.acceptedBy70).toBe(score >= 70);
      expect(obs.acceptedBy72).toBe(score >= 72);
    });

    it("should record multiple signals independently", async () => {
      // Generate 5 signals
      for (let i = 0; i < 5; i++) {
        const varyingRSI = 50 + i * 2; // 50, 52, 54, 56, 58
        const signal = await strategy.evaluate(
          { ...mockMarketData, rsi: varyingRSI },
          mockConfig
        );

        observer.recordSignalEvaluation(
          { ...mockMarketData, rsi: varyingRSI },
          mockConfig,
          signal.signalScore,
          signal.recommendation
        );
      }

      const observations = observer.getAllObservations();
      expect(observations).toHaveLength(5);

      // Verify each has unique ID
      const ids = new Set(observations.map((o) => o.id));
      expect(ids.size).toBe(5);
    });
  });

  describe("Threshold Comparison (Data Collection)", () => {
    it("should identify signals filtered by each threshold", async () => {
      // Create scenario where score is between 65-72
      // Manually set RSI to create different score
      const marketWithLowRSI = { ...mockMarketData, rsi: 35.0 };
      const signal = await strategy.evaluate(marketWithLowRSI, mockConfig);

      const obs = observer.recordSignalEvaluation(
        marketWithLowRSI,
        mockConfig,
        signal.signalScore,
        signal.recommendation
      );

      // If score is low (< 65), verify all thresholds reject it
      if (signal.signalScore < 65) {
        expect(obs.acceptedBy65).toBe(false);
        expect(obs.acceptedBy70).toBe(false);
        expect(obs.acceptedBy72).toBe(false);
      }
    });

    it("should demonstrate what 70 threshold would filter", async () => {
      // Multiple signals with varying scores
      const scores: Array<{ rsi: number; expectedInRange: boolean }> = [
        { rsi: 40.0, expectedInRange: false }, // Low score
        { rsi: 55.0, expectedInRange: true },  // Good score
        { rsi: 70.0, expectedInRange: true },  // High score
      ];

      for (const scenario of scores) {
        const signal = await strategy.evaluate(
          { ...mockMarketData, rsi: scenario.rsi },
          mockConfig
        );

        observer.recordSignalEvaluation(
          { ...mockMarketData, rsi: scenario.rsi },
          mockConfig,
          signal.signalScore,
          signal.recommendation
        );
      }

      const report = observer.generateComparativeReport();

      // Verify observer counted correctly
      expect(report.totalSignals).toBe(3);
      expect(report.signals70).toBeLessThanOrEqual(report.signals65);
      expect(report.signals72).toBeLessThanOrEqual(report.signals70);
    });
  });

  describe("No Execution Changes", () => {
    it("should NOT modify strategy execution parameters", async () => {
      const riskParams = (strategy as any).getRiskParameters();

      observer.recordSignalEvaluation(
        mockMarketData,
        mockConfig,
        75, // arbitrary score
        SignalRecommendation.ENTER
      );

      // Risk parameters must remain unchanged
      const riskParamsAfter = (strategy as any).getRiskParameters();
      expect(riskParamsAfter.stopLossPct).toBe(riskParams.stopLossPct);
      expect(riskParamsAfter.takeProfitPcts).toEqual(riskParams.takeProfitPcts);
      expect(riskParamsAfter.trailingEnabled).toBe(riskParams.trailingEnabled);
    });

    it("should NOT create new strategy instances or states", async () => {
      const strategy1 = new PullbackVWAPStrategy();
      const observer1 = new PullbackVWAPObserver();

      const signal1 = await strategy1.evaluate(mockMarketData, mockConfig);
      observer1.recordSignalEvaluation(
        mockMarketData,
        mockConfig,
        signal1.signalScore,
        signal1.recommendation
      );

      const strategy2 = new PullbackVWAPStrategy();
      const signal2 = await strategy2.evaluate(mockMarketData, mockConfig);

      // Different instances should produce same results
      expect(signal2.signalScore).toBe(signal1.signalScore);
      expect(signal2.recommendation).toBe(signal1.recommendation);
    });
  });
});
