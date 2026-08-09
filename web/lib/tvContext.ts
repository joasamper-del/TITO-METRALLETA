// Contexto de TradingView — capa de CONFIRMACIÓN, no señal principal.
//
// Lee las alertas del webhook (`lib/alert.ts`) cuyo `raw.source` es uno de los 5
// indicadores del shortlist (ver INTEGRACION-TRADINGVIEW.md) y las clasifica en
// alcista / bajista / neutro para cruzarlas con la tesis de flujo/GEX. Marca si cada
// una **acompaña o contradice** esa tesis.
//
// REGLA CLAVE: esto NO produce score ni altera el scorecard 0-100. Es solo contexto.
// PURO — tests en tvContext.test.ts.

import type { TradingViewAlert } from "./alert";

export type TvSource = "RSI" | "ADX" | "SuperTrend" | "Squeeze" | "VolumeProfile";
export type TvBias = "bullish" | "bearish" | "neutral";
/** Dirección de la tesis de opciones (del GEX/predicción) con la que se cruza el contexto. */
export type ThesisDir = "up" | "down" | "flat" | null;

export interface TvContextSignal {
  id: string;
  receivedAt: string;
  ticker: string;
  source: TvSource;
  bias: TvBias;
  label: string;
  value: number | null;
  timeframe: string | null;
  agrees: "agree" | "disagree" | "neutral"; // vs la tesis de opciones
}

/** Orden de presentación fijo (momentum → tendencia → volatilidad → nivel). */
const DISPLAY_ORDER: TvSource[] = ["RSI", "ADX", "SuperTrend", "Squeeze", "VolumeProfile"];

const SOURCE_ALIASES: Record<string, TvSource> = {
  rsi: "RSI",
  adx: "ADX",
  supertrend: "SuperTrend",
  squeeze: "Squeeze",
  squeezemomentum: "Squeeze",
  volumeprofile: "VolumeProfile",
  vp: "VolumeProfile",
  poc: "VolumeProfile",
};

/** Reconoce el `source` de una alerta (case/símbolos-insensible). null si no es del shortlist. */
export function normalizeSource(raw: unknown): TvSource | null {
  if (typeof raw !== "string") return null;
  const key = raw.toLowerCase().replace(/[^a-z]/g, "");
  return SOURCE_ALIASES[key] ?? null;
}

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Clasifica una señal cruda en {bias, label}. PURO.
 * El `bias` es la lectura de contexto; el `label` es el texto legible para la cinta.
 */
export function classifySignal(
  source: TvSource,
  value: number | null,
  signal: string,
): { bias: TvBias; label: string } {
  const s = signal.toLowerCase();
  switch (source) {
    // Nota: el `label` NO repite el nombre del indicador — la cinta ya lo muestra aparte.
    case "RSI": {
      if (value == null) return { bias: "neutral", label: "—" };
      const zone = value >= 70 ? " · sobrecompra" : value <= 30 ? " · sobreventa" : "";
      const bias: TvBias = value >= 55 ? "bullish" : value <= 45 ? "bearish" : "neutral";
      return { bias, label: `${value.toFixed(0)}${zone}` };
    }
    case "ADX": {
      // ADX mide FUERZA de tendencia, no dirección → bias siempre neutral.
      if (value == null) return { bias: "neutral", label: "—" };
      const strength = value >= 25 ? "tendencia fuerte" : value < 20 ? "rango" : "moderada";
      return { bias: "neutral", label: `${value.toFixed(0)} · ${strength}` };
    }
    case "SuperTrend": {
      const bias: TvBias = /(^|[^a-z])(up|long|buy|bull|alcista|1)([^a-z]|$)/.test(s)
        ? "bullish"
        : /(^|[^a-z])(down|short|sell|bear|bajista|-1)([^a-z]|$)/.test(s)
          ? "bearish"
          : "neutral";
      return { bias, label: bias === "bullish" ? "alcista" : bias === "bearish" ? "bajista" : "—" };
    }
    case "Squeeze": {
      const comprimido = /\bon\b|comprim|squeeze/.test(s);
      const bias: TvBias =
        value != null && value > 0 ? "bullish" : value != null && value < 0 ? "bearish" : "neutral";
      const parts: string[] = [];
      if (comprimido) parts.push("comprimido");
      if (value != null && value > 0) parts.push("momentum+");
      else if (value != null && value < 0) parts.push("momentum−");
      return { bias, label: parts.length > 0 ? parts.join(" · ") : "—" };
    }
    case "VolumeProfile": {
      return { bias: "neutral", label: value != null ? `POC ${value}` : "Volume Profile" };
    }
  }
}

function agreesWith(bias: TvBias, thesis: ThesisDir): TvContextSignal["agrees"] {
  if (bias === "neutral" || thesis == null || thesis === "flat") return "neutral";
  if ((bias === "bullish" && thesis === "up") || (bias === "bearish" && thesis === "down")) {
    return "agree";
  }
  return "disagree";
}

/**
 * Del buzón de alertas, toma la más reciente por cada `source` del shortlist para el
 * ticker dado, la clasifica y marca acuerdo/desacuerdo con la tesis. Devuelve las
 * señales en orden de presentación fijo. PURO.
 */
export function tvContext(
  alerts: TradingViewAlert[],
  opts: { ticker?: string; thesis?: ThesisDir } = {},
): TvContextSignal[] {
  const ticker = opts.ticker?.trim().toUpperCase();
  const sorted = [...alerts].sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));

  const seen = new Set<TvSource>();
  const out: TvContextSignal[] = [];
  for (const a of sorted) {
    if (ticker && a.ticker !== ticker) continue;
    const source = normalizeSource(a.raw?.source);
    if (!source || seen.has(source)) continue;
    seen.add(source);

    const value = num(a.raw?.value) ?? num(a.raw?.[source.toLowerCase()]);
    const rawSignal = a.raw?.signal ?? a.raw?.action;
    const signal = typeof rawSignal === "string" ? rawSignal : "";
    const { bias, label } = classifySignal(source, value, signal);

    out.push({
      id: a.id,
      receivedAt: a.receivedAt,
      ticker: a.ticker,
      source,
      bias,
      label,
      value,
      timeframe: a.timeframe,
      agrees: agreesWith(bias, opts.thesis ?? null),
    });
  }

  return out.sort((x, y) => DISPLAY_ORDER.indexOf(x.source) - DISPLAY_ORDER.indexOf(y.source));
}
