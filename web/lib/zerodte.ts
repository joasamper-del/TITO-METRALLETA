// ============================================================================
// Agente 0DTE — cadena del vencimiento del día, ordenada por volumen.
// Ver Agente Principal/Proceso 0DTE.md.
//
// Reutiliza `parseSchwabChain` (pura) y `toRow` del proyecto; lo único propio
// es pedir UNA sola fecha de vencimiento y quedarse con los strikes de mayor
// volumen de cada lado.
// ============================================================================

import { toRow } from "./compute";
import { expectedMove, probTouch } from "./expectedMove";
import { bsCharm, bsVanna, chainIV, MAX_SANE_IV } from "./gex";
import { marketDateStr } from "./occ";
import { authedGet, parseSchwabChain, SchwabError, type SchwabChainResponse } from "./schwab";
import type { ContractType, Row } from "./types";
import { loadFlow, overlayRealtime } from "./zerodteFlow";

const API_BASE =
  process.env.SCHWAB_API_BASE ?? "https://api.schwabapi.com/marketdata/v1";

/** Cuántos strikes se toman de cada lado. */
export const TOP_N = 10;

/**
 * Símbolo que espera Schwab. SPX es un índice y necesita el prefijo `$`:
 * pedir `SPX` a secas responde 400 Bad Request.
 */
export function toSchwabSymbol(ticker: string): string {
  const t = ticker.trim().toUpperCase();
  if (!t) return "";
  const INDEX = new Set(["SPX", "NDX", "RUT", "VIX", "DJX"]);
  return INDEX.has(t) ? `$${t}` : t;
}

/**
 * Fecha de HOY en hora de Nueva York, formato YYYY-MM-DD.
 *
 * No se puede derivar de UTC: a partir de las 8:00 PM ET la fecha UTC ya es la
 * del día siguiente, y "el vencimiento de hoy" es la premisa de este agente.
 * PURA: recibe el instante.
 */
export function etDate(now: Date = new Date()): string {
  return marketDateStr(now);
}

/**
 * Fechas de vencimiento seleccionables: hoy + los próximos `count` días hábiles
 * (salta sábados y domingos). PURA. SPY/QQQ/SPX tienen vencimiento cada día de
 * mercado; si un día resultara feriado, Schwab devolverá cadena vacía y la UI lo
 * marca. No cubre feriados porque no hay calendario local — es aceptable.
 */
export function expirationDates(now: Date = new Date(), count = 3): string[] {
  const out = [etDate(now)];
  // Se avanza sobre el instante en UTC pero la fecha se lee siempre en ET.
  const cursor = new Date(now.getTime());
  while (out.length <= count) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const wd = new Date(`${marketDateStr(cursor)}T12:00:00Z`).getUTCDay(); // 0=dom, 6=sab
    if (wd === 0 || wd === 6) continue;
    out.push(marketDateStr(cursor));
  }
  return out;
}

/** Los N strikes con mayor volumen de un lado. PURA. */
export function topByVolume(rows: Row[], type: ContractType, n: number = TOP_N): Row[] {
  return rows
    .filter((r) => r.contractType === type)
    .sort((a, b) => b.volume - a.volume || Math.abs(a.strike) - Math.abs(b.strike))
    .slice(0, n);
}

/** Una fila de la tabla: el strike con su lado call y su lado put. */
export interface ChainLine {
  strike: number;
  call: Row | null;
  put: Row | null;
  /** Por qué entró el strike: por el ranking de calls, el de puts, o ambos. */
  from: "call" | "put" | "both";
}

/**
 * Construye la tabla con forma de option chain. PURA.
 *
 * Los dos rankings son independientes, así que la unión puede dar hasta 2N
 * strikes. El lado que no clasificó se rellena desde la cadena completa: que un
 * strike entrara por sus puts no debe dejar su columna de calls en blanco.
 */
export function buildChainTable(all: Row[], n: number = TOP_N): ChainLine[] {
  const topCalls = topByVolume(all, "call", n);
  const topPuts = topByVolume(all, "put", n);

  const callRank = new Set(topCalls.map((r) => r.strike));
  const putRank = new Set(topPuts.map((r) => r.strike));

  const byStrike = new Map<number, { call: Row | null; put: Row | null }>();
  for (const r of all) {
    if (!callRank.has(r.strike) && !putRank.has(r.strike)) continue;
    let e = byStrike.get(r.strike);
    if (!e) { e = { call: null, put: null }; byStrike.set(r.strike, e); }
    if (r.contractType === "call") e.call = r;
    else e.put = r;
  }

  return [...byStrike.entries()]
    .map(([strike, e]) => ({
      strike,
      call: e.call,
      put: e.put,
      from: (callRank.has(strike) && putRank.has(strike)
        ? "both"
        : callRank.has(strike)
          ? "call"
          : "put") as ChainLine["from"],
    }))
    // De mayor a menor: los strikes altos arriba, como se lee un gráfico de
    // precio. El orden es por strike, NO por volumen, para que siga leyéndose
    // como una cadena de verdad.
    .sort((a, b) => b.strike - a.strike);
}

