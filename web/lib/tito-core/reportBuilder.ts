// build_report del flujo oficial (WORKFLOW_AND_AUDIT.md) — junta status, métricas y
// explicación en el OpportunityReport final. Es el único lugar que decide `priority`:
// no es trabajo del Decision Engine ("deriva únicamente los cuatro estados") ni del
// Metrics Engine (confianza/riesgo/calidad/probabilidad, no urgencia).
//
// `id` y `createdAt` se reciben como parámetros en vez de generarse aquí: esta función
// se mantiene PURA (misma entrada → mismo reporte), y la generación de identidad/tiempo
// (no determinista) queda en workflow.ts, que sí hace I/O.

import type {
  OpportunityPriority, OpportunityReport, OpportunityStatus, ReportVersions,
} from "./types";
import type { MarketSnapshot } from "./marketSnapshot";
import type { RuleResult } from "./ruleEngine";
import type { Metrics } from "./metricsEngine";
import { explainInvalidationConditions, explainNextTrigger, explainReasons } from "./explanationEngine";

/**
 * Semántica exacta de DECISION_CONTRACT.md:
 *   alta:      operar, o esperar con confianza alta ("muy cerca de operar").
 *   media:     esperar con buena configuración (confianza media).
 *   baja:      no operar, baja convicción, o revisar manualmente no urgente.
 *   archivada: oportunidad expirada o invalidada — NO se deriva en este commit; esta
 *              fase no modela ciclo de vida/expiración (eso es Strategy Manager /
 *              Continuous Improvement, aún no implementado). Queda reservado en el
 *              catálogo para cuando exista ese motor.
 */
function derivePriority(status: OpportunityStatus, confidence: number | null): OpportunityPriority {
  if (status === "operar") return "alta";
  if (status === "esperar") return confidence !== null && confidence >= 0.75 ? "alta" : "media";
  return "baja"; // "no operar" y "revisar manualmente" no urgente
}

export interface ReportMeta {
  id: string;
  createdAt: string;
}

export function buildReport(
  snapshot: MarketSnapshot,
  rules: RuleResult[],
  status: OpportunityStatus,
  metrics: Metrics,
  versions: ReportVersions,
  meta: ReportMeta,
): OpportunityReport {
  return {
    id: meta.id,
    symbol: snapshot.symbol,
    ...versions,
    status,
    priority: derivePriority(status, metrics.confidence),
    confidence: metrics.confidence,
    risk: metrics.risk,
    dataQuality: metrics.dataQuality,
    historicalProbability: metrics.historicalProbability,
    razones: explainReasons(rules),
    invalidationConditions: explainInvalidationConditions(rules),
    nextTrigger: explainNextTrigger(status, rules),
    createdAt: meta.createdAt,
  };
}
