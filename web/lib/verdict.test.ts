import { describe, expect, it } from "vitest";
import { canPrepareTrade, fromPrediction, fromZeroDte } from "./verdict";
import type { Verdict } from "./zerodteVerdict";
import type { ProPrediction } from "./prediction";

const zd = (over: Partial<Verdict>): Verdict =>
  ({
    action: "COMPRAR",
    actionLabel: "COMPRAR CALLS",
    bias: "alcista",
    confidence: "media",
    confidencePct: 58,
    strategy: "",
    reason: "",
    invalidation: "",
    reviewWhen: "",
    targetRange: null,
    assumptions: null,
    levels: { magnet: null, resistance: null, support: null, flip: null },
    scenarios: [],
    noTrade: false,
    ...over,
  }) as Verdict;

const pred = (over: Partial<ProPrediction>): ProPrediction =>
  ({
    horizonDays: 10,
    spot: 100,
    iv: 0.3,
    bear: {} as ProPrediction["bear"],
    base: {} as ProPrediction["base"],
    bull: {} as ProPrediction["bull"],
    score: 60,
    active: 6,
    confidence: 60,
    levels: [],
    direction: "up",
    summary: "",
    caveat: null,
    calibration: { applied: false, shiftPct: 0, samples: 0 },
    ...over,
  }) as ProPrediction;

describe("canPrepareTrade (gate duro)", () => {
  it("solo COMPRAR habilita preparar operación", () => {
    expect(canPrepareTrade({ action: "COMPRAR" })).toBe(true);
    expect(canPrepareTrade({ action: "ESPERAR" })).toBe(false);
    expect(canPrepareTrade({ action: "NO_OPERAR" })).toBe(false);
  });
});

describe("fromZeroDte", () => {
  it("COMPRAR alcista → label CALLS", () => {
    expect(fromZeroDte(zd({ action: "COMPRAR", bias: "alcista" })).label).toBe("CALLS");
  });
  it("COMPRAR bajista → label PUTS", () => {
    expect(fromZeroDte(zd({ action: "COMPRAR", bias: "bajista", actionLabel: "COMPRAR PUTS" })).label).toBe("PUTS");
  });
  it("NO_OPERAR → label NO OP. y source 0dte", () => {
    const u = fromZeroDte(zd({ action: "NO_OPERAR", bias: "neutral" }));
    expect(u.label).toBe("NO OP.");
    expect(u.source).toBe("0dte");
  });
});

describe("fromPrediction", () => {
  it("caveat de liquidez → NO OPERAR", () => {
    expect(fromPrediction(pred({ caveat: "cadena ilíquida" })).action).toBe("NO_OPERAR");
  });
  it("dirección flat → NO OPERAR (neutral)", () => {
    const u = fromPrediction(pred({ direction: "flat" }));
    expect(u.action).toBe("NO_OPERAR");
    expect(u.bias).toBe("neutral");
  });
  it("alcista con confianza ≥50 → COMPRAR", () => {
    const u = fromPrediction(pred({ direction: "up", confidence: 60 }));
    expect(u.action).toBe("COMPRAR");
    expect(u.bias).toBe("alcista");
  });
  it("direccional con confianza <50 → ESPERAR", () => {
    const u = fromPrediction(pred({ direction: "down", confidence: 40 }));
    expect(u.action).toBe("ESPERAR");
    expect(u.bias).toBe("bajista");
  });
  it("null → NO OPERAR", () => {
    expect(fromPrediction(null).action).toBe("NO_OPERAR");
  });
});
