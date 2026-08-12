// Conclusión Ejecutiva del módulo 0DTE.
//
// Sintetiza el flujo crudo (panorama, GEX, muros de volumen, escenarios y cierre)
// en UNA decisión accionable: COMPRAR · ESPERAR · NO OPERAR, con estrategia
// sugerida, el porqué, la invalidación y cuándo revisar. Es una función PURA:
// mismo `ZeroDteResult` → mismo veredicto, para que sea auditable y testeable.
//
// Regla del sistema: sin evidencia no hay número, sin número no hay conclusión.
// Si el flujo no da una tesis clara → `noTrade` = true ("HOY NO HAY TRADE").
// Nada de esto es consejo financiero; toda ejecución la hace el usuario.

import type { ZeroDteResult } from "./zerodte";

export type VerdictAction = "COMPRAR" | "ESPERAR" | "NO_OPERAR";
export type VerdictBias = "alcista" | "bajista" | "neutral";
export type VerdictConfidence = "alta" | "media" | "baja";

export interface VerdictScenario {
  kind: "bull" | "base" | "bear" | string;
  label: string;
  target: number;
  changePct: number;
  probTouch: number;
  reason: string;
}

export interface Verdict {
  /** Franja de acción: verde COMPRAR · ámbar ESPERAR · gris NO OPERAR. */
  action: VerdictAction;
  actionLabel: string;
  /** Sesgo direccional del flujo (separado de la confianza). */
  bias: VerdictBias;
  confidence: VerdictConfidence;
  /** Baja 20-40 · Media 45-65 · Alta 70-90 (spec). */
  confidencePct: number;
  /** Estrategia concreta sugerida (qué haría un operador con esta lectura). */
  strategy: string;
  /** El porqué en 1-2 líneas: dónde pega el dinero / régimen de gamma. */
  reason: string;
  /** Dónde muere la tesis → salir. */
  invalidation: string;
  /** Cuándo volver a mirar. */
  reviewWhen: string;
  /** Objetivo SIEMPRE como rango, nunca un precio único (regla visual #1). */
  targetRange: [number, number] | null;
  /** Supuestos declarados del cálculo (IV / 1σ), para etiquetar el número. */
  assumptions: string | null;
  levels: {
    magnet: number | null; // imán del GEX
    resistance: number | null; // muro MAX CALL
    support: number | null; // muro MAX PUT
    flip: number | null; // zona de inversión de gamma
  };
  scenarios: VerdictScenario[];
  /** true → escribir "HOY NO HAY TRADE" con el motivo. */
  noTrade: boolean;
}

