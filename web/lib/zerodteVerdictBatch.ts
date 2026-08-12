// Veredicto 0DTE para una LISTA de tickers (header, watchlist, alertas).
//
// Misma lógica que la tarjeta y el descubridor: fetchZeroDte → buildVerdict →
// fromZeroDte. Es la fuente que propaga el estado NO OPERAR a cualquier sitio
// donde aparezca un ticker. Un ticker sin 0DTE hoy devuelve null (no aplica el
// veredicto intradía), no un NO OPERAR falso.

import { fetchZeroDte } from "./zerodte";
import { buildVerdict } from "./zerodteVerdict";
import { fromZeroDte, type UnifiedVerdict } from "./verdict";

export interface VerdictBatch {
  asOf: string;
  /** Por ticker: el veredicto unificado, o null si no tiene 0DTE hoy / falló. */
  verdicts: Record<string, UnifiedVerdict | null>;
}

/** Normaliza, deduplica y limita la lista de tickers (defensa del endpoint). */
export function parseTickers(raw: string | null, max = 30): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const t = part.trim().toUpperCase();
    if (t && /^[A-Z.]{1,8}$/.test(t)) seen.add(t);
    if (seen.size >= max) break;
  }
  return [...seen];
}

export async function verdictsForTickers(
  tickers: string[],
  now: Date = new Date(),
): Promise<VerdictBatch> {
  const settled = await Promise.allSettled(tickers.map((t) => fetchZeroDte(t, now)));
  const verdicts: Record<string, UnifiedVerdict | null> = {};

  settled.forEach((r, i) => {
    const ticker = tickers[i];
    // Sin 0DTE hoy o error de datos → null: el veredicto intradía no aplica,
    // y jamás lo forzamos a NO OPERAR (sería mentir con confianza).
    if (r.status === "rejected" || !r.value.isToday || r.value.contractCount === 0) {
      verdicts[ticker] = null;
      return;
    }
    verdicts[ticker] = fromZeroDte(buildVerdict(r.value));
  });

  return { asOf: now.toISOString(), verdicts };
}
