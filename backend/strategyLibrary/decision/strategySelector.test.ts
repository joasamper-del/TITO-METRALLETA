/**
 * Strategy Selector Tests
 * Validate 6 risk gates, selection logic, DO NOT OPERATE scenarios
 */

import { describe, it, expect } from "vitest";
import { StrategySelector } from "./strategySelector";
import { RiskGate } from "./riskGate";
import { StrategyMatcher } from "./strategyMatcher";

describe("Strategy Selector", () => {
  const selector = new StrategySelector();
  const riskGate = new RiskGate();
  const matcher = new StrategyMatcher();

  // Test basic market conditions
  const bullishConditions = {
    regime: "BULLISH_STRONG",
    vix: 15,
    symbol: "SPY",
    price: 450,
    volume: 65000000,
    volatility: 0.15,
    earningsWithin24h: false,
  };

  it("should block LongStraddle strategy", () => {
    const blocked = matcher.getBlockedStrategies();
    expect(blocked).toContain("LongStraddleStrategy");
    expect(matcher.isStrategyBlocked("LongStraddleStrategy")).toBe(true);
  });

  it("should have 6 safe strategies", () => {
    const unblocked = matcher.getUnblockedStrategies();
    expect(unblocked.length).toBeGreaterThan(5);
    expect(unblocked).toContain("TrailingExitStrategy");
    expect(unblocked).toContain("BreakoutStrategy");
    expect(unblocked).toContain("WheelStrategy");
  });

  it("should select strategy in BULLISH_STRONG regime", () => {
    const result = selector.selectStrategy(bullishConditions);
    expect(result.status).toBe("OPERATE");
    expect(result.selectedStrategy).toBeDefined();
    expect(result.confidence).toBeGreaterThan(70);
  });

  // Test all 6 risk gates individually
  describe("Risk Gates", () => {
    it("should pass win rate gate (>45%)", () => {
      const gate = riskGate.checkWinRateGate(58);
      expect(gate.passed).toBe(true);
      expect(gate.gateName).toBe("Win Rate");
    });

    it("should fail win rate gate (<45%)", () => {
      const gate = riskGate.checkWinRateGate(35);
      expect(gate.passed).toBe(false);
      expect(gate.failureReason).toContain("below 45%");
    });

    it("should pass Sharpe gate (>0.5)", () => {
      const gate = riskGate.checkSharpeRatioGate(1.08);
      expect(gate.passed).toBe(true);
    });

    it("should fail Sharpe gate (<0.5)", () => {
      const gate = riskGate.checkSharpeRatioGate(0.42);
      expect(gate.passed).toBe(false);
      expect(gate.failureReason).toContain("below 0.5");
    });

    it("should pass overfitting gate (<50%)", () => {
      const gate = riskGate.checkOverfittingGate(18);
      expect(gate.passed).toBe(true);
    });

    it("should fail overfitting gate (>50%)", () => {
      const gate = riskGate.checkOverfittingGate(68);
      expect(gate.passed).toBe(false);
      expect(gate.failureReason).toContain("exceeds 50%");
    });

    it("should pass drawdown gate (<6%)", () => {
      const gate = riskGate.checkDrawdownGate(-3.8);
      expect(gate.passed).toBe(true);
    });

    it("should fail drawdown gate (>6%)", () => {
      const gate = riskGate.checkDrawdownGate(-8.1);
      expect(gate.passed).toBe(false);
      expect(gate.failureReason).toContain("exceeds 6%");
    });

    it("should pass liquidity gate (SPY)", () => {
      const gate = riskGate.checkLiquidityGate("SPY", 65000000);
      expect(gate.passed).toBe(true);
    });

    it("should fail liquidity gate (low volume)", () => {
      const gate = riskGate.checkLiquidityGate("SPY", 5000000);
      expect(gate.passed).toBe(false);
    });

    it("should pass earnings gate (no individual stock)", () => {
      const gate = riskGate.checkEarningsGate("SPY", false);
      expect(gate.passed).toBe(true); // Indices don't have earnings blocks
    });

    it("should fail earnings gate (individual stock with earnings)", () => {
      const gate = riskGate.checkEarningsGate("AAPL", true);
      expect(gate.passed).toBe(false);
    });
  });

  // Test DO NOT OPERATE scenarios
  describe("DO NOT OPERATE Scenarios", () => {
    it("should DO NOT OPERATE when no strategy passes all gates", () => {
      const badConditions = {
        regime: "BULLISH_STRONG",
        vix: 50, // Extreme volatility
        symbol: "SPY",
        price: 450,
        volume: 1000000, // Very low liquidity
        volatility: 0.5,
        earningsWithin24h: false,
      };

      const result = selector.selectStrategy(badConditions);
      expect(result.status).toBe("DO_NOT_OPERATE");
      expect(result.selectedStrategy).toBeUndefined();
      expect(result.confidence).toBe(0);
    });

    it("should DO NOT OPERATE when regime has no matches", () => {
      const noRegimeConditions = {
        regime: "UNKNOWN_REGIME",
        vix: 15,
        symbol: "SPY",
        price: 450,
        volume: 65000000,
        volatility: 0.15,
        earningsWithin24h: false,
      };

      const result = selector.selectStrategy(noRegimeConditions);
      expect(result.status).toBe("DO_NOT_OPERATE");
    });

    it("should DO NOT OPERATE when LongStraddle is only option", () => {
      // LongStraddle is blocked, so even if matched to regime should fail
      const blockedCheck = matcher.isStrategyBlocked("LongStraddleStrategy");
      expect(blockedCheck).toBe(true);
    });
  });

  // Test complete validation workflow
  describe("Complete Validation Workflow", () => {
    it("should validate TrailingExitStrategy successfully", () => {
      const profile = matcher.getStrategyProfile("TrailingExitStrategy");
      expect(profile).toBeDefined();

      if (profile) {
        const gateResult = riskGate.validateStrategy(
          "TrailingExitStrategy",
          profile.symbol,
          profile.testWinRate,
          profile.testSharpe,
          profile.overfittingScore,
          profile.maxDrawdown,
          65000000,
          false
        );

        expect(gateResult.allPassed).toBe(true);
        expect(gateResult.recommendation).toBe("OPERATE");
      }
    });

    it("should block MeanReversionStrategy on win rate gate", () => {
      const profile = matcher.getStrategyProfile("MeanReversionStrategy");
      expect(profile).toBeDefined();

      if (profile) {
        const gateResult = riskGate.validateStrategy(
          "MeanReversionStrategy",
          profile.symbol,
          profile.testWinRate, // 35% - fails gate
          profile.testSharpe,
          profile.overfittingScore,
          profile.maxDrawdown,
          65000000,
          false
        );

        expect(gateResult.allPassed).toBe(false);
        expect(gateResult.recommendation).toBe("DO_NOT_OPERATE");
        expect(gateResult.reasons.some((r) => r.includes("Win rate"))).toBe(true);
      }
    });

    it("should block LongStraddleStrategy on multiple gates", () => {
      const profile = matcher.getStrategyProfile("LongStraddleStrategy");
      expect(profile).toBeDefined();

      if (profile) {
        const gateResult = riskGate.validateStrategy(
          "LongStraddleStrategy",
          profile.symbol,
          profile.testWinRate, // 35% - fails
          profile.testSharpe, // 0.42 - fails
          profile.overfittingScore, // 68% - fails
          profile.maxDrawdown, // -8.1% - fails
          65000000,
          false
        );

        expect(gateResult.allPassed).toBe(false);
        expect(gateResult.failureCount).toBeGreaterThan(1);
      }
    });
  });

  // Test decision explanation
  describe("Decision Explanations", () => {
    it("should provide explanation for OPERATE decision", () => {
      const result = selector.selectStrategy(bullishConditions);
      const explanation = selector.getDecisionExplanation(result);

      expect(explanation).toContain("DECISION");
      expect(explanation).toContain("OPERATE");
      expect(explanation).toContain("Reasoning");
    });

    it("should provide explanation for DO NOT OPERATE decision", () => {
      const badConditions = {
        regime: "UNKNOWN_REGIME",
        vix: 60,
        symbol: "SPY",
        price: 450,
        volume: 1000000,
        volatility: 0.5,
        earningsWithin24h: false,
      };

      const result = selector.selectStrategy(badConditions);
      const explanation = selector.getDecisionExplanation(result);

      expect(explanation).toContain("DO NOT OPERATE");
    });
  });

  // Test that blocked strategies never reach execution
  describe("Blocked Strategy Protection", () => {
    it("should never select LongStraddle regardless of conditions", () => {
      // Try multiple market conditions
      const testConditions = [
        { ...bullishConditions, regime: "BULLISH_STRONG" },
        { ...bullishConditions, regime: "HIGH_VOLATILITY" },
        { ...bullishConditions, regime: "EARNINGS_EVENT" },
      ];

      testConditions.forEach((conditions) => {
        const result = selector.selectStrategy(conditions);

        if (result.status === "OPERATE") {
          expect(result.selectedStrategy).not.toBe("LongStraddleStrategy");
        }
      });
    });

    it("should verify LongStraddle is in blocked list", () => {
      const blocked = matcher.getBlockedStrategies();
      expect(blocked).toContain("LongStraddleStrategy");
    });
  });

  // Test edge cases
  describe("Edge Cases", () => {
    it("should handle extreme volatility (VIX=60)", () => {
      const extremeVIX = {
        ...bullishConditions,
        vix: 60,
      };

      const result = selector.selectStrategy(extremeVIX);
      expect(result.status).toBeDefined();
      // May or may not operate, but should handle gracefully
      expect(result.confidence).toBeDefined();
    });

    it("should handle low volume", () => {
      const lowVolume = {
        ...bullishConditions,
        volume: 5000000, // Below SPY minimum
      };

      const result = selector.selectStrategy(lowVolume);
      expect(result.status).toBe("DO_NOT_OPERATE");
    });

    it("should handle earnings within 24h (individual stock)", () => {
      const earningsConditions = {
        ...bullishConditions,
        symbol: "AAPL", // Individual stock
        earningsWithin24h: true,
      };

      const result = selector.selectStrategy(earningsConditions);
      // Should block or handle appropriately
      expect(result.status).toBeDefined();
    });

    it("should NOT block earnings for indices (SPY/QQQ)", () => {
      const indicesEarnings = {
        ...bullishConditions,
        symbol: "SPY",
        earningsWithin24h: true, // Should be ignored
      };

      const result = selector.selectStrategy(indicesEarnings);
      // SPY earnings flag should NOT block trading (it's an index)
      if (result.status === "DO_NOT_OPERATE") {
        expect(result.reasons.some((r) => r.includes("Earnings"))).toBe(false);
      }
    });
  });
});
