// ============================================================================
// Descubridor 0DTE — recorre un universo, aplica el gate de 0DTE (solo los que
// vencen HOY), rankea por volumen de opciones y enriquece cada candidato con su
// noticia más fresca (capa empresa de lib/news.ts). Reutiliza `fetchZeroDte`, así
// que hereda su fuente (Schwab + overlay MarketSnack) sin lógica nueva de datos.
//
// El gate lo da `isToday`: en un martes/jueves los single-names no tienen 0DTE
// (sus dailies son Lun/Mié/Vie) y quedan fuera solos; solo los índices (SPX/SPY/
// QQQ/IWM) vencen cada día hábil. Ver SCOREDCARD/Descubrimiento-0DTE.md.
// ============================================================================

import { fetchTickerNews, newsBias, type Bias } from "./news";
import { fetchZeroDte } from "./zerodte";
import {
  buildVerdict,
  type VerdictAction,
  type VerdictBias,
  type VerdictConfidence,
} from "./zerodteVerdict";
import { fromZeroDte } from "./verdict";

/**
 * Universo por defecto. El gate `isToday` filtra solos los que no tienen 0DTE hoy,
 * así que se puede incluir de todo; los índices/ETF vencen a diario y los single-
 * names casi a diario (L/X/V). Editable — más nombres = más llamadas a Schwab.
 */
export const DISCOVER_UNIVERSE = [
  // Índices / ETF — vencimiento diario (cubren martes/jueves)
  "SPX", "SPY", "QQQ", "IWM", "DIA",
  // Mega-caps — venc. casi diario (L/X/V)
  "NVDA", "GOOGL", "AAPL", "MSFT", "AMZN", "META", "TSLA", "AVGO", "NFLX",
  // Semis / AI de alto flujo
  "AMD", "SMH", "INTC", "MU", "PLTR", "SMCI",
  // Cripto-proxy y alto flujo + watchlist
  "MSTR", "COIN", "INTU", "SHOP",
];

/**
 * Universo por defecto del módulo 0DTE = la watchlist "0DTE" de Robinhood de Victor
 * (lista ⚡ "Underlyings para análisis de flujo 0DTE"). Snapshot: el app no lee
 * Robinhood en vivo, así que si cambias la lista en RH hay que re-sincronizar aquí.
 * Última sync: 2026-08-12.
 */
export const ZERODTE_WATCHLIST = ["QQQ", "SPY", "SHOP", "SMH", "AMD", "INTU"];

const HOUR_MS = 3600_000;

/** Resumen de noticias del candidato: la más fresca + el sesgo de sentimiento. */
export interface CandidateNews {
  /** true si la noticia más reciente es de ≤24h. */
  fresh: boolean;
  /** Cuántas noticias de empresa hay en las últimas 24h. */
  freshCount: number;
  /** Sesgo de sentimiento (bullish/bearish/mixed/neutral). */
  bias: Bias;
  /** Titular más reciente y su enlace. */
  topTitle: string | null;
  topUrl: string | null;
  /** Antigüedad del titular más reciente, en horas. */
  topAgeH: number | null;
}

/**
 * Veredicto compacto del candidato. Es la MISMA decisión que muestra la tarjeta
 * Conclusión Ejecutiva: se calcula con `buildVerdict` sobre el mismo
 * `ZeroDteResult` que ya trae el descubridor, así que nunca puede contradecirla.
 * El filtro Calls/Puts del cliente se apoya en `action` + `bias`.
 */
export interface CandidateVerdict {
  action: VerdictAction; // COMPRAR · ESPERAR · NO_OPERAR
  actionLabel: string; // "COMPRAR CALLS", "COMPRAR PUTS", "ESPERAR", "NO OPERAR"
  /** Etiqueta corta del badge compartido: "CALLS", "PUTS", "ESPERAR", "NO OP.". */
  label: string;
  bias: VerdictBias; // alcista · bajista · neutral
  confidence: VerdictConfidence;
  confidencePct: number;
  /** Estrategia sugerida (1-2 frases). */
  strategy: string;
  /** El porqué del veredicto. */
  reason: string;
  /** Nivel/condición de invalidación = stop de la tesis. */
  stop: string;
  /** Objetivo como rango [lo, hi], nunca un precio único. */
  targetRange: [number, number] | null;
}