/**
 * Lo que el VOLUMEN por sí solo permite afirmar. Deliberadamente corto.
 *
 * No incluye dirección: el volumen dice dónde hay actividad, no de qué lado.
 * Un strike con volumen enorme es una apuesta alcista si esos calls se
 * compraron y un muro de resistencia si se vendieron, y eso solo lo distingue
 * el agresor (ask vs bid), que esta fuente no entrega. Ver Proceso 0DTE §6.3.
 */
export interface ChainSummary {
  /** Strike con más volumen de calls de toda la cadena. */
  maxCallStrike: number | null;
  maxCallVolume: number;
  /** Strike con más volumen de puts de toda la cadena. */
  maxPutStrike: number | null;
  maxPutVolume: number;
  /** Totales de TODA la cadena, no solo de los strikes mostrados. */
  callVolume: number;
  putVolume: number;
  /** putVolume / callVolume. null si no hay volumen de calls. */
  putCallRatio: number | null;
}

/** Resumen de la cadena. PURA. */
export function summarize(all: Row[]): ChainSummary {
  let maxCall: Row | null = null;
  let maxPut: Row | null = null;
  let callVolume = 0;
  let putVolume = 0;

  for (const r of all) {
    if (r.contractType === "call") {
      callVolume += r.volume;
      if (!maxCall || r.volume > maxCall.volume) maxCall = r;
    } else {
      putVolume += r.volume;
      if (!maxPut || r.volume > maxPut.volume) maxPut = r;
    }
  }

  return {
    maxCallStrike: maxCall?.strike ?? null,
    maxCallVolume: maxCall?.volume ?? 0,
    maxPutStrike: maxPut?.strike ?? null,
    maxPutVolume: maxPut?.volume ?? 0,
    callVolume,
    putVolume,
    putCallRatio: callVolume > 0 ? putVolume / callVolume : null,
  };
}

// ---------------------------------------------------------------- pronóstico

/** Cierre del mercado en minutos desde medianoche ET. */
const CLOSE_MIN = 16 * 60;

/**
 * Horas que faltan para el cierre (16:00 ET). PURA.
 *
 * Es el dato que hace viable el pronóstico intradía: `expectedMove` anualiza
 * sobre 365 días, así que pasarle `days = 0` da σ = 0 y los tres escenarios
 * colapsan sobre el spot. Con la fracción de día que queda, el cono se abre lo
 * que le corresponde — que a media sesión es poco, y así debe ser.
 */
export function hoursToClose(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const raw = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const h = raw === 24 ? 0 : raw; // ICU devuelve "24" a medianoche
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return Math.max(0, (CLOSE_MIN - (h * 60 + m)) / 60);
}

/**
 * Ventana alrededor del spot para medir la IV del día. Muy estrecha a propósito.
 *
 * `chainIV` usa ±20%, que sirve para horizontes de semanas pero no aquí: en el
 * vencimiento del día los strikes lejanos cotizan con IV disparatada (el tope de
 * cordura son 300%) y, ponderados por Open Interest, arrastran la media. Medido
 * en SPX el 24-jul-2026, ±20% daba 85% de IV — que implicaba ±1.7% en 3.4 horas,
 * más de lo que SPX suele moverse en una sesión entera.
 */
export const ATM_PCT = 0.02;

/**
 * IV at-the-money del vencimiento del día, ponderada por Open Interest. PURA.
 * Devuelve null si la cadena no trae IV real.
 */
export function atmIV(rows: Row[], spot: number, pct: number = ATM_PCT): number | null {
  if (!(spot > 0)) return null;
  const lo = spot * (1 - pct);
  const hi = spot * (1 + pct);

  let weighted = 0;
  let weight = 0;
  for (const r of rows) {
    const iv = r.greeks?.iv;
    if (typeof iv !== "number" || !(iv > 0) || iv > MAX_SANE_IV) continue;
    if (r.strike < lo || r.strike > hi) continue;
    if (!(r.openInterest > 0)) continue;
    weighted += iv * r.openInterest;
    weight += r.openInterest;
  }
  return weight > 0 ? weighted / weight : null;
}

