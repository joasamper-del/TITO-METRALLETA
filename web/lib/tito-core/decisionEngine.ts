// Decision Engine — "deriva únicamente los cuatro estados oficiales + contexto enriquecido" (bitácora §7).
// No conoce símbolos, precios ni prioridades: solo mira resultados de reglas y calidad
// de datos. Orden de evaluación (mayor a menor severidad), fiel a la semántica de §4:
//
//   1. dataQuality "baja"         → datos incompletos FUERZAN revisión (principio §2).
//   2. una regla dura rota        → no cumple la estrategia → "no operar".
//   3. cualquier señal ambigua    → mixta / fuera de lo cubierto → "revisar manualmente".
//   4. falta la condición crítica → oportunidad en formación → "esperar".
//   5. todo lo demás aprobado     → "operar".
//
// Retorna DecisionDetails: estado + confianza + razones + factores de riesgo +
// condiciones de invalidación + stop loss / take profit + placeholder histórico.
// "Casi cumple" nunca es "operar": el paso 4 es la única salida hacia "esperar", y
// exige que TODAS las reglas duras ya hayan pasado.

import type { DataQuality, DecisionDetails, HistoricalProbability } from "./types";
import type { RuleResult } from "./ruleEngine";
import { HARD_RULE_CATEGORIES } from "./ruleEngine";

export function buildDecision(
  rules: RuleResult[],
  dataQuality: DataQuality,
  snapshot?: { spot?: number; iv?: number },
): DecisionDetails {
  const spot = snapshot?.spot ?? 0;
  const iv = snapshot?.iv ?? 0.2;

  // Evaluación secuencial de severidad
  if (dataQuality === "baja") {
    return {
      status: "revisar manualmente",
      confidence: 0,
      razones: [
        "La calidad de datos es baja — información incompleta o confiabilidad cuestionada.",
        "Los datos críticos no están disponibles o tienen inconsistencias.",
      ],
      riskFactors: [
        "Falta de datos de precio o volumen",
        "Chain de opciones incompleto",
        "Información de griegos no confiable",
      ],
      invalidationConditions: [
        "Cualquier actualización en la fuente que mejore la calidad de datos",
      ],
      stopLoss: null,
      takeProfit: null,
      historicalProbability: null,
    };
  }

  const hardRulesFailed = rules.filter(
    (r) => HARD_RULE_CATEGORIES.includes(r.category) && r.passed === false,
  );

  if (hardRulesFailed.length > 0) {
    const failedReasons = hardRulesFailed.map((r) => r.detail || r.category);
    return {
      status: "no operar",
      confidence: 5,
      razones: [
        `Se rompieron ${hardRulesFailed.length} regla(s) dura(s): ${failedReasons.join(", ")}`,
        "La estrategia no cumple los requisitos mínimos de riesgo/viabilidad.",
      ],
      riskFactors: [
        "Violación de regla dura de liquidez",
        "Violación de umbral de volatilidad",
        "Exposición de riesgo inaceptable",
      ],
      invalidationConditions: [
        "Esta condición es terminal — cambiaría solo si los datos o la estrategia se revisan.",
      ],
      stopLoss: null,
      takeProfit: null,
      historicalProbability: null,
    };
  }

  const ambiguousRules = rules.filter((r) => r.passed === null);

  if (ambiguousRules.length > 0) {
    const ambigReasons = ambiguousRules.map((r) => r.detail || r.category);
    return {
      status: "revisar manualmente",
      confidence: 25,
      razones: [
        `${ambiguousRules.length} regla(s) ambigua(s) o fuera del rango cubierto: ${ambigReasons.join(", ")}`,
        "El escenario está parcialmente dentro del modelo — requiere validación manual.",
      ],
      riskFactors: [
        "Condiciones atípicas no modeladas",
        "Señales contradictorias entre sub-agentes",
        "Falta de precedentes históricos comparables",
      ],
      invalidationConditions: [
        "Resolución de ambigüedad en favor de la estrategia",
        "Confirmación manual de condiciones especiales",
      ],
      stopLoss: null,
      takeProfit: null,
      historicalProbability: null,
    };
  }

  const candleRule = rules.find((r) => r.category === "candle");

  if (candleRule && candleRule.passed === false) {
    const passedRules = rules.filter((r) => r.passed === true).length;
    const totalRules = rules.length;
    const confidence = Math.round((passedRules / totalRules) * 70); // Máx 70% mientras espera

    return {
      status: "esperar",
      confidence,
      razones: [
        "La formación de vela/estructura crítica no está completa.",
        `${passedRules} de ${totalRules} condiciones ya se cumplen — oportunidad en formación.`,
        "Aguardar confirmación del patrón de precio antes de entrar.",
      ],
      riskFactors: [
        "Falta de confirmación de patrón",
        "Riesgo de ruptura falsa si entra prematuramente",
        "Liquidez podría cambiar antes de entrada confirmada",
      ],
      invalidationConditions: [
        "Cierre de vela con estructura confirmada",
        "Rompimiento de nivel soporte/resistencia crítico",
        "Cambio de volumen o IV que sugiera cambio de escenario",
      ],
      stopLoss: spot ? spot * (1 - 0.02) : null, // Piso técnico a -2%
      takeProfit: spot ? spot * (1 + 0.03 * Math.sqrt(iv)) : null, // Target inicial
      historicalProbability: null,
    };
  }

  // Todo pasó — "operar"
  const passedRules = rules.filter((r) => r.passed === true).length;
  const totalRules = rules.length;
  const confidence = Math.round((passedRules / totalRules) * 100);

  const allReasons = rules
    .filter((r) => r.passed === true)
    .map((r) => r.detail || r.category)
    .slice(0, 5); // Top 5

  return {
    status: "operar",
    confidence,
    razones: [
      `${passedRules} de ${totalRules} condiciones se cumplen.`,
      ...allReasons,
    ],
    riskFactors: [
      "Riesgo de liquidez: validar spread bid/ask antes de entrada",
      "Gap overnight: evaluar distancia a soportes",
      "Cambio de IV: monitorear antes de entrada",
    ],
    invalidationConditions: [
      "Caída por debajo de soporte de 4H",
      "Aumento súbito de IV >20% vs. baseline",
      "Volumen se colapsa a <50% del promedio",
    ],
    stopLoss: spot ? spot * (1 - 0.025) : null, // -2.5% operativo
    takeProfit: spot ? spot * (1 + 0.05 * Math.sqrt(iv)) : null, // Target dinámico
    historicalProbability: null, // Placeholder — llenar desde sub-agente 6
  };
}
