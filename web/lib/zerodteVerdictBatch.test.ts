import { describe, expect, it } from "vitest";
import { parseTickers } from "./zerodteVerdictBatch";

describe("parseTickers", () => {
  it("normaliza a mayúsculas y recorta espacios", () => {
    expect(parseTickers("spy, qqq ,AmD")).toEqual(["SPY", "QQQ", "AMD"]);
  });
  it("deduplica", () => {
    expect(parseTickers("SPY,SPY,QQQ")).toEqual(["SPY", "QQQ"]);
  });
  it("descarta entradas inválidas (vacías, símbolos raros, muy largas)", () => {
    expect(parseTickers("SPY,,123$,TOOOLONGGG,QQQ")).toEqual(["SPY", "QQQ"]);
  });
  it("acepta puntos (ej. BRK.B) y limita la cantidad", () => {
    expect(parseTickers("BRK.B")).toEqual(["BRK.B"]);
    expect(parseTickers("A,B,C,D,E", 3)).toEqual(["A", "B", "C"]);
  });
  it("null o vacío → []", () => {
    expect(parseTickers(null)).toEqual([]);
    expect(parseTickers("")).toEqual([]);
  });
});
