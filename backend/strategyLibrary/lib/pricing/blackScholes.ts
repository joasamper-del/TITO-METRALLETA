/**
 * Black-Scholes Option Pricing Model
 *
 * Integrado desde Victor's agente-tito-metralleta
 * https://github.com/infusionvictor/agente-tito-metralleta
 *
 * Copy-paste ready (sin cambios):
 * - bsPrice()
 * - bsDelta()
 * - bsGamma()
 * - normCdf()
 */

/**
 * Cumulative normal distribution function
 * Approximation using error function
 */
export function normCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Black-Scholes Call Price
 * @param S Stock price
 * @param K Strike price
 * @param T Time to expiration (years)
 * @param r Risk-free rate
 * @param sigma Volatility (annualized)
 */
export function bsPrice(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): { call: number; put: number } {
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const call = S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
  const put = K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1);

  return { call, put };
}

/**
 * Black-Scholes Delta
 * Sensitivity to underlying price changes
 */
export function bsDelta(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  optionType: "call" | "put"
): number {
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  return optionType === "call" ? normCdf(d1) : normCdf(d1) - 1;
}

/**
 * Black-Scholes Gamma
 * Second derivative of option price w.r.t. underlying
 */
export function bsGamma(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): number {
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const numerator = Math.exp((-d1 * d1) / 2) / Math.sqrt(2 * Math.PI);
  return numerator / (S * sigma * Math.sqrt(T));
}

/**
 * Black-Scholes Vega
 * Sensitivity to volatility changes
 */
export function bsVega(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): number {
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  return (S * Math.exp((-d1 * d1) / 2) / Math.sqrt(2 * Math.PI)) * Math.sqrt(T);
}

/**
 * Black-Scholes Theta
 * Time decay
 */
export function bsTheta(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  optionType: "call" | "put"
): number {
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const pdf_d1 = Math.exp((-d1 * d1) / 2) / Math.sqrt(2 * Math.PI);

  if (optionType === "call") {
    return (
      (-S * pdf_d1 * sigma) / (2 * Math.sqrt(T)) -
      r * K * Math.exp(-r * T) * normCdf(d2)
    ) / 365;
  } else {
    return (
      (-S * pdf_d1 * sigma) / (2 * Math.sqrt(T)) +
      r * K * Math.exp(-r * T) * normCdf(-d2)
    ) / 365;
  }
}
