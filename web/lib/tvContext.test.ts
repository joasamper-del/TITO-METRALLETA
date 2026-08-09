import { describe, expect, it } from "vitest";
import {
  classifySignal,
  normalizeSource,
  tvContext,
  type TvSource,
} from "./tvContext";
import type { TradingViewAlert } from "./alert";

function alert(
  raw: Record<string, unknown>,
  over: Partial<TradingViewAlert> = {},
): TradingViewAlert {
  return {
    id: over.id ?? "id-" + Math.random().toString(36).slice(2),
    receivedAt: over.receivedAt ?? "2026-08-08T12:00:00.000Z",
    ticker: over.ticker ?? "SPY",
    action: over.action ?? "neutral",
    price: over.price ?? null,
    timeframe: over.timeframe ?? "5",
    strategy: over.strategy ?? null,
    message: over.message ?? null,
    raw: { ticker: over.ticker ?? "SPY", ...raw },
  };
}

describe("normalizeSource", () => {
  it("reconoce los alias del shortlist", () => {
    expect(normalizeSource("RSI")).toBe("RSI");
    expect(normalizeSource("rsi")).toBe("RSI");
    expect(normalizeSource("SuperTrend")).toBe("SuperTrend");
    expect(normalizeSource("Squeeze Momentum")).toBe("Squeeze");
    expect(normalizeSource("VP")).toBe("VolumeProfile");
    expect(normalizeSource("poc")).toBe("VolumeProfile");
  });
  it("rechaza lo que no es del shortlist", () => {
    expect(normalizeSource("MACD")).toBeNull();
    expect(normalizeSource(42)).toBeNull();
    expect(normalizeSource(undefined)).toBeNull();
  });
});

describe("classifySignal", () => {
  it("RSI: zonas y sesgo por la línea 50", () => {
    expect(classifySignal("RSI", 28, "")).toMatchObject({ bias: "bearish" });
    expect(classifySignal("RSI", 28, "").label).toContain("sobreventa");
    expect(classifySignal("RSI", 75, "")).toMatchObject({ bias: "bullish" });
    expect(classifySignal("RSI", 75, "").label).toContain("sobrecompra");
    expect(classifySignal("RSI", 50, "")).toMatchObject({ bias: "neutral" });
  });
  it("ADX: siempre neutral (mide fuerza, no dirección)", () => {
    expect(classifySignal("ADX", 30, "").bias).toBe("neutral");
    expect(classifySignal("ADX", 30, "").label).toContain("tendencia fuerte");
    expect(classifySignal("ADX", 15, "").label).toContain("rango");
  });
  it("SuperTrend: dirección desde la señal", () => {
    expect(classifySignal("SuperTrend", null, "up").bias).toBe("bullish");
    expect(classifySignal("SuperTrend", null, "sell").bias).toBe("bearish");
    expect(classifySignal("SuperTrend", null, "").bias).toBe("neutral");
  });
  it("Squeeze: sesgo por el signo del momentum + estado comprimido", () => {
    expect(classifySignal("Squeeze", 1.2, "on").bias).toBe("bullish");
    expect(classifySignal("Squeeze", -0.5, "off").bias).toBe("bearish");
    expect(classifySignal("Squeeze", 1.2, "on").label).toContain("comprimido");
  });
  it("VolumeProfile: neutral con el POC en la etiqueta", () => {
    expect(classifySignal("VolumeProfile", 512.5, "")).toEqual({
      bias: "neutral",
      label: "POC 512.5",
    });
  });
});

describe("tvContext", () => {
  it("toma la más reciente por source y respeta el orden de presentación", () => {
    const alerts = [
      alert({ source: "RSI", value: 20 }, { id: "rsi-old", receivedAt: "2026-08-08T10:00:00.000Z" }),
      alert({ source: "RSI", value: 80 }, { id: "rsi-new", receivedAt: "2026-08-08T11:00:00.000Z" }),
      alert({ source: "SuperTrend", signal: "up" }, { id: "st" }),
    ];
    const ctx = tvContext(alerts, { ticker: "SPY" });
    // RSI antes que SuperTrend por el orden fijo
    expect(ctx.map((s) => s.source)).toEqual(["RSI", "SuperTrend"]);
    // la más reciente de RSI (80) gana
    expect(ctx[0].id).toBe("rsi-new");
    expect(ctx[0].value).toBe(80);
  });

  it("filtra por ticker", () => {
    const alerts = [
      alert({ source: "RSI", value: 60 }, { ticker: "NVDA" }),
      alert({ source: "ADX", value: 30 }, { ticker: "SPY" }),
    ];
    expect(tvContext(alerts, { ticker: "SPY" }).map((s) => s.source)).toEqual(["ADX"]);
  });

  it("marca acuerdo/desacuerdo con la tesis de opciones", () => {
    const alerts = [
      alert({ source: "RSI", value: 70 }, { id: "r" }),        // bullish
      alert({ source: "SuperTrend", signal: "down" }, { id: "s" }), // bearish
      alert({ source: "ADX", value: 30 }, { id: "a" }),        // neutral
    ];
    const ctx = tvContext(alerts, { ticker: "SPY", thesis: "up" });
    const by = Object.fromEntries(ctx.map((s) => [s.source, s.agrees]));
    expect(by.RSI).toBe("agree");       // bullish vs tesis up
    expect(by.SuperTrend).toBe("disagree"); // bearish vs tesis up
    expect(by.ADX).toBe("neutral");     // sin dirección
  });

  it("ignora alertas sin source del shortlist", () => {
    const alerts = [alert({ source: "MACD", value: 1 }), alert({ foo: "bar" })];
    expect(tvContext(alerts, { ticker: "SPY" })).toHaveLength(0);
  });
});
