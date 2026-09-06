/**
 * Observer Tests for Parallel Threshold Tracking
 * Validates that 65/70/72 observations are collected correctly
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PullbackVWAPObserver } from "./PullbackVWAPStrategy.observer";
import { MarketData, StrategyConfig, SignalRecommendation } from "../types/Strategy";

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
const mockConfig: StrategyConfig = { symbol: "SPY", timeframe: "1d", positionSizePct: 100, riskPercentage: 1.5 };

describe("PullbackVWAPObserver", () => {
  beforeEach(() => {
    observer = new PullbackVWAPObserver();
  });

  describe("Signal Evaluation Recording", () => {
    it("should record signal with correct threshold acceptance", () => {
      // Score 68: accepted by 65, rejected by 70 and 72
      const obs = observer.recordSignalEvaluation(
        mockMarketData,
        mockConfig,
        68,
        SignalRecommendation.ENTER
      );

      expect(obs.signalScore).toBe(68);
      expect(obs.acceptedBy65).toBe(true);  // 68 >= 65
      expect(obs.acceptedBy70).toBe(false); // 68 < 70
      expect(obs.acceptedBy72).toBe(false); // 68 < 72
    });

    it("should correctly classify score 71", () => {
      // Score 71: accepted by 65 and 70, rejected by 72
      const obs = observer.recordSignalEvaluation(
        mockMarketData,
        mockConfig,
        71,
        SignalRecommendation.ENTER
      );

      expect(obs.acceptedBy65).toBe(true);
      expect(obs.acceptedBy70).toBe(true);
      expect(obs.acceptedBy72).toBe(false);
    });

    it("should correctly classify score 72", () => {
      // Score 72: accepted by all three
      const obs = observer.recordSignalEvaluation(
        mockMarketData,
        mockConfig,
        72,
        SignalRecommendation.ENTER
      );

      expect(obs.acceptedBy65).toBe(true);
      expect(obs.acceptedBy70).toBe(true);
      expect(obs.acceptedBy72).toBe(true);
    });

    it("should generate unique IDs for each observation", () => {
      const obs1 = observer.recordSignalEvaluation(
        mockMarketData,
        mockConfig,
        68,
        SignalRecommendation.ENTER
      );
      const obs2 = observer.recordSignalEvaluation(
        mockMarketData,
        mockConfig,
        71,
        SignalRecommendation.ENTER
      );

      expect(obs1.id).not.toBe(obs2.id);
    });
  });

  describe("Post-Trade Data Update", () => {
    it("should update observation with trade results", () => {
      const obs = observer.recordSignalEvaluation(
        mockMarketData,
        mockConfig,
        68,
        SignalRecommendation.ENTER
      );

      observer.updateWithPostTradeData(
        obs.id,
        555.0,  // entry
        560.0,  // exit (+0.9%)
        562.0,  // max favorable
        553.0   // max adverse
      );

      const updated = observer.getAllObservations()[0];
      expect(updated.entryPrice).toBe(555.0);
      expect(updated.exitPrice).toBe(560.0);
      expect(updated.profitLoss).toBeCloseTo(0.9, 1);
      expect(updated.outcome).toBe("WIN");
      expect(updated.maxFavorableExcursion).toBe(562.0);
      expect(updated.maxAdverseExcursion).toBe(553.0);
    });

    it("should correctly classify LOSS outcome", () => {
      const obs = observer.recordSignalEvaluation(
        mockMarketData,
        mockConfig,
        75,
        SignalRecommendation.ENTER
      );

      observer.updateWithPostTradeData(
        obs.id,
        555.0,  // entry
        548.0,  // exit (-1.26%)
        558.0,  // max favorable
        545.0   // max adverse
      );

      const updated = observer.getAllObservations()[0];
      expect(updated.outcome).toBe("LOSS");
    });
  });

  describe("Comparative Report Generation", () => {
    it("should generate report with correct counts", () => {
      // Simular 10 señales con diferentes scores
      const scores = [60, 65, 68, 70, 71, 72, 75, 68, 70, 72];
      const obsList: any[] = [];

      scores.forEach((score) => {
        const obs = observer.recordSignalEvaluation(
          mockMarketData,
          mockConfig,
          score,
          SignalRecommendation.ENTER
        );
        obsList.push(obs);
      });

      const report = observer.generateComparativeReport();

      expect(report.totalSignals).toBe(10);
      expect(report.signals65).toBe(9);  // All except 60: scores >= 65
      expect(report.signals70).toBe(6);  // 70, 71, 72, 75, 72, 70
      expect(report.signals72).toBe(3);  // 72, 75, 72 (scores >= 72)
      expect(report.filtered70).toBe(3); // Between 65-69: 65, 68, 68
      expect(report.filtered72).toBe(6); // Between 65-71: 65, 68, 70, 71, 68, 70
    });

    it("should recommend based on win rate and P&L", () => {
      // Create winning trades at different scores
      for (let i = 0; i < 35; i++) {
        const score = 60 + Math.random() * 25; // 60-85
        const obs = observer.recordSignalEvaluation(
          mockMarketData,
          mockConfig,
          score,
          SignalRecommendation.ENTER
        );

        // All trades are +1% profit (winning)
        observer.updateWithPostTradeData(obs.id, 555.0, 560.55, 562.0, 553.0);
      }

      const report = observer.generateComparativeReport();

      expect(report.recommendation).not.toBe("WAIT_MORE_DATA");
      expect(["KEEP_65", "RECOMMEND_70", "RECOMMEND_72"]).toContain(
        report.recommendation
      );
    });
  });

  describe("Data Retrieval", () => {
    it("should retrieve all observations", () => {
      observer.recordSignalEvaluation(mockMarketData, mockConfig, 65, SignalRecommendation.ENTER);
      observer.recordSignalEvaluation(mockMarketData, mockConfig, 70, SignalRecommendation.ENTER);

      const all = observer.getAllObservations();
      expect(all).toHaveLength(2);
    });

    it("should retrieve observations for specific symbol", () => {
      observer.recordSignalEvaluation(mockMarketData, mockConfig, 65, SignalRecommendation.ENTER);
      observer.recordSignalEvaluation(
        { ...mockMarketData, symbol: "QQQ" },
        mockConfig,
        70,
        SignalRecommendation.ENTER
      );

      const spy = observer.getObservationsForSymbol("SPY");
      const qqq = observer.getObservationsForSymbol("QQQ");

      expect(spy).toHaveLength(1);
      expect(qqq).toHaveLength(1);
    });
  });

  describe("Data Cleanup", () => {
    it("should remove old observations", () => {
      // Record observation (will be recent)
      observer.recordSignalEvaluation(mockMarketData, mockConfig, 65, SignalRecommendation.ENTER);

      // Manually age the observation
      const obs = observer.getAllObservations()[0];
      obs.createdAt = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days old

      const removed = observer.cleanOldObservations(30); // Remove > 30 days old

      expect(removed).toBe(1);
      expect(observer.getAllObservations()).toHaveLength(0);
    });
  });
});
