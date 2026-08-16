import { describe, it, expect } from "vitest";
import { fromOpportunityReport } from "./verdictAdapter";
import type { OpportunityReport, OpportunityStatus } from "./types";

function report(over: Partial<OpportunityReport> = {}): OpportunityReport {
  return {
    id: "id-1",
    symbol: "META",
    systemVersion: "TM-SYSTEM-v0.1-MOCK",
    strategyVersion: "TM-STRATEGY-v0.1-MOCK",
    configVersion: "TM-CONFIG-v0.1-MOCK",
    decisionContractVersion: "TM-DECISION-v1",
    status: "esperar",
    priority: "alta",
    confidence: 0.82,
    risk: "bajo",
    dataQuality: "alta",
    historicalProbability: { min: 65, max: 72, comparableCases: 18 },
    razones: ["a", "b", "c"],
    invalidationConditions: [],
    nextTrigger: "proximo cierre de vela",
    createdAt: "2026-08-16T14:00:00.000Z",
    ...over,
  };
}

describe("fromOpportunityReport", () => {
  const cases: [OpportunityStatus, string][] = [
    ["operar", "COMPRAR"],
    ["esperar", "ESPERAR"],
    ["no operar", "NO_OPERAR"],
    ["revisar manualmente", "NO_OPERAR"],
  ];

  for (const [status, expectedAction] of cases) {
    it(`status '${status}' → action '${expectedAction}'`, () => {
      expect(fromOpportunityReport(report({ status })).action).toBe(expectedAction);
    });
  }

  it("bias siempre es 'neutral' — OpportunityReport no modela dirección", () => {
    for (const [status] of cases) {
      expect(fromOpportunityReport(report({ status })).bias).toBe("neutral");
    }
  });

  it("source siempre es 'tito-core'", () => {
    expect(fromOpportunityReport(report()).source).toBe("tito-core");
  });

  it("confidencePct convierte 0..1 a 0..100", () => {
    expect(fromOpportunityReport(report({ confidence: 0.82 })).confidencePct).toBe(82);
    expect(fromOpportunityReport(report({ confidence: 1 })).confidencePct).toBe(100);
    expect(fromOpportunityReport(report({ confidence: 0 })).confidencePct).toBe(0);
  });

  it("confidencePct es 0 cuando confidence es null", () => {
    expect(fromOpportunityReport(report({ confidence: null })).confidencePct).toBe(0);
  });

  it("label sigue la convención de verdict.ts (OPERAR/ESPERAR/NO OP.)", () => {
    expect(fromOpportunityReport(report({ status: "operar" })).label).toBe("OPERAR");
    expect(fromOpportunityReport(report({ status: "esperar" })).label).toBe("ESPERAR");
    expect(fromOpportunityReport(report({ status: "no operar" })).label).toBe("NO OP.");
    expect(fromOpportunityReport(report({ status: "revisar manualmente" })).label).toBe("NO OP.");
  });
});
