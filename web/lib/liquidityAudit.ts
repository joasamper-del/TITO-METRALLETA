// Auditoría trail de evaluaciones de liquidez fallidas (ROJO o insuficiente histórico).
// Registra evidencia en data/audit/liquidityCheckFails.jsonl para trazabilidad y debugging.

import { promises as fs } from "fs";
import path from "path";
import type { LiquidityCheckResult } from "./liquidity";

const AUDIT_DIR = path.join(process.cwd(), "data", "audit");
const AUDIT_FILE = path.join(AUDIT_DIR, "liquidityCheckFails.jsonl");

export interface AuditEntry {
  timestamp: string;
  ticker: string;
  level: string;
  disparityPct: number;
  sectorAvgNotional: number | null;
  tickerNotional: number;
  historicalDays: number;
  reason: string;
}

/**
 * Registra un fallo de liquidez (ROJO o <2d) en el audit trail.
 * JSONL: una línea por fallo, sin duplicados por fecha.
 * Solo se ejecuta en servidor; cliente no llama esto.
 *
 * @param ticker Símbolo del activo
 * @param result Resultado de evaluateLiquidity
 * @param now Timestamp (default: ahora)
 */
export async function recordLiquidityCheckFail(
  ticker: string,
  result: LiquidityCheckResult,
  now: Date = new Date(),
): Promise<void> {
  // Solo registra si es un fallo (ROJO o <2d)
  if (result.level === "VERDE") return;

  const entry: AuditEntry = {
    timestamp: now.toISOString(),
    ticker: ticker.toUpperCase(),
    level: result.level,
    disparityPct: result.disparityPct,
    sectorAvgNotional: result.sectorAvgNotional,
    tickerNotional: result.tickerNotional,
    historicalDays: result.historicalDays,
    reason: result.reason,
  };

  try {
    await fs.mkdir(AUDIT_DIR, { recursive: true });
    const line = JSON.stringify(entry) + "\n";
    await fs.appendFile(AUDIT_FILE, line, "utf8");
  } catch (err) {
    // Fail gracefully: si no puede escribir auditoría, no bloquea el sistema
    console.error("[liquidityAudit] Error writing to audit file:", err);
  }
}

/**
 * Lee todos los fallos registrados en el audit trail (opcional, para debugging/análisis).
 * Solo se ejecuta en servidor.
 */
export async function readLiquidityAuditTrail(): Promise<AuditEntry[]> {
  try {
    const raw = await fs.readFile(AUDIT_FILE, "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditEntry);
  } catch {
    return [];
  }
}
