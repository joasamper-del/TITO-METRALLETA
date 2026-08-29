// Rule Engine — "reglas pequeñas por tendencia, volumen, liquidez, régimen, patrón,
// vela, volatilidad y eventos" (bitácora §7). Cada regla es una función PURA e
// independiente: evaluate_rules solo las corre y junta los resultados, no decide nada
// (eso es trabajo del Decision Engine). `passed: null` representa una señal ambigua/mixta
// que el Decision Engine debe congelar como "revisar manualmente", no tratar como fallo.

import type { MarketSnapshot, RuleCategory } from "./marketSnapshot";

export interface RuleResult {
  id: string;
  category: RuleCategory;
  passed: boolean | null;
  detail: string;
}

type Rule = (s: MarketSnapshot) => RuleResult;

const trendRule: Rule = (s) => {
  const isValidTrend =
    (s.direction === "LONG" && s.trend === "alcista") ||
    (s.direction === "SHORT" && s.trend === "bajista");

  return {
    id: "trend-bidireccional",
    category: "trend",
    passed: isValidTrend,
    detail: isValidTrend
      ? `tendencia ${s.trend} válida para ${s.direction}`
      : `tendencia ${s.trend} inválida para ${s.direction}`,
  };
};

const volumeRule: Rule = (s) => ({
  id: "volumen-suficiente",
  category: "volume",
  passed: s.volumeSufficient,
  detail: s.volumeSufficient ? "volumen suficiente" : "volumen insuficiente",
});

const liquidityRule: Rule = (s) => ({
  id: "liquidez-adecuada",
  category: "liquidity",
  passed: s.liquidityAdequate,
  detail: s.liquidityAdequate ? "liquidez adecuada" : "liquidez insuficiente",
});

const regimeRule: Rule = (s) => ({
  id: "regimen-validado",
  category: "regime",
  passed: s.regimeValidated,
  detail: s.regimeValidated ? "régimen valida la estrategia" : "régimen no valida la estrategia",
});

const patternRule: Rule = (s) => ({
  id: "patron-detectado",
  category: "pattern",
  passed: s.patternDetected,
  detail:
    s.patternDetected === null
      ? "señal de patrón ambigua"
      : s.patternDetected
        ? "patrón detectado"
        : "patrón no detectado",
});

const candleRule: Rule = (s) => ({
  id: "vela-confirmacion",
  category: "candle",
  passed: s.candleConfirmed,
  detail: s.candleConfirmed ? "vela de confirmación cerrada" : "vela de confirmación pendiente",
});

const volatilityRule: Rule = (s) => ({
  id: "volatilidad-en-rango",
  category: "volatility",
  passed: s.volatilityInRange,
  detail: s.volatilityInRange ? "volatilidad en rango operable" : "volatilidad fuera de rango",
});

const eventsRule: Rule = (s) => ({
  id: "sin-eventos-bloqueantes",
  category: "events",
  passed: !s.blockingEvent,
  detail: s.blockingEvent ? "evento bloqueante próximo" : "sin eventos bloqueantes",
});

/** Categorías cuyo fallo explícito ("passed === false") rompe una regla dura. */
export const HARD_RULE_CATEGORIES: readonly RuleCategory[] = [
  "trend", "volume", "liquidity", "regime", "volatility", "events",
];

const ALL_RULES: Rule[] = [
  trendRule, volumeRule, liquidityRule, regimeRule,
  patternRule, candleRule, volatilityRule, eventsRule,
];

/** evaluate_rules del flujo oficial (bitácora §6). PURA — mismo snapshot, mismo resultado. */
export function evaluateRules(snapshot: MarketSnapshot): RuleResult[] {
  return ALL_RULES.map((rule) => rule(snapshot));
}