/** Contrato 0DTE sugerido para un veredicto COMPRAR (null si no aplica). */
export interface CandidateContract {
  right: "call" | "put";
  strike: number | null;
  /** Prima por contrato (de la cadena), o null si el strike no está rankeado. */
  price: number | null;
  expiration: string;
}

export interface DiscoverCandidate {
  ticker: string;
  spot: number | null;
  /** false = el ticker no tiene 0DTE hoy (o no llegaron datos). */
  hasZeroDte: boolean;
  /** callVolume + putVolume de TODA la cadena del día. Es el ranking. */
  totalVolume: number;
  callVolume: number;
  putVolume: number;
  putCallRatio: number | null;
  contractCount: number;
  /** Imán del GEX (strike de mayor gamma), o null. */
  magnet: number | null;
  /** Veredicto 0DTE del candidato (misma lógica que la tarjeta). */
  verdict: CandidateVerdict;
  /** Contrato sugerido si el veredicto es COMPRAR, si no null. */
  contract: CandidateContract | null;
  /** Noticia más fresca del ticker, o null si no hay (índices, sin cobertura, sin API key). */
  news: CandidateNews | null;
}

export interface DiscoverResult {
  asOf: string;
  universeSize: number;
  /** Cuántos tickers respondieron sin error. */
  scanned: number;
  /** Cuántos de los que respondieron tenían 0DTE hoy (pasaron el gate). */
  withZeroDte: number;
  /** Candidatos con 0DTE hoy, ordenados por volumen total desc. */
  candidates: DiscoverCandidate[];
  errors: { ticker: string; error: string }[];
}

/** Enriquece los candidatos con su noticia más fresca. Tolerante: si falla, news = null. */
async function attachNews(cands: DiscoverCandidate[], now: Date): Promise<void> {
  await Promise.all(
    cands.map(async (c) => {
      try {
        const items = await fetchTickerNews(c.ticker);
        if (items.length === 0) return; // índices/sin cobertura → se queda en null
        const sorted = [...items].sort((a, b) =>
          b.publishedUtc.localeCompare(a.publishedUtc),
        );
        const top = sorted[0];
        const ageH = (now.getTime() - new Date(top.publishedUtc).getTime()) / HOUR_MS;
        const freshCount = sorted.filter(
          (it) => (now.getTime() - new Date(it.publishedUtc).getTime()) / HOUR_MS <= 24,
        ).length;
        c.news = {
          fresh: Number.isFinite(ageH) && ageH <= 24,
          freshCount,
          bias: newsBias(sorted, now).bias,
          topTitle: top.title,
          topUrl: top.url,
          topAgeH: Number.isFinite(ageH) ? ageH : null,
        };
      } catch {
        // una noticia caída no puede tumbar el descubridor
      }
    }),
  );
}

/**
 * Corre el descubridor sobre el universo. Cada ticker se pide en paralelo y de
 * forma tolerante: un fallo de Schwab en un nombre no tumba al resto. Los
 * candidatos que pasan el gate se enriquecen con su noticia más fresca.
 */
/** Prioridad de orden: primero los COMPRAR, luego ESPERAR, al final NO OPERAR/sin 0DTE. */
const ACTION_RANK: Record<VerdictAction, number> = { COMPRAR: 0, ESPERAR: 1, NO_OPERAR: 2 };

