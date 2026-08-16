// Metrics Engine — "confianza, riesgo, calidad de datos y probabilidad histórica"
// (bitácora §7). PURA: mismos resultados de reglas + mismo snapshot → mismas métricas.

import type { DataQuality, HistoricalProbability, OpportunityRisk } from "./types";
import type { MarketSnapshot } from "./marketSnapshot";
import type { RuleResult } from "./ruleEngine";

export interface Metrics {
  confidence: number | null;
  risk: OpportunityRisk;
  dataQuality: DataQuality;
  historicalProbability: HistoricalProbability | null;
}

/**
 * Confianza = proporción de reglas aprobadas entre las evaluables (excluye señales
 * ambiguas, que no aportan evidencia en ninguna dirección). "Cálculo trazable, nunca
 * corazonada" (principio §2): con datos de calidad "baja" se degrada a la mitad en vez
 * de inventarse un número — la evidencia de partida ya es débil.
 */
function computeConfidence(rules: RuleResult[], dataQuality: DataQuality): number | null {
  const applicable = rules.filter((r) => r.passed !== null);
  if (applicable.length === 0) return null;
  const passed = applicable.filter((r) => r.passed === true).length;
  let confidence = passed / applicable.length;
  if (dataQuality === "baja") confidence *= 0.5;
  return Math.round(confidence * 100) / 100;
}

/** Riesgo separado de confianza y prioridad (bitácora §3): volatilidad + calidad de datos. */
function computeRisk(snapshot: MarketSnapshot): OpportunityRisk {
  if (snapshot.volatilityInRange && snapshot.dataQuality === "alta") return "bajo";
  if (snapshot.volatilityInRange || snapshot.dataQuality === "media") return "medio";
  return "alto";
}

export function calculateMetrics(snapshot: MarketSnapshot, rules: RuleResult[]): Metrics {
  return {
    confidence: computeConfidence(rules, snapshot.dataQuality),
    risk: computeRisk(snapshot),
    dataQuality: snapshot.dataQuality,
    // "Solo con casos comparables suficientes" — con datos de baja calidad no hay base
    // para afirmar comparabilidad, así que se reporta null en vez de un número dudoso.
    historicalProbability: snapshot.dataQuality === "baja" ? null : snapshot.historicalProbability,
  };
}
