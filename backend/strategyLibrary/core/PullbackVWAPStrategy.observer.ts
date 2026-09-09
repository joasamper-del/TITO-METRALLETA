/**
 * PullbackVWAPStrategy Parallel Observer
 *
 * ⚠️ CRITICAL: INFORMATIONAL ONLY
 * - Threshold 65 is the ONLY ACTIVE rule (executes trades)
 * - Thresholds 70 and 72 are OBSERVATION ONLY (never execute)
 * - This observer records: what WOULD HAVE HAPPENED with 70/72
 * - No orders, positions, or risk parameters change
 *
 * Propósito: Recolectar datos empíricos de señales Pullback simultáneamente
 * con tres umbrales (65, 70, 72) SIN alterar decisiones ni ejecución.
 *
 * Flujo:
 * 1. Cada vez que PullbackVWAPStrategy evalúa una señal (minSignalScore=65, active)
 * 2. Observer registra en paralelo qué HUBIERA PASADO con 70 y 72 (shadow observation)
 * 3. Después del trade (resultado real confirmado en Paper), se actualizan métricas
 * 4. Acumula: ganancia/pérdida teórica, max favorable, max adverso
 * 5. Al final del período (semana/mes), genera reporte comparativo
 * 6. NUNCA toma decisiones con 70/72 - solo informa para análisis
 *
 * No se ejecuta nada. Solo observa, registra e INFORMA.
 */

import { MarketData, StrategyConfig, SignalRecommendation } from "../types/Strategy";

export interface ThresholdObservation {
  timestamp: Date;
  symbol: string;
  signalScore: number;

  // Data source labels (PAPER/SHADOW/REAL_DATA)
  source: "PAPER" | "SHADOW"; // PAPER = simulated, SHADOW = parallel observation only
  realData: boolean; // false until from authentic Paper trade; true when Paper trade confirmed

  // Qué umbral hubiera aceptado (65, 70, 72)
  acceptedBy65: boolean;
  acceptedBy70: boolean;
  acceptedBy72: boolean;

  // Recomendación real (con 65, ÚNICO ACTIVO)
  recommendationAt65: SignalRecommendation;

  // Información de trade posterior (se completa después)
  entryPrice?: number;
  exitPrice?: number;
  profitLoss?: number;           // Ganancia/pérdida teórica
  maxFavorableExcursion?: number; // Máximo avance favorable
  maxAdverseExcursion?: number;   // Máximo movimiento adverso
  outcome?: "WIN" | "LOSS" | "BREAK_EVEN";