export async function discoverZeroDte(
  universe: string[] = ZERODTE_WATCHLIST,
  now: Date = new Date(),
): Promise<DiscoverResult> {
  const settled = await Promise.allSettled(
    universe.map((t) => fetchZeroDte(t, now)),
  );

  const candidates: DiscoverCandidate[] = [];
  const errors: { ticker: string; error: string }[] = [];
  let scanned = 0;
  let withZeroDte = 0;

  settled.forEach((r, i) => {
    const ticker = universe[i];
    if (r.status === "rejected") {
      errors.push({
        ticker,
        error: r.reason instanceof Error ? r.reason.message : "error desconocido",
      });
      // Aun sin datos, mostramos una tarjeta del ticker (sin 0DTE / sin datos).
      candidates.push(noDataCandidate(ticker));
      return;
    }
    scanned += 1;
    const res = r.value;
    const hasZeroDte = res.isToday && res.contractCount > 0;
    if (hasZeroDte) withZeroDte += 1;

    // Mismo veredicto que la tarjeta: buildVerdict sobre el ZeroDteResult que ya
    // tenemos. No hay datos nuevos ni segunda pasada — imposible contradecirla.
    const v = buildVerdict(res);

    // Contrato sugerido solo para COMPRAR: strike del muro en la dirección del
    // trade (o el imán), con su prima de la cadena.
    let contract: CandidateContract | null = null;
    if (hasZeroDte && v.action === "COMPRAR") {
      const right: "call" | "put" = v.bias === "alcista" ? "call" : "put";
      const strike = (right === "call" ? v.levels.resistance : v.levels.support) ?? v.levels.magnet;
      const line = strike != null ? res.lines.find((l) => l.strike === strike) : undefined;
      const row = right === "call" ? line?.call ?? null : line?.put ?? null;
      contract = { right, strike, price: row?.price ?? row?.ask ?? null, expiration: res.expiration };
    }

    candidates.push({
      ticker: res.ticker,
      spot: res.spot,
      hasZeroDte,
      totalVolume: res.summary.callVolume + res.summary.putVolume,
      callVolume: res.summary.callVolume,
      putVolume: res.summary.putVolume,
      putCallRatio: res.summary.putCallRatio,
      contractCount: res.contractCount,
      magnet: res.gex.kingStrike,
      verdict: {
        action: v.action,
        actionLabel: hasZeroDte ? v.actionLabel : "SIN 0DTE HOY",
        label: hasZeroDte ? fromZeroDte(v).label : "SIN 0DTE",
        bias: v.bias,
        confidence: v.confidence,
        confidencePct: v.confidencePct,
        strategy: v.strategy,
        reason: v.reason,
        stop: v.invalidation,
        targetRange: v.targetRange,
      },
      contract,
      news: null,
    });
  });

  // Orden: COMPRAR arriba, luego por confianza y volumen.
  candidates.sort(
    (a, b) =>
      ACTION_RANK[a.verdict.action] - ACTION_RANK[b.verdict.action] ||
      b.verdict.confidencePct - a.verdict.confidencePct ||
      b.totalVolume - a.totalVolume,
  );

  await attachNews(candidates, now);

  return {
    asOf: now.toISOString(),
    universeSize: universe.length,
    scanned,
    withZeroDte,
    candidates,
    errors,
  };
}

/** Tarjeta mínima para un ticker sin datos / sin 0DTE hoy. */
function noDataCandidate(ticker: string): DiscoverCandidate {
  return {
    ticker,
    spot: null,
    hasZeroDte: false,
    totalVolume: 0,
    callVolume: 0,
    putVolume: 0,
    putCallRatio: null,
    contractCount: 0,
    magnet: null,
    verdict: {
      action: "NO_OPERAR",
      actionLabel: "SIN 0DTE HOY",
      label: "SIN 0DTE",
      bias: "neutral",
      confidence: "baja",
      confidencePct: 0,
      strategy: "Este ticker no tiene vencimiento 0DTE hoy (o no llegaron datos).",
      reason: "Sin cadena de hoy no hay tesis intradía.",
      stop: "—",
      targetRange: null,
    },
    contract: null,
    news: null,
  };
}
