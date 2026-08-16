// Explanation Engine — "explica qué encontró, por qué decidió, reglas clave y qué haría
// cambiar la decisión" (bitácora §7). Traduce resultados de reglas ya calculados a las
// tres piezas explicables del contrato: razones (3-5), condiciones de invalidación y
// próximo disparador. No re-evalúa nada — solo redacta lo que Rule/Decision Engine
// ya decidieron, así la explicación nunca puede contradecir al reporte.

import type { OpportunityStatus } from "./types";
import type { RuleResult } from "./ruleEngine";
import { HARD_RULE_CATEGORIES } from "./ruleEngine";

const INVALIDATION_BY_CATEGORY: Record<string, string> = {
  trend: "la tendencia deja de ser alcista",
  volume: "el volumen cae por debajo del umbral",
  liquidity: "la liquidez se vuelve insuficiente",
  regime: "el régimen deja de validar la estrategia",
  volatility: "la volatilidad sale del rango operable",
  events: "aparece un evento bloqueante (ej. earnings, halt)",
};

/** 3-5 factores a favor y en contra — el contrato exige ese rango exacto (bitácora §3). */
export function explainReasons(rules: RuleResult[]): string[] {
  const favor = rules.filter((r) => r.passed === true).map((r) => r.detail);
  const enContra = rules.filter((r) => r.passed !== true).map((r) => r.detail);
  const ordered = [...enContra, ...favor];
  if (ordered.length >= 3) return ordered.slice(0, 5);
  // Con menos de 3 reglas evaluables (no ocurre con las 8 fijas de hoy, pero el
  // contrato exige el mínimo) se completa con lo que quede sin repetir.
  return [...ordered, ...rules.map((r) => r.detail)].slice(0, Math.max(3, ordered.length));
}

/** Condiciones específicas y observables que invalidarían la oportunidad (bitácora §3). */
export function explainInvalidationConditions(rules: RuleResult[]): string[] {
  const conditions = rules
    .filter((r) => HARD_RULE_CATEGORIES.includes(r.category) && r.passed === true)
    .map((r) => INVALIDATION_BY_CATEGORY[r.category])
    .filter((c): c is string => Boolean(c));
  const candle = rules.find((r) => r.category === "candle");
  if (candle && candle.passed === false) {
    conditions.push("la vela de confirmación cierra en contra de la tendencia");
  }
  return conditions;
}

/** Próximo evento que justifica reevaluar; null si la decisión ya está resuelta. */
export function explainNextTrigger(status: OpportunityStatus, rules: RuleResult[]): string | null {
  if (status === "esperar") {
    const candle = rules.find((r) => r.category === "candle");
    if (candle && candle.passed === false) return "proximo cierre de vela";
    return "confirmación de la condición pendiente";
  }
  if (status === "revisar manualmente") return "aclaración de la señal ambigua";
  return null;
}
