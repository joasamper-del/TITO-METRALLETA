// GET /api/0dte/bars?ticker=SPX — barras intradía (5 min) del subyacente para
// el chart. Fuente: Schwab pricehistory (Massive no autoriza indices).

import { fetchIntradayBars, SchwabError } from "@/lib/schwab";
import { toSchwabSymbol } from "@/lib/zerodte";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get("ticker") ?? "SPX").trim().toUpperCase();
  if (!ticker) return Response.json({ error: "ticker requerido" }, { status: 400 });

  try {
    const bars = await fetchIntradayBars(toSchwabSymbol(ticker));
    return Response.json({ ticker, bars });
  } catch (err) {
    const message =
      err instanceof SchwabError ? err.message : "Error al cargar barras.";
    // 200: el chart es secundario; la tabla no depende de esto.
    return Response.json({ ticker, error: message, bars: [] }, { status: 200 });
  }
}
