// validate_report del flujo oficial (WORKFLOW_AND_AUDIT.md). Si una etapa técnica falla,
// las siguientes no continúan — este validador es el punto donde un reporte mal formado
// se detiene ANTES de guardarse o publicarse, en vez de llegar a la UI. Cubre los
// criterios de aceptación de la fase mock: 0 campos obligatorios vacíos, valores dentro
// de catálogos permitidos, 0 inconsistencias lógicas.

import {
  DATA_QUALITIES, OPPORTUNITY_PRIORITIES, OPPORTUNITY_RISKS, OPPORTUNITY_STATUSES,
  type OpportunityReport,
} from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function validateReport(report: OpportunityReport): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(report.id)) errors.push("id vacío o inválido");
  if (!isNonEmptyString(report.symbol)) errors.push("symbol vacío o inválido");
  if (!isNonEmptyString(report.systemVersion)) errors.push("systemVersion vacío");
  if (!isNonEmptyString(report.strategyVersion)) errors.push("strategyVersion vacío");
  if (!isNonEmptyString(report.configVersion)) errors.push("configVersion vacío");
  if (!isNonEmptyString(report.decisionContractVersion)) errors.push("decisionContractVersion vacío");
  if (!isNonEmptyString(report.createdAt) || Number.isNaN(Date.parse(report.createdAt))) {
    errors.push("createdAt vacío o no es una fecha ISO válida");
  }

  if (!OPPORTUNITY_STATUSES.includes(report.status)) {
    errors.push(`status fuera de catálogo: ${String(report.status)}`);
  }
  if (!OPPORTUNITY_PRIORITIES.includes(report.priority)) {
    errors.push(`priority fuera de catálogo: ${String(report.priority)}`);
  }
  if (!OPPORTUNITY_RISKS.includes(report.risk)) {
    errors.push(`risk fuera de catálogo: ${String(report.risk)}`);
  }
  if (!DATA_QUALITIES.includes(report.dataQuality)) {
    errors.push(`dataQuality fuera de catálogo: ${String(report.dataQuality)}`);
  }

  if (report.confidence !== null && (report.confidence < 0 || report.confidence > 1)) {
    errors.push(`confidence fuera de rango 0.0-1.0: ${report.confidence}`);
  }

  if (report.historicalProbability !== null) {
    const { min, max, comparableCases } = report.historicalProbability;
    if (!(min <= max)) errors.push(`historicalProbability.min debe ser <= max (${min} > ${max})`);
    if (comparableCases <= 0) {
      errors.push(`historicalProbability.comparableCases debe ser > 0 (${comparableCases})`);
    }
  }

  if (!Array.isArray(report.razones) || report.razones.length < 3 || report.razones.length > 5) {
    errors.push(`razones debe tener entre 3 y 5 elementos (tiene ${report.razones?.length ?? 0})`);
  } else if (report.razones.some((r) => !isNonEmptyString(r))) {
    errors.push("razones contiene un elemento vacío");
  }

  if (!Array.isArray(report.invalidationConditions)) {
    errors.push("invalidationConditions debe ser una lista");
  } else if (report.invalidationConditions.some((c) => !isNonEmptyString(c))) {
    errors.push("invalidationConditions contiene un elemento vacío");
  }

  if (report.nextTrigger !== null && !isNonEmptyString(report.nextTrigger)) {
    errors.push("nextTrigger debe ser string no vacío o null");
  }

  // Inconsistencias lógicas explícitas de DECISION_CONTRACT.md — un fallo técnico nunca
  // se transforma silenciosamente en una decisión de trading (ARCHITECTURE.md, ley #10).
  if (report.status === "operar" && report.confidence === null) {
    errors.push("inconsistencia: status 'operar' sin confidence trazable");
  }
  if (report.status === "operar" && report.dataQuality === "baja") {
    errors.push("inconsistencia: status 'operar' con dataQuality 'baja' es inválido (DECISION_CONTRACT.md)");
  }

  return { valid: errors.length === 0, errors };
}
