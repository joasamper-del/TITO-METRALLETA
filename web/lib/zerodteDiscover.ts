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
  bias: VerdictBias; // alcista · bajista · neutral
  confidence: VerdictConfidence;
  confidencePct: number;
}

export interface DiscoverCandidate {
  ticker: string;
  spot: number | null;
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
export async function discoverZeroDte(
  universe: string[] = DISCOVER_UNIVERSE,
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
      return;
    }
    scanned += 1;
    const res = r.value;
    // Gate 0DTE: solo los que vencen HOY.
    if (!res.isToday || res.contractCount === 0) return;
    withZeroDte += 1;

    const callV = res.summary.callVolume;
    const putV = res.summary.putVolume;
    // Mismo veredicto que la tarjeta: buildVerdict sobre el ZeroDteResult que ya
    // tenemos. No hay datos nuevos ni segunda pasada — imposible contradecirla.
    const v = buildVerdict(res);
    candidates.push({
      ticker: res.ticker,
      spot: res.spot,
      totalVolume: callV + putV,
      callVolume: callV,
      putVolume: putV,
      putCallRatio: res.summary.putCallRatio,
      contractCount: res.contractCount,
      magnet: res.gex.kingStrike,
      verdict: {
        action: v.action,
        actionLabel: v.actionLabel,
        bias: v.bias,
        confidence: v.confidence,
        confidencePct: v.confidencePct,
      },
      news: null,
    });
  });

  candidates.sort((a, b) => b.totalVolume - a.totalVolume);

  // Filtro de noticias: enriquece solo los que pasaron el gate (pocas llamadas).
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
