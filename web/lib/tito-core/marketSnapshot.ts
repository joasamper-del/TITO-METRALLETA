// Forma interna de los datos entre las etapas get_data → evaluate_rules del flujo mock
// (bitácora §6). NO es parte del contrato público (OpportunityReport) — es lo que la capa
// de datos entrega al Rule Engine. En esta fase (§10 de la bitácora) siempre viene de
// mockDataSource.ts; una fuente real implementaría la misma forma sin tocar el resto del
// pipeline.

import type { DataQuality, HistoricalProbability } from "./types";

export type RuleCategory =
  | "trend" | "volume" | "liquidity" | "regime"
  | "pattern" | "candle" | "volatility" | "events";

export interface MarketSnapshot {
  symbol: string;
  /** Tendencia del subyacente. La estrategia mock solo opera a favor de "alcista". */
  trend: "alcista" | "bajista" | "lateral";
  volumeSufficient: boolean;
  liquidityAdequate: boolean;
  /** El régimen de mercado (ej. volatilidad/gamma) valida la estrategia activa. */
  regimeValidated: boolean;
  /**
   * ¿Se detectó el patrón que la estrategia busca? null = señal mixta/ambigua —
   * ni confirma ni descarta el patrón, dispara "revisar manualmente".
   */
  patternDetected: boolean | null;
  /** Condición crítica observable de ejecución (ej. cierre de vela). Gate operar/esperar. */
  candleConfirmed: boolean;
  volatilityInRange: boolean;
  /** true si hay un evento que bloquea operar (ej. earnings inminente, halt). */
  blockingEvent: boolean;
  /** Rango histórico si hay casos comparables suficientes; null si no. */
  historicalProbability: HistoricalProbability | null;
  /** Calidad de los datos que sustentan este snapshot. */
  dataQuality: DataQuality;
}
