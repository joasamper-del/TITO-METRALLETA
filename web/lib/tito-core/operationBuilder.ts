/**
 * Operation Builder — Salida simple y accionable para el trader
 *
 * Convierte DecisionDetails + SpecialistsAnalysis en:
 *   • call / put / no operar (acción)
 *   • confianza (0-100)
 *   • razones (por qué)
 *   • nivel de entrada (precio recomendado)
 *   • stop loss
 *   • invalidación (qué rompe la tesis)
 *
 * Objetivo: una línea clara que un trader puede actuar EN TIEMPO REAL.
 */

import type { DecisionDetails } from "./types";
import type { SpecialistsAnalysis } from "./specialistsEngine";

export interface Operation {
  action: "call" | "put" | "no operar"; // acción ejecutable
  confidence: number; // 0-100
  razones: string[]; // top 3 por qué
  entryPrice: number | null; // precio sugerido
  stopLoss: number; // precio crítico
  takeProfit: number; // objetivo
  invalidation: string; // qué rompe la tesis (1 línea)
  horizon: number; // días hasta vencimiento sugerido
  riskRewardRatio: number | null; // T/P : S/L
}

/**
 * Construye operación accionable
 * Inputs:
 *   - decision: análisis del Decision Engine (status, confianza, S/L-T/P)
 *   - specialists: análisis de 4 especialistas (recomendación)
 *   - currentPrice: precio spot actual
 *   - dte: días a vencimiento
 */
export function buildOperation(
  decision: DecisionDetails,
  specialists: SpecialistsAnalysis,
  currentPrice: number,
  dte: number = 30,
): Operation {
  // Si está vetado o no operar, devuelve operación vacía
  if (specialists.vetoed || specialists.recommendation === "no operar") {
    return {
      action: "no operar",
      confidence: 0,
      razones: [
        "Evaluador de veto bloqueó la operación",
        ...specialists.devilsAdvocate.reasoning.slice(0, 2),
      ],
      entryPrice: null,
      stopLoss: currentPrice * 0.98, // piso técnico
      takeProfit: currentPrice * 1.02,
      invalidation: "Condiciones de riesgo críticas detectadas",
      horizon: dte,
      riskRewardRatio: null,
    };
  }

  // Combina confianza de Decision Engine + Specialists
  const engineConfidence = decision.confidence;
  const specialistsConfidence = specialists.overallScore;
  const finalConfidence = (engineConfidence * 0.4 + specialistsConfidence * 0.6);

  // Calcula entrada y objetivos dinámicamente
  const spread = currentPrice * 0.005; // 0.5% spread inicial
  const entryPrice = specialists.recommendation === "call"
    ? currentPrice + spread
    : currentPrice - spread;

  const stopLoss = decision.stopLoss ?? (currentPrice * 0.975);
  const takeProfit = decision.takeProfit ?? (currentPrice * 1.05);

  const riskPercentage = Math.abs(stopLoss - entryPrice) / entryPrice;
  const rewardPercentage = Math.abs(takeProfit - entryPrice) / entryPrice;
  const rrRatio = rewardPercentage / riskPercentage;

  // Razones: top 3 del Decision Engine + 1 del especialista más positivo
  const topReasons = decision.razones.slice(0, 2);
  const specialistBoost = specialists.tape.score > 75
    ? `Tape muy positivo (${specialists.tape.score}%)`
    : specialists.gex.score > 75
      ? `GEX concentrado (${specialists.gex.score}%)`
      : null;

  if (specialistBoost) {
    topReasons.push(specialistBoost);
  }

  // Invalidación: combina línea crítica de Decision Engine + Devil's Advocate
  const invalidationKey = decision.invalidationConditions[0] || "Ruptura de soporte crítico";
  const devilAlert = specialists.devilsAdvocate.reasoning
    .find((r) => r.includes("⚠️") || r.includes("🛑")) || null;

  const invalidation = devilAlert
    ? `${invalidationKey} | ${devilAlert}`
    : invalidationKey;

  return {
    action: specialists.recommendation,
    confidence: Math.round(finalConfidence),
    razones: topReasons,
    entryPrice: Math.round(entryPrice * 100) / 100,
    stopLoss: Math.round(stopLoss * 100) / 100,
    takeProfit: Math.round(takeProfit * 100) / 100,
    invalidation: invalidation.substring(0, 100), // cap para legibilidad
    horizon: dte,
    riskRewardRatio: Math.round(rrRatio * 100) / 100,
  };
}

/**
 * Formatea operación para display en UI
 */
export function formatOperation(op: Operation): string {
  if (op.action === "no operar") {
    return `❌ NO OPERAR (confianza: ${op.confidence}%)`;
  }

  const symbol = op.action === "call" ? "📈 CALL" : "📉 PUT";
  const confidence = `${op.confidence}%`;
  const entry = op.entryPrice ? `Entrada: $${op.entryPrice}` : "Entrada: spot";
  const sl = `S/L: $${op.stopLoss}`;
  const tp = `T/P: $${op.takeProfit}`;
  const rr = op.riskRewardRatio ? ` (R:R ${op.riskRewardRatio}:1)` : "";

  return `${symbol} (${confidence}) | ${entry} | ${sl} | ${tp}${rr}`;
}

/**
 * Validación de operación — verifica que sea lógicamente consistente
 */
export function validateOperation(op: Operation): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (op.action === "no operar") {
    return { valid: true, errors: [] }; // siempre válido
  }

  // S/L siempre debe estar "en contra" de la dirección
  if (op.action === "call" && op.stopLoss > op.entryPrice!) {
    errors.push("S/L debe ser DEBAJO de entrada en CALL");
  }
  if (op.action === "put" && op.stopLoss < op.entryPrice!) {
    errors.push("S/L debe ser ENCIMA de entrada en PUT");
  }

  // T/P siempre debe estar "a favor"
  if (op.action === "call" && op.takeProfit <= op.entryPrice!) {
    errors.push("T/P debe ser ARRIBA de entrada en CALL");
  }
  if (op.action === "put" && op.takeProfit >= op.entryPrice!) {
    errors.push("T/P debe ser ABAJO de entrada en PUT");
  }

  // Ratio riesgo/recompensa debe ser razonable
  if (op.riskRewardRatio !== null && op.riskRewardRatio < 0.5) {
    errors.push("R:R muy bajo (< 0.5) — validar manualmente");
  }

  // Confianza debe ser >50 para operar
  if (op.confidence < 50) {
    errors.push("Confianza < 50% — considerar no operar");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
