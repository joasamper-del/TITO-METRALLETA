import { describe, it, expect } from "vitest";
import { buildReport } from "./reportBuilder";
import { calculateMetrics } from "./metricsEngine";
import { evaluateRules } from "./ruleEngine";
import { buildDecision } from "./decisionEngine";
import type { MarketSnapshot } from "./marketSnapshot";
import type { ReportVersions } from "./types";

const versions: ReportVersions = {
  systemVersion: "TM-SYSTEM-v0.1-MOCK",
  strategyVersion: "TM-STRATEGY-v0.1-MOCK",
  configVersion: "TM-CONFIG-v0.1-MOCK",
  decisionContractVersion: "TM-DECISION-v1",
};

const meta = { id: "test-id-1", createdAt: "2026-08-16T14:00:00.000Z" };

function snapshot(over: Partial<MarketSnapshot> = {}): MarketSnapshot {
  return {
    symbol: "meta", // minúsculas a propósito: build_report no normaliza, initialize sí
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

function fullPipeline(s: MarketSnapshot) {
  const rules = evaluateRules(s);
  const metrics = calculateMetrics(s, rules);
  const status = buildDecision(rules, metrics.dataQuality);
  return buildReport(s, rules, status, metrics, versions, meta);
}

describe("buildReport", () => {
  it("propaga id, symbol, createdAt y las 4 versiones exactas", () => {
    const report = fullPipeline(snapshot());
    expect(report.id).toBe("test-id-1");
    expect(report.symbol).toBe("meta");
    expect(report.createdAt).toBe("2026-08-16T14:00:00.000Z");
    expect(report).toMatchObject(versions);
  });

  it("priority 'alta' cuando status es 'operar'", () => {
    const report = fullPipeline(snapshot());
    expect(report.status).toBe("operar");
    expect(report.priority).toBe("alta");
  });

  it("priority 'alta' cuando status es 'esperar' con confianza alta (>=0.75) — 'muy cerca de operar'", () => {
    const report = fullPipeline(snapshot({ candleConfirmed: false })); // 7/8 → 0.88
    expect(report.status).toBe("esperar");
    expect(report.confidence).toBeGreaterThanOrEqual(0.75);
    expect(report.priority).toBe("alta");
  });

  it("priority 'media' cuando status es 'esperar' con confianza < 0.75", () => {
    // buildReport aislado: forzamos status "esperar" y confidence 0.6 vía Metrics
    // directamente, para probar la regla de priority sin depender de qué combinación
    // exacta de reglas produce esa confianza.
    const rules = evaluateRules(snapshot({ candleConfirmed: false }));
    const report = buildReport(
      snapshot({ candleConfirmed: false }), rules, "esperar",
      { confidence: 0.6, risk: "medio", dataQuality: "media", historicalProbability: null },
      versions, meta,
    );
    expect(report.priority).toBe("media");
  });

  it("priority 'baja' cuando status es 'no operar'", () => {
    const report = fullPipeline(snapshot({ trend: "bajista" }));
    expect(report.status).toBe("no operar");
    expect(report.priority).toBe("baja");
  });

  it("priority 'baja' cuando status es 'revisar manualmente'", () => {
    const report = fullPipeline(snapshot({ patternDetected: null }));
    expect(report.status).toBe("revisar manualmente");
    expect(report.priority).toBe("baja");
  });

  it("razones tiene entre 3 y 5 elementos", () => {
    const report = fullPipeline(snapshot());
    expect(report.razones.length).toBeGreaterThanOrEqual(3);
    expect(report.razones.length).toBeLessThanOrEqual(5);
  });

  it("nextTrigger es 'proximo cierre de vela' cuando el status es 'esperar' por vela pendiente", () => {
    const report = fullPipeline(snapshot({ candleConfirmed: false }));
    expect(report.status).toBe("esperar");
    expect(report.nextTrigger).toBe("proximo cierre de vela");
  });

  it("nextTrigger es null cuando la decisión ya está resuelta ('operar')", () => {
    const report = fullPipeline(snapshot());
    expect(report.status).toBe("operar");
    expect(report.nextTrigger).toBeNull();
  });
});