  // Metadatos
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PullbackVWAPObserver {
  private observations: Map<string, ThresholdObservation> = new Map();
  private readonly THRESHOLDS = [65, 70, 72];

  /**
   * Registra una nueva evaluación de Pullback con múltiples umbrales
   * source: "PAPER" = simulated, "SHADOW" = parallel observation only
   * realData: false (shadow) until authenticated from Paper trade
   */
  recordSignalEvaluation(
    marketData: MarketData,
    config: StrategyConfig,
    signalScore: number,
    recommendationAt65: SignalRecommendation,
    source: "PAPER" | "SHADOW" = "SHADOW",
    realData: boolean = false
  ): ThresholdObservation {
    const observation: ThresholdObservation = {
      timestamp: marketData.timestamp,
      symbol: marketData.symbol,
      signalScore,
      source,
      realData,
      acceptedBy65: signalScore >= 65,
      acceptedBy70: signalScore >= 70,
      acceptedBy72: signalScore >= 72,
      recommendationAt65,
      id: `${marketData.symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.observations.set(observation.id, observation);
    return observation;
  }

  /**
   * Marca una observación como realData cuando se confirma desde Paper trading
   * Transforma de SHADOW a PAPER authenticated
   */
  markAsRealData(observationId: string, authenticatedFromPaperTrade: boolean = true): void {
    const obs = this.observations.get(observationId);
    if (!obs) return;
    obs.realData = authenticatedFromPaperTrade;
    obs.source = "PAPER";
    obs.updatedAt = new Date();
  }

  /**
   * Actualiza una observación con datos posteriores del trade (SOLO si realData=true)
   * Nunca ejecuta con 70/72 - solo registra qué HUBIERA PASADO
   */
  updateWithPostTradeData(
    observationId: string,
    entryPrice: number,
    exitPrice: number,
    maxFavExc: number,
    maxAdvExc: number
  ): void {
    const obs = this.observations.get(observationId);
    if (!obs) return;

    obs.entryPrice = entryPrice;
    obs.exitPrice = exitPrice;
    obs.profitLoss = ((exitPrice - entryPrice) / entryPrice) * 100;
    obs.maxFavorableExcursion = maxFavExc;
    obs.maxAdverseExcursion = maxAdvExc;
    obs.outcome =
      obs.profitLoss > 0.1
        ? "WIN"
        : obs.profitLoss < -0.1
          ? "LOSS"
          : "BREAK_EVEN";
    obs.updatedAt = new Date();
  }

  /**
   * Genera reporte comparativo: ¿Qué hubiera pasado con 70 y 72?
   */
  generateComparativeReport(period?: { startDate: Date; endDate: Date }): {
    totalSignals: number;
    signals65: number;
    signals70: number;
    signals72: number;
    filtered70: number;
    filtered72: number;
    win65: number;
    win70: number;
    win72: number;
    avgPL65: number;
    avgPL70: number;
    avgPL72: number;
    maxFavAvg: number;
    maxAdvAvg: number;
    recommendation: string;
  } {
    const observations = Array.from(this.observations.values());

    // Filtrar por período si se proporciona
    const filtered = period
      ? observations.filter(
          (o) =>
            o.createdAt >= period.startDate &&
            o.createdAt <= period.endDate
      )
      : observations;

    const totalSignals = filtered.length;
    const signals65 = filtered.filter((o) => o.acceptedBy65).length;
    const signals70 = filtered.filter((o) => o.acceptedBy70).length;
    const signals72 = filtered.filter((o) => o.acceptedBy72).length;

    // Señales que se hubieran filtrado
    const filtered70 = signals65 - signals70; // Entre 65 y 70
    const filtered72 = signals65 - signals72; // Entre 65 y 72

    // Ganancias
    const completed = filtered.filter((o) => o.outcome);
    const win65 = completed.filter((o) => o.acceptedBy65 && o.outcome === "WIN").length;
    const win70 = completed.filter((o) => o.acceptedBy70 && o.outcome === "WIN").length;
    const win72 = completed.filter((o) => o.acceptedBy72 && o.outcome === "WIN").length;

    // P&L promedio
    const pl65 = completed
      .filter((o) => o.acceptedBy65)
      .reduce((sum, o) => sum + (o.profitLoss || 0), 0) / Math.max(1, signals65);
    const pl70 = completed
      .filter((o) => o.acceptedBy70)
      .reduce((sum, o) => sum + (o.profitLoss || 0), 0) / Math.max(1, signals70);
    const pl72 = completed
      .filter((o) => o.acceptedBy72)
      .reduce((sum, o) => sum + (o.profitLoss || 0), 0) / Math.max(1, signals72);

    const maxFavAvg =
      completed.reduce((sum, o) => sum + (o.maxFavorableExcursion || 0), 0) /
      Math.max(1, completed.length);
    const maxAdvAvg =
      completed.reduce((sum, o) => sum + Math.abs(o.maxAdverseExcursion || 0), 0) /
      Math.max(1, completed.length);

    // Recomendación
    let recommendation = "WAIT_MORE_DATA";
    if (completed.length >= 30) {
      // Mínimo 30 trades para validación
      if (pl72 > pl70 && pl72 > pl65) {
        recommendation = "RECOMMEND_72";
      } else if (pl70 > pl65) {
        recommendation = "RECOMMEND_70";
      } else {
        recommendation = "KEEP_65";
      }
    }

    return {
      totalSignals,
      signals65,
      signals70,
      signals72,
      filtered70,
      filtered72,
      win65,
      win70,
      win72,
      avgPL65: parseFloat(pl65.toFixed(2)),
      avgPL70: parseFloat(pl70.toFixed(2)),
      avgPL72: parseFloat(pl72.toFixed(2)),
      maxFavAvg: parseFloat(maxFavAvg.toFixed(2)),
      maxAdvAvg: parseFloat(maxAdvAvg.toFixed(2)),
      recommendation,
    };
  }

  /**
   * Retorna todas las observaciones para análisis
   */
  getAllObservations(): ThresholdObservation[] {
    return Array.from(this.observations.values());
  }

  /**
   * Retorna observaciones para un símbolo específico
   */
  getObservationsForSymbol(symbol: string): ThresholdObservation[] {
    return Array.from(this.observations.values()).filter(
      (o) => o.symbol === symbol
    );
  }

  /**
   * Limpia observaciones antiguas (más de N días)
   */
  cleanOldObservations(daysOld: number = 30): number {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    let removed = 0;

    for (const [id, obs] of this.observations.entries()) {
      if (obs.createdAt < cutoff) {
        this.observations.delete(id);
        removed++;
      }
    }

    return removed;
  }
}

// Singleton para uso global
export const pullbackObserver = new PullbackVWAPObserver();
