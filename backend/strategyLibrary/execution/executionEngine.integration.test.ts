/**
 * Execution Engine Integration Tests
 * Test full flow: Selector → Confirmation → Alpaca
 * Uses SimulationMode to verify WITHOUT touching real Alpaca
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ExecutionEngine } from "./executionEngine";
import { SimulationMode } from "./simulationMode";
import { SupervisorGate } from "./supervisorGate";
import { PreFlightChecklist } from "./preFlightChecklist";
import { SelectionResult } from "../decision/strategySelector";
import { ConfirmationResult } from "../confirmation/types";

describe("Execution Engine Integration Tests", () => {
  let executionEngine: ExecutionEngine;
  let simulator: SimulationMode;
  let supervisor: SupervisorGate;
  let preflight: PreFlightChecklist;

  const mockSelectionResult: SelectionResult = {
    status: "OPERATE",
    selectedStrategy: "TrailingExitStrategy",
    selectedSymbol: "SPY",
    confidence: 85,
    compatibilityScore: 90,
    explanation: "Test strategy",
    reasons: ["Test reason"],
  };

  const mockConfirmationResult: ConfirmationResult = {
    context: {
      symbol: "SPY",
      regime: "BULLISH_STRONG",
      vix: 18,
      price: 450.23,
      volume: 65000000,
      volatility: 0.15,
      timestamp: new Date(),
      selectedStrategy: "TrailingExitStrategy",
    },
    confidence: {
      finalScore: 72,
      votes: [],
      scoreBreakdown: [],
      timestamp: new Date(),
      recommendation: "BUY",
    },
    isConfirmed: true,
    threshold: 65,
    suggestions: [],
  };

  beforeEach(() => {
    executionEngine = new ExecutionEngine(
      process.env.APCA_API_KEY_ID || "test-key",
      process.env.APCA_API_SECRET_KEY || "test-secret"
    );
    simulator = new SimulationMode({ startingBalance: 100000 });
    supervisor = new SupervisorGate();
    preflight = new PreFlightChecklist();
  });

  // ========== HAPPY PATH TESTS ==========

  it("should place simulated trade successfully", async () => {
    const result = await simulator.placeOrder({
      symbol: "SPY",
      quantity: 100,
      entryPrice: 450.23,
      stopLoss: 449.00,
      takeProfit: 451.50,
      timestamp: new Date("2026-09-01T14:30:00Z"), // Tuesday, 10:30 AM ET (market open)
    });

    expect(result.success).toBe(true);
    expect(result.order).toBeDefined();
    expect(result.order?.status).toBe("open");
    expect(result.preFlightResult.status).toBe("READY");
  });

  it("should hit take profit and close position", async () => {
    const placeResult = await simulator.placeOrder({
      symbol: "SPY",
      quantity: 100,
      entryPrice: 450.23,
      stopLoss: 449.00,
      takeProfit: 451.50,
      timestamp: new Date("2026-09-01T14:30:00Z"),
    });

    expect(placeResult.success).toBe(true);

    // Update price to hit TP
    const closed = simulator.updateMarketPrice("SPY", 451.50, new Date("2026-09-01T15:00:00Z"));

    expect(closed).toBeDefined();
    expect(closed?.status).toBe("closed");
    expect(closed?.exitReason).toBe("TP_HIT");
    expect(closed?.pnlDollars).toBeCloseTo(127.00, 0); // (451.50 - 450.23) * 100
  });

  it("should hit stop loss and close position", async () => {
    const placeResult = await simulator.placeOrder({
      symbol: "SPY",
      quantity: 100,
      entryPrice: 450.23,
      stopLoss: 449.00,
      takeProfit: 451.50,
      timestamp: new Date("2026-09-01T14:30:00Z"),
    });

    expect(placeResult.success).toBe(true);

    // Update price to hit SL
    const closed = simulator.updateMarketPrice("SPY", 448.99, new Date("2026-09-01T15:00:00Z"));

    expect(closed).toBeDefined();
    expect(closed?.status).toBe("closed");
    expect(closed?.exitReason).toBe("SL_HIT");
    expect(closed?.pnlDollars).toBeCloseTo(-123.00, 0); // (449.00 - 450.23) * 100
  });

  // ========== PRE-FLIGHT VALIDATION TESTS ==========

  it("should block trade if market is closed", async () => {
    // After-hours: 8 PM UTC on Friday (midnight ET)
    const afterHours = new Date("2026-09-01T20:00:00Z"); // 4:00 PM ET + 4 hours

    const preFlightResult = await preflight.runAll({
      symbol: "SPY",
      entryPrice: 450.23,
      stopLoss: 449.00,
      takeProfit: 451.50,
      positionSize: 100,
      accountData: { totalBalance: 100000, dailyPnL: 0 },
      marketData: { volume: 65000000, vix: 18 },
      isSimulation: true,
      timestamp: afterHours,
    });

    expect(preFlightResult.status).toBe("BLOCKED");
    expect(preFlightResult.blockedReasons[0]).toContain("Market closed");
  });

  it("should block trade if stop loss equals entry price", async () => {
    const preFlightResult = await preflight.runAll({
      symbol: "SPY",
      entryPrice: 450.23,
      stopLoss: 450.23, // INVALID: equals entry
      takeProfit: 451.50,
      positionSize: 100,
      accountData: { totalBalance: 100000, dailyPnL: 0 },
      marketData: { volume: 65000000, vix: 18 },
      isSimulation: true,
      timestamp: new Date("2026-09-01T14:30:00Z"),
    });

    expect(preFlightResult.status).toBe("BLOCKED");
    expect(preFlightResult.blockedReasons[0]).toContain("Stop loss equals entry");
  });

  it("should block trade if risk/reward ratio < 1:1", async () => {
    const preFlightResult = await preflight.runAll({
      symbol: "SPY",
      entryPrice: 450.23,
      stopLoss: 449.00, // Risk = 1.23
      takeProfit: 450.50, // Reward = 0.27 (< Risk)
      positionSize: 100,
      accountData: { totalBalance: 100000, dailyPnL: 0 },
      marketData: { volume: 65000000, vix: 18 },
      isSimulation: true,
      timestamp: new Date("2026-09-01T14:30:00Z"),
    });

    expect(preFlightResult.status).toBe("BLOCKED");
    expect(preFlightResult.blockedReasons[0]).toContain("Reward");
  });

  it("should block trade if data incomplete", async () => {
    const preFlightResult = await preflight.runAll({
      symbol: "SPY",
      entryPrice: NaN, // INVALID
      stopLoss: 449.00,
      takeProfit: 451.50,
      positionSize: 100,
      accountData: { totalBalance: 100000, dailyPnL: 0 },
      marketData: { volume: 65000000, vix: 18 },
      isSimulation: true,
      timestamp: new Date("2026-09-01T14:30:00Z"),
    });

    expect(preFlightResult.status).toBe("BLOCKED");
    expect(preFlightResult.blockedReasons[0]).toContain("Missing");
  });

  // ========== SUPERVISOR GATE TESTS ==========

  it("should reject trade if daily loss exceeds -2%", () => {
    const gateResult = supervisor.checkDailyLossGate({
      totalBalance: 100000,
      dailyPnL: -2500, // -2.5% (exceeds -2%)
      openPositions: 0,
      buyingPower: 100000,
    });

    expect(gateResult.passed).toBe(false);
    expect(gateResult.reason).toContain("Daily loss");
  });

  it("should approve trade if daily loss within limits", () => {
    const gateResult = supervisor.checkDailyLossGate({
      totalBalance: 100000,
      dailyPnL: -1500, // -1.5% (within -2%)
      openPositions: 0,
      buyingPower: 100000,
    });

    expect(gateResult.passed).toBe(true);
  });

  it("should reject trade if open positions >= 3", () => {
    const gateResult = supervisor.checkOpenPositionsGate({
      totalBalance: 100000,
      dailyPnL: 0,
      openPositions: 3,
      buyingPower: 100000,
    });

    expect(gateResult.passed).toBe(false);
  });

  it("should approve trade if open positions < 3", () => {
    const gateResult = supervisor.checkOpenPositionsGate({
      totalBalance: 100000,
      dailyPnL: 0,
      openPositions: 2,
      buyingPower: 100000,
    });

    expect(gateResult.passed).toBe(true);
  });

  it("should reject correlated positions (SPY + QQQ)", () => {
    const gateResult = supervisor.checkCorrelationGate("SPY", [
      { symbol: "QQQ", quantity: 100 },
    ]);

    expect(gateResult.passed).toBe(false);
  });

  it("should approve non-correlated positions (SPY + BTC)", () => {
    const gateResult = supervisor.checkCorrelationGate("SPY", [
      { symbol: "BTC", quantity: 1 },
    ]);

    expect(gateResult.passed).toBe(true);
  });

  it("should reject if volume too low", () => {
    const gateResult = supervisor.checkLiquidityGate({
      symbol: "SPY",
      price: 450.23,
      volume: 5000000, // Below 20M minimum
      bid: 450.20,
      ask: 450.26,
      vix: 18,
      timestamp: new Date(),
    });

    expect(gateResult.passed).toBe(false);
  });

  it("should approve if volume sufficient", () => {
    const gateResult = supervisor.checkLiquidityGate({
      symbol: "SPY",
      price: 450.23,
      volume: 65000000, // Above 20M minimum
      bid: 450.20,
      ask: 450.26,
      vix: 18,
      timestamp: new Date(),
    });

    expect(gateResult.passed).toBe(true);
  });

  // ========== ACCOUNT TRACKING TESTS ==========

  it("should track account balance correctly after trades", async () => {
    const initial = simulator.getAccountStatus();
    expect(initial.balance).toBe(100000);

    // Place and execute trade (TP hit)
    await simulator.placeOrder({
      symbol: "SPY",
      quantity: 100,
      entryPrice: 450.23,
      stopLoss: 449.00,
      takeProfit: 451.50,
      timestamp: new Date("2026-09-01T14:30:00Z"),
    });

    simulator.updateMarketPrice("SPY", 451.50, new Date("2026-09-01T15:00:00Z"));

    const after = simulator.getAccountStatus();
    expect(after.balance).toBeCloseTo(100127.00, 0); // Initial + P&L
  });

  it("should reset daily P&L correctly", async () => {
    await simulator.placeOrder({
      symbol: "SPY",
      quantity: 100,
      entryPrice: 450.23,
      stopLoss: 449.00,
      takeProfit: 451.50,
      timestamp: new Date("2026-09-01T14:30:00Z"),
    });

    simulator.updateMarketPrice("SPY", 451.50, new Date("2026-09-01T15:00:00Z"));

    const beforeReset = simulator.getAccountStatus();
    expect(beforeReset.dailyPnL).toBeCloseTo(127.00, 0);

    simulator.resetDaily();

    const afterReset = simulator.getAccountStatus();
    expect(afterReset.dailyPnL).toBe(0);
    expect(afterReset.balance).toBeCloseTo(100127.00, 0); // Balance unchanged
  });

  // ========== SIMULATION REPORT TESTS ==========

  it("should generate correct simulation report", async () => {
    await simulator.placeOrder({
      symbol: "SPY",
      quantity: 100,
      entryPrice: 450.23,
      stopLoss: 449.00,
      takeProfit: 451.50,
      timestamp: new Date("2026-09-01T14:30:00Z"),
    });

    simulator.updateMarketPrice("SPY", 451.50, new Date("2026-09-01T15:00:00Z"));

    const report = simulator.generateReport();

    expect(report).toContain("SIMULATION REPORT");
    expect(report).toContain("Starting Balance: $100000.00");
    expect(report).toContain("Trades Completed: 1");
    expect(report).toContain("Wins: 1");
  });

  // ========== EDGE CASE TESTS ==========

  it("should handle multiple concurrent positions", async () => {
    // Place 2 positions
    const result1 = await simulator.placeOrder({
      symbol: "SPY",
      quantity: 100,
      entryPrice: 450.23,
      stopLoss: 449.00,
      takeProfit: 451.50,
      timestamp: new Date("2026-09-01T14:30:00Z"),
    });

    const result2 = await simulator.placeOrder({
      symbol: "QQQ",
      quantity: 50,
      entryPrice: 350.00,
      stopLoss: 349.00,
      takeProfit: 351.50,
      timestamp: new Date("2026-09-01T14:35:00Z"),
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    const status = simulator.getAccountStatus();
    expect(status.openPositions).toBe(2);

    // Close one position
    simulator.updateMarketPrice("SPY", 451.50, new Date("2026-09-01T15:00:00Z"));

    const statusAfter = simulator.getAccountStatus();
    expect(statusAfter.openPositions).toBe(1);
  });

  it("should allow closing all positions at end of day", async () => {
    await simulator.placeOrder({
      symbol: "SPY",
      quantity: 100,
      entryPrice: 450.23,
      stopLoss: 449.00,
      takeProfit: 451.50,
      timestamp: new Date("2026-09-01T14:30:00Z"),
    });

    await simulator.placeOrder({
      symbol: "QQQ",
      quantity: 50,
      entryPrice: 350.00,
      stopLoss: 349.00,
      takeProfit: 351.50,
      timestamp: new Date("2026-09-01T14:35:00Z"),
    });

    const beforeClose = simulator.getAccountStatus();
    expect(beforeClose.openPositions).toBe(2);

    // Close all positions at specific prices
    simulator.closeAllPositions(
      {
        SPY: 451.50, // TP hit
        QQQ: 348.50, // SL hit
      },
      new Date("2026-09-01T16:00:00Z")
    );

    const afterClose = simulator.getAccountStatus();
    expect(afterClose.openPositions).toBe(0);
  });
});
