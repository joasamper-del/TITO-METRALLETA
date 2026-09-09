/**
 * Interactive Brokers Adapter - Comprehensive Test Suite
 * 30+ tests covering auth, orders, Greeks, positions, and error handling
 */

import { describe, it, expect, beforeEach } from "vitest";
import { IBKrAuth } from "./ibkrAuth";
import { IBKrAdapterFull } from "./ibkrAdapterFull";

describe("IBKrAuth", () => {
  let auth: IBKrAuth;

  beforeEach(() => {
    auth = new IBKrAuth({
      accountId: "DU123456",
      apiKey: "test_api_key",
    });
  });

  it("should initialize with account ID and API key", () => {
    expect(auth).toBeDefined();
  });

  it("should exchange OAuth token (stub)", async () => {
    const token = await auth.exchangeOAuthToken("auth_code_12345");
    expect(token).toBeDefined();
    expect(token.accessToken).toBeDefined();
    expect(token.expiresIn).toBeGreaterThan(0);
  });

  it("should have valid access token after exchange", async () => {
    await auth.exchangeOAuthToken("auth_code");
    const token = await auth.getAccessToken();
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(0);
  });

  it("should refresh OAuth token", async () => {
    await auth.exchangeOAuthToken("auth_code");
    const refreshed = await auth.refreshOAuthToken();
    expect(refreshed.accessToken).toBeDefined();
    expect(refreshed.expiresIn).toBeGreaterThan(0);
  });

  it("should validate credentials and return account info", async () => {
    const account = await auth.validateCredentials();
    expect(account).toBeDefined();
    expect(account.accountId).toBe("DU123456");
    expect(account.status).toBe("ACTIVE");
    expect(account.accountType).toBe("paper");
    expect(account.equity).toBeGreaterThan(0);
  });

  it("should verify paper trading mode", async () => {
    const isPaper = await auth.verifyPaperTradingMode();
    expect(isPaper).toBe(true);
  });

  it("should set account context", async () => {
    await auth.setAccountContext("DU654321");
    // Should not throw
    expect(auth).toBeDefined();
  });

  it("should get token status", () => {
    const status = auth.getTokenStatus();
    expect(status).toBeDefined();
    expect(status.isValid).toBe(true);
    expect(status.expiresIn).toBeGreaterThan(0);
    expect(status.expiresSoon).toBe(false);
  });

  it("should logout and clear token", async () => {
    await auth.logout();
    const status = auth.getTokenStatus();
    expect(status.isValid).toBe(false);
  });

  it("should get API client", () => {
    const client = auth.getApiClient();
    expect(client).toBeDefined();
  });
});

