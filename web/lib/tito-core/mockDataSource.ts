// get_data del flujo oficial (bitácora §6) — fase mock (§10): "no se conectaron APIs,
// datos de mercado reales, Robinhood, TradingView ni ningún broker". Esta es la ÚNICA
// fuente de datos permitida en esta fase; una fuente real implementaría la misma forma
// (Promise<MarketSnapshot>) sin que el resto del pipeline se entere del cambio.
//
// META es el escenario de referencia auditado (bitácora §13): fuerza
// `candleConfirmed = false` para comprobar que una oportunidad prometedora se queda en
// "esperar" mientras falte una condición crítica, en vez de colarse a "operar".

import type { ReportVersions } from "./types";
import type { MarketSnapshot } from "./marketSnapshot";

/** Versiones exactas de la corrida mock auditada el 2026-08-16 (bitácora §13). */
export const MOCK_VERSIONS: ReportVersions = {
  strategyVersion: "TM-STRATEGY-v0.1-MOCK",
  systemVersion: "TM-SYSTEM-v0.1-MOCK",
  configVersion: "TM-CONFIG-v0.1-MOCK",
  decisionContractVersion: "TM-DECISION-v1",
};

const NAMED_SCENARIOS: Record<string, Omit<MarketSnapshot, "symbol">> = {
  // Mismo escenario cualitativo que la referencia auditada de la bitácora (§13): alcista + LONG,
  // volumen/liquidez/régimen OK, vela sin confirmar → debe quedar en "esperar". La
  // confidence exacta (0.82 en la bitácora) no se reproduce bit a bit: ese número salió
  // de una corrida conceptual sin motor de métricas persistido; este commit calcula la
  // suya con una fórmula trazable propia (metricsEngine.ts), documentada y testeada.
  META: {
    direction: "LONG",
    trend: "alcista",
    volumeSufficient: true,
    liquidityAdequate: true,
    regimeValidated: true,
    patternDetected: true,
    candleConfirmed: false,
    volatilityInRange: true,
    blockingEvent: false,
    historicalProbability: { min: 65, max: 72, comparableCases: 18 },
    dataQuality: "alta",
  },
  // Todo aprobado, incluida la vela — debe resolver a "operar" (LONG alcista).
  GOOD: {
    direction: "LONG",
    trend: "alcista",
    volumeSufficient: true,
    liquidityAdequate: true,
    regimeValidated: true,
    patternDetected: true,
    candleConfirmed: true,
    volatilityInRange: true,
    blockingEvent: false,
    historicalProbability: { min: 70, max: 78, comparableCases: 22 },
    dataQuality: "alta",
  },
  // SHORT bajista — regla dura de tendencia VÁLIDA, pero todo lo demás requiere aprobación.
  SHORTGOOD: {
    direction: "SHORT",
    trend: "bajista",
    volumeSufficient: true,
    liquidityAdequate: true,
    regimeValidated: true,
    patternDetected: true,
    candleConfirmed: true,
    volatilityInRange: true,
    blockingEvent: false,
    historicalProbability: { min: 70, max: 78, comparableCases: 22 },
    dataQuality: "alta",
  },
  // Tendencia en contra para LONG (bajista vs LONG) — regla dura rota → "no operar".
  BADX: {
    direction: "LONG",
    trend: "bajista",
    volumeSufficient: true,
    liquidityAdequate: true,
    regimeValidated: true,
    patternDetected: true,
    candleConfirmed: true,
    volatilityInRange: true,
    blockingEvent: false,
    historicalProbability: null,
    dataQuality: "media",
  },
  // Señal de patrón ambigua → "revisar manualmente".
  MIXD: {
    direction: "LONG",
    trend: "alcista",
    volumeSufficient: true,
    liquidityAdequate: true,
    regimeValidated: true,
    patternDetected: null,
    candleConfirmed: true,
    volatilityInRange: true,
    blockingEvent: false,
    historicalProbability: null,
    dataQuality: "media",
  },
  // Datos incompletos → "revisar manualmente" por calidad de datos, sin importar reglas.
  LOWQ: {
    direction: "LONG",
    trend: "alcista",
    volumeSufficient: true,
    liquidityAdequate: true,
    regimeValidated: true,
    patternDetected: true,
    candleConfirmed: true,
    volatilityInRange: true,
    blockingEvent: false,
    historicalProbability: null,
    dataQuality: "baja",
  },
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Genera un snapshot determinista para cualquier símbolo sin escenario nombrado —
 * mismo símbolo siempre produce el mismo snapshot (bitácora §11, AC-08). Existe para
 * que el flujo corra sin excepciones sobre cualquier ticker (AC-02), no para simular
 * mercado real. S23a: dirección también determinista según hash.
 */
function proceduralSnapshot(symbol: string): Omit<MarketSnapshot, "symbol"> {
  const h = hashString(symbol);
  const direction = h % 2 === 0 ? ("LONG" as const) : ("SHORT" as const);
  const trend =
    direction === "LONG"
      ? h % 3 === 0 ? "bajista" : h % 3 === 1 ? "lateral" : "alcista"
      : h % 3 === 0 ? "alcista" : h % 3 === 1 ? "lateral" : "bajista";

  return {
    direction,
    trend,
    volumeSufficient: h % 5 !== 0,
    liquidityAdequate: h % 7 !== 0,
    regimeValidated: h % 4 !== 0,
    patternDetected: h % 11 === 0 ? null : h % 2 === 0,
    candleConfirmed: h % 2 === 0,
    volatilityInRange: h % 6 !== 0,
    blockingEvent: h % 13 === 0,
    historicalProbability:
      h % 3 === 0 ? null : { min: 40 + (h % 30), max: 55 + (h % 30), comparableCases: 5 + (h % 40) },
    dataQuality: h % 9 === 0 ? "baja" : h % 3 === 0 ? "media" : "alta",
  };
}

/** get_data — async a propósito: una fuente real reemplaza esto sin cambiar el pipeline. */
export async function getMockSnapshot(symbol: string): Promise<MarketSnapshot> {
  const clean = symbol.trim().toUpperCase();
  const base = NAMED_SCENARIOS[clean] ?? proceduralSnapshot(clean);
  return { symbol: clean, ...base };
}
