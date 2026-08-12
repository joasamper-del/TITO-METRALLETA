// Ticket de orden — Fase 2 (solo PREPARAR, nunca ejecutar).
//
// Modelo común para las tres superficies que preparan operación (0DTE compra de
// opción, Wheel venta de put, Ticker acciones). Genera el texto del ticket y el
// comando de PREVIEW para el MCP de Robinhood (review_option_order /
// review_equity_order — NUNCA place_*). Funciones puras y testeables.

export type OrderSide = "buy" | "sell";
export type OrderInstrument = "option" | "equity";

export interface OrderSpec {
  side: OrderSide;
  ticker: string;
  instrument: OrderInstrument;
  /** Etiqueta del badge/acción: "COMPRAR CALLS", "VENDER PUT", "COMPRAR acciones"… */
  label: string;
  right?: "call" | "put"; // solo opción
  strike?: number; // solo opción
  expiration?: string; // solo opción (YYYY-MM-DD)
  /** Contratos (opción) o acciones (equity). null si no se pudo dimensionar. */
  quantity: number | null;
  /** Prima por contrato (opción) o precio por acción (equity). null = a mercado. */
  limit: number | null;
}

const sideWord = (s: OrderSide) => (s === "buy" ? "COMPRAR" : "VENDER");
const money2 = (n: number) => `$${n.toFixed(2)}`;

/** Coste/colateral estimado en $: opción = prima×100×qty; equity = precio×qty. */
export function orderCost(spec: OrderSpec): number | null {
  if (spec.quantity == null || spec.limit == null) return null;
  const mult = spec.instrument === "option" ? 100 : 1;
  return spec.quantity * spec.limit * mult;
}

/** Ticket legible para copiar / pasar al bróker. */
export function buildTicket(spec: OrderSpec): string {
  const qty = spec.quantity && spec.quantity > 0 ? String(spec.quantity) : "?";
  const lim = spec.limit != null ? ` · límite ${money2(spec.limit)}` : " · límite: confírmalo en tu bróker";
  if (spec.instrument === "option") {
    const strike = spec.strike != null ? `$${spec.strike}` : "(strike)";
    const right = (spec.right ?? "").toUpperCase();
    return `${sideWord(spec.side)} ${qty}x ${spec.ticker} ${spec.expiration ?? ""} ${strike} ${right}${lim}`.replace(/\s+/g, " ").trim();
  }
  return `${sideWord(spec.side)} ${qty} acciones de ${spec.ticker}${lim}`;
}

/** Comando de PREVIEW para el MCP de Robinhood. Nunca coloca — solo revisa. */
export function buildMcpCommand(spec: OrderSpec): string {
  const qty = spec.quantity && spec.quantity > 0 ? String(spec.quantity) : "?";
  const side = spec.side === "buy" ? "comprar" : "vender";
  const lim = spec.limit != null ? `precio límite ${money2(spec.limit)}.` : "a precio de mercado (confírmalo).";
  if (spec.instrument === "option") {
    const strike = spec.strike != null ? `$${spec.strike}` : "(strike)";
    return (
      `Revisa esta orden en Robinhood con review_option_order (solo PREVIEW, NO la coloques): ` +
      `${side} ${qty} contrato(s) de ${spec.ticker}, vencimiento ${spec.expiration ?? "(fecha)"}, ` +
      `strike ${strike}, tipo ${spec.right ?? "(call/put)"}, ${lim}`
    );
  }
  return (
    `Revisa esta orden en Robinhood con review_equity_order (solo PREVIEW, NO la coloques): ` +
    `${side} ${qty} acciones de ${spec.ticker}, ${lim}`
  );
}

export function robinhoodUrl(ticker: string): string {
  return `https://robinhood.com/stocks/${encodeURIComponent(ticker)}`;
}
