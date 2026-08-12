import { describe, expect, it } from "vitest";
import { buildMcpCommand, buildTicket, orderCost, type OrderSpec } from "./orderTicket";

const optionBuy: OrderSpec = {
  side: "buy", ticker: "NVDA", instrument: "option", label: "COMPRAR CALLS",
  right: "call", strike: 225, expiration: "2026-08-12", quantity: 3, limit: 1.2,
};
const putSell: OrderSpec = {
  side: "sell", ticker: "UBER", instrument: "option", label: "VENDER PUT",
  right: "put", strike: 72.5, expiration: "2026-09-18", quantity: 1, limit: 1.2,
};
const equityBuy: OrderSpec = {
  side: "buy", ticker: "AMD", instrument: "equity", label: "COMPRAR acciones",
  quantity: 20, limit: 168.5,
};

describe("orderCost", () => {
  it("opción = prima × 100 × qty", () => {
    expect(orderCost(optionBuy)).toBeCloseTo(360);
  });
  it("equity = precio × qty", () => {
    expect(orderCost(equityBuy)).toBeCloseTo(3370);
  });
  it("sin cantidad o límite → null", () => {
    expect(orderCost({ ...optionBuy, quantity: null })).toBeNull();
    expect(orderCost({ ...optionBuy, limit: null })).toBeNull();
  });
});

describe("buildTicket", () => {
  it("compra de opción", () => {
    expect(buildTicket(optionBuy)).toBe("COMPRAR 3x NVDA 2026-08-12 $225 CALL · límite $1.20");
  });
  it("venta de put", () => {
    expect(buildTicket(putSell)).toBe("VENDER 1x UBER 2026-09-18 $72.5 PUT · límite $1.20");
  });
  it("equity", () => {
    expect(buildTicket(equityBuy)).toBe("COMPRAR 20 acciones de AMD · límite $168.50");
  });
  it("sin límite avisa que se confirme en el bróker", () => {
    expect(buildTicket({ ...equityBuy, limit: null })).toContain("confírmalo en tu bróker");
  });
});

describe("buildMcpCommand", () => {
  it("opción usa review_option_order y dice PREVIEW", () => {
    const c = buildMcpCommand(optionBuy);
    expect(c).toContain("review_option_order");
    expect(c).toContain("PREVIEW");
    expect(c).not.toContain("place_");
  });
  it("equity usa review_equity_order", () => {
    expect(buildMcpCommand(equityBuy)).toContain("review_equity_order");
  });
  it("venta de put dice vender", () => {
    expect(buildMcpCommand(putSell)).toContain("vender");
  });
});
