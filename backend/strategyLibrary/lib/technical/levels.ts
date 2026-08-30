/**
 * Levels: Support & Resistance
 * Integrado desde Victor's agente-tito-metralleta
 */

export function computeLevels(
  high: number,
  low: number,
  close: number
): { pivot: number; r1: number; s1: number; r2?: number; s2?: number } {
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);
  return { pivot, r1, s1, r2, s2 };
}