// ----------------------------------------------------------------- GEX 0DTE

/** Ventana de strikes alrededor del spot para el GEX del día. */
export const GEX_NEAR_PCT = 0.03;

export interface ZeroDteGexNode {
  strike: number;
  /** callGex − putGex. El signo dice qué lado domina. */
  netGex: number;
  callGex: number;
  putGex: number;
  side: "call" | "put";
  /** Gamma total del strike, normalizada al mayor de la ventana (0-1). */
  concentration: number;
}

export interface ZeroDteGex {
  nodes: ZeroDteGexNode[];
  /** Strike de mayor concentración de gamma: el imán. */
  kingStrike: number | null;
  /** Strike donde el GEX acumulado cambia de signo: la zona de inversión. */
  flipStrike: number | null;
  /** Gamma neta del vencimiento. Positiva revierte, negativa amplifica. */
  regime: "positive" | "negative";
  totalNetGex: number;
  /** Fracción de contratos que traían gamma real (0-1). */
  realGammaShare: number;
  n: number;
}

/**
 * GEX del vencimiento del día. PURA.
 *
 * No reutiliza `gexAnalysis` porque este descarta todo contrato con
 * `daysToExpiration <= 0` —pensado para excluir los ya expirados de una cadena
 * multi-vencimiento— y en 0DTE eso es la cadena entera: devolvería vacío.
 *
 * Tampoco hace falta su maquinaria de Black-Scholes: Schwab entrega la gamma
 * real por contrato, y con T = 0 la fórmula degeneraría de todos modos.
 *
 * GEX por strike = gamma × OI × 100 × spot² × 0.01, con signo +call / −put,
 * igual que el motor existente.
 */
export function zeroDteGex(
  rows: Row[],
  spot: number,
  nearPct: number = GEX_NEAR_PCT,
): ZeroDteGex {
  const empty: ZeroDteGex = {
    nodes: [], kingStrike: null, flipStrike: null,
    regime: "positive", totalNetGex: 0, realGammaShare: 0, n: 0,
  };
  if (!(spot > 0) || rows.length === 0) return empty;

  const lo = spot * (1 - nearPct);
  const hi = spot * (1 + nearPct);
  const byStrike = new Map<number, { callGex: number; putGex: number }>();
  let considered = 0;
  let withRealGamma = 0;

  for (const r of rows) {
    if (r.strike < lo || r.strike > hi) continue;
    if (!(r.openInterest > 0)) continue;
    const gamma = r.greeks?.gamma;
    considered += 1;
    if (typeof gamma !== "number" || !(gamma > 0)) continue;
    withRealGamma += 1;

    const gex = gamma * r.openInterest * 100 * spot * spot * 0.01;
    const s = byStrike.get(r.strike) ?? { callGex: 0, putGex: 0 };
    if (r.contractType === "call") s.callGex += gex;
    else s.putGex += gex;
    byStrike.set(r.strike, s);
  }

  if (byStrike.size === 0) return empty;

  const raw = [...byStrike.entries()]
    .map(([strike, g]) => ({
      strike,
      netGex: g.callGex - g.putGex,
      callGex: g.callGex,
      putGex: g.putGex,
      total: g.callGex + g.putGex,
    }))
    .sort((a, b) => a.strike - b.strike);

  const maxTotal = Math.max(...raw.map((r) => r.total), 0);
  const nodes: ZeroDteGexNode[] = raw.map((r) => ({
    strike: r.strike,
    netGex: r.netGex,
    callGex: r.callGex,
    putGex: r.putGex,
    side: (r.netGex >= 0 ? "call" : "put") as "call" | "put",
    concentration: maxTotal > 0 ? r.total / maxTotal : 0,
  }));

  // Imán: donde hay más gamma, sin importar el signo. Es el strike que más
  // obliga a los dealers a operar contra el movimiento.
  const king = nodes.reduce((a, b) => (b.concentration > a.concentration ? b : a));

  // Zona de inversión: recorriendo de menor a mayor strike, el punto donde el
  // GEX acumulado cambia de signo.
  let flipStrike: number | null = null;
  let acc = 0;
  let prev = 0;
  for (const nd of raw) {
    prev = acc;
    acc += nd.netGex;
    if (prev !== 0 && Math.sign(acc) !== Math.sign(prev)) {
      flipStrike = nd.strike;
      break;
    }
  }

  const totalNetGex = raw.reduce((s, r) => s + r.netGex, 0);

  return {
    nodes: [...nodes].sort((a, b) => b.concentration - a.concentration),
    kingStrike: king.strike,
    flipStrike,
    regime: totalNetGex >= 0 ? "positive" : "negative",
    totalNetGex,
    realGammaShare: considered > 0 ? withRealGamma / considered : 0,
    n: byStrike.size,
  };
}

