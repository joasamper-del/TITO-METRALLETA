// save_history del flujo oficial (WORKFLOW_AND_AUDIT.md) — "cada decisión y cambio
// queda asociado a versiones exactas y a un registro de auditoría" (ARCHITECTURE.md,
// ley #11: "every important transition is auditable"). Cada reporte ya trae su propio
// `id` y `createdAt` (contrato oficial), así que el histórico es simplemente un log
// append-only de reportes — nunca se sobrescribe una corrida anterior. Solo servidor
// (fs), mismo patrón que predictionStore.ts.

import { promises as fs } from "fs";
import path from "path";
import type { OpportunityReport } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "tito-core", "history");

function fileFor(symbol: string): string {
  const safe = symbol.trim().toUpperCase().replace(/[^A-Z0-9._-]/g, "");
  return path.join(DATA_DIR, `${safe}.json`);
}

async function loadHistory(symbol: string): Promise<OpportunityReport[]> {
  try {
    const raw = await fs.readFile(fileFor(symbol), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Persiste el reporte y devuelve el histórico completo del símbolo (más reciente al final). */
export async function saveHistory(report: OpportunityReport): Promise<OpportunityReport[]> {
  const existing = await loadHistory(report.symbol);
  const updated = [...existing, report];
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(fileFor(report.symbol), JSON.stringify(updated), "utf8");
  return updated;
}
