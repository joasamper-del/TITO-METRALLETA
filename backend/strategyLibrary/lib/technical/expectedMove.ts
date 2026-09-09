/**
 * Expected Move Calculator
 * Integrado desde Victor's agente-tito-metralleta
 */

export function expectedMove(
  price: number,
  iv: number,
  daysToExpiry: number
): { lower: number; upper: number } {
  const T = daysToExpiry / 365;
  const move = price * iv * Math.sqrt(T);
  return { lower: price - move, upper: price + move };
}
