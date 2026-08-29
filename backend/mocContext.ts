/**
 * MOC Context — Market on Close / Closing Imbalance
 *
 * MOC/Imbalance como CONFIRMACIÓN cerca del cierre:
 * - NO ejecuta órdenes basadas en MOC
 * - SÍ mide dirección y magnitud del imbalance
 * - SÍ registra cambio desde open del cierre
 * - SÍ para confirmar decisiones de Tito Core cerca del cierre (15:50-16:00 ET)
 * - Documentado en reporte de Paper Trading
 *
 * MOC es data de la bolsa NYSE sobre órdenes acumuladas al cierre.
 * Útil para medir presión de compra/venta última hora.
 */

export interface MOCContext {
  timestamp: string;
  timeToClose: number; // Minutos hasta cierre (16:00 ET)
  buyImbalance: number; // Órdenes de compra neto acumuladas (en unidades)
  sellImbalance: number; // Órdenes de venta neto acumuladas (en unidades)
  netImbalance: number; // Compra - Venta (puede ser positivo o negativo)
  imbalanceDirection: "compra" | "venta" | "balance"; // Dirección dominante
  imbalanceMagnitude: "muy alta" | "alta" | "media" | "baja"; // Magnitud
  changeFromOpen: number; // Cambio de imbalance desde open del cierre
  confirmation: "alcista" | "neutral" | "bajista"; // Confirmación para decisiones
  disclaimer: string;
}

/**
 * Determina dirección del imbalance
 */
export function getImbalanceDirection(
  netImbalance: number
): "compra" | "venta" | "balance" {
  if (netImbalance > 50000) return "compra"; // Compra fuerte
  if (netImbalance < -50000) return "venta"; // Venta fuerte
  return "balance"; // Equilibrio
}

/**
 * Clasifica magnitud del imbalance
 */
export function classifyImbalanceMagnitude(
  netImbalance: number
): "muy alta" | "alta" | "media" | "baja" {
  const abs = Math.abs(netImbalance);
  if (abs > 200000) return "muy alta";
  if (abs > 100000) return "alta";
  if (abs > 50000) return "media";
  return "baja";
}

/**
 * Calcula confirmación basada en MOC
 * Típicamente usado en últimos 10 minutos del trading
 */
export function getMOCConfirmation(
  imbalanceDirection: "compra" | "venta" | "balance"
): "alcista" | "neutral" | "bajista" {
  switch (imbalanceDirection) {
    case "compra":
      return "alcista"; // Más órdenes de compra = presión alcista
    case "venta":
      return "bajista"; // Más órdenes de venta = presión bajista
    case "balance":
      return "neutral"; // Equilibrio = neutral
  }
}

/**
 * Crea contexto MOC para cada operación
 * Especialmente útil si operamos cerca del cierre (15:50-16:00 ET)
 */
export function createMOCContext(
  buyImbalance: number,
  sellImbalance: number,
  changeFromOpen: number = 0,
  timeToClose: number = 0 // Minutos hasta cierre (0 = en cierre)
): MOCContext {
  const netImbalance = buyImbalance - sellImbalance;
  const direction = getImbalanceDirection(netImbalance);
  const magnitude = classifyImbalanceMagnitude(netImbalance);
  const confirmation = getMOCConfirmation(direction);

  return {
    timestamp: new Date().toISOString(),
    timeToClose,
    buyImbalance,
    sellImbalance,
    netImbalance,
    imbalanceDirection: direction,
    imbalanceMagnitude: magnitude,
    changeFromOpen,
    confirmation,
    disclaimer:
      "⚠️ MOC es data de NYSE sobre órdenes acumuladas al cierre. Solo contexto de confirmación, nunca orden principal. Datos históricos pueden retrasarse.",
  };
}

/**
 * Valida decisión de Tito Core contra contexto MOC
 * Retorna: ¿la decisión es CONFIRMADA por MOC o CONTRADICE?
 */
export function validateDecisionWithMOC(
  titoDecision: "CALL" | "PUT" | "WAIT" | "NO TRADE",
  mocConfirmation: "alcista" | "neutral" | "bajista"
): {
  aligned: boolean;
  alignment: "confirmada" | "neutral" | "contradice";
  reason: string;
} {
  if (mocConfirmation === "neutral") {
    return {
      aligned: true,
      alignment: "neutral",
      reason: "MOC neutral: Tito Core toma decisión sin restricción",
    };
  }

  if (mocConfirmation === "alcista") {
    // MOC alcista = presión de compra = buen entorno para CALL
    if (titoDecision === "CALL") {
      return {
        aligned: true,
        alignment: "confirmada",
        reason: "✅ MOC alcista CONFIRMA CALL: más órdenes de compra acumuladas",
      };
    }
    if (titoDecision === "PUT") {
      return {
        aligned: false,
        alignment: "contradice",
        reason: "⚠️ MOC alcista CONTRADICE PUT: presión de compra es desfavorable",
      };
    }
  }

  if (mocConfirmation === "bajista") {
    // MOC bajista = presión de venta = buen entorno para PUT o defensivo
    if (titoDecision === "PUT" || titoDecision === "NO TRADE") {
      return {
        aligned: true,
        alignment: "confirmada",
        reason: "✅ MOC bajista CONFIRMA defensiva: más órdenes de venta acumuladas",
      };
    }
    if (titoDecision === "CALL") {
      return {
        aligned: false,
        alignment: "contradice",
        reason: "⚠️ MOC bajista CONTRADICE CALL: presión de venta es desfavorable",
      };
    }
  }

  return {
    aligned: true,
    alignment: "neutral",
    reason: "Evaluación neutral",
  };
}

/**
 * Interpreta cambio de imbalance durante el día
 */
export function interpretImbalanceChange(
  changeFromOpen: number
): string {
  if (changeFromOpen > 100000) {
    return "Imbalance de compra aumentó significativamente durante el día";
  }
  if (changeFromOpen < -100000) {
    return "Imbalance de venta aumentó significativamente durante el día";
  }
  if (changeFromOpen > 0) {
    return "Ligera tendencia hacia más órdenes de compra acumuladas";
  }
  if (changeFromOpen < 0) {
    return "Ligera tendencia hacia más órdenes de venta acumuladas";
  }
  return "Imbalance se mantuvo estable";
}

export default {
  getImbalanceDirection,
  classifyImbalanceMagnitude,
  getMOCConfirmation,
  createMOCContext,
  validateDecisionWithMOC,
  interpretImbalanceChange,
};