// ---------------------------------------------- flujos de dealer (vanna / charm)

export interface DealerFlow {
  /** Charm neto cerca del dinero (con signo +call/−put, ponderado por OI). */
  netCharm: number;
  /** Vanna neta cerca del dinero (misma convención). */
  netVanna: number;
  /**
   * Intensidad del efecto charm AHORA (0-1). Crece hacia el cierre porque charm
   * escala como 1/T; a media sesión es leve, en la última hora domina.
   */
  charmIntensity: number;
  /** Dirección de la deriva por vanna SI la IV baja ~1 punto. */
  vannaIfVolDrops: Lean;
  /** Explicación en una línea. */
  note: string;
}

/**
 * Agrega charm y vanna de la cadena del día como "flujo de dealer". PURA.
 *
 * Convención de posicionamiento (la misma del GEX de este proyecto): se suma con
 * signo +call / −put, ponderado por Open Interest, solo cerca del dinero. NO es
 * una certeza sobre el posicionamiento real de cada dealer — es el modelo
 * estándar de exposición agregada. Por eso lo que sale es una TENDENCIA
 * probabilística, no una garantía.
 *
 * `hoursToClose` escala la intensidad de charm (1/T se dispara al cierre).
 */
export function dealerFlow(
  rows: Row[],
  spot: number,
  iv: number | null,
  hoursLeft: number,
  nearPct = 0.03,
): DealerFlow | null {
  if (!(spot > 0) || iv == null || !(iv > 0) || hoursLeft <= 0) return null;

  const lo = spot * (1 - nearPct);
  const hi = spot * (1 + nearPct);
  const T = hoursLeft / (24 * 365); // años hasta el cierre

  let netCharm = 0;
  let netVanna = 0;
  for (const r of rows) {
    if (r.strike < lo || r.strike > hi) continue;
    if (!(r.openInterest > 0)) continue;
    const sign = r.contractType === "call" ? 1 : -1;
    netCharm += bsCharm(spot, r.strike, T, iv) * r.openInterest * sign;
    netVanna += bsVanna(spot, r.strike, T, iv) * r.openInterest * sign;
  }

  // Intensidad de charm: crece al acercarse el cierre. Plena en la última hora.
  const charmIntensity = Math.max(0, Math.min(1, 1 - hoursLeft / 6.5));

  // Vanna: si la IV baja, el sesgo va en sentido OPUESTO al signo de netVanna
  // (menos vol → el delta cae donde vanna es positiva). Se reporta condicional.
  const vannaIfVolDrops: Lean =
    Math.abs(netVanna) < 1e-6 ? "lateral" : netVanna > 0 ? "bajista" : "alcista";

  const note =
    `Charm ${netCharm >= 0 ? "positivo" : "negativo"} (intensidad ${(charmIntensity * 100).toFixed(0)}%, ` +
    `sube hacia el cierre); vanna sugiere sesgo ${vannaIfVolDrops} si la IV baja.`;

  return { netCharm, netVanna, charmIntensity, vannaIfVolDrops, note };
}

// ------------------------------------------------- panorama a corto plazo (5 min)

export type Lean = "alcista" | "bajista" | "lateral";

export interface ShortTermOutlook {
  spot: number;
  horizonMinutes: number;
  /** Desviación estándar del movimiento en el horizonte, en puntos. */
  sigma: number;
  /** Rango ~68% (±1σ). */
  rangeLow: number;
  rangeHigh: number;
  /** Imán del GEX (strike de mayor gamma). */
  magnet: number | null;
  regime: "positive" | "negative";
  lean: Lean;
  /** Frase corta y llana: "ahora en X → en ~5 min ...". */
  headline: string;
  /** Explicación en una línea del porqué. */
  detail: string;
  confidence: "baja" | "media";
  /** Intensidad del charm ahora (0-1), o null si no hay flujo. Sube hacia el cierre. */
  charmIntensity: number | null;
  /** Qué añade el charm a la lectura, o null. */
  charmNote: string | null;
  /** Qué añade la vanna (condicional a la IV), o null. */
  vannaNote: string | null;
}

const nfPts = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

/**
 * Panorama del próximo tramo (por defecto 5 min). PURA.
 *
 * Deliberadamente NO da un precio único "va a llegar a X". A 5 minutos el
 * movimiento esperado es diminuto y afirmar un punto exacto sería falso. Lo que
 * sí es defendible: el RANGO estadístico (±1σ sobre el horizonte) y hacia dónde
 * empuja el POSICIONAMIENTO (el imán del GEX y el régimen de gamma). Se combinan
 * en una frase legible, marcada siempre como estimación, no como consejo.
 */
