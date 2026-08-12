// GET /api/0dte/verdict?tickers=SPY,QQQ,AMD — veredicto 0DTE unificado por
// ticker, para propagar el estado NO OPERAR al header, la watchlist y las
// alertas. Ver lib/zerodteVerdictBatch.ts.

import { parseTickers, verdictsForTickers } from "@/lib/zerodteVerdictBatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const tickers = parseTickers(new URL(req.url).searchParams.get("tickers"));
  if (tickers.length === 0) {
    return Response.json({ error: "Falta el parámetro ?tickers=A,B,C" }, { status: 400 });
  }
  try {
    return Response.json(await verdictsForTickers(tickers));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error calculando veredictos.";
    return Response.json({ error: message }, { status: 502 });
  }
}
