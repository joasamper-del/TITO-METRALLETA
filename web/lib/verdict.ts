// Veredicto unificado de toda la app.
//
// Cada módulo produce su decisión con SU propia señal (0DTE → buildVerdict
// intradía; Ticker → ProPrediction multi-día; Wheel → su score), pero todos la
// expresan en el MISMO lenguaje: COMPRAR · ESPERAR · NO OPERAR. Así el estado
// "NO OPERAR" se ve y se comporta igual en cualquier pantalla, y un solo gate
// (`canPrepareTrade`) decide si la app puede ofrecer preparar la operación.
//
// Regla transversal (igual que en 0DTE): sesgo neutral o datos no fiables →
// NO OPERAR. Solo COMPRAR habilita preparar un trade.

import type { Verdict } from "./zerodteVerdict";
import type { ProPrediction } from "./prediction";

export type TradeAction = "COMPRAR" | "ESPERAR" | "NO_OPERAR";
export type TradeBias = "alcista" | "bajista" | "neutral";
export type VerdictSource = "0dte" | "ticker" | "wheel";

export interface UnifiedVerdict {
  action: TradeAction;
  bias: TradeBias;
  /** 0-100, separado del sesgo. */
  confidencePct: number;
  /** Etiqueta corta para el badge: "CALLS", "PUTS", "OPERAR ▲", "ESPERAR", "NO OP.". */
  label: string;
  /** Módulo/horizonte de origen — un 0DTE no es lo mismo que una tesis multi-día. */
  source: VerdictSource;
}

/**
 * Gate duro de la Fase 2: SOLO un COMPRAR habilita preparar una operación.
 * NO OPERAR y ESPERAR nunca ofrecen preparar el trade. Fuente única de verdad
 * para toda la app — cualquier botón de "preparar operación" pregunta por aquí.
 */
export function canPrepareTrade(v: { action: TradeAction }): boolean {
  return v.action === "COMPRAR";
}

/** Adapta el veredicto 0DTE (buildVerdict) al modelo unificado. */
export function fromZeroDte(v: Verdict): UnifiedVerdict {
  return {
    action: v.action,
    bias: v.bias,
    confidencePct: v.confidencePct,
    label:
      v.action === "COMPRAR"
        ? v.bias === "alcista"
          ? "CALLS"
          : "PUTS"
        : v.action === "ESPERAR"
          ? "ESPERAR"
          : "NO OP.",
    source: "0dte",
  };
}

/**
 * Adapta la predicción multi-día de la vista Ticker al modelo unificado.
 * - `caveat` (liquidez no fiable) o dirección `flat` → NO OPERAR (neutral).
 * - Direccional con confianza ≥50 → COMPRAR; con confianza <50 → ESPERAR.
 * El "operar" aquí es multi-día sobre el subyacente, no un 0DTE — de ahí `source`.
 */
export function fromPrediction(p: ProPrediction | null): UnifiedVerdict {
  if (!p || p.caveat || p.direction === "flat") {
    return {
      action: "NO_OPERAR",
      bias: "neutral",
      confidencePct: p?.confidence ?? 0,
      label: "NO OPERAR",
      source: "ticker",
    };
  }
  const bias: TradeBias = p.direction === "up" ? "alcista" : "bajista";
  const action: TradeAction = p.confidence >= 50 ? "COMPRAR" : "ESPERAR";
  return {
    action,
    bias,
    confidencePct: p.confidence,
    label: action === "COMPRAR" ? (bias === "alcista" ? "OPERAR ▲" : "OPERAR ▼") : "ESPERAR",
    source: "ticker",
  };
}

/**
 * Adapta un candidato de la Wheel (venta de cash-secured put) al modelo unificado.
 * - `blocked` (ilíquido) o sin score → NO OPERAR.
 * - score ≥70 → COMPRAR (vender el put); 50-69 → ESPERAR; <50 → NO OPERAR.
 * El "operar" aquí es VENDER un put (estrategia de ingreso, sesgo alcista/neutral),
 * por eso la etiqueta es "VENDER PUT", no "CALLS/PUTS".
 */
export function fromWheel(scoreTotal: number | null, blocked = false): UnifiedVerdict {
  if (blocked || scoreTotal == null) {
    return { action: "NO_OPERAR", bias: "neutral", confidencePct: scoreTotal ?? 0, label: "NO OP.", source: "wheel" };
  }
  const action: TradeAction = scoreTotal >= 70 ? "COMPRAR" : scoreTotal >= 50 ? "ESPERAR" : "NO_OPERAR";
  const bias: TradeBias = action === "NO_OPERAR" ? "neutral" : "alcista";
  const label = action === "COMPRAR" ? "VENDER PUT" : action === "ESPERAR" ? "ESPERAR" : "NO OP.";
  return { action, bias, confidencePct: scoreTotal, label, source: "wheel" };
}
