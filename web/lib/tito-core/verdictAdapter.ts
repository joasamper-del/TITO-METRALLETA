// Adaptador hacia lib/verdict.ts — NO lo modifica, solo lee sus tipos (import de solo
// lectura). Existe para el día en que tito-core necesite alimentar una vista real; hoy
// no lo consume ninguna pantalla.
//
// Dos limitaciones reales del contrato, documentadas aquí en vez de resueltas con un
// valor inventado:
//
// 1. `VerdictSource` en verdict.ts es un catálogo cerrado ("0dte" | "ticker" | "wheel")
//    que no incluye a tito-core. Ampliarlo sería tocar verdict.ts, que se dejó
//    explícitamente intacto en esta fase. Por eso este adaptador devuelve su propio tipo
//    (OpportunityVerdict), con la misma forma que UnifiedVerdict salvo `source`. Cuando
//    se decida cablear esto a una vista real, ese es el momento de ampliar VerdictSource.
//
// 2. OpportunityReport (el contrato oficial del bundle) no modela dirección en absoluto
//    — es "operar/esperar/no operar/revisar manualmente", no "alcista/bajista". Por eso
//    `bias` es siempre "neutral" aquí; no es un placeholder silencioso, es lo único que
//    el contrato permite afirmar con evidencia.

import type { TradeAction, TradeBias } from "../verdict";
import type { OpportunityReport } from "./types";

export interface OpportunityVerdict {
  action: TradeAction;
  /** Siempre "neutral" — OpportunityReport no modela dirección (ver nota arriba). */
  bias: TradeBias;
  confidencePct: number;
  label: string;
  source: "tito-core";
}

/**
 * Colapsa los 4 estados oficiales a los 3 de TradeAction, siguiendo la misma regla que
 * ya usa verdict.ts en el resto de la app: "sesgo neutral o datos no fiables → NO OPERAR".
 * "revisar manualmente" no es un fallo de datos, pero tampoco es una luz verde para
 * operar — cae en el mismo bucket que "no operar" por la razón que da la propia
 * bitácora: "nunca pasa automáticamente a operar".
 */
function toAction(status: OpportunityReport["status"]): TradeAction {
  if (status === "operar") return "COMPRAR";
  if (status === "esperar") return "ESPERAR";
  return "NO_OPERAR"; // "no operar" y "revisar manualmente"
}

function toLabel(action: TradeAction): string {
  if (action === "COMPRAR") return "OPERAR"; // sin flecha: bias siempre neutral, no hay dirección que mostrar
  if (action === "ESPERAR") return "ESPERAR";
  return "NO OP.";
}

export function fromOpportunityReport(report: OpportunityReport): OpportunityVerdict {
  const action = toAction(report.status);
  return {
    action,
    bias: "neutral",
    confidencePct: report.confidence !== null ? Math.round(report.confidence * 100) : 0,
    label: toLabel(action),
    source: "tito-core",
  };
}
