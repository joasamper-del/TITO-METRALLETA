// GET /api/news?ticker=XXX&name=...&liquidityIssue=true — Tarea 7: noticias en dos capas (macro RSS + empresa).
// R8: Si la cadena de opciones es ilíquida (liquidityIssue=true), devuelve estado explícito sin fabricar datos.

import { buildNewsReport } from "@/lib/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get("ticker") ?? "").trim().toUpperCase();
  const name = searchParams.get("name");
  const liquidityIssue = searchParams.get("liquidityIssue") === "true";

  if (!ticker) {
    return Response.json({ error: "Falta el ticker." }, { status: 400 });
  }

  // R8: Si liquidez es roja (Tarea 6), descarta noticias — no fiables.
  // Falla cerrada: "no hay noticias" es mejor que "hay noticias no validadas".
  if (liquidityIssue) {
    return Response.json({
      ticker,
      error: "Option chain ilíquido — noticias no disponibles (Tarea 6).",
      news: [],
      bias: { bias: "neutral", score: 0, positive: 0, negative: 0, neutral: 0 },
      feedsOk: 0,
      feedsTotal: 0,
    });
  }

  try {
    const report = await buildNewsReport(ticker, name, new Date());
    return Response.json(report);
  } catch {
    return Response.json({ error: "No se pudieron leer las noticias." }, { status: 502 });
  }
}
