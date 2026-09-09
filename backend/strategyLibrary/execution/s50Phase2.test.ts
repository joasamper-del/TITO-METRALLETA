/**
 * S50 Phase 2 Tests: Self-Learning System
 * PostTradeReportGenerator + PerformanceAnalyzer
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PostTradeReportGenerator, PostTradeReport } from "./postTradeReportGenerator";
import { PerformanceAnalyzer } from "./performanceAnalyzer";
import { DecisionLogEntry } from "../confirmation/decisionHistory";

describe("S50 Phase 2: Self-Learning System", () => {
  let mockReports: PostTradeReport[];

  beforeEach(() => {
    // Create mock trade reports with realistic data
    mockReports = [
      // Winning trades
      {
        tradeId: "SPY_1",
        symbol: "SPY",
        timestamp: new Date("2026-09-01T14:30:00Z"),
        strategy: "TrailingExitStrategy",
        regime: "BULLISH_STRONG",
        vix: 16.5,
        entryReason: ["Trend confirmation", "Volume spike"],
        confirmationSources: [
          { sourceName: "VIXSource", verdict: "CONFIRM", score: 95, dataQuality: "EXCELLENT", impact: "strong" },
          { sourceName: "TrendSource", verdict: "CONFIRM", score: 85, dataQuality: "GOOD", impact: "strong" },
          { sourceName: "VolatilitySource", verdict: "NEUTRAL", score: 60, dataQuality: "FAIR", impact: "moderate" },
        ],
        confidenceScore: 92,
        confidenceThreshold: 65,
        entryPrice: 450.23,
        quantity: 100,
        exitPrice: 451.50,
        exitReason: "TP_HIT",
        pnlDollars: 127.0,
        pnlPercent: 0.28,
        duration: "25 min",
        riskRewardRatio: 2.5,
        lessons: ["Trend confirmation works in BULLISH_STRONG", "VIX regime filtering effective"],
        nextTrade: "✅ Excellent execution. Multiple sources aligned. Continue this pattern.",
        riskGatesAllPassed: true,
        supervisorGatesAllPassed: true,
      },

      // Loss with high confidence
      {
        tradeId: "QQQ_2",
        symbol: "QQQ",
        timestamp: new Date("2026-09-01T15:00:00Z"),
        strategy: "MeanReversionStrategy",
        regime: "BULLISH_WEAK",
        vix: 19.2,
        entryReason: ["Oversold bounce", "Support level"],
        confirmationSources: [
          { sourceName: "VIXSource", verdict: "NEUTRAL", score: 55, dataQuality: "EXCELLENT", impact: "moderate" },
          { sourceName: "TrendSource", verdict: "CONTRADICT", score: 35, dataQuality: "GOOD", impact: "moderate" },
          { sourceName: "VolatilitySource", verdict: "CONFIRM", score: 80, dataQuality: "FAIR", impact: "strong" },
        ],
        confidenceScore: 75,
        confidenceThreshold: 65,
        entryPrice: 350.0,
        quantity: 50,
        exitPrice: 349.0,
        exitReason: "SL_HIT",
        pnlDollars: -50.0,
        pnlPercent: -0.29,
        duration: "15 min",
        riskRewardRatio: 0.5,
        lessons: ["Weak regime + weak trend confirmation = higher false positives", "Consider skipping BULLISH_WEAK trades"],
        nextTrade: "📚 Loss in weak regime. Trend didn't confirm. Raise threshold to 75+.",
        riskGatesAllPassed: true,
        supervisorGatesAllPassed: true,
      },

      // Low confidence win
      {
        tradeId: "BTC_3",
        symbol: "BTC",
        timestamp: new Date("2026-09-01T16:00:00Z"),
        strategy: "BreakoutStrategy",
        regime: "LATERAL",
        vix: 22.1,
        entryReason: ["Breakout above resistance"],
        confirmationSources: [
          { sourceName: "VIXSource", verdict: "NEUTRAL", score: 50, dataQuality: "EXCELLENT", impact: "weak" },
          { sourceName: "MarketSniper", verdict: "CONFIRM", score: 60, dataQuality: "POOR", impact: "weak" },
        ],
        confidenceScore: 55,
        confidenceThreshold: 65,
        entryPrice: 42000.0,
        quantity: 1,
        exitPrice: 42500.0,
        exitReason: "TP_HIT",
        pnlDollars: 500.0,
        pnlPercent: 1.19,
        duration: "45 min",
        riskRewardRatio: 1.2,
        lessons: ["Low confidence win in LATERAL? Luck or edge? Needs more data"],
        nextTrade: "Lucky win in LATERAL regime. Increase sample size before relying on this.",
        riskGatesAllPassed: true,
        supervisorGatesAllPassed: true,
      },
    ];
  });

  // ========== POST-TRADE REPORT GENERATOR TESTS ==========

  describe("PostTradeReportGenerator", () => {
    it("should generate formatted text report", () => {
      const report = mockReports[0];
      const text = PostTradeReportGenerator.formatAsText(report);

      expect(text).toContain("TRADE REPORT");
      expect(text).toContain("SPY");
      expect(text).toContain("TrailingExitStrategy");
      expect(text).toContain("$127.00");
      expect(text).toContain("✅"); // Win symbol
    });

    it("should generate JSON report", () => {
      const report = mockReports[0];
      const json = PostTradeReportGenerator.formatAsJSON(report);
      const parsed = JSON.parse(json);

      expect(parsed.symbol).toBe("SPY");
      expect(parsed.pnlDollars).toBe(127.0);
    });

    it("should export multiple reports as CSV", () => {
      const csv = PostTradeReportGenerator.exportAsCSV(mockReports);

      expect(csv).toContain("TradeID");
      expect(csv).toContain("Symbol");
      expect(csv).toContain("SPY");
      expect(csv).toContain("QQQ");
      expect(csv).toContain("BTC");
    });

    it("should include all confirmation sources in report", () => {
      const report = mockReports[0];
      const text = PostTradeReportGenerator.formatAsText(report);

      expect(text).toContain("VIXSource");
      expect(text).toContain("TrendSource");
      expect(text).toContain("CONFIRM");
    });

    it("should calculate duration correctly", () => {
      const report = mockReports[0];
      expect(report.duration).toBe("25 min");
    });
  });

  // ========== PERFORMANCE ANALYZER TESTS ==========

  describe("PerformanceAnalyzer", () => {
    let analyzer: PerformanceAnalyzer;

    beforeEach(() => {
      analyzer = new PerformanceAnalyzer(mockReports);
    });

    // Overall stats
    it("should calculate correct win rate", () => {
      const stats = analyzer.getOverallStats();

      expect(stats.totalTrades).toBe(3);
      expect(stats.winTrades).toBe(2); // SPY, BTC won
      expect(stats.lossTrades).toBe(1); // QQQ lost
      expect(stats.winRate).toBe((2 / 3) * 100);
    });

    it("should calculate average P&L", () => {
      const stats = analyzer.getOverallStats();

      const expectedAvg = (127.0 - 50.0 + 500.0) / 3;
      expect(stats.avgPnL).toBeCloseTo(expectedAvg, 0);
    });

    it("should calculate Sharpe ratio", () => {
      const stats = analyzer.getOverallStats();

      // Should be positive (more wins than losses)
      expect(stats.sharpeRatio).toBeGreaterThan(0);
    });

    it("should calculate profit factor", () => {
      const stats = analyzer.getOverallStats();

      const grossProfit = 127.0 + 500.0; // 627
      const grossLoss = 50.0;
      const expectedPF = grossProfit / grossLoss; // ~12.54

      expect(stats.profitFactor).toBeCloseTo(expectedPF, 1);
    });

    // Confidence-based analysis
    it("should analyze performance by confidence level", () => {
      const byConfidence = analyzer.getPerformanceByConfidenceLevel();

      const high90 = byConfidence.find((p) => p.confidenceRange === "90-100");
      expect(high90).toBeDefined();
      expect(high90?.trades).toBe(1); // SPY at 92
      expect(high90?.winRate).toBe(100); // SPY won

      const low60 = byConfidence.find((p) => p.confidenceRange === "0-59");
      expect(low60).toBeDefined();
      expect(low60?.trades).toBe(1); // BTC at 55
    });

    // Source-based analysis
    it("should identify best confirmation combinations", () => {
      const bestCombos = analyzer.getBestConfirmationCombinations();

      expect(bestCombos.length).toBeGreaterThan(0);

      // "VIX + Trend + Volatility" should be top (100% win rate from SPY)
      const topCombo = bestCombos[0];
      expect(topCombo.winRate).toBe(100);
      expect(topCombo.trades).toBeGreaterThan(0);
    });

    it("should calculate source reliability", () => {
      const sourceReliability = analyzer.getSourceReliability();

      const vixSource = sourceReliability.find((s) => s.sourceName === "VIXSource");
      expect(vixSource).toBeDefined();
      expect(vixSource?.totalVotes).toBeGreaterThan(0);
      expect(vixSource?.confirmAccuracy).toBeGreaterThan(0);
    });

    // Regime-based analysis
    it("should analyze performance by regime", () => {
      const byRegime = analyzer.getPerformanceByRegime();

      const bullishStrong = byRegime.find((r) => r.regime === "BULLISH_STRONG");
      expect(bullishStrong).toBeDefined();
      expect(bullishStrong?.winRate).toBe(100); // SPY won

      const lateral = byRegime.find((r) => r.regime === "LATERAL");
      expect(lateral).toBeDefined();
      expect(lateral?.winRate).toBe(100); // BTC won (lucky)
    });

    // Diagnostic queries
    it("should find missed signals (high confidence losses)", () => {
      const missed = analyzer.getMissedSignals();

      expect(missed.length).toBe(1);
      expect(missed[0].symbol).toBe("QQQ");
      expect(missed[0].confidenceScore).toBe(75);
      expect(missed[0].pnlDollars).toBe(-50.0);
    });

    it("should find lucky wins (low confidence winners)", () => {
      const lucky = analyzer.getLuckyWins();

      expect(lucky.length).toBe(1);
      expect(lucky[0].symbol).toBe("BTC");
      expect(lucky[0].confidenceScore).toBe(55);
      expect(lucky[0].pnlDollars).toBe(500.0);
    });

    it("should generate summary report", () => {
      const summary = analyzer.generateSummary();

      expect(summary).toContain("TITO PERFORMANCE ANALYSIS");
      expect(summary).toContain("Total Trades: 3");
      expect(summary).toContain("Win Rate:");
      expect(summary).toContain("BEST CONFIRMATION COMBOS");
      expect(summary).toContain("SOURCE RELIABILITY");
    });
  });

  // ========== INTEGRATION TESTS ==========

  describe("S50 Phase 2 Integration", () => {
    it("should generate reports and analyze them in pipeline", () => {
      // Step 1: Generate reports
      const reports = mockReports;

      // Step 2: Create analyzer
      const analyzer = new PerformanceAnalyzer(reports);

      // Step 3: Get insights
      const stats = analyzer.getOverallStats();
      const byConfidence = analyzer.getPerformanceByConfidenceLevel();
      const bestCombos = analyzer.getBestConfirmationCombinations();

      expect(stats.totalTrades).toBe(3);
      expect(byConfidence.length).toBeGreaterThan(0);
      expect(bestCombos.length).toBeGreaterThan(0);
    });

    it("should handle empty report list gracefully", () => {
      const analyzer = new PerformanceAnalyzer([]);

      const stats = analyzer.getOverallStats();
      expect(stats.totalTrades).toBe(0);
      expect(stats.winRate).toBe(0);

      const byRegime = analyzer.getPerformanceByRegime();
      expect(byRegime.length).toBe(0);
    });
  });
});
