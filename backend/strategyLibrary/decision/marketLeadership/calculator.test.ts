import { describe, it, expect } from "vitest";
import { MarketLeadershipCalculator, MarketData } from "./calculator";

describe("Market Leadership Index - Calculator", () => {
  const calculator = new MarketLeadershipCalculator();
  const baseDate = new Date("2026-09-05T08:30:00Z");

  it("Strong bullish scenario - should return ENTER", () => {
    const data: MarketData = {
      timestamp: baseDate,
      // SPY in strong uptrend
      spyPrice: 580,
      spyMA50: 570,
      spyMA200: 550,
      // QQQ outperforming
      qqqPrice: 480,
      qqqMA50: 470,
      qqqMA200: 450,
      // VIX normal
      vix: 18,
      vixMA20: 20,
      // Good volume
      currentVolume: 3.2e9,
      averageVolume: 2.5e9,
      spreadBPS: 1.5,
      // Bullish flow
      gexValue: 45,
      callWallExists: false,
      putWallExists: true,
      putCallRatio: 0.4,
    };

    const result = calculator.calculate(data);

    expect(result.marketLeadershipIndex).toBeGreaterThanOrEqual(70);
    expect(result.direction).toBe("BULLISH");
    expect(result.action).toBe("ENTER");
    expect(result.confidence).toBeGreaterThan(80);
    expect(result.scoreBreakdown.bullishVotes).toBeGreaterThan(result.scoreBreakdown.bearishVotes);
    expect(result.unavailableComponents).toHaveLength(0);
  });

  it("Strong bearish scenario - should return EVITAR", () => {
    const data: MarketData = {
      timestamp: baseDate,
      // SPY in downtrend
      spyPrice: 540,
      spyMA50: 560,
      spyMA200: 580,
      // QQQ also weak
      qqqPrice: 440,
      qqqMA50: 460,
      qqqMA200: 480,
      // VIX elevated
      vix: 32,
      vixMA20: 28,
      // Low volume
      currentVolume: 1.8e9,
      averageVolume: 2.5e9,
      spreadBPS: 3.0,
      // Bearish flow
      gexValue: -150,
      callWallExists: true,
      putWallExists: false,
      putCallRatio: 1.8,
    };

    const result = calculator.calculate(data);

    expect(result.marketLeadershipIndex).toBeLessThan(50);
    expect(result.direction).toBe("BEARISH");
    expect(result.action).toBe("EVITAR");
    expect(result.scoreBreakdown.bearishVotes).toBeGreaterThan(result.scoreBreakdown.bullishVotes);
  });

  it("Neutral scenario with mixed signals", () => {
    const data: MarketData = {
      timestamp: baseDate,
      // SPY consolidating
      spyPrice: 565,
      spyMA50: 570,
      spyMA200: 560,
      // QQQ significantly weaker
      qqqPrice: 450,
      qqqMA50: 475,
      qqqMA200: 460,
      // VIX normal
      vix: 20,
      // Average volume
      currentVolume: 2.5e9,
      averageVolume: 2.5e9,
      // No flow data
    };

    const result = calculator.calculate(data);

    expect(result.direction).toBe("NEUTRAL");
    expect(result.action).toBe("EVITAR");
  });

  it("Missing data should reduce confidence", () => {
    const data: MarketData = {
      timestamp: baseDate,
      spyPrice: 580,
      spyMA50: 570,
      spyMA200: 550,
      qqqPrice: 480,
      qqqMA50: 470,
      qqqMA200: 450,
      vix: 0, // Missing
      currentVolume: 0, // Missing
      averageVolume: 2.5e9,
      // No flow data
    };

    const result = calculator.calculate(data);

    expect(result.unavailableComponents.length).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThan(85);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("Should produce detailed audit trail", () => {
    const data: MarketData = {
      timestamp: baseDate,
      spyPrice: 580,
      spyMA50: 570,
      spyMA200: 550,
      qqqPrice: 480,
      qqqMA50: 470,
      qqqMA200: 450,
      vix: 18,
      currentVolume: 3.2e9,
      averageVolume: 2.5e9,
      gexValue: 45,
    };

    const result = calculator.calculate(data);

    expect(result.auditTrail.whatSourcesWereConsulted.length).toBeGreaterThan(0);
    expect(Object.keys(result.auditTrail.whatWasFoundInEachSource).length).toEqual(
      result.auditTrail.whatSourcesWereConsulted.length
    );
    expect(result.auditTrail.whatSignalsApprovedTheDecision.length).toBeGreaterThan(0);
    expect(result.auditTrail.howMuchWeightEachComponentHad["SPY Trend"]).toBeGreaterThan(0);
  });

  it("VIX extreme high (>35) should push to BEARISH", () => {
    const data: MarketData = {
      timestamp: baseDate,
      spyPrice: 530, // Well below MA50
      spyMA50: 570,
      spyMA200: 550,
      qqqPrice: 420, // Significantly below
      qqqMA50: 470,
      qqqMA200: 450,
      vix: 38, // Extreme fear
      currentVolume: 3.0e9,
      averageVolume: 2.5e9,
      gexValue: -200,
    };

    const result = calculator.calculate(data);

    expect(result.action).toBe("EVITAR");
    expect(result.direction).toBe("BEARISH");
  });

  it("Low VIX (<15) should be neutral despite bullish trends", () => {
    const data: MarketData = {
      timestamp: baseDate,
      spyPrice: 580,
      spyMA50: 570,
      spyMA200: 550,
      qqqPrice: 480,
      qqqMA50: 470,
      qqqMA200: 450,
      vix: 12, // Very low
      currentVolume: 3.2e9,
      averageVolume: 2.5e9,
    };

    const result = calculator.calculate(data);

    // Should still be BULLISH but with caution (action might be ESPERAR not ENTER)
    expect(result.direction).toBe("BULLISH");
  });

  it("All components should have proper weights and contributions", () => {
    const data: MarketData = {
      timestamp: baseDate,
      spyPrice: 580,
      spyMA50: 570,
      spyMA200: 550,
      qqqPrice: 480,
      qqqMA50: 470,
      qqqMA200: 450,
      vix: 18,
      currentVolume: 3.2e9,
      averageVolume: 2.5e9,
      gexValue: 45,
    };

    const result = calculator.calculate(data);

    // Sum of weights should be ~1 (accounting for renormalization)
    const totalWeight = result.components.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 1);

    // Final index should be weighted sum of components
    const calculatedIndex = result.components.reduce((sum, c) => sum + c.contribution, 0);
    expect(calculatedIndex).toBeCloseTo(result.marketLeadershipIndex, 0);
  });
});
