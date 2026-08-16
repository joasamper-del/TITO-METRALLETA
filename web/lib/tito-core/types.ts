// Contrato central de Tito — OpportunityReport.
//
// Espejo de la fuente AUTORITATIVA: Tito_Metralleta_ClaudeCode_Bundle_2026-08-16/
// sdk/tito-internal-sdk/src/contracts/opportunity.ts + handoff/DECISION_CONTRACT.md.
// La bitácora del 2026-08-16 (§3-4) describe el mismo contrato en prosa, pero donde hay
// diferencia manda el bundle de handoff (es la versión con la que audita Claude Code).
// Este es el ÚNICO objeto que la UI puede leer para decidir qué mostrar; la UI nunca
// recalcula reglas, métricas ni decisiones (principio no negociable). Los catálogos
// (status/priority/risk/dataQuality) son cerrados a propósito — un valor fuera de
// catálogo debe fallar la validación, no colarse como string libre.
//
// Si se agrega `sdk/tito-internal-sdk` como dependencia real del repo más adelante,
// este archivo debería reemplazarse por un `import type` desde ese paquete en vez de
// mantener una copia — por ahora se copia inline para no acoplar el módulo a un SDK
// que aún no vive en package.json.

/** Los cuatro únicos estados que puede derivar el Decision Engine. "Casi cumple" nunca es "operar". */
export type OpportunityStatus = "operar" | "esperar" | "no operar" | "revisar manualmente";

export type OpportunityPriority = "alta" | "media" | "baja" | "archivada";
export type OpportunityRisk = "bajo" | "medio" | "alto";
export type DataQuality = "alta" | "media" | "baja";

export const OPPORTUNITY_STATUSES: readonly OpportunityStatus[] = [
  "operar", "esperar", "no operar", "revisar manualmente",
];
export const OPPORTUNITY_PRIORITIES: readonly OpportunityPriority[] = [
  "alta", "media", "baja", "archivada",
];
export const OPPORTUNITY_RISKS: readonly OpportunityRisk[] = ["bajo", "medio", "alto"];
export const DATA_QUALITIES: readonly DataQuality[] = ["alta", "media", "baja"];

/** Versiones exactas que produjeron el reporte — trazabilidad obligatoria (ARCHITECTURE.md, ley #12). */
export interface ReportVersions {
  systemVersion: string;
  strategyVersion: string;
  configVersion: string;
  decisionContractVersion: string;
}

/**
 * "Basada en casos realmente comparables. Si la muestra es insuficiente: null."
 * (DECISION_CONTRACT.md). Estructurada a propósito — un string libre como "65%-72%"
 * no deja verificar cuántos casos comparables la respaldan.
 */
export interface HistoricalProbability {
  min: number;
  max: number;
  comparableCases: number;
}

export interface OpportunityReport extends ReportVersions {
  /** Identificador único de esta corrida de análisis (no del símbolo). */
  id: string;
  symbol: string;
  status: OpportunityStatus;
  priority: OpportunityPriority;
  /** Cálculo trazable; nunca corazonada. null si no hay evidencia suficiente. */
  confidence: number | null;
  risk: OpportunityRisk;
  dataQuality: DataQuality;
  historicalProbability: HistoricalProbability | null;
  /** 3 a 5 factores principales a favor y en contra. */
  razones: string[];
  /** Condiciones específicas y observables que invalidarían la oportunidad. */
  invalidationConditions: string[];
  /** Próximo evento que justifica reevaluar; null si no aplica. */
  nextTrigger: string | null;
  createdAt: string;
}
