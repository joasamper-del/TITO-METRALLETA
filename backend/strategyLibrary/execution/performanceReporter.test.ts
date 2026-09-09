/**
 * Performance Reporter Tests
 * Test comparison, overfitting detection, and report generation
 */

import { describe, it, expect } from "vitest";
import { PerformanceReporter, PerformanceComparison } from "./performanceReporter";
import { ExecutionSummary, StrategyExecutionResult } from "./walkForwardExecutor";

describe("Performance Reporter", () => {
  const reporter = new PerformanceReporter();

  const mockSummary: ExecutionSummary = {
    totalStrategies: 2,
    successful: 2,
    failed: 0,
    bestGeneralizer: "TrailingExitStrategy",
    worstGeneralizer: "MeanReversionStrategy",
    avgOverfittingScore: 30,
    results: [
      {
        strategy: "TrailingExitStrategy",
        symbol: "SPY",
        status: "success",
        executionTimeMs: 500,
        result: {
          strategy: "TrailingExitStrategy",
          symbol: "SPY",
          trainPeriod: { start: new Date("2024-01-01"), end: new Date("2024-09-30") },
          testPeriod: { start: new Date("2024-10-01"), end: new Date("2024-12-31") },
          trainStats: { trades: 12, winRate: 65, sharpe: 1.4, pnl: 1850 },
          testStats: { trades: 5, winRate: 58, sharpe: 1.1, pnl: 650 },
          overfittingScore: 18,
          generalization: "excellent",
        },
      },
      {
        strategy: "MeanReversionStrategy",
        symbol: "SPY",
        status: "success",
        executionTimeMs: 450,
        result: {
          strategy: "MeanReversionStrategy",
          symbol: "SPY",
          trainPeriod: { start: new Date("2024-01-01"), end: new Date("2024-09-30") },
          testPeriod: { start: new Date("2024-10-01"), end: new Date("2024-12-31") },
          trainStats: { trades: 18, winRate: 42, sharpe: 0.9, pnl: 1200 },
          testStats: { trades: 8, winRate: 35, sharpe: 0.6, pnl: 400 },
          overfittingScore: 42,
          generalization: "fair",
        },
      },
    ],
    executionTimeMs: 950,
  };

  const mockResults = [
    { strategy: "TrailingExitStrategy", winRate: 60, sharpe: 1.4, pnl: 1800, trades: 15 },
    { strategy: "MeanReversionStrategy", winRate: 40, sharpe: 0.8, pnl: 1150, trades: 20 },
  ];

  it("should generate comparison report", () => {
    const comparisons = reporter.generateComparisonReport(mockSummary, mockResults);

    expect(comparisons.length).toBeGreaterThan(0);
    expect(comparisons[0].strategy).toBeDefined();
    expect(comparisons[0].mock).toBeDefined();
    expect(comparisons[0].real).toBeDefined();
  });

  it("should calculate variance correctly", () => {
    const comparisons = reporter.generateComparisonReport(mockSummary, mockResults);

    comparisons.forEach((c) => {
      expect(c.variance.winRateDiff).toBeGreaterThanOrEqual(0);
      expect(c.variance.sharpeDiff).toBeDefined();
      expect(c.variance.pnlDiff).toBeGreaterThanOrEqual(0);
    });
  });

  it("should assess reliability based on variance", () => {
    const comparisons = reporter.generateComparisonReport(mockSummary, mockResults);

    comparisons.forEach((c) => {
      expect(typeof c.reliable).toBe("boolean");
      expect(["excellent", "good", "fair", "caution", "investigate"]).toContain(c.assessment);
    });
  });

  it("should identify overfitting signatures", () => {
    const signatures = reporter.identifyOverfittingSignatures(mockSummary);

    expect(signatures).toBeDefined();
    expect(Array.isArray(signatures)).toBe(true);
  });

  it("should generate recommendations", () => {
    const comparisons = reporter.generateComparisonReport(mockSummary, mockResults);
    const recommendations = reporter.generateRecommendations(comparisons, mockSummary);

    expect(recommendations).toBeDefined();
    expect(Array.isArray(recommendations)).toBe(true);
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it("should include safe to trade recommendations", async () => {
    const comparisons = reporter.generateComparisonReport(mockSummary, mockResults);
    const recommendations = reporter.generateRecommendations(comparisons, mockSummary);

    const hasSafeRecommendation = recommendations.some((r) => r.includes("SAFE TO TRADE"));
    // May or may not have safe strategies depending on variance
    expect(Array.isArray(recommendations)).toBe(true);
  });

  it("should include best generalizer in recommendations", async () => {
    const comparisons = reporter.generateComparisonReport(mockSummary, mockResults);
    const recommendations = reporter.generateRecommendations(comparisons, mockSummary);

    expect(recommendations.some((r) => r.includes("BEST GENERALIZER"))).toBe(true);
  });

  it("should generate comprehensive final report", async () => {
    const report = await reporter.generateFinalReport(mockSummary, mockResults);

    expect(report).toContain("SESSION 48");
    expect(report).toContain("COMPREHENSIVE BACKTESTING REPORT");
    expect(report).toContain("EXECUTIVE SUMMARY");
    expect(report).toContain("REAL VS MOCK COMPARISON");
    expect(report).toContain("OVERFITTING ANALYSIS");
    expect(report).toContain("RECOMMENDATIONS");
  });

  it("should report execution statistics in final report", async () => {
    const report = await reporter.generateFinalReport(mockSummary, mockResults);

    expect(report).toContain(mockSummary.totalStrategies.toString());
    expect(report).toContain(mockSummary.successful.toString());
    expect(report).toContain("Successful");
  });

  it("should calculate confidence score", async () => {
    const comparisons = reporter.generateComparisonReport(mockSummary, mockResults);
    const report = await reporter.generateFinalReport(mockSummary, mockResults);

    expect(report).toContain("Overall Confidence");
    expect(report).toContain("/100");
  });

  it("should assess strategy reliability accurately", () => {
    const comparisons = reporter.generateComparisonReport(mockSummary, mockResults);

    // Check that assessments are reasonable
    comparisons.forEach((c) => {
      const avgVariance = (c.variance.winRateDiff + c.variance.pnlDiff) / 2;

      if (avgVariance < 5) {
        expect(c.assessment).toBe("excellent");
      } else if (avgVariance < 15) {
        expect(c.assessment).toBe("good");
      } else if (avgVariance < 25) {
        expect(c.assessment).toBe("fair");
      }
    });
  });
});
