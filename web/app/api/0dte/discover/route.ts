// GET /api/0dte/discover — recorre el universo, aplica el gate de 0DTE (solo los
// que vencen hoy) y devuelve los candidatos rankeados por volumen de opciones.
// Ver SCOREDCARD/Descubrimiento-0DTE.md y lib/zerodteDiscover.ts.

import { discoverZeroDte } from "@/lib/zerodteDiscover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await discoverZeroDte();
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error en el descubridor 0DTE.";
    return Response.json({ error: message }, { status: 502 });
  }
}
