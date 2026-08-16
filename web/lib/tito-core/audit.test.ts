// Reproduce formalmente los 12 criterios de aceptación de WORKFLOW_AND_AUDIT.md
// (AC-01 a AC-12) contra la implementación real de tito-core, con los mismos IDs que usa
// el bundle de handoff. Los tests del commit 1 (ruleEngine/decisionEngine/etc.) ya
// prueban esta lógica pieza por pieza; este archivo es la auditoría de extremo a
// extremo, con la misma forma que el reporte que aprobó la fase mock.

import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { runAnalysis } from "./workflow";
import { validateReport } from "./validator";
import { getMockSnapshot } from "./mockDataSource";
import type { OpportunityReport } from "./types";

const NAMED_SCENARIOS = ["META", "GOOD", "BADX", "MIXD", "LOWQ"];
const SYNTHETIC_SYMBOLS = Array.from({ length: 100 }, (_, i) => `AUD${i}`);
const HISTORY_FILE = path.join(process.cwd(), "data", "tito-core", "history", "AUDIT99.json");

async function removeIfExists(file: string) {
  try {
    await fs.unlink(file);
  } catch {
    // no existía
  }
}

afterEach(async () => {
  await removeIfExists(HISTORY_FILE);
});

describe("Auditoría de aceptación — WORKFLOW MOCK v0.1", () => {
  it("AC-01 — flujo extremo a extremo completo (initialize...publish)", async () => {
    const { report, rules, validation } = await runAnalysis("META", { persist: false });
    expect(rules).toHaveLength(8); // evaluate_rules corrió las 8 categorías
    expect(validation.valid).toBe(true); // validate_report corrió y aprobó
    expect(report.status).toBeDefined(); // build_decision + build_report corrieron
  });

  it("AC-02 — 0 excepciones no controladas en 100 repeticiones", async () => {
    let thrown = 0;
    for (const symbol of SYNTHETIC_SYMBOLS) {
      try {
        await runAnalysis(symbol, { persist: false });
      } catch {
        thrown += 1;
      }
    }
    expect(thrown).toBe(0);
  });

  it("AC-03 — OpportunityReport válido para todos los escenarios nombrados", async () => {
    for (const symbol of NAMED_SCENARIOS) {
      const { validation } = await runAnalysis(symbol, { persist: false });
      expect(validation.valid).toBe(true);
    }
  });

  it("AC-04 — 0 campos obligatorios vacíos en 100 repeticiones", async () => {
    for (const symbol of SYNTHETIC_SYMBOLS) {
      const { validation } = await runAnalysis(symbol, { persist: false });
      const emptyFieldErrors = validation.errors.filter((e) => e.includes("vacío"));
      expect(emptyFieldErrors).toEqual([]);
    }
  });

  it("AC-05 — valores dentro de rangos/catálogos permitidos en 100 repeticiones", async () => {
    for (const symbol of SYNTHETIC_SYMBOLS) {
      const { validation } = await runAnalysis(symbol, { persist: false });
      const catalogErrors = validation.errors.filter(
        (e) => e.includes("catálogo") || e.includes("rango"),
      );
      expect(catalogErrors).toEqual([]);
    }
  });

  it("AC-06 — 0 inconsistencias lógicas en 100 repeticiones", async () => {
    for (const symbol of SYNTHETIC_SYMBOLS) {
      const { validation } = await runAnalysis(symbol, { persist: false });
      const inconsistencies = validation.errors.filter((e) => e.includes("inconsistencia"));
      expect(inconsistencies).toEqual([]);
    }
  });

  it("AC-07 — trazabilidad completa: versiones, id y createdAt en cada reporte", async () => {
    const { report } = await runAnalysis("META", { persist: false });
    expect(report.id).toBeTruthy();
    expect(report.systemVersion).toBeTruthy();
    expect(report.strategyVersion).toBeTruthy();
    expect(report.configVersion).toBeTruthy();
    expect(report.decisionContractVersion).toBeTruthy();
    expect(report.createdAt).toBeTruthy();
  });

  it("AC-08 — determinismo lógico 100/100 (mismo símbolo, misma decisión)", async () => {
    const runs: OpportunityReport[] = [];
    for (let i = 0; i < 100; i++) {
      runs.push((await runAnalysis("META", { persist: false })).report);
    }
    const decisionShape = (r: OpportunityReport) => {
      const { id: _id, createdAt: _createdAt, ...rest } = r;
      return rest;
    };
    const first = decisionShape(runs[0]);
    expect(runs.every((r) => JSON.stringify(decisionShape(r)) === JSON.stringify(first))).toBe(true);
  });

  it("AC-09 — persistencia: N corridas → N reportes guardados, sin duplicados accidentales", async () => {
    await removeIfExists(HISTORY_FILE);
    const REPS = 10;
    for (let i = 0; i < REPS; i++) {
      await runAnalysis("AUDIT99", { persist: true, now: new Date(2026, 7, 16, 14, 0, i) });
    }
    const raw = await fs.readFile(HISTORY_FILE, "utf8");
    const history: OpportunityReport[] = JSON.parse(raw);
    expect(history).toHaveLength(REPS);
    expect(new Set(history.map((r) => r.id)).size).toBe(REPS); // sin ids repetidos
  });

  it("AC-10 — publish devuelve el reporte ya validado sin transformarlo", async () => {
    const { report } = await runAnalysis("META", { persist: false });
    // Si publish recalculara algo, revalidar el mismo objeto podría fallar o producir
    // un resultado distinto. La UI (cuando exista) solo debería leer esto, no recalcular.
    expect(validateReport(report)).toEqual({ valid: true, errors: [] });
  });

  it("AC-11 — tiempos estables en mock (guardrail generoso, no el baseline de latencia)", async () => {
    const durations: number[] = [];
    for (const symbol of SYNTHETIC_SYMBOLS) {
      const start = performance.now();
      await runAnalysis(symbol, { persist: false });
      durations.push(performance.now() - start);
    }
    const max = Math.max(...durations);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    // Guardrail para detectar una regresión grave (ej. I/O accidental en el mock),
    // no una medición de rendimiento — los números exactos del bundle (~0.10ms
    // promedio) son de otra máquina y no se reproducen bit a bit aquí.
    expect(avg).toBeLessThan(50);
    expect(max).toBeLessThan(500);
  });

  it("AC-12 — 0 conexiones reales: get_data no llama red bajo ningún escenario", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("tito-core/mockDataSource no debe llamar fetch en esta fase");
    }) as typeof fetch;
    try {
      for (const symbol of [...NAMED_SCENARIOS, "CUALQUIERA"]) {
        await expect(getMockSnapshot(symbol)).resolves.toBeDefined();
        await expect(runAnalysis(symbol, { persist: false })).resolves.toBeDefined();
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