export function shortTermOutlook(
  spot: number,
  iv: number | null,
  gex: ZeroDteGex,
  horizonMinutes = 5,
  flow?: DealerFlow | null,
): ShortTermOutlook | null {
  if (!(spot > 0) || iv == null || !(iv > 0)) return null;

  const days = horizonMinutes / 1440;
  const em = expectedMove(spot, iv, days);
  const lo = em.lower1;
  const hi = em.upper1;
  const magnet = gex.kingStrike;
  const dist = magnet != null ? magnet - spot : 0;

  const charmI = flow?.charmIntensity ?? null;

  // Lean: en gamma positiva el precio revierte hacia el imán; en negativa se
  // amplifica. El imán solo "tira" si está a un alcance razonable en el horizonte.
  // El CHARM extiende ese alcance hacia el cierre: el delta que se desvanece
  // arrastra el precio al imán con más fuerza cuanto menos tiempo queda.
  let lean: Lean = "lateral";
  let detail: string;
  const reach = 2 * em.sigma * (1 + 0.5 * (charmI ?? 0));

  if (magnet == null) {
    detail = "Sin imán de gamma identificable; movimiento sin sesgo claro.";
  } else if (gex.regime === "positive") {
    if (Math.abs(dist) <= em.sigma) {
      lean = "lateral";
      detail = `Gamma positiva y el precio ya está sobre el imán ${nfPts(magnet)}: los dealers lo anclan, se espera lateral.`;
    } else if (Math.abs(dist) <= reach) {
      lean = dist > 0 ? "alcista" : "bajista";
      detail = `Gamma positiva: el precio tiende a volver al imán ${nfPts(magnet)}, ${dist > 0 ? "por encima" : "por debajo"}.`;
    } else {
      lean = "lateral";
      detail = `El imán ${nfPts(magnet)} queda fuera de alcance en ${horizonMinutes} min; sesgo lateral dentro del rango.`;
    }
  } else {
    // Gamma negativa: los movimientos se amplifican. Sin momentum no afirmamos
    // dirección, pero avisamos del riesgo de aceleración.
    lean = "lateral";
    detail = `Gamma negativa: los movimientos se amplifican. Si rompe ${gex.flipStrike != null ? nfPts(gex.flipStrike) : "un extremo"}, puede acelerar.`;
  }

  const confidence: "baja" | "media" =
    gex.regime === "positive" && magnet != null && Math.abs(dist) <= em.sigma ? "media" : "baja";

  // Notas de charm/vanna: la matemática que afina la trayectoria hacia el cierre.
  let charmNote: string | null = null;
  let vannaNote: string | null = null;
  if (flow && charmI != null) {
    const pct = `${(charmI * 100).toFixed(0)}%`;
    charmNote =
      gex.regime === "positive"
        ? `Charm ${pct}: la atracción hacia ${magnet != null ? nfPts(magnet) : "el imán"} se intensifica hacia el cierre (pin).`
        : `Charm ${pct}: un rompimiento puede acelerar hacia el cierre (gamma negativa).`;
    if (flow.vannaIfVolDrops !== "lateral") {
      vannaNote = `Vanna: si la IV baja, añade sesgo ${flow.vannaIfVolDrops}.`;
    }
  }

  const headline =
    `Ahora ${spot.toFixed(2)} → en ~${horizonMinutes} min, probablemente entre ` +
    `${nfPts(lo)} y ${nfPts(hi)}` +
    (magnet != null && lean !== "lateral" ? `, gravitando hacia ${nfPts(magnet)}` : "");

  return {
    spot,
    horizonMinutes,
    sigma: em.sigma,
    rangeLow: lo,
    rangeHigh: hi,
    magnet,
    regime: gex.regime,
    lean,
    headline,
    detail,
    confidence,
    charmIntensity: charmI,
    charmNote,
    vannaNote,
  };
}

// ----------------------------------------------- pronóstico de cierre (3-4pm ET)

/** Ventana en minutos antes del cierre en que se activa el pronóstico. */
export const CLOSING_WINDOW_MIN = 60;

/**
 * Fase del pronóstico de cierre a lo largo del día:
 *  - pending: 9:30am–3pm, aún no se calcula (strike null).
 *  - live: 3–4pm, se calcula y converge.
 *  - final: tras las 4pm y hasta las 9:30am de la próxima sesión, valor fijado.
 */
