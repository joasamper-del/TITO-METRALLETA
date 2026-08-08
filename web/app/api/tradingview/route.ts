// /api/tradingview — buzón de entrada de alertas de TradingView (webhook).
//
//   POST  (cuerpo JSON o clave=valor)  → valida el secreto y guarda la alerta
//   GET   ?ticker=&since=&limit=        → alertas recientes (más nuevas primero)
//
// TradingView no manda headers personalizados, así que la autenticación es un secreto
// compartido DENTRO del cuerpo (`passphrase`), comparado contra TRADINGVIEW_WEBHOOK_SECRET.
// La ruta solo valida y persiste (buzón pasivo): Tito procesa las alertas leyéndolas por GET,
// igual que el agente lee `pending` en /api/watchlist. Toda la lógica pura vive en `alert.ts`.

import { filterAlerts, parseAlertBody, toAlert, verifySecret } from "@/lib/alert";
import { appendAlert, loadAlerts } from "@/lib/alertStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Una alerta de TradingView cabe de sobra aquí; más que esto es abuso.
const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: Request) {
  const secret = process.env.TRADINGVIEW_WEBHOOK_SECRET;
  if (!secret) {
    // Sin secreto configurado no se acepta nada: un webhook público abierto es una puerta.
    return Response.json({ error: "Webhook no configurado en el servidor." }, { status: 503 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: "Cuerpo demasiado grande." }, { status: 413 });
  }

  const payload = parseAlertBody(raw);
  if (!payload) {
    return Response.json({ error: "Cuerpo ilegible (se esperaba JSON o clave=valor)." }, { status: 400 });
  }

  if (!verifySecret(payload, secret)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const result = toAlert(payload, {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
  });
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const saved = await appendAlert(result.alert);
  return Response.json({ ok: true, id: result.alert.id, stored: saved.items.length });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit"));
  const { items } = await loadAlerts();
  const alerts = filterAlerts(items, {
    ticker: searchParams.get("ticker"),
    since: searchParams.get("since"),
    limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
  });
  return Response.json({ count: alerts.length, alerts });
}
