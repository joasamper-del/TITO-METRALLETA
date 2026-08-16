import { describe, it, expect } from "vitest";
import { buildDecision } from "./decisionEngine";
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
    historicalProbability: null,
    dataQuality: "alta",
    ...over,
  };
}

describe("buildDecision", () => {
  it("'operar' solo cuando TODAS las reglas duras pasan y la vela está confirmada", () => {
    const s = snapshot();
    expect(buildDecision(evaluateRules(s), s.dataQuality)).toBe("operar");
  });

  it("'esperar' cuando todo pasa salvo la vela de confirmación — 'casi cumple' nunca es 'operar'", () => {
    const s = snapshot({ candleConfirmed: false });
    expect(buildDecision(evaluateRules(s), s.dataQuality)).toBe("esperar");
  });

  it("'no operar' cuando una regla dura se rompe (ej. tendencia en contra)", () => {
    const s = snapshot({ trend: "bajista" });
    expect(buildDecision(evaluateRules(s), s.dataQuality)).toBe("no operar");
  });

  it("'no operar' pesa más que la vela pendiente si además hay una regla dura rota", () => {
    const s = snapshot({ trend: "bajista", candleConfirmed: false });
    expect(buildDecision(evaluateRules(s), s.dataQuality)).toBe("no operar");
  });

  it("'revisar manualmente' cuando hay una señal ambigua sin reglas duras rotas", () => {
    const s = snapshot({ patternDetected: null });
    expect(buildDecision(evaluateRules(s), s.dataQuality)).toBe("revisar manualmente");
  });

  it("'revisar manualmente' cuando dataQuality es 'baja', sin importar las reglas", () => {
    const s = snapshot({ dataQuality: "baja" });
    expect(buildDecision(evaluateRules(s), s.dataQuality)).toBe("revisar manualmente");
  });

  it("dataQuality 'baja' manda incluso sobre una regla dura rota", () => {
    const s = snapshot({ dataQuality: "baja", trend: "bajista" });
    expect(buildDecision(evaluateRules(s), s.dataQuality)).toBe("revisar manualmente");
  });
});
