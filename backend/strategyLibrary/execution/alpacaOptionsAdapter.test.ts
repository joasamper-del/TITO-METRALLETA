/**
 * Alpaca Options Adapter Tests
 * Validates Bear Put Spread and Wheel strategy execution
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AlpacaOptionsAdapter } from "./alpacaOptionsAdapter";

describe("AlpacaOptionsAdapter", () => {
  let adapter: AlpacaOptionsAdapter;

  beforeEach(() => {
    adapter = new AlpacaOptionsAdapter("test-key", "test-secret");
  });

  describe("BearPutSpread", () => {
    it("should place bear put spread order", async () => {
      const result = await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261021",
        quantity: 1,
        clientOrderId: "test-1",
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.orderId).toContain("spread_");
    });

    it("should validate strike prices (short > long for puts)", async () => {
      const result = await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 448,
        longStrike: 450, // Invalid: short strike lower than long
        expiration: "261021",
        quantity: 1,
        clientOrderId: "test-2",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Short strike must be higher");
    });

    it("should create two-leg position", async () => {
      await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261021",
        quantity: 1,
        clientOrderId: "test-3",
      });

      const positions = adapter.getPositionsBySymbol("SPY");
      expect(positions.length).toBe(1);
      expect(positions[0].legs.length).toBe(2);
      expect(positions[0].legs[0].side).toBe("sell");
      expect(positions[0].legs[1].side).toBe("buy");
    });

    it("should calculate max loss (strike difference)", async () => {
      const shortStrike = 450;
      const longStrike = 448;
      const quantity = 1;

      await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike,
        longStrike,
        expiration: "261021",
        quantity,
        clientOrderId: "test-4",
      });

      const positions = adapter.getPositionsBySymbol("SPY");
      const expectedMaxLoss = (shortStrike - longStrike) * quantity * 100;
      expect(positions[0].maxLoss).toBe(expectedMaxLoss);
    });

    it("should track DTE (days to expiration)", async () => {
      await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261021",
        quantity: 1,
        clientOrderId: "test-5",
      });

      const positions = adapter.getPositionsBySymbol("SPY");
      expect(positions[0].daysToExpiration).toBeGreaterThanOrEqual(40); // ~47 days to Oct 26
      expect(positions[0].daysToExpiration).toBeLessThanOrEqual(50);
    });
  });

  describe("Wheel Strategy", () => {
    it("should place put sale order", async () => {
      const result = await adapter.placeWheelPutSale({
        symbol: "QQQ",
        strikePrice: 300,
        expiration: "261021",
        quantity: 1,
        clientOrderId: "wheel-1",
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.orderId).toContain("wheel_");
    });

    it("should create single-leg position for put sale", async () => {
      await adapter.placeWheelPutSale({
        symbol: "QQQ",
        strikePrice: 300,
        expiration: "261021",
        quantity: 1,
        clientOrderId: "wheel-2",
      });

      const positions = adapter.getPositionsBySymbol("QQQ");
      expect(positions.length).toBe(1);
      expect(positions[0].legs.length).toBe(1);
      expect(positions[0].legs[0].side).toBe("sell");
      expect(positions[0].legs[0].optionType).toBe("put");
    });

    it("should calculate max loss as strike value", async () => {
      const strikePrice = 300;
      const quantity = 1;

      await adapter.placeWheelPutSale({
        symbol: "QQQ",
        strikePrice,
        expiration: "261021",
        quantity,
        clientOrderId: "wheel-3",
      });

      const positions = adapter.getPositionsBySymbol("QQQ");
      const expectedMaxLoss = strikePrice * quantity * 100;
      expect(positions[0].maxLoss).toBe(expectedMaxLoss);
    });
  });

  describe("Position Management", () => {
    it("should retrieve all positions", async () => {
      await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261021",
        quantity: 1,
        clientOrderId: "pos-1",
      });

      await adapter.placeWheelPutSale({
        symbol: "QQQ",
        strikePrice: 300,
        expiration: "261021",
        quantity: 1,
        clientOrderId: "pos-2",
      });

      const allPositions = adapter.getPositions();
      expect(allPositions.length).toBeGreaterThanOrEqual(2);
    });

    it("should get positions by symbol", async () => {
      await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261021",
        quantity: 1,
        clientOrderId: "sym-1",
      });

      await adapter.placeWheelPutSale({
        symbol: "QQQ",
        strikePrice: 300,
        expiration: "261021",
        quantity: 1,
        clientOrderId: "sym-2",
      });

      const spyPositions = adapter.getPositionsBySymbol("SPY");
      const qqqPositions = adapter.getPositionsBySymbol("QQQ");

      expect(spyPositions.length).toBe(1);
      expect(qqqPositions.length).toBe(1);
      expect(spyPositions[0].symbol).toBe("SPY");
      expect(qqqPositions[0].symbol).toBe("QQQ");
    });

    it("should close all positions", async () => {
      await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261021",
        quantity: 1,
        clientOrderId: "close-1",
      });

      await adapter.placeWheelPutSale({
        symbol: "QQQ",
        strikePrice: 300,
        expiration: "261021",
        quantity: 1,
        clientOrderId: "close-2",
      });

      const result = await adapter.closeAllPositions();
      expect(result.success).toBe(true);
      expect(result.closedCount).toBeGreaterThanOrEqual(2);

      const remainingActive = adapter.getPositions().filter((p) => p.status === "active");
      expect(remainingActive.length).toBe(0);
    });
  });

  describe("Option Symbol Building", () => {
    it("should build correct OCC format symbol", async () => {
      await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261021",
        quantity: 1,
        clientOrderId: "symbol-test",
      });

      const positions = adapter.getPositionsBySymbol("SPY");
      const shortLeg = positions[0].legs[0];
      const longLeg = positions[0].legs[1];

      // Should contain expiration and type indicator
      expect(shortLeg.optionSymbol).toContain("261021");
      expect(shortLeg.optionSymbol).toContain("P"); // Put
      expect(longLeg.optionSymbol).toContain("P");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid parameters gracefully", async () => {
      const result = await adapter.placeBearPutSpread({
        symbol: "",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261021",
        quantity: 0,
        clientOrderId: "error-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should track strategy name", async () => {
      await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261021",
        quantity: 1,
        clientOrderId: "strategy-name-test",
      });

      const positions = adapter.getPositionsBySymbol("SPY");
      expect(positions[0].strategyName).toBe("BearPutSpread");
    });
  });
});
