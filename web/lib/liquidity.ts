// ============================================================================
// Tarea 6: Evaluación de Liquidez del Option Chain
//
// Valida que la cadena de opciones consultada es líquida antes de confiar en
// su análisis (GEX, flujo, predicción). Compara Notional Value contra el
// promedio de las 7 Magníficas (líderes del sector).
//
// DECISIONES CONSTITUCIONALES (2026-09-13):
// 1. 7 Magníficas: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META (versionadas, inmutables)
// 2. Thresholds: <20% VERDE, [20,40%] AMARILLO, >40% ROJO (frontera exacta: 40.00% = AMARILLO)
// 3. ROJO = hard-block: gexAnalysis + predictPro retornan NULL, bloquean GEX/Pred
// 4. Histórico parcial: ≥2d AMARILLO (usa disponibles), <2d HOLD/fail-closed (bloquea)
//
// Funciones puras y testeables (lib/liquidity.test.ts).
// ============================================================================

export type LiquidityLevel = "VERDE" | "AMARILLO" | "ROJO" | "HOLD";

export interface LiquidityCheckResult {
  level: LiquidityLevel;
  disparityPct: number;
  reason: string;
  sectorAvgNotional: number | null;
  tickerNotional: number;
  historicalDays: number;
  lowLiquidity: boolean;
}

/** 7 Magníficas — líderes del sector, versionadas 2026-09-13. No modificables automáticamente. */
export const SECTOR_LEADERS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META"] as const;
export type SectorLeader = (typeof SECTOR_LEADERS)[number];

/** Histórico mínimo aceptable (en días) para proceder. */
export const MIN_HISTORICAL_DAYS = 2;

/** Histórico objetivo (en días) para cálculo completo. */
export const TARGET_HISTORICAL_DAYS = 5;

/** Thresholds de disparidad porcentual. */
export const THRESHOLDS = {
  green: 20,      // < 20% → VERDE
  yellow: 40,     // [20, 40%] → AMARILLO; (40, ∞) → ROJO
};

/**
 * Calcula el promedio de Notional Value de los últimos N días para un ticker.
 * Devuelve { avgNotional, daysAvailable } o null si no hay datos.
 *
 * @param snapshots Array de snapshots históricos (más reciente primero, como lo devuelve chainStore)
 * @param maxDays Número máximo de días a considerar (p. ej. 5 para cálculo sector_avg)
 */
export function calculateAverageNotional(
  snapshots: Array<{ date: string; totalNotional: number }>,
  maxDays: number,
): { avgNotional: number; daysAvailable: number } | null {
  if (!snapshots || snapshots.length === 0) return null;

  const sample = snapshots.slice(0, maxDays);
  const validNotionals = sample
    .map((s) => s.totalNotional)
    .filter((n) => typeof n === "number" && n > 0);

  if (validNotionals.length === 0) return null;

  const avg = validNotionals.reduce((a, b) => a + b, 0) / validNotionals.length;
  return { avgNotional: avg, daysAvailable: validNotionals.length };
}

/**
 * Calcula disparidad porcentual: |ticker - sector_avg| / sector_avg × 100.
 * Retorna null si los insumos no son válidos.
 */
export function calculateDisparity(
  tickerNotional: number,
  sectorAvgNotional: number,
): number | null {
  if (
    !Number.isFinite(tickerNotional) ||
    !Number.isFinite(sectorAvgNotional) ||
    sectorAvgNotional <= 0
  ) {
    return null;
  }
  return Math.abs(tickerNotional - sectorAvgNotional) / sectorAvgNotional * 100;
}

/**
 * Clasifica el nivel de liquidez basado en disparidad porcentual.
 *
 * Thresholds (decisión 2):
 * - disparityPct < 20%           → VERDE
 * - 20% ≤ disparityPct ≤ 40%     → AMARILLO
 * - disparityPct > 40%           → ROJO
 *
 * Nota: 40.00% es AMARILLO (la frontera es > 40%, no >= 40%)
 */
export function classifyLiquidity(disparityPct: number): LiquidityLevel {
  if (!Number.isFinite(disparityPct) || disparityPct < 0) return "ROJO";
  if (disparityPct < THRESHOLDS.green) return "VERDE";
  if (disparityPct <= THRESHOLDS.yellow) return "AMARILLO";
  return "ROJO";
}

