// Flujo oficial de análisis (WORKFLOW_AND_AUDIT.md):
//   initialize → get_data → evaluate_rules → calculate_metrics → build_decision →
//   build_report → validate_report → save_history → publish → UI
//
// "Si una etapa técnica falla, las siguientes no continúan. Un error de infraestructura
// se registra como error técnico; no se convierte en 'no operar'" — por eso
// validate_report lanza en vez de degradar silenciosamente a un status: un reporte que
// no cumple el contrato es un fallo técnico, no una oportunidad "no operar"
// (ARCHITECTURE.md, ley #10).
//
// `publish` en esta fase es simplemente devolver el reporte ya validado: es el ÚNICO
// objeto que la UI (fuera de este módulo) podría leer, y no lo recalcula.
//
// `id`/`createdAt` se generan aquí (no en reportBuilder) porque son los únicos datos no
// deterministas del pipeline — todo lo demás, dado el mismo snapshot, es puro.

import { randomUUID } from "crypto";
import { calculateMetrics } from "./metricsEngine";
import { buildDecision } from "./decisionEngine";
import { buildReport } from "./reportBuilder";
import { evaluateRules, type RuleResult } from "./ruleEngine";
import { validateReport, type ValidationResult } from "./validator";
import { getMockSnapshot, MOCK_VERSIONS } from "./mockDataSource";
import { saveHistory } from "./historyStore";
import type { OpportunityReport } from "./types";

export interface AnalysisResult {
  report: OpportunityReport;
  rules: RuleResult[];
  validation: ValidationResult;
}

export interface RunAnalysisOptions {
  /** Persistir en save_history. Default true; en tests unitarios se desactiva. */
  persist?: boolean;
  now?: Date;
}

export async function runAnalysis(
  symbolInput: string,
  opts: RunAnalysisOptions = {},
): Promise<AnalysisResult> {
  const persist = opts.persist ?? true;
  const now = opts.now ?? new Date();

  const symbol = symbolInput.trim().toUpperCase(); // initialize
  const snapshot = await getMockSnapshot(symbol); // get_data
  const rules = evaluateRules(snapshot); // evaluate_rules
  const metrics = calculateMetrics(snapshot, rules); // calculate_metrics
  const status = buildDecision(rules, metrics.dataQuality); // build_decision
  const report = buildReport(snapshot, rules, status, metrics, MOCK_VERSIONS, {
    id: randomUUID(),
    createdAt: now.toISOString(),
  }); // build_report
  const validation = validateReport(report); // validate_report

  if (!validation.valid) {
    throw new Error(
      `Tito Core: reporte inválido para ${symbol}: ${validation.errors.join("; ")}`,
    );
  }

  if (persist) await saveHistory(report); // save_history

  return { report, rules, validation }; // publish
}