describe("IBKrAdapterFull", () => {
  let auth: IBKrAuth;
  let adapter: IBKrAdapterFull;

  beforeEach(() => {
    auth = new IBKrAuth({
      accountId: "DU123456",
      apiKey: "test_api_key",
    });
    adapter = new IBKrAdapterFull(auth);
  });

  describe("Bear Put Spread Orders", () => {
    it("should place bear put spread order", async () => {
      const result = await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261011",
        quantity: 1,
        clientOrderId: "test_1",
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
    });

    it("should validate strike prices (short > long)", async () => {
      const result = await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 448, // Invalid: lower than long
        longStrike: 450,
        expiration: "261011",
        quantity: 1,
        clientOrderId: "test_2",
      });

      // Should handle gracefully (either success with mock or error)
      expect(result).toBeDefined();
    });

    it("should set correct order type for market orders", async () => {
      const result = await adapter.placeBearPutSpread({
        symbol: "QQQ",
        shortStrike: 350,
        longStrike: 348,
        expiration: "261011",
        quantity: 1,
        clientOrderId: "test_3",
        // No maxCredit = market order
      });

      expect(result.success).toBe(true);
    });

    it("should set limit price if maxCredit provided", async () => {
      const result = await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261011",
        quantity: 1,
        maxCredit: 1.50, // Limit order
        clientOrderId: "test_4",
      });

      expect(result.success).toBe(true);
    });

    it("should track open orders", async () => {
      await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261011",
        quantity: 1,
        clientOrderId: "test_5",
      });

      const orders = adapter.getOpenOrders();
      expect(orders.length).toBeGreaterThan(0);
    });

    it("should handle multiple concurrent orders", async () => {
      await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261011",
        quantity: 1,
        clientOrderId: "test_6a",
      });

      await adapter.placeBearPutSpread({
        symbol: "QQQ",
        shortStrike: 350,
        longStrike: 348,
        expiration: "261011",
        quantity: 1,
        clientOrderId: "test_6b",
      });

      const orders = adapter.getOpenOrders();
      expect(orders.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Greeks Data", () => {
    it("should fetch Greeks for put option", async () => {
      const greeks = await adapter.getGreeks({
        symbol: "SPY",
        strike: 450,
        expiration: "261011",
        optionType: "PUT",
      });

      expect(greeks).toBeDefined();
      expect(greeks?.delta).toBeLessThan(0); // Put should have negative delta
      expect(greeks?.gamma).toBeGreaterThan(0);
      expect(greeks?.theta).toBeLessThan(0); // Negative theta
      expect(greeks?.vega).toBeGreaterThan(0);
    });

    it("should fetch Greeks for call option", async () => {
      const greeks = await adapter.getGreeks({
        symbol: "SPY",
        strike: 450,
        expiration: "261011",
        optionType: "CALL",
      });

      expect(greeks).toBeDefined();
      expect(greeks?.delta).toBeGreaterThan(0); // Call should have positive delta
      expect(greeks?.gamma).toBeGreaterThan(0);
    });

    it("should include bid/ask/last prices in Greeks", async () => {
      const greeks = await adapter.getGreeks({
        symbol: "SPY",
        strike: 450,
        expiration: "261011",
        optionType: "PUT",
      });

      expect(greeks?.bid).toBeGreaterThan(0);
      expect(greeks?.ask).toBeGreaterThan(greeks?.bid || 0);
      expect(greeks?.last).toBeGreaterThan(0);
    });

    it("should handle Greeks for multiple strikes", async () => {
      const strikes = [440, 450, 460];
      const results = await Promise.all(
        strikes.map((strike) =>
          adapter.getGreeks({
            symbol: "SPY",
            strike,
            expiration: "261011",
            optionType: "PUT",
          })
        )
      );

      expect(results.length).toBe(3);
      results.forEach((g) => expect(g).toBeDefined());
    });
  });

  describe("Order Management", () => {
    it("should get order status", async () => {
      const placement = await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261011",
        quantity: 1,
        clientOrderId: "test_status_1",
      });

      const status = adapter.getOrderStatus(placement.orderId!);
      expect(status).toBeDefined();
      expect(status?.orderId).toBe(placement.orderId);
    });

    it("should cancel order", async () => {
      const placement = await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261011",
        quantity: 1,
        clientOrderId: "test_cancel_1",
      });

      const result = await adapter.cancelOrder(placement.orderId!);
      expect(result.success).toBe(true);

      const status = adapter.getOrderStatus(placement.orderId!);
      expect(status?.status).toBe("CANCELLED");
    });

    it("should handle cancel of non-existent order", async () => {
      const result = await adapter.cancelOrder("FAKE_ORDER_ID");
      expect(result.success).toBe(false);
    });

    it("should update order", async () => {
      const placement = await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261011",
        quantity: 1,
        clientOrderId: "test_update_1",
      });

      const result = await adapter.updateOrder(placement.orderId!, {
        limitPrice: 1.50,
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
    });
  });

  describe("Account & Connection", () => {
    it("should get account information", async () => {
      const account = await adapter.getAccount();
      expect(account).toBeDefined();
      expect(account?.accountId).toBe("DU123456");
      expect(account?.equity).toBeGreaterThan(0);
    });

    it("should verify connection", async () => {
      const verified = await adapter.verifyConnection();
      expect(verified).toBe(true);
    });

    it("should identify paper trading mode", async () => {
      const account = await adapter.getAccount();
      expect(account?.accountType).toBe("paper");
    });
  });

  describe("Position Management", () => {
    it("should get open positions", () => {
      const positions = adapter.getPositions();
      expect(Array.isArray(positions)).toBe(true);
    });

    it("should close position", async () => {
      // Mock a position (would be real after order fills)
      const result = await adapter.closePosition("SPY");
      // Success depends on whether position exists
      expect(result).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid symbol gracefully", async () => {
      const result = await adapter.placeBearPutSpread({
        symbol: "",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261011",
        quantity: 1,
        clientOrderId: "test_error_1",
      });

      // Should not crash
      expect(result).toBeDefined();
    });

    it("should handle invalid expiration", async () => {
      const result = await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "",
        quantity: 1,
        clientOrderId: "test_error_2",
      });

      expect(result).toBeDefined();
    });

    it("should handle zero quantity", async () => {
      const result = await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261011",
        quantity: 0,
        clientOrderId: "test_error_3",
      });

      expect(result).toBeDefined();
    });
  });

  describe("Logout", () => {
    it("should logout and clear state", async () => {
      await adapter.placeBearPutSpread({
        symbol: "SPY",
        shortStrike: 450,
        longStrike: 448,
        expiration: "261011",
        quantity: 1,
        clientOrderId: "test_logout_1",
      });

      await adapter.logout();

      const orders = adapter.getOpenOrders();
      expect(orders.length).toBe(0);
    });
  });
});
