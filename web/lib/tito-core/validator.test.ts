import { describe, it, expect } from "vitest";
import { validateReport } from "./validator";
import type { OpportunityReport } from "./types";

function report(over: Partial<OpportunityReport> = {}): OpportunityReport {
  return {
    id: "b1f7c2a0-0000-4000-8000-000000000001",
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
    razones: ["tendencia alcista confirmada", "volumen suficiente", "vela pendiente"],
    invalidationConditions: ["la tendencia deja de ser alcista"],
    nextTrigger: "proximo cierre de vela",
    createdAt: "2026-08-16T14:00:00.000Z",
    ...over,
  };
}

describe("validateReport", () => {
  it("un reporte bien formado pasa sin errores", () => {
    const r = validateReport(report());
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("rechaza id vacío", () => {
    expect(validateReport(report({ id: "" })).valid).toBe(false);
  });

  it("rechaza symbol vacío", () => {
    expect(validateReport(report({ symbol: "" })).valid).toBe(false);
  });

  it("rechaza createdAt vacío o inválido", () => {
    expect(validateReport(report({ createdAt: "" })).valid).toBe(false);
    expect(validateReport(report({ createdAt: "no es una fecha" })).valid).toBe(false);
  });

  it("rechaza status fuera de catálogo", () => {
    const bad = report({ status: "comprar ya" as OpportunityReport["status"] });
    expect(validateReport(bad).valid).toBe(false);
  });

  it("rechaza confidence fuera de 0.0-1.0", () => {
    expect(validateReport(report({ confidence: 1.5 })).valid).toBe(false);
    expect(validateReport(report({ confidence: -0.1 })).valid).toBe(false);
  });

  it("acepta confidence null", () => {
    expect(validateReport(report({ confidence: null, status: "esperar" })).valid).toBe(true);
  });

  it("rechaza historicalProbability con min > max", () => {
    const bad = report({ historicalProbability: { min: 80, max: 60, comparableCases: 10 } });
    expect(validateReport(bad).valid).toBe(false);
  });

  it("rechaza historicalProbability con comparableCases <= 0", () => {
    const bad = report({ historicalProbability: { min: 60, max: 80, comparableCases: 0 } });
    expect(validateReport(bad).valid).toBe(false);
  });

  it("acepta historicalProbability null", () => {
    expect(validateReport(report({ historicalProbability: null })).valid).toBe(true);
  });

  it("rechaza razones con menos de 3 o más de 5 elementos", () => {
    expect(validateReport(report({ razones: ["solo una"] })).valid).toBe(false);
    expect(
      validateReport(report({ razones: ["a", "b", "c", "d", "e", "f"] })).valid,
    ).toBe(false);
  });

  it("rechaza un elemento vacío dentro de razones", () => {
    expect(validateReport(report({ razones: ["a", "", "c"] })).valid).toBe(false);
  });

  it("inconsistencia: 'operar' sin confidence trazable", () => {
    const bad = report({ status: "operar", priority: "alta", confidence: null, dataQuality: "alta" });
    const result = validateReport(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("inconsistencia"))).toBe(true);
  });

  it("inconsistencia: 'operar' con dataQuality 'baja' (DECISION_CONTRACT.md lo declara inválido)", () => {
    const bad = report({ status: "operar", priority: "alta", confidence: 0.9, dataQuality: "baja" });
    const result = validateReport(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("inconsistencia"))).toBe(true);
  });
});
