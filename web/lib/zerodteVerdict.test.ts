import { describe, expect, it } from "vitest";
import { buildVerdict } from "./zerodteVerdict";
import type { ZeroDteResult } from "./zerodte";

// Base mínima de un ZeroDteResult; cada test sobreescribe lo que le importa.
function make(over: Partial<ZeroDteResult> = {}): ZeroDteResult {
  const base: ZeroDteResult = {
    ticker: "SPX",
    expiration: "2026-08-12",
    isToday: true,
    spot: 5000,
    delayed: false,
    contractCount: 100,
    realtimeStrikes: 0,
    realtimeAgeSec: null,
    lines: [],
    summary: {
      maxCallStrike: 5050,
      maxCallVolume: 1000,
      maxPutStrike: 4950,
      maxPutVolume: 900,
      putCallRatio: 0.9,
      putVolume: 900,
      callVolume: 1000,
    },
    forecast: {
      spot: 5000,
      iv: 0.15,
      hoursToClose: 3,
      sigma: 25,
      sigmaPct: 0.5,
      upper1: 5025,
      lower1: 4975,
      upper2: 5050,
      lower2: 4950,
      caveat: null,
      scenarios: [
        { kind: "bull", target: 5030, changePct: 0.6, probTouch: 0.4, reason: "hacia el call wall" },
        { kind: "base", target: 5000, changePct: 0, probTouch: 0.7, reason: "pin al imán" },
        { kind: "bear", target: 4970, changePct: -0.6, probTouch: 0.4, reason: "hacia el put wall" },
      ],
    },
    outlook: {
      horizonMinutes: 5,
      spot: 5000,
      rangeLow: 4980,
      rangeHigh: 5020,
      magnet: 5000,
      regime: "positive",
      lean: "lateral",
      detail: "detalle del panorama",
      headline: "titular",
      confidence: "media",
      sigma: 20,
      charmIntensity: null,
      charmNote: null,
      vannaNote: null,
    },
    dealerFlow: null,
    closing: null,
    gex: {
      nodes: [],
      kingStrike: 5000,
      flipStrike: 4975,
      regime: "positive",
      totalNetGex: 100,
      realGammaShare: 0.8,
      n: 10,
    },
    asOf: new Date().toISOString(),
  } as ZeroDteResult;
  return { ...base, ...over };
}

describe("buildVerdict", () => {
  it("vista a futuro → NO OPERAR y HOY NO HAY TRADE", () => {
    const v = buildVerdict(make({ isToday: false }));
    expect(v.action).toBe("NO_OPERAR");
    expect(v.noTrade).toBe(true);
  });

  it("gamma positiva anclada al imán (lateral) → NO OPERAR direccional", () => {
    const v = buildVerdict(make()); // lean lateral, regime positive, magnet set
    expect(v.bias).toBe("neutral");
    expect(v.action).toBe("NO_OPERAR");
    expect(v.noTrade).toBe(true);
  });

  it("neutral con gamma negativa (sin anclaje) también → NO OPERAR", () => {
    const v = buildVerdict(
      make({
        outlook: { ...make().outlook!, lean: "lateral", regime: "negative" },
        gex: { ...make().gex, regime: "negative" },
      }),
    );
    expect(v.bias).toBe("neutral");
    expect(v.action).toBe("NO_OPERAR");
    expect(v.actionLabel).toBe("NO OPERAR");
    expect(v.noTrade).toBe(true);
  });

  it("sesgo alcista con confianza media → COMPRAR CALLS", () => {
    const v = buildVerdict(
      make({
        outlook: {
          ...make().outlook!,
          lean: "alcista",
          confidence: "media",
        },
      }),
    );
    expect(v.action).toBe("COMPRAR");
    expect(v.actionLabel).toBe("COMPRAR CALLS");
    expect(v.targetRange).not.toBeNull();
  });

  it("sesgo bajista con confianza baja → ESPERAR confirmación", () => {
    const v = buildVerdict(
      make({
        outlook: {
          ...make().outlook!,
          lean: "bajista",
          confidence: "baja",
        },
      }),
    );
    expect(v.action).toBe("ESPERAR");
    expect(v.confidencePct).toBe(35);
  });

  it("cerca del cierre con anclaje fuerte sube la confianza a alta", () => {
    const v = buildVerdict(
      make({
        outlook: { ...make().outlook!, lean: "alcista", confidence: "media" },
        closing: {
          phase: "live",
          minutesLeft: 10,
          spot: 5000,
          magnet: 5000,
          regime: "positive",
          estimate: 5009.4,
          strike: 5010,
          rangeLow: 4990,
          rangeHigh: 5030,
          sigma: 12,
          confidence: "alta",
          note: "",
        },
      }),
    );
    expect(v.confidence).toBe("alta");
    expect(v.confidencePct).toBe(75);
  });

  it("el objetivo siempre es un rango, nunca un precio único", () => {
    const v = buildVerdict(make({ outlook: { ...make().outlook!, lean: "alcista", confidence: "media" } }));
    expect(v.targetRange).toHaveLength(2);
    expect(v.targetRange![0]).toBeLessThanOrEqual(v.targetRange![1]);
  });
});
