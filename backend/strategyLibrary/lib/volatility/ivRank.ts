/**
 * IV Rank Calculator
 * Integrado desde Victor's agente-tito-metralleta
 */

export function ivRankPoints(
  iv: number,
  iv52wHigh: number,
  iv52wLow: number
): number {
  if (iv52wHigh === iv52wLow) return 50;
  return ((iv - iv52wLow) / (iv52wHigh - iv52wLow)) * 100;
}