export type ClosingPhase = "pending" | "live" | "final";

export interface ClosingForecast {
  phase: ClosingPhase;
  minutesLeft: number;
  spot: number;
  magnet: number | null;
  regime: "positive" | "negative";
  /** Precio de cierre estimado (crudo, sin redondear al strike). */
  estimate: number;
  /** Strike más probable de cierre. null en fase pending. */
  strike: number | null;
  /** Rango ~68% del cierre, redondeado a strikes. */
  rangeLow: number;
  rangeHigh: number;
  /** σ restante en puntos: se encoge hacia 0 al acercarse las 4pm. */
  sigma: number;
  confidence: "baja" | "media" | "alta";
  note: string;
  /** Solo en fase final: la fecha de la sesión de la que viene el valor fijado. */
  fromDate?: string;
}

/**
 * Pronóstico del strike de cierre a las 4:00pm ET. PURA.
 *
 * Se activa **solo en la última hora** (3:00-4:00pm ET), que es cuando el jalón
 * de gamma+charm de los market makers es más fuerte (charm ~ 1/√T se dispara) y
 * el movimiento restante ya es pequeño. Fuera de esa ventana devuelve null.
 *
 * En gamma POSITIVA el precio tiende al imán; el estimado se acota al cono de 2σ
 * restante, así que **converge**: mientras pasa el tiempo, σ se encoge y el
 * estimado se afina hacia el precio actual/imán. En gamma NEGATIVA no hay pin —
 * el mejor estimado es el precio actual y la confianza baja.
 *
 * NO es certeza: el pin es una tendencia que una noticia grande puede romper.
 */
export function closingForecast(
  spot: number,
  iv: number | null,
  gex: ZeroDteGex,
  now: Date = new Date(),
  strikeStep = 5,
): ClosingForecast | null {
  if (!(spot > 0) || iv == null || !(iv > 0)) return null;

  const minutesLeft = hoursToClose(now) * 60;
  if (minutesLeft <= 0 || minutesLeft > CLOSING_WINDOW_MIN) return null;

  const em = expectedMove(spot, iv, minutesLeft / 1440);
  const reach = 2 * em.sigma; // cuánto puede moverse, como mucho, en el tiempo que queda
  const magnet = gex.kingStrike;

  // Estimado crudo: en gamma positiva, el imán acotado a lo alcanzable; si el
  // imán no llega, hasta donde el tiempo permita hacia él. En gamma negativa el
  // pin no aplica: el mejor estimado es el precio actual.
  let estimate: number;
  if (gex.regime === "positive" && magnet != null) {
    estimate = Math.min(spot + reach, Math.max(spot - reach, magnet));
  } else {
    estimate = spot;
  }

  const strike = Math.round(estimate / strikeStep) * strikeStep;
  const rangeLow = Math.round((spot - em.sigma) / strikeStep) * strikeStep;
  const rangeHigh = Math.round((spot + em.sigma) / strikeStep) * strikeStep;

  // Confianza: sube al converger (menos tiempo, menos σ) en gamma positiva.
  let confidence: "baja" | "media" | "alta";
  if (gex.regime !== "positive" || magnet == null) confidence = "baja";
  else if (minutesLeft <= 15) confidence = "alta";
  else confidence = "media";

  const note =
    gex.regime === "positive" && magnet != null
      ? `Gamma positiva: los dealers tienden a anclar el cierre cerca de ${nfPts(magnet)}. ` +
        `Quedan ${minutesLeft.toFixed(0)} min y el margen de movimiento es +/-${em.sigma.toFixed(1)} pts.`
      : `Gamma negativa: sin efecto de anclaje fiable. El mejor estimado es el precio actual; ` +
        `un rompimiento puede alejarlo.`;

  return {
    phase: "live",
    minutesLeft,
    spot,
    magnet,
    regime: gex.regime,
    estimate,
    strike,
    rangeLow,
    rangeHigh,
    sigma: em.sigma,
    confidence,
    note,
  };
}

export type ScenarioKind = "bear" | "base" | "bull";

export interface ZeroDteScenario {
  kind: ScenarioKind;
  target: number;
  changePct: number;
  /** Probabilidad de TOCAR el nivel antes del cierre (0-1). */
  probTouch: number;
  reason: string;
}

export interface ZeroDteForecast {
  spot: number;
  iv: number;
  hoursToClose: number;
  sigma: number;
  sigmaPct: number;
  upper1: number;
  lower1: number;
  upper2: number;
  lower2: number;
  scenarios: ZeroDteScenario[];
  /** Motivo por el que el pronóstico NO es fiable, o null. */
  caveat: string | null;
}

