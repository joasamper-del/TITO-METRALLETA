// Lógica PURA del webhook de TradingView (sin I/O ni red — testeada en alert.test.ts).
//
// TradingView dispara una alerta y hace POST del cuerpo que tú definas en la caja
// "Message" de la alerta. Dos verdades incómodas de ese webhook mandan aquí:
//
//   1. NO permite headers personalizados → no hay forma de firmar la petición. La
//      única autenticación posible es un secreto compartido DENTRO del cuerpo
//      (`passphrase`/`secret`). Por eso `verifySecret` lee del payload, no del header.
//   2. El Content-Type suele llegar como text/plain aunque el cuerpo sea JSON. Por eso
//      `parseAlertBody` recibe el texto crudo y prueba JSON y luego clave=valor, en vez
//      de confiar en `request.json()`.
//
// El endpoint solo valida y guarda (buzón pasivo). Tito procesa las alertas leyéndolas
// después por `GET /api/tradingview`.

/** Alerta ya normalizada, tal como se persiste y se sirve. Nunca incluye el secreto. */
export interface TradingViewAlert {
  id: string;
  receivedAt: string; // ISO 8601
  ticker: string; // siempre en mayúsculas
  action: "buy" | "sell" | "neutral";
  price: number | null;
  timeframe: string | null; // el {{interval}} de TradingView (p. ej. "5", "1D")
  strategy: string | null; // nombre de la estrategia/alerta que la disparó
  message: string | null; // texto legible para humanos
  raw: Record<string, unknown>; // payload original SIN el secreto, para auditoría
}

/** Claves que llevan el secreto compartido; se aceptan varias por comodidad al configurar. */
const SECRET_KEYS = ["passphrase", "secret", "token"] as const;

/**
 * Parsea el cuerpo crudo del webhook. Prueba JSON primero; si no, `clave=valor`
 * (una por línea, también admite `clave: valor`). Devuelve un objeto plano o `null`
 * si no se pudo sacar nada estructurado.
 */
export function parseAlertBody(rawBody: string): Record<string, unknown> | null {
  const text = rawBody?.trim();
  if (!text) return null;

  // 1) JSON — el formato recomendado en la caja Message de la alerta.
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // no era JSON; seguimos con clave=valor
  }

  // 2) clave=valor / clave: valor, una por línea.
  const out: Record<string, unknown> = {};
  let found = false;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.\-]+)\s*[=:]\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim();
    found = true;
  }
  return found ? out : null;
}

/** Lee el secreto compartido del payload (primera clave presente de SECRET_KEYS). */
export function extractSecret(payload: Record<string, unknown>): string | null {
  for (const k of SECRET_KEYS) {
    const v = payload[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

/**
 * Compara el secreto del payload con el esperado en tiempo (casi) constante para no
 * filtrar la longitud por timing. Si no hay secreto configurado o no viene en el
 * payload, es un NO — un webhook público sin secreto no se acepta jamás.
 */
export function verifySecret(payload: Record<string, unknown>, expected: string | undefined): boolean {
  if (!expected) return false;
  const got = extractSecret(payload);
  if (!got) return false;
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function asString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Normaliza texto de acción a las tres únicas que maneja el sistema. */
function normalizeAction(v: unknown): "buy" | "sell" | "neutral" {
  const s = asString(v)?.toLowerCase() ?? "";
  if (/\b(buy|long|bull|call)\b/.test(s)) return "buy";
  if (/\b(sell|short|bear|put|exit|close)\b/.test(s)) return "sell";
  return "neutral";
}

/**
 * Convierte un payload parseado en una alerta normalizada. Requiere al menos `ticker`
 * (con o sin símbolo `$`). Tolera nombres alternativos de campo porque cada estrategia
 * de TradingView rotula distinto.
 */
export function toAlert(
  payload: Record<string, unknown>,
  ctx: { id: string; receivedAt: string },
): { alert: TradingViewAlert } | { error: string } {
  const tickerRaw =
    asString(payload.ticker) ?? asString(payload.symbol) ?? asString(payload.tick);
  if (!tickerRaw) return { error: "Falta 'ticker' en la alerta." };
  const ticker = tickerRaw.replace(/^\$/, "").toUpperCase();

  // El payload de auditoría nunca guarda el secreto.
  const raw: Record<string, unknown> = { ...payload };
  for (const k of SECRET_KEYS) delete raw[k];

  const action = normalizeAction(payload.action ?? payload.side ?? payload.signal);
  const price =
    asNumber(payload.price) ?? asNumber(payload.close) ?? asNumber(payload.last);
  const timeframe =
    asString(payload.timeframe) ?? asString(payload.interval) ?? asString(payload.tf);
  const strategy =
    asString(payload.strategy) ?? asString(payload.alert) ?? asString(payload.name);
  const message =
    asString(payload.message) ?? asString(payload.comment) ?? asString(payload.text);

  return {
    alert: {
      id: ctx.id,
      receivedAt: ctx.receivedAt,
      ticker,
      action,
      price,
      timeframe,
      strategy,
      message,
      raw,
    },
  };
}

/**
 * Filtra y ordena alertas para servirlas (más recientes primero). PURO: la ruta le
 * pasa lo que cargó del store. `since` es un ISO/`receivedAt`; se devuelven las
 * estrictamente posteriores.
 */
export function filterAlerts(
  items: TradingViewAlert[],
  opts: { ticker?: string | null; since?: string | null; limit?: number } = {},
): TradingViewAlert[] {
  const ticker = opts.ticker?.trim().replace(/^\$/, "").toUpperCase();
  const since = opts.since?.trim();
  let out = items;
  if (ticker) out = out.filter((a) => a.ticker === ticker);
  if (since) out = out.filter((a) => a.receivedAt > since);
  out = [...out].sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  if (opts.limit && opts.limit > 0) out = out.slice(0, opts.limit);
  return out;
}
