/**
 * VolatilityFilter - Ajusta parámetros según volatilidad
 *
 * La volatilidad es dinámica. En ambiente de baja volatilidad,
 * los stops deben ser tighter. En alta volatilidad, más wide.
 *
 * Además, en volatilidad extrema, muchas estrategias se bloquean.
 */

import { MarketData, VolatilityFilterResult } from "../types/Strategy";
import { RiskParameters } from "../base/BaseStrategy";

export class VolatilityFilter {
  /**
   * Aplica filtro de volatilidad a una estrategia
   *
   * Entrada: marketData (con σ realizada), riskParams (base)
   * Salida: adjustedParams + información de filtrado
   */
  public apply(
    marketData: MarketData,
    baseRiskParams: RiskParameters
  ): VolatilityFilterResult {
    const volPercentile = marketData.volatilityPercentile ?? 50; // Default: mediana
    const volRealized = marketData.volatilityRealized ?? 15; // Default: 15%

    // Categorizar nivel de volatilidad
    const volLevel = this.categorizeVolatility(volPercentile, volRealized);

    // Obtener adjustments según nivel
    const adjustments = this.getAdjustments(volLevel, volPercentile);

    // Construir resultado
    const result: VolatilityFilterResult = {
      volatilityLevel: volLevel,
      volatilityPercentile: volPercentile,

      adjustedStopLossPct:
        baseRiskParams.stopLossPct * adjustments.stopLossMultiplier,
      adjustedPositionSizePct:
        adjustments.positionSizeMultiplier,
      adjustedTrailingDistancePct:
        baseRiskParams.trailingDistancePct * adjustments.trailingMultiplier,

      minSignalScoreRequired: adjustments.minSignalScore,
      isBlocked: adjustments.isBlocked,
      explanation: adjustments.explanation,
    };

    return result;
  }

  /**
   * Categoriza el nivel de volatilidad
   *
   * Usa percentil (0-100) y σ realizada como confirmación
   */
  private categorizeVolatility(
    percentile: number,
    volRealized: number
  ): "LOW" | "MEDIUM" | "HIGH" | "EXTREME" {
    // Primaria: percentil
    if (percentile < 25) return "LOW";
    if (percentile < 50) return "MEDIUM";
    if (percentile < 75) return "HIGH";
    return "EXTREME";
  }

  /**
   * Retorna adjustments para cada nivel de volatilidad
   */
  private getAdjustments(
    level: "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
    percentile: number
  ): {
    stopLossMultiplier: number;
    trailingMultiplier: number;
    positionSizeMultiplier: number;
    minSignalScore: number;
    isBlocked: boolean;
    explanation: string;
  } {
    switch (level) {
      case "LOW": // σ_percentil < 25
        return {
          stopLossMultiplier: 0.75, // 1.5% → 1.125%
          trailingMultiplier: 0.67, // 1.5% → 1.0%
          positionSizeMultiplier: 1.1, // +10% (menos ruido, más seguro)
          minSignalScore: 70,
          isBlocked: false,
          explanation:
            "Volatilidad BAJA (${percentile}p) → Stops más tight, posición +10%",
        };

      case "MEDIUM": // 25 ≤ σ_percentil < 50
        return {
          stopLossMultiplier: 1.0, // Sin cambios
          trailingMultiplier: 1.0,
          positionSizeMultiplier: 1.0, // Normal
          minSignalScore: 70,
          isBlocked: false,
          explanation:
            "Volatilidad MEDIA (${percentile}p) → Parámetros estándar",
        };

      case "HIGH": // 50 ≤ σ_percentil < 75
        return {
          stopLossMultiplier: 1.5, // 1.5% → 2.25%
          trailingMultiplier: 1.67, // 1.5% → 2.5%
          positionSizeMultiplier: 0.7, // -30%
          minSignalScore: 75, // Más selectivo
          isBlocked: false,
          explanation:
            "Volatilidad ALTA (${percentile}p) → Stops wider, posición -30%, score ≥75",
        };

      case "EXTREME": // σ_percentil ≥ 75
        return {
          stopLossMultiplier: 2.0, // 1.5% → 3.0%
          trailingMultiplier: 2.0, // 1.5% → 3.0%
          positionSizeMultiplier: 0.5, // -50%
          minSignalScore: 85, // Muy selectivo
          isBlocked: true, // Bloquear mayoría de estrategias
          explanation:
            "Volatilidad EXTREMA (${percentile}p) → BLOQUEADO. Solo si score ≥85",
        };

      default:
        return {
          stopLossMultiplier: 1.0,
          trailingMultiplier: 1.0,
          positionSizeMultiplier: 1.0,
          minSignalScore: 70,
          isBlocked: false,
          explanation: "Estado desconocido",
        };
    }
  }

  /**
   * Utilidad: Retorna "razón para bloquear" si aplica
   */
  public getBlockingReason(
    marketData: MarketData
  ): { isBlocked: boolean; reason?: string } {
    const volPercentile = marketData.volatilityPercentile ?? 50;

    if (volPercentile >= 90) {
      return {
        isBlocked: true,
        reason: `Volatilidad ${volPercentile}p: Bloqueado (extrema)`,
      };
    }

    // Hay eventos que causan bloqueo inmediato
    if (marketData.earnings) {
      return {
        isBlocked: true,
        reason: "Earnings hoy/mañana: Riesgo overnight bloqueado",
      };
    }

    return { isBlocked: false };
  }
}