/**
 * Tres escenarios para lo que queda de sesión. PURA.
 *
 * El imán es el strike de mayor volumen ponderado por probabilidad de toque: un
 * muro enorme pero inalcanzable en 3 horas pesa menos que uno mediano y cercano.
 * Todo se recorta al cono de 2σ — sin ese tope el modelo propone objetivos que
 * la volatilidad implícita no permite alcanzar en el tiempo que queda.
 *
 * NO incorpora dirección: el volumen no distingue compra de venta. Estos niveles
 * son zonas de atracción, no una apuesta sobre hacia dónde va el precio.
 */
export function buildForecast(
  spot: number,
  iv: number | null,
  lines: ChainLine[],
  now: Date = new Date(),
): ZeroDteForecast | null {
  if (!(spot > 0) || iv == null || !(iv > 0)) return null;

  const hrs = hoursToClose(now);
  const days = hrs / 24;
  const em = expectedMove(spot, iv, days);

  const clamp = (v: number) => Math.min(em.upper2, Math.max(em.lower2, v));

  // Peso de cada strike: volumen total × probabilidad de tocarlo antes del cierre.
  const weighted = lines
    .map((l) => {
      const volume = (l.call?.volume ?? 0) + (l.put?.volume ?? 0);
      const touch = probTouch(spot, l.strike, iv, days);
      return { strike: l.strike, volume, touch, weight: volume * touch };
    })
    .filter((w) => w.volume > 0)
    .sort((a, b) => b.weight - a.weight);

  const top = weighted[0];
  const base = top ? clamp(top.strike) : spot;

  // Separación mínima respecto al base. Sin ella, el peso volumen × toque
  // siempre elige el strike CONTIGUO —su probabilidad de toque es casi 1— y los
  // tres escenarios se amontonan en ±0.1% mientras el cono dice ±1.7%. Un
  // escenario que no se distingue del base no es un escenario.
  const minGap = Math.max(em.sigma * 0.5, spot * 0.001);

  const above = weighted.filter((w) => w.strike >= base + minGap);
  const below = weighted.filter((w) => w.strike <= base - minGap);

  // Si no hay muro relevante a un lado, la banda de 1σ hace de objetivo.
  const bullRaw = above.length ? above[0].strike : em.upper1;
  const bearRaw = below.length ? below[0].strike : em.lower1;

  // Orden estricto bear < base < bull: un modelo que los cruza no dice nada.
  const bull = Math.max(clamp(bullRaw), base);
  const bear = Math.min(clamp(bearRaw), base);

  const mk = (kind: ScenarioKind, target: number, reason: string): ZeroDteScenario => ({
    kind,
    target,
    changePct: ((target - spot) / spot) * 100,
    probTouch: probTouch(spot, target, iv, days),
    reason,
  });

  const volTxt = top ? `${top.volume.toLocaleString("en-US")} contratos` : "sin volumen";

  let caveat: string | null = null;
  if (hrs <= 0) caveat = "Sesión cerrada: el vencimiento de hoy ya expiró.";
  else if (hrs < 0.5) caveat = "Menos de 30 minutos para el cierre: el modelo pierde sentido.";
  else if (!top) caveat = "Sin volumen suficiente en la cadena.";

  return {
    spot,
    iv,
    hoursToClose: hrs,
    sigma: em.sigma,
    sigmaPct: em.sigmaPct,
    upper1: em.upper1,
    lower1: em.lower1,
    upper2: em.upper2,
    lower2: em.lower2,
    caveat,
    scenarios: [
      mk("bear", bear, below.length
        ? `Zona de atracción por debajo (${below[0].volume.toLocaleString("en-US")} contratos)`
        : "Banda inferior de 1σ — no hay muro relevante debajo"),
      mk("base", base, top
        ? `Strike de mayor atracción: ${top.strike} (${volTxt})`
        : "Sin imán identificable"),
      mk("bull", bull, above.length
        ? `Zona de atracción por encima (${above[0].volume.toLocaleString("en-US")} contratos)`
        : "Banda superior de 1σ — no hay muro relevante encima"),
    ],
  };
}

