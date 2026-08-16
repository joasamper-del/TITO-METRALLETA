import { describe, it, expect } from "vitest";
import { calculateMetrics } from "./metricsEngine";
import { evaluateRules } from "./ruleEngine";
import type { MarketSnapshot } from "./marketSnapshot";

function snapshot(over: Partial<MarketSnapshot> = {}): MarketSnapshot {
  return {
    symbol: "TEST",
    trend: "alcista",
    volumeSufficient: true,
    liquidityAdequate: true,
    regimeValidated: true,
    patternDetected: true,
    candleConfirmed: true,
    volatilityInRange: true,
    blockingEvent: false,
    historicalProbability: { min: 60, max: 65, comparableCases: 12 },
    dataQuality: "alta",
    ...over,
  };
}

describe("calculateMetrics", () => {
  it("confidence = proporción de reglas aprobadas entre las evaluables (redondeado a 2 decimales)", () => {
    const s = snapshot({ candleConfirmed: false }); // 7 de 8 pasan → 0.875 → 0.88
    const m = calculateMetrics(s, evaluateRules(s));
    expect(m.confidence).toBe(0.88);
  });

  it("excluye las reglas ambiguas (null) del cálculo de confidence", () => {
    const s = snapshot({ patternDetected: null }); // 7 de 7 evaluables pasan
    const m = calculateMetrics(s, evaluateRules(s));
    expect(m.confidence).toBe(1);
  });

  it("degrada confidence a la mitad cuando dataQuality es 'baja'", () => {
    const s = snapshot({ dataQuality: "baja" }); // 8/8 = 1.0 antes de degradar
    const m = calculateMetrics(s, evaluateRules(s));
    expect(m.confidence).toBe(0.5);
  });

  it("risk 'bajo' con volatilidad en rango y datos de alta calidad", () => {
    const s = snapshot({ volatilityInRange: true, dataQuality: "alta" });
    expect(calculateMetrics(s, evaluateRules(s)).risk).toBe("bajo");
  });

  it("risk 'alto' con volatilidad fuera de rango y datos de baja calidad", () => {
    const s = snapshot({ volatilityInRange: false, dataQuality: "baja" });
    expect(calculateMetrics(s, evaluateRules(s)).risk).toBe("alto");
  });

  it("historicalProbability se anula si dataQuality es 'baja' aunque el dato exista", () => {
    const s = snapshot({
      dataQuality: "baja",
      historicalProbability: { min: 80, max: 90, comparableCases: 30 },
    });
    expect(calculateMetrics(s, evaluateRules(s)).historicalProbability).toBeNull();
  });

  it("es determinista", () => {
    const s = snapshot();
    const rules = evaluateRules(s);
    expect(calculateMetrics(s, rules)).toEqual(calculateMetrics(s, rules));
  });
});