/** Formatea un nivel de precio con hasta 2 decimales, sin ceros de relleno. */
function lvl(n: number | null | undefined): string {
  if (n == null) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

export function buildVerdict(d: ZeroDteResult): Verdict {
  const o = d.outlook;
  const gex = d.gex;
  const sum = d.summary;
  const fc = d.forecast;
  const cl = d.closing;
  const spot = d.spot;

  const levels = {
    magnet: gex.kingStrike,
    resistance: sum.maxCallStrike,
    support: sum.maxPutStrike,
    flip: gex.flipStrike,
  };

  const scenarios: VerdictScenario[] = (fc?.scenarios ?? []).map((s) => ({
    kind: s.kind,
    label: s.kind === "bull" ? "Alcista" : s.kind === "bear" ? "Bajista" : "Base",
    target: s.target,
    changePct: s.changePct,
    probTouch: s.probTouch,
    reason: s.reason,
  }));

  const assumptions =
    fc != null
      ? `Escenarios sobre IV ${(fc.iv * 100).toFixed(1)}% · 1σ = ±${fc.sigma.toFixed(1)} pts (${fc.sigmaPct.toFixed(2)}%) a ${fc.hoursToClose.toFixed(1)} h del cierre.`
      : null;

  // Vista a futuro o sin datos → no hay veredicto 0DTE (el intradía solo existe hoy).
  if (!d.isToday || !o || spot == null) {
    return {
      action: "NO_OPERAR",
      actionLabel: "NO OPERAR",
      bias: "neutral",
      confidence: "baja",
      confidencePct: 25,
      strategy:
        "El veredicto 0DTE solo aplica al vencimiento de hoy. Cambia a «Hoy» para evaluar un trade.",
      reason: !d.isToday
        ? "Estás viendo un vencimiento futuro; el panorama intradía, el agresor y los escenarios al cierre solo existen para el 0DTE de hoy."
        : "No llegó el spot ni el panorama de opciones: sin datos no hay tesis.",
      invalidation: "—",
      reviewWhen: "Al abrir la cadena del vencimiento de hoy.",
      targetRange: null,
      assumptions,
      levels,
      scenarios,
      noTrade: true,
    };
  }

  const bias: VerdictBias =
    o.lean === "alcista" ? "alcista" : o.lean === "bajista" ? "bajista" : "neutral";
  const anchored = gex.regime === "positive" && levels.magnet != null;

  // Confianza, honesta y separada del sesgo. El panorama solo emite baja|media;
  // cerca del cierre con anclaje fuerte, el pin puede subir a alta.
  let confidence: VerdictConfidence = o.confidence === "media" ? "media" : "baja";
  if (cl?.phase === "live" && cl.confidence === "alta" && bias !== "neutral") {
    confidence = "alta";
  }
  const confidencePct = confidence === "alta" ? 75 : confidence === "media" ? 58 : 35;

  // Objetivo como RANGO: base ↔ escenario direccional; si faltan, el rango 5-min.
  const base = scenarios.find((s) => s.kind === "base")?.target ?? null;
  const dirTarget =
    scenarios.find((s) => s.kind === (bias === "alcista" ? "bull" : "bear"))?.target ?? null;
  const targetRange: [number, number] | null =
    base != null && dirTarget != null
      ? [Math.min(base, dirTarget), Math.max(base, dirTarget)]
      : [o.rangeLow, o.rangeHigh];

  // Nivel de invalidación: el flip de gamma manda; si no hay, el muro opuesto.
  const invalLevel =
    bias === "alcista"
      ? levels.flip ?? levels.support
      : bias === "bajista"
        ? levels.flip ?? levels.resistance
        : levels.flip;
  const invalIsFlip = invalLevel != null && invalLevel === levels.flip;

  let action: VerdictAction;
  let actionLabel: string;
  let strategy: string;
  let noTrade = false;

  if (bias === "neutral") {
    // Sesgo neutral → NO OPERAR siempre (sin dirección clara no hay trade
    // direccional 0DTE). El motivo cambia según el régimen de gamma.
    action = "NO_OPERAR";
    actionLabel = "NO OPERAR";
    noTrade = true;
    const ruptura = levels.flip != null ? `el flip ${lvl(levels.flip)}` : "un extremo del rango";
    strategy = anchored
      ? `Mercado anclado al imán ${lvl(levels.magnet)} por gamma positiva: sin dirección clara para un 0DTE direccional. Hoy no hay compra de calls/puts; si acaso, estructuras neutrales (no direccionales).`
      : `Gamma negativa y sin dirección definida: el precio puede acelerar si rompe ${ruptura}, pero hoy no hay sesgo para operar. Vigilar esa ruptura; entrar solo si aparece dirección clara.`;
  } else {
    const upside = bias === "alcista";
    if (confidence === "baja") {
      action = "ESPERAR";
      actionLabel = "ESPERAR";
      strategy = `Sesgo ${bias} pero confianza baja: esperar confirmación. Gatillo: que ${
        upside
          ? `reclame el imán ${lvl(levels.magnet)} o rompa la resistencia ${lvl(levels.resistance)}`
          : `pierda el imán ${lvl(levels.magnet)} o rompa el soporte ${lvl(levels.support)}`
      }. Sin eso, no entrar.`;
    } else {
      action = "COMPRAR";
      actionLabel = upside ? "COMPRAR CALLS" : "COMPRAR PUTS";
      const strike = upside ? levels.resistance ?? levels.magnet : levels.support ?? levels.magnet;
      const rango = targetRange ? `${lvl(targetRange[0])}–${lvl(targetRange[1])}` : "—";
      strategy = `Comprar ${upside ? "CALLs" : "PUTs"} 0DTE cerca de ${lvl(strike)} (ligeramente OTM). Objetivo: rango ${rango}. Invalidación: ${lvl(invalLevel)}. Tamaño pequeño y salida rápida — 0DTE decae por theta hacia el cierre.`;
    }
  }

  const reason = o.detail || o.headline;
  const invalidation =
    invalLevel != null
      ? `${bias === "bajista" ? "Por encima de" : bias === "alcista" ? "Por debajo de" : "Al cruzar"} ${lvl(invalLevel)} (${invalIsFlip ? "flip de gamma" : "muro opuesto"}) la tesis muere → salir.`
      : "Si el precio sale del rango proyectado, salir.";
  const reviewWhen =
    cl?.phase === "live"
      ? `Hacia el cierre 4:00pm ET (faltan ~${cl.minutesLeft.toFixed(0)} min); la vista se refresca sola cada minuto.`
      : "En la próxima actualización (cada minuto) o si rompe un nivel clave.";

  return {
    action,
    actionLabel,
    bias,
    confidence,
    confidencePct,
    strategy,
    reason,
    invalidation,
    reviewWhen,
    targetRange,
    assumptions,
    levels,
    scenarios,
    noTrade,
  };
}