export interface ZeroDteResult {
  ticker: string;
  expiration: string;
  /** true si el vencimiento pedido es el de hoy (0DTE). Los paneles intradía
   *  (panorama 5 min, escenarios hasta el cierre) solo aplican cuando es true. */
  isToday: boolean;
  spot: number | null;
  delayed: boolean;
  /** Contratos totales del vencimiento (denominador del ranking). */
  contractCount: number;
  /** Strikes con datos frescos de MarketSnack superpuestos (0 = todo Schwab). */
  realtimeStrikes: number;
  /** Antigüedad del dato fresco más reciente, en segundos. null si no hubo. */
  realtimeAgeSec: number | null;
  lines: ChainLine[];
  summary: ChainSummary;
  /** null si la cadena no trae IV real o el spot no llegó. */
  forecast: ZeroDteForecast | null;
  /** Panorama del próximo tramo (~5 min), en lenguaje llano. */
  outlook: ShortTermOutlook | null;
  /** Flujos de dealer (vanna/charm) — afinan la trayectoria hacia el cierre. */
  dealerFlow: DealerFlow | null;
  /** Pronóstico del strike de cierre — solo activo 3:00-4:00pm ET, si no null. */
  closing: ClosingForecast | null;
  gex: ZeroDteGex;
  asOf: string;
}

/**
 * Descarga la cadena de UN vencimiento y devuelve la tabla ya ordenada.
 *
 * `targetDate` (YYYY-MM-DD) elige el vencimiento; por defecto, hoy (0DTE). Se
 * descarga SOLO esa fecha (`fromDate = toDate = targetDate`), bajo demanda: cada
 * día es una consulta independiente, así que ver un vencimiento futuro no altera
 * en nada el cálculo de hoy. Al pedir una sola expiración no hace falta el troceo
 * por ventanas de `fetchOptionChain`.
 */
export async function fetchZeroDte(
  ticker: string,
  now: Date = new Date(),
  targetDate?: string,
): Promise<ZeroDteResult> {
  const symbol = toSchwabSymbol(ticker);
  if (!symbol) throw new SchwabError("Ticker vacío.");
  const today = etDate(now);
  const day = targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : today;
  const isToday = day === today;

  const params = new URLSearchParams({
    symbol,
    contractType: "ALL",
    includeUnderlyingQuote: "true",
    fromDate: day,
    toDate: day,
    strikeCount: "500",
  });

  const res = await authedGet(`${API_BASE}/chains?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new SchwabError(
      `Schwab respondió ${res.status} para ${symbol}. ${body.slice(0, 160)}`.trim(),
      res.status,
    );
  }

  const json = (await res.json()) as SchwabChainResponse;
  const parsed = parseSchwabChain(json, ticker.toUpperCase());
  const schwabRows = parsed.contracts.map(toRow);

  // Superpone la foto EN TIEMPO REAL de MarketSnack sobre la cadena de Schwab
  // (que llega 15 min retrasada). Solo para el vencimiento de hoy — el acumulado
  // es intradía. Los strikes que MarketSnack vio quedan frescos; el resto, Schwab.
  let rows = schwabRows;
  let realtimeStrikes = 0;
  let realtimeAgeSec: number | null = null;
  if (isToday) {
    const acc = await loadFlow(ticker, day).catch(() => null);
    const ov = overlayRealtime(schwabRows, acc);
    rows = ov.rows;
    realtimeStrikes = ov.realtimeStrikes;
    if (ov.newestTs > 0) realtimeAgeSec = Math.max(0, Math.round((now.getTime() - ov.newestTs) / 1000));
  }

  const lines = buildChainTable(rows);

  // IV at-the-money del día. Si no hay OI junto al dinero se cae a la ventana
  // ancha de `chainIV`, que es peor pero mejor que quedarse sin pronóstico.
  const spot = parsed.underlyingPrice;
  const iv = spot != null ? atmIV(rows, spot) ?? chainIV(rows, spot) : null;
  const gex = zeroDteGex(rows, spot ?? 0);
  const flow = dealerFlow(rows, spot ?? 0, iv, hoursToClose(now));

  return {
    ticker: ticker.toUpperCase(),
    expiration: day,
    isToday,
    spot: parsed.underlyingPrice,
    delayed: parsed.delayed,
    contractCount: rows.length,
    /** Strikes con datos frescos de MarketSnack (0 = todo Schwab, 15 min). */
    realtimeStrikes,
    /** Antigüedad del dato fresco más reciente, en segundos. null si no hubo. */
    realtimeAgeSec,
    lines,
    summary: summarize(rows),
    // Paneles intradía solo en 0DTE: en un vencimiento futuro no aplican.
    forecast: isToday ? buildForecast(spot ?? 0, iv, lines, now) : null,
    outlook: isToday ? shortTermOutlook(spot ?? 0, iv, gex, 5, flow) : null,
    dealerFlow: isToday ? flow : null,
    closing: isToday ? closingForecast(spot ?? 0, iv, gex, now) : null,
    gex,
    asOf: now.toISOString(),
  };
}
