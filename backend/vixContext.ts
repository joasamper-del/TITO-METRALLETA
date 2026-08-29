/**
 * VIX Context — Indicador de volatilidad/régimen para Fase D
 *
 * VIX como CONFIRMACIÓN (no como señal principal):
 * - NO ejecuta órdenes basadas en VIX
 * - SÍ usa para validar régimen de volatilidad
 * - SÍ para confirmar decisiones SPY/QQQ de Tito Core
 * - Documentado en reporte de Paper Trading
 *
 * VIX es proxy de SPY volatility, NO índice oficial CBOE
 */

export interface VIXContext {
  value: number; // VIX actual
  regime: "baja" | "normal" | "media" | "alta"; // Clasificación
  trend: "bajista" | "lateral" | "alcista"; // Tendencia de volatilidad
  confirmation: "alcista" | "neutral" | "bajista"; // Confirmación para SPY/QQQ
  impact: string; // Cómo influye en decisiones
  disclaimer: string; // Aclaración: es proxy, no oficial
}

/**
 * Clasifica VIX en régimen
 */
export function classifyVIXRegime(vixValue: number): "baja" | "normal" | "media" | "alta" {
  if (vixValue < 12) return "baja";
  if (vixValue < 16) return "normal";
  if (vixValue < 25) return "media";
  return "alta";
}

/**
 * Determina tendencia de VIX
 */
export function getVIXTrend(current: number, previous: number): "bajista" | "lateral" | "alcista" {
  const change = ((current - previous) / previous) * 100;
  if (change < -2) return "bajista";
  if (change > 2) return "alcista";
  return "lateral";
}

/**
 * Calcula confirmación para SPY/QQQ
 * - VIX bajo → mercado tranquilo → confirma señales alcistas
 * - VIX alto → mercado volátil → requiere confirmación fuerte
 */
export function getVIXConfirmation(vixRegime: string): "alcista" | "neutral" | "bajista" {
  switch (vixRegime) {
    case "baja":
      return "alcista"; // Baja vol = entorno alcista
    case "normal":
      return "neutral"; // Vol normal = neutral
    case "media":
      return "neutral"; // Vol media = neutral/cauteloso
    case "alta":
      return "bajista"; // Alta vol = entorno bajista/defensivo
    default:
      return "neutral";
  }
}

/**
 * Crea contexto VIX para cada operación
 */
export function createVIXContext(
  vixValue: number,
  previousVIXValue: number = vixValue
): VIXContext {
  const regime = classifyVIXRegime(vixValue);
  const trend = getVIXTrend(vixValue, previousVIXValue);
  const confirmation = getVIXConfirmation(regime);

  const impactMap: Record<string, string> = {
    baja: "Volatilidad baja → entorno tranquilo, confirma señales alcistas de SPY/QQQ",
    normal: "Volatilidad normal → régimen neutral, decisiones por Tito Core sin ajuste",
    media: "Volatilidad media → mercado cauteloso, requiere confirmación adicional",
    alta: "Volatilidad alta → mercado estresado, prefiere defensivo (SPY puts, QQQ stops)",
  };

  return {
    value: vixValue,
    regime,
    trend,
    confirmation,
    impact: impactMap[regime] || "",
    disclaimer: "⚠️ VIX es proxy de volatilidad de SPY, NO índice oficial CBOE. Solo contexto, nunca orden principal.",
  };
}

/**
 * Valida decisión de Tito Core contra contexto VIX
 * Retorna: ¿la decisión es CONFIRMADA por VIX o CONTRADICE?
 */
export function validateDecisionWithVIX(
  titoDecision: "CALL" | "PUT" | "WAIT" | "NO TRADE",
  vixConfirmation: "alcista" | "neutral" | "bajista"
): {
  aligned: boolean;
  alignment: "confirmada" | "neutral" | "contradice";
  reason: string;
} {
  if (vixConfirmation === "neutral") {
    return {
      aligned: true,
      alignment: "neutral",
      reason: "VIX neutral: Tito Core toma decisión sin restricción",
    };
  }

  if (vixConfirmation === "alcista") {
    // VIX bajo = buen entorno para CALL
    if (titoDecision === "CALL") {
      return {
        aligned: true,
        alignment: "confirmada",
        reason: "✅ VIX bajo CONFIRMA CALL de Tito: volatilidad baja es favorable",
      };
    }
    if (titoDecision === "PUT") {
      return {
        aligned: false,
        alignment: "contradice",
        reason: "⚠️ VIX bajo CONTRADICE PUT: volatilidad baja favorece calls no puts",
      };
    }
  }

  if (vixConfirmation === "bajista") {
    // VIX alto = buen entorno para PUT o defensivo
    if (titoDecision === "PUT" || titoDecision === "NO TRADE") {
      return {
        aligned: true,
        alignment: "confirmada",
        reason: "✅ VIX alto CONFIRMA decisión defensiva: volatilidad alta requiere protección",
      };
    }
    if (titoDecision === "CALL") {
      return {
        aligned: false,
        alignment: "contradice",
        reason: "⚠️ VIX alto CONTRADICE CALL: volatilidad alta es desfavorable para alcistas",
      };
    }
  }

  return {
    aligned: true,
    alignment: "neutral",
    reason: "Evaluación neutral",
  };
}

export default {
  classifyVIXRegime,
  getVIXTrend,
  getVIXConfirmation,
  createVIXContext,
  validateDecisionWithVIX,
};
