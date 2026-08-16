// Pruebas de extremo a extremo del flujo (WORKFLOW_AND_AUDIT.md). Reproducen en código
// lo que el bundle de handoff describe como "auditado": los 4 estados oficiales, cero
// excepciones no controladas, determinismo de la lógica de decisión, y persistencia real
// de save_history.

import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { runAnalysis } from "./workflow";
import type { OpportunityReport } from "./types";

const HISTORY_FILE = path.join(process.cwd(), "data", "tito-core", "history", "ZZTEST.json");

async function removeIfExists(file: string) {
  try {
    await fs.unlink(file);
  } catch {
    // no existía — nada que limpiar
  }
}

afterEach(async () => {
  await removeIfExists(HISTORY_FILE);
});

/** Compara solo los campos que la lógica de decisión debe reproducir; id/createdAt son
 *  identidad de la corrida, no del resultado, y varían a propósito entre corridas. */
function decisionFields(r: OpportunityReport) {
  const { id: _id, createdAt: _createdAt, ...rest } = r;
  return rest;
}

describe("runAnalysis — flujo extremo a extremo (mock)", () => {
  it("META: alcista con vela pendiente queda en 'esperar', nunca en 'operar'", async () => {
    const { report, validation } = await runAnalysis("META", { persist: false });
    expect(validation.valid).toBe(true);
    expect(report.status).toBe("esperar");
    expect(report.priority).toBe("alta"); // confianza alta → "muy cerca de operar"
    expect(report.risk).toBe("bajo");
    expect(report.dataQuality).toBe("alta");
    expect(report.historicalProbability).toEqual({ min: 65, max: 72, comparableCases: 18 });
    expect(report.nextTrigger).toBe("proximo cierre de vela");
  });

  it("GOOD: todo aprobado incluida la vela → 'operar'", async () => {
    const { report } = await runAnalysis("GOOD", { persist: false });
    expect(report.status).toBe("operar");
    expect(report.priority).toBe("alta");
    expect(report.confidence).not.toBeNull();
  });

  it("BADX: tendencia en contra rompe una regla dura → 'no operar', prioridad baja", async () => {
    const { report } = await runAnalysis("BADX", { persist: false });
    expect(report.status).toBe("no operar");
    expect(report.priority).toBe("baja");
  });

  it("MIXD: señal de patrón ambigua → 'revisar manualmente'", async () => {
    const { report } = await runAnalysis("MIXD", { persist: false });
    expect(report.status).toBe("revisar manualmente");
  });

  it("LOWQ: dataQuality 'baja' fuerza revisión sin importar las reglas", async () => {
    const { report } = await runAnalysis("LOWQ", { persist: false });
    expect(report.status).toBe("revisar manualmente");
    expect(report.historicalProbability).toBeNull();
  });

  it("acepta el símbolo en minúsculas y lo normaliza (initialize)", async () => {
    const { report } = await runAnalysis("meta", { persist: false });
    expect(report.symbol).toBe("META");
  });

  it("id es único por corrida aunque el símbolo se repita", async () => {
    const a = await runAnalysis("META", { persist: false });
    const b = await runAnalysis("META", { persist: false });
    expect(a.report.id).not.toBe(b.report.id);
  });

  it("createdAt refleja el reloj inyectado", async () => {
    const now = new Date("2026-08-16T14:00:00.000Z");
    const { report } = await runAnalysis("META", { persist: false, now });
    expect(report.createdAt).toBe("2026-08-16T14:00:00.000Z");
  });

  it("es determinista en la lógica de decisión: mismo símbolo → mismo resultado salvo id/createdAt", async () => {
    const a = await runAnalysis("META", { persist: false });
    const b = await runAnalysis("META", { persist: false });
    expect(decisionFields(a.report)).toEqual(decisionFields(b.report));
  });

  it("0 excepciones no controladas y reportes siempre válidos en 100 símbolos sintéticos", async () => {
    const symbols = Array.from({ length: 100 }, (_, i) => `SYN${i}`);
    for (const symbol of symbols) {
      const { validation } = await runAnalysis(symbol, { persist: false });
      expect(validation.valid).toBe(true);
    }
  });

  it("save_history persiste un reporte por corrida, sin pisar corridas anteriores", async () => {
    await removeIfExists(HISTORY_FILE);

    await runAnalysis("ZZTEST", { persist: true, now: new Date("2026-08-16T14:00:00Z") });
    await runAnalysis("ZZTEST", { persist: true, now: new Date("2026-08-16T14:05:00Z") });

    const raw = await fs.readFile(HISTORY_FILE, "utf8");
    const history: OpportunityReport[] = JSON.parse(raw);
    expect(history).toHaveLength(2);
    expect(history[0].createdAt).toBe("2026-08-16T14:00:00.000Z");
    expect(history[1].createdAt).toBe("2026-08-16T14:05:00.000Z");
    expect(history[0].symbol).toBe("ZZTEST");
    expect(history[0].id).not.toBe(history[1].id);
  });
});