/**
 * Ejecuta la validación completa de liquidez.
 *
 * Regla fail-closed: si cualquier dato falta o es indeterminado, retorna ROJO.
 * Histórico parcial (≥2d): AMARILLO + procede.
 * Histórico insuficiente (<2d): HOLD/fail-closed (mismo nivel bloqueante que ROJO, pero marcado diferente).
 *
 * @param tickerNotional Notional Value del ticker consultado (hoy)
 * @param sectorAverageSnapshots Snapshots históricos de los 7 Magníficas (combinados)
 */
export function evaluateLiquidity(
  tickerNotional: number,
  sectorAverageSnapshots: Array<{ date: string; totalNotional: number }>,
): LiquidityCheckResult {
  // Fail-closed: ticker sin notional calculable
  if (!Number.isFinite(tickerNotional) || tickerNotional <= 0) {
    return {
      level: "ROJO",
      disparityPct: NaN,
      reason: "Notional value no calculable. Datos insuficientes o stale.",
      sectorAvgNotional: null,
      tickerNotional,
      historicalDays: 0,
      lowLiquidity: true,
    };
  }

  // Calcula promedio sector (máximo 5 días para ser coherente con Tarea 5)
  const sectorAvg = calculateAverageNotional(sectorAverageSnapshots, TARGET_HISTORICAL_DAYS);

  // Fail-closed: sector sin datos históricos
  if (!sectorAvg) {
    return {
      level: "ROJO",
      disparityPct: NaN,
      reason: "Promedio del sector no disponible. Sin histórico de líderes.",
      sectorAvgNotional: null,
      tickerNotional,
      historicalDays: 0,
      lowLiquidity: true,
    };
  }

  // Chequea suficiencia histórica (decisión 4)
  if (sectorAvg.daysAvailable < MIN_HISTORICAL_DAYS) {
    return {
      level: "HOLD", // fail-closed: <2d = HOLD/hard-block (conforme especificación)
      disparityPct: NaN,
      reason: `Histórico insuficiente (${sectorAvg.daysAvailable}d disponibles, ${MIN_HISTORICAL_DAYS}d mínimo). Aguardar ≥${MIN_HISTORICAL_DAYS} días.`,
      sectorAvgNotional: sectorAvg.avgNotional,
      tickerNotional,
      historicalDays: sectorAvg.daysAvailable,
      lowLiquidity: true,
    };
  }

  // Calcula disparidad
  const disparity = calculateDisparity(tickerNotional, sectorAvg.avgNotional);

  // Fail-closed: indeterminación (división por cero, aunque ya la cubrimos arriba)
  if (disparity === null || !Number.isFinite(disparity)) {
    return {
      level: "ROJO",
      disparityPct: NaN,
      reason: "Comparación de liquidez indeterminada. Datos inválidos.",
      sectorAvgNotional: sectorAvg.avgNotional,
      tickerNotional,
      historicalDays: sectorAvg.daysAvailable,
      lowLiquidity: true,
    };
  }

  // Clasifica según thresholds
  const level = classifyLiquidity(disparity);

  // Genera mensaje legible
  let reason: string;
  if (level === "VERDE") {
    reason = `Liquidez normal. Disparidad ${disparity.toFixed(1)}%.`;
  } else if (level === "AMARILLO") {
    const hint =
      sectorAvg.daysAvailable < TARGET_HISTORICAL_DAYS
        ? ` [Histórico incompleto: ${sectorAvg.daysAvailable}d disponibles, ${TARGET_HISTORICAL_DAYS}d objetivo]`
        : "";
    reason = `Liquidez moderadamente baja. Disparidad ${disparity.toFixed(1)}%.${hint} Operar con precaución.`;
  } else {
    reason = `Liquidez muy baja. Disparidad ${disparity.toFixed(1)}%. NO OPERAR.`;
  }

  return {
    level,
    disparityPct: disparity,
    reason,
    sectorAvgNotional: sectorAvg.avgNotional,
    tickerNotional,
    historicalDays: sectorAvg.daysAvailable,
    lowLiquidity: level !== "VERDE",
  };
}

/**
 * Convierte LiquidityCheckResult a un booleano para uso en gexAnalysis.
 * true = lowLiquidity (AMARILLO o ROJO), false = VERDE.
 */
export function isLowLiquidity(result: LiquidityCheckResult): boolean {
  return result.lowLiquidity;
}

/**
 * Indica si el resultado bloquea hard (ROJO o HOLD).
 * Los AMARILLO (histórico completo) permiten proceder con cautela.
 */
export function shouldBlock(result: LiquidityCheckResult): boolean {
  return result.level === "ROJO" || result.level === "HOLD";
}
