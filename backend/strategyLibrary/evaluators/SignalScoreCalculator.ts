/**
 * SignalScoreCalculator - Calcula puntaje de señal 0-100
 *
 * Toma múltiples factores (tendencia, momentum, volumen, etc.)
 * y calcula un score compuesto con pesos específicos
 */

import { SignalScoreComponents } from "../types/Strategy";

export interface ScoreFactor {
  name: string;
  value: number; // 0-100 (el factor individual)
  weight: number; // 0-1 (peso en el score total)
  explanation: string;
}

export class SignalScoreCalculator {
  /**
   * Calcula el score compuesto de múltiples factores
   *
   * Fórmula:
   * FinalScore = Σ(factor.value * factor.weight) / Σ(weights)
   *
   * Ejemplo:
   * - Tendencia: 25 puntos × 0.25 weight = 6.25
   * - RSI: 20 puntos × 0.20 weight = 4.0
   * - Volumen: 15 puntos × 0.15 weight = 2.25
   * - Patrón: 20 puntos × 0.20 weight = 4.0
   * - Liquidez: 10 puntos × 0.10 weight = 1.0
   * - Régimen: 10 puntos × 0.10 weight = 1.0
   *
   * Total: (6.25 + 4.0 + 2.25 + 4.0 + 1.0 + 1.0) / 1.0 = 18.5
   * Escalado a 100: (18.5 / 100) × 100 = 18.5... ESPERA
   *
   * Mejor fórmula:
   * FinalScore = Σ(factor.value * factor.weight) donde weights suman 1.0
   * Result: 6.25 + 4.0 + 2.25 + 4.0 + 1.0 + 1.0 = 18.5 (está en escala 0-100)
   */
  public calculateComposite(factors: ScoreFactor[]): SignalScoreComponents {
    if (factors.length === 0) {
      return {
        finalScore: 0,
        weights: {},
      };
    }

    // Validar que los weights sumen ~1.0
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      console.warn(
        `SignalScoreCalculator: Total weight (${totalWeight}) does not equal 1.0`
      );
    }

    // Calcular score ponderado
    let finalScore = 0;
    const weights: Record<string, number> = {};

    for (const factor of factors) {
      const contribution = factor.value * factor.weight;
      finalScore += contribution;
      weights[factor.name] = factor.weight;
    }

    // Redondear a 2 decimales
    finalScore = Math.round(finalScore * 100) / 100;

    return {
      trend: factors.find((f) => f.name.toLowerCase().includes("trend"))
        ?.value,
      momentum: factors.find((f) => f.name.toLowerCase().includes("momentum"))
        ?.value,
      volume: factors.find((f) => f.name.toLowerCase().includes("volume"))
        ?.value,
      pattern: factors.find((f) => f.name.toLowerCase().includes("pattern"))
        ?.value,
      volatility: factors.find((f) =>
        f.name.toLowerCase().includes("volatility")
      )?.value,
      liquidity: factors.find((f) =>
        f.name.toLowerCase().includes("liquidity")
      )?.value,
      regime: factors.find((f) => f.name.toLowerCase().includes("regime"))
        ?.value,

      weights,
      finalScore,
    };
  }

  /**
   * Utilidad: Convierte un factor individual a escala 0-100
   *
   * Ejemplo: RSI está en 62, escala RSI es 0-100
   * → rsiFactor = 62 / 100 * 100 = 62
   */
  public scaleValue(value: number, min: number, max: number): number {
    const scaled = ((value - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, scaled)); // Clamp 0-100
  }

  /**
   * Utilidad: Calcula "fortaleza" de un rango
   * Ejemplo: RSI en 65 vs rango 50-70 → qué % del rango está usado
   */
  public rangeStrength(
    value: number,
    minRange: number,
    maxRange: number
  ): number {
    if (value < minRange) return 0;
    if (value > maxRange) return 0;

    const strength = ((value - minRange) / (maxRange - minRange)) * 100;
    return Math.max(0, Math.min(100, strength));
  }
}
