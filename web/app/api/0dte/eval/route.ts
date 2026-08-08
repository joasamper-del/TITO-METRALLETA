// GET /api/0dte/eval?ticker=SPX — revisa los pronósticos guardados contra las
// barras intradía reales. Mide acierto y sesgo. Ver Proceso 0DTE §10.

import { fetchBars, MassiveError } from "@/lib/massive";
import { loadEvalJournal, reviewForecasts, type EvalBar } from "@/lib/zerodteEval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Massive nombra los índices con prefijo `I:` (I:SPX). Los ETF van tal cual. */
function barsSymbol(ticker: string): string {
  const INDEX = new Set(["SPX", "NDX", "RUT", "VIX", "DJX"]);
  return INDEX.has(ticker) ? `I:${ticker}` : ticker;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get("ticker") ?? "SPX").trim().toUpperCase();
  if (!ticker) return Response.json({ error: "ticker requerido" }, { status: 400 });

  const journal = await loadEvalJournal(ticker);
  if (!journal || journal.snapshots.length === 0) {
    return Response.json({
      ticker,
      empty: true,
      message: "Aún no hay pronósticos guardados para evaluar.",
    });
  }

  try {
    // 5 min × 10 días cubre de sobra la ventana de las fotos recientes.
    const tf = await fetchBars(barsSymbol(ticker), 5, "minute", 10);
    const bars: EvalBar[] = tf.map((b) => ({
      time: b.time, high: b.high, low: b.low, close: b.close,
    }));
    return Response.json({ ticker, ...reviewForecasts(journal.snapshots, bars) });
  } catch (err) {
    const message =
      err instanceof MassiveError ? err.message : "Error al cargar barras para evaluar.";
    // 200: la evaluación es secundaria, no debe romper la página.
    return Response.json({ ticker, error: message, evals: [] }, { status: 200 });
  }
}
