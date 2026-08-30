/**
 * S50 Phase 3 Tests: AdaptiveWeighting Engine
 * Statistical validation, overfitting prevention, conservative adjustments
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdaptiveWeightingEngine, WeightAdjustmentDecision } from "./adaptiveWeightingEngine";
import { SourceReliability } from "./performanceAnalyzer";

describe("S50 Phase 3: Adaptive Weighting Engine", () => {
  let engine: AdaptiveWeightingEngine;
  let mockReliabilities: SourceReliability[];

  beforeEach(() => {
    // Initialize with mock source reliabilities
    mockReliabilities = [
      {
        sourceName: "VIXSource",
        totalVotes: 50,
        confirmVotes: 40,
        confirmAccuracy: 80,
        neutralAccuracy: 60,
        contradictAccuracy: 30,
        overallScore: 95,
      },
      {
        sourceName: "TrendSource",
        totalVotes: 45,
        confirmVotes: 35,
        confirmAccuracy: 75,
        neutralAccuracy: 55,
        contradictAccuracy: 25,
        overallScore: 85,
      },
      {
        sourceName: "VolatilitySource",
        totalVotes: 30,
        confirmVotes: 18,
        confirmAccuracy: 60,
        neutralAccuracy: 50,
        contradictAccuracy: 20,
        overallScore: 65,
      },
    ];

    engine = new AdaptiveWeightingEngine({
      minTradesPerSource: 10,
      minWinRateShift: 5,
      pValueThreshold: 0.05,
      maxWeightChangePercent: 10,
      rebalanceFrequency: 50,
    });

    engine.initializeWeights(mockReliabilities);
  });

  describe("Weight Initialization", () => {
    it("should initialize weights from reliability scores", () => {
      const weights = engine.getCurrentWeights();

      expect(weights.VIXSource).toBeCloseTo(0.95, 1);
      expect(weights.TrendSource).toBeCloseTo(0.85, 1);
      expect(weights.VolatilitySource).toBeCloseTo(0.65, 1);
    });

    it("should clamp weights to [0.1, 1.0] range", () => {
      const weights = engine.getCurrentWeights();

      for (const weight of Object.values(weights)) {
        expect(weight).toBeGreaterThanOrEqual(0.1);
        expect(weight).toBeLessThanOrEqual(1.0);
      }
    });

    it("should track adjustment history", () => {
      const status = engine.getWeightStatus();

      expect(status).toHaveLength(3);
      expect(status[0].adjustmentCount).toBe(0); // No adjustments yet
    });
  });

  describe("Overfitting Prevention", () => {
    it("should reject adjustment with insufficient trades", () => {
      const decision = engine.evaluateAdjustment(
        "VIXSource",
        5, // Only 5 trades (min is 10)
        80, // historical win rate
        90 // recent win rate (10% improvement)
      );

      expect(decision.shouldAdjust).toBe(false);
      expect(decision.reason).toContain("Insufficient trades");
      expect(decision.evidence.minTradesMetric).toBe(false);
    });

    it("should reject adjustment with small win rate shift", () => {
      const decision = engine.evaluateAdjustment(
        "VIXSource",
        10, // Meets min trades
        80, // historical win rate
        83 // recent win rate (only 3% improvement, need 5%)
      );

      expect(decision.shouldAdjust).toBe(false);
      expect(decision.reason).toContain("Win rate shift too small");
      expect(decision.evidence.winRateShiftMetric).toBe(false);
    });

    it("should reject adjustment without statistical significance", () => {
      const decision = engine.evaluateAdjustment(
        "VIXSource",
        10, // Meets min trades
        50, // historical win rate
        60 // recent win rate (10% shift, but could be random with n=10)
      );

      expect(decision.shouldAdjust).toBe(false);
      expect(decision.reason).toContain("Not statistically significant");
      expect(decision.evidence.significanceMetric).toBe(false);
    });
  });

  describe("Statistical Validation", () => {
    it("should accept adjustment with all criteria met", () => {
      const decision = engine.evaluateAdjustment(
        "VIXSource",
        50, // Many trades
        60, // historical win rate
        80 // recent win rate (20% improvement - significant)
      );

      expect(decision.shouldAdjust).toBe(true);
      expect(decision.evidence.minTradesMetric).toBe(true);
      expect(decision.evidence.winRateShiftMetric).toBe(true);
      expect(decision.evidence.significanceMetric).toBe(true);
    });

    it("should calculate reasonable p-value", () => {
      const decision = engine.evaluateAdjustment(
        "VIXSource",
        100,
        50,
        70 // 20% improvement
      );

      // With 100 trades and 20% improvement from baseline 50%, this should be highly significant
      expect(decision.evidence.pValue).toBeLessThan(0.05);
    });

    it("should recognize marginal cases", () => {
      // Large sample, borderline shift
      const decision = engine.evaluateAdjustment(
        "VIXSource",
        100,
        70,
        75 // 5% improvement (just at threshold)
      );

      // This might or might not pass depending on exact p-value, but criteria are clear
      expect(decision.evidence.minTradesMetric).toBe(true);
      expect(decision.evidence.winRateShiftMetric).toBe(true);
    });
  });

  describe("Weight Adjustment", () => {
    it("should apply adjustment correctly", () => {
      const decision: WeightAdjustmentDecision = {
        sourceName: "VIXSource",
        shouldAdjust: true,
        reason: "All criteria met",
        oldWeight: 0.95,
        newWeight: 1.0,
        changePercent: 5.26,
        evidence: {
          tradesCount: 50,
          historicalWinRate: 60,
          recentWinRate: 80,
          pValue: 0.01,
          minTradesMetric: true,
          winRateShiftMetric: true,
          significanceMetric: true,
        },
      };

      const applied = engine.applyAdjustment(decision);
      expect(applied).toBe(true);

      const weights = engine.getCurrentWeights();
      expect(weights.VIXSource).toBeCloseTo(1.0, 1); // Clamped to max
    });

    it("should cap adjustment at max change percent", () => {
      const currentVIXWeight = 0.95; // VIXSource initialized to 0.95

      const decision: WeightAdjustmentDecision = {
        sourceName: "VIXSource",
        shouldAdjust: true,
        reason: "All criteria met",
        oldWeight: currentVIXWeight,
        newWeight: 1.5, // Try 50% increase (exceeds 10% cap)
        changePercent: 57.89,
        evidence: {
          tradesCount: 50,
          historicalWinRate: 50,
          recentWinRate: 90,
          pValue: 0.001,
          minTradesMetric: true,
          winRateShiftMetric: true,
          significanceMetric: true,
        },
      };

      engine.applyAdjustment(decision);

      const weights = engine.getCurrentWeights();
      // Should be capped at 0.95 * 1.10 = 1.045, which clamps to 1.0
      expect(weights.VIXSource).toBeLessThanOrEqual(1.0);
      expect(weights.VIXSource).toBeGreaterThan(0.95); // Should have increased slightly
    });

    it("should track adjustment count and timestamp", () => {
      const decision: WeightAdjustmentDecision = {
        sourceName: "VIXSource",
        shouldAdjust: true,
        reason: "Test",
        oldWeight: 0.9,
        newWeight: 0.95,
        changePercent: 5.56,
        evidence: {
          tradesCount: 50,
          historicalWinRate: 70,
          recentWinRate: 80,
          pValue: 0.02,
          minTradesMetric: true,
          winRateShiftMetric: true,
          significanceMetric: true,
        },
      };

      engine.applyAdjustment(decision);

      const status = engine.getWeightStatus();
      const vixSource = status.find((s) => s.sourceName === "VIXSource");
      expect(vixSource?.adjustmentCount).toBe(1);
      expect(vixSource?.lastAdjustedAt).toBeDefined();
    });
  });

  describe("Rebalance Cycle", () => {
    it("should process multiple adjustments in single cycle", () => {
      const decisions: WeightAdjustmentDecision[] = [
        {
          sourceName: "VIXSource",
          shouldAdjust: true,
          reason: "All criteria met",
          oldWeight: 0.95,
          newWeight: 0.98,
          changePercent: 3.16,
          evidence: {
            tradesCount: 50,
            historicalWinRate: 75,
            recentWinRate: 85,
            pValue: 0.02,
            minTradesMetric: true,
            winRateShiftMetric: true,
            significanceMetric: true,
          },
        },
        {
          sourceName: "TrendSource",
          shouldAdjust: true,
          reason: "All criteria met",
          oldWeight: 0.85,
          newWeight: 0.82,
          changePercent: -3.53,
          evidence: {
            tradesCount: 50,
            historicalWinRate: 75,
            recentWinRate: 65,
            pValue: 0.03,
            minTradesMetric: true,
            winRateShiftMetric: true,
            significanceMetric: true,
          },
        },
      ];

      const applied = engine.rebalanceCycle(decisions);

      expect(applied).toHaveLength(2);

      const weights = engine.getCurrentWeights();
      expect(weights.VIXSource).toBeGreaterThan(0.95);
      expect(weights.TrendSource).toBeLessThan(0.85);
    });

    it("should reject non-qualifying adjustments in cycle", () => {
      const decisions: WeightAdjustmentDecision[] = [
        {
          sourceName: "VIXSource",
          shouldAdjust: true,
          reason: "Criteria met",
          oldWeight: 0.95,
          newWeight: 0.98,
          changePercent: 3.16,
          evidence: {
            tradesCount: 50,
            historicalWinRate: 75,
            recentWinRate: 85,
            pValue: 0.02,
            minTradesMetric: true,
            winRateShiftMetric: true,
            significanceMetric: true,
          },
        },
        {
          sourceName: "VolatilitySource",
          shouldAdjust: false, // This one should not be applied
          reason: "Insufficient data",
          oldWeight: 0.65,
          newWeight: 0.65,
          changePercent: 0,
          evidence: {
            tradesCount: 5,
            historicalWinRate: 60,
            recentWinRate: 65,
            pValue: 0.5,
            minTradesMetric: false,
            winRateShiftMetric: false,
            significanceMetric: false,
          },
        },
      ];

      const applied = engine.rebalanceCycle(decisions);

      expect(applied).toHaveLength(1);
      expect(applied[0].sourceName).toBe("VIXSource");

      const weights = engine.getCurrentWeights();
      expect(weights.VolatilitySource).toBe(0.65); // Unchanged
    });
  });

  describe("Audit & Reporting", () => {
    it("should generate audit report", () => {
      const report = engine.generateAuditReport();

      expect(report).toContain("ADAPTIVE WEIGHTING AUDIT REPORT");
      expect(report).toContain("VIXSource");
      expect(report).toContain("TrendSource");
      expect(report).toContain("VolatilitySource");
      expect(report).toContain("Total Trades Processed");
    });

    it("should show weight status with history", () => {
      const decision: WeightAdjustmentDecision = {
        sourceName: "VIXSource",
        shouldAdjust: true,
        reason: "Criteria met",
        oldWeight: 0.95,
        newWeight: 0.98,
        changePercent: 3.16,
        evidence: {
          tradesCount: 50,
          historicalWinRate: 75,
          recentWinRate: 85,
          pValue: 0.02,
          minTradesMetric: true,
          winRateShiftMetric: true,
          significanceMetric: true,
        },
      };

      engine.applyAdjustment(decision);

      const status = engine.getWeightStatus();
      const vixStatus = status.find((s) => s.sourceName === "VIXSource");

      expect(vixStatus?.currentWeight).toBeCloseTo(0.98, 1);
      expect(vixStatus?.historicalWeight).toBe(0.95);
      expect(vixStatus?.adjustmentCount).toBe(1);
    });
  });

  describe("Edge Cases & Safety", () => {
    it("should handle unknown source gracefully", () => {
      const decision = engine.evaluateAdjustment(
        "UnknownSource",
        50,
        75,
        85
      );

      expect(decision.shouldAdjust).toBe(false);
      expect(decision.reason).toContain("Source not found");
    });

    it("should never allow weights below 0.1", () => {
      const decision: WeightAdjustmentDecision = {
        sourceName: "VolatilitySource",
        shouldAdjust: true,
        reason: "Criteria met",
        oldWeight: 0.65,
        newWeight: 0.05, // Try to drop below 0.1
        changePercent: -92.31,
        evidence: {
          tradesCount: 100,
          historicalWinRate: 60,
          recentWinRate: 10,
          pValue: 0.001,
          minTradesMetric: true,
          winRateShiftMetric: true,
          significanceMetric: true,
        },
      };

      engine.applyAdjustment(decision);

      const weights = engine.getCurrentWeights();
      expect(weights.VolatilitySource).toBeGreaterThanOrEqual(0.1);
    });

    it("should never allow weights above 1.0", () => {
      const decision: WeightAdjustmentDecision = {
        sourceName: "VIXSource",
        shouldAdjust: true,
        reason: "Criteria met",
        oldWeight: 0.95,
        newWeight: 1.5, // Try to exceed 1.0
        changePercent: 57.89,
        evidence: {
          tradesCount: 100,
          historicalWinRate: 60,
          recentWinRate: 95,
          pValue: 0.001,
          minTradesMetric: true,
          winRateShiftMetric: true,
          significanceMetric: true,
        },
      };

      engine.applyAdjustment(decision);

      const weights = engine.getCurrentWeights();
      expect(weights.VIXSource).toBeLessThanOrEqual(1.0);
    });
  });
});
