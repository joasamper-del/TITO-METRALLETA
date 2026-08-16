import { describe, it, expect } from "vitest";
import { evaluateRules, HARD_RULE_CATEGORIES } from "./ruleEngine";
import type { MarketSnapshot } from "./marketSnapshot";

function snapshot(over: Partial<MarketSnapshot> = {}): MarketSnapshot {
  return {
    symbol: "META",
    trend: "alcista",
    volumeSufficient: true,
    liquidityAdequate: true,
    regimeValidated: true,
    patternDetected: true,
    candleConfirmed: true,
    volatilityInRange: true,
    blockingEvent: false,
    historicalProbability: { min: 65, max: 72, comparableCases: 18 },
    dataQuality: "alta",
    ...over,
  };
}

describe("evaluateRules", () => {
  it("produce las 8 categorías fijas del rule engine", () => {
    const rules = evaluateRules(snapshot());
    const categories = rules.map((r) => r.category).sort();
    expect(categories).toEqual(
      ["candle", "events", "liquidity", "pattern", "regime", "trend", "volatility", "volume"].sort(),
    );
  });

  it("todas pasan cuando el snapshot es totalmente favorable", () => {
    const rules = evaluateRules(snapshot());
    expect(rules.every((r) => r.passed === true)).toBe(true);
  });

  it("la regla de tendencia falla si no es alcista", () => {
    const rules = evaluateRules(snapshot({ trend: "bajista" }));
    const trend = rules.find((r) => r.category === "trend")!;
    expect(trend.passed).toBe(false);
  });

  it("la regla de patrón queda ambigua (null) cuando la señal es mixta", () => {
    const rules = evaluateRules(snapshot({ patternDetected: null }));
    const pattern = rules.find((r) => r.category === "pattern")!;
    expect(pattern.passed).toBeNull();
  });

  it("la regla de vela refleja candleConfirmed sin tocar las demás", () => {
    const rules = evaluateRules(snapshot({ candleConfirmed: false }));
    const candle = rules.find((r) => r.category === "candle")!;
    expect(candle.passed).toBe(false);
    expect(rules.filter((r) => r.category !== "candle").every((r) => r.passed === true)).toBe(true);
  });

  it("es determinista: mismo snapshot, mismo resultado", () => {
    const s = snapshot();
    expect(evaluateRules(s)).toEqual(evaluateRules(s));
  });

  it("HARD_RULE_CATEGORIES no incluye pattern ni candle (no son reglas duras de rechazo)", () => {
    expect(HARD_RULE_CATEGORIES).not.toContain("pattern");
    expect(HARD_RULE_CATEGORIES).not.toContain("candle");
  });
});
