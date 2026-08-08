import { describe, expect, it } from "vitest";
import {
  extractSecret,
  filterAlerts,
  parseAlertBody,
  toAlert,
  verifySecret,
  type TradingViewAlert,
} from "./alert";

const CTX = { id: "id-1", receivedAt: "2026-08-08T12:00:00.000Z" };

describe("parseAlertBody", () => {
  it("parsea JSON", () => {
    expect(parseAlertBody('{"ticker":"SPY","action":"buy"}')).toEqual({
      ticker: "SPY",
      action: "buy",
    });
  });

  it("parsea clave=valor por líneas", () => {
    expect(parseAlertBody("ticker=SPY\naction=sell")).toEqual({
      ticker: "SPY",
      action: "sell",
    });
  });

  it("parsea clave: valor", () => {
    expect(parseAlertBody("ticker: QQQ")).toEqual({ ticker: "QQQ" });
  });

  it("rechaza cuerpo vacío o basura sin estructura", () => {
    expect(parseAlertBody("")).toBeNull();
    expect(parseAlertBody("   ")).toBeNull();
    expect(parseAlertBody("hola mundo sin nada")).toBeNull();
  });

  it("ignora un JSON que no es objeto (array o escalar)", () => {
    expect(parseAlertBody("[1,2,3]")).toBeNull();
    expect(parseAlertBody("42")).toBeNull();
  });
});

describe("extractSecret / verifySecret", () => {
  it("lee el secreto de passphrase, secret o token", () => {
    expect(extractSecret({ passphrase: "abc" })).toBe("abc");
    expect(extractSecret({ secret: "xyz" })).toBe("xyz");
    expect(extractSecret({ token: "tok" })).toBe("tok");
    expect(extractSecret({ ticker: "SPY" })).toBeNull();
  });

  it("acepta solo cuando el secreto coincide exactamente", () => {
    expect(verifySecret({ passphrase: "s3cr3t" }, "s3cr3t")).toBe(true);
    expect(verifySecret({ passphrase: "malo" }, "s3cr3t")).toBe(false);
  });

  it("rechaza si no hay secreto configurado o no viene en el payload", () => {
    expect(verifySecret({ passphrase: "x" }, undefined)).toBe(false);
    expect(verifySecret({ passphrase: "x" }, "")).toBe(false);
    expect(verifySecret({ ticker: "SPY" }, "x")).toBe(false);
  });
});

describe("toAlert", () => {
  it("normaliza ticker, acción, precio y timeframe", () => {
    const res = toAlert(
      { ticker: "$spy", action: "long", close: "512.30", interval: "5", strategy: "0DTE" },
      CTX,
    );
    expect("alert" in res).toBe(true);
    const a = (res as { alert: TradingViewAlert }).alert;
    expect(a.ticker).toBe("SPY");
    expect(a.action).toBe("buy");
    expect(a.price).toBe(512.3);
    expect(a.timeframe).toBe("5");
    expect(a.strategy).toBe("0DTE");
    expect(a.id).toBe("id-1");
  });

  it("mapea sell desde short/put/exit", () => {
    for (const v of ["short", "put", "sell", "exit"]) {
      const res = toAlert({ ticker: "SPY", action: v }, CTX);
      expect((res as { alert: TradingViewAlert }).alert.action).toBe("sell");
    }
  });

  it("cae en neutral cuando la acción es desconocida", () => {
    const res = toAlert({ ticker: "SPY", action: "???" }, CTX);
    expect((res as { alert: TradingViewAlert }).alert.action).toBe("neutral");
  });

  it("exige ticker", () => {
    const res = toAlert({ action: "buy" }, CTX);
    expect("error" in res).toBe(true);
  });

  it("nunca guarda el secreto en raw", () => {
    const res = toAlert({ ticker: "SPY", passphrase: "s3cr3t", foo: "bar" }, CTX);
    const a = (res as { alert: TradingViewAlert }).alert;
    expect(a.raw).not.toHaveProperty("passphrase");
    expect(a.raw).toHaveProperty("foo", "bar");
  });
});

describe("filterAlerts", () => {
  const mk = (id: string, ticker: string, receivedAt: string): TradingViewAlert => ({
    id,
    receivedAt,
    ticker,
    action: "neutral",
    price: null,
    timeframe: null,
    strategy: null,
    message: null,
    raw: {},
  });
  const items = [
    mk("a", "SPY", "2026-08-08T10:00:00.000Z"),
    mk("b", "QQQ", "2026-08-08T11:00:00.000Z"),
    mk("c", "SPY", "2026-08-08T12:00:00.000Z"),
  ];

  it("ordena más recientes primero", () => {
    expect(filterAlerts(items).map((a) => a.id)).toEqual(["c", "b", "a"]);
  });

  it("filtra por ticker (tolera $ y minúsculas)", () => {
    expect(filterAlerts(items, { ticker: "$spy" }).map((a) => a.id)).toEqual(["c", "a"]);
  });

  it("filtra por since (estrictamente posteriores)", () => {
    expect(
      filterAlerts(items, { since: "2026-08-08T10:00:00.000Z" }).map((a) => a.id),
    ).toEqual(["c", "b"]);
  });

  it("aplica limit tras ordenar", () => {
    expect(filterAlerts(items, { limit: 1 }).map((a) => a.id)).toEqual(["c"]);
  });
});
