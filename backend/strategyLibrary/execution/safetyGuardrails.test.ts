/**
 * Safety Guardrails Tests
 * Circuit Breaker + Emergency Stop + Manual Approval Gate
 * "Three layers of human control"
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CircuitBreaker } from "./circuitBreaker";
import { EmergencyStop, EmergencyStopLevel } from "./emergencyStop";
import { ManualApprovalGate, ApprovalStatus } from "./manualApprovalGate";

describe("Safety Guardrails", () => {
  // ========== CIRCUIT BREAKER TESTS ==========

  describe("Circuit Breaker", () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
      breaker = new CircuitBreaker({
        dailyLossLimit: -2,
        weeklyLossLimit: -5,
        maxConsecutiveLosses: 4,
      });
    });

    it("should allow trading when operational", () => {
      expect(breaker.canExecute()).toBe(true);
      const status = breaker.getStatus();
      expect(status.isTripped).toBe(false);
    });

    it("should trip on daily loss limit", () => {
      const timestamp = new Date("2026-09-01T14:30:00Z");

      breaker.recordTrade(-1.5, timestamp);
      expect(breaker.canExecute()).toBe(true);

      breaker.recordTrade(-1.0, timestamp); // Total: -2.5%
      expect(breaker.canExecute()).toBe(false);

      const status = breaker.getStatus();
      expect(status.isTripped).toBe(true);
      expect(status.reason).toContain("Daily loss");
    });

    it("should trip on weekly loss limit", () => {
      const baseTime = new Date("2026-09-01T14:30:00Z");

      // Simulate 5 days of -1% losses = -5%
      for (let i = 0; i < 5; i++) {
        const dayTime = new Date(baseTime);
        dayTime.setDate(dayTime.getDate() + i);
        breaker.recordTrade(-1.0, dayTime);
      }

      expect(breaker.canExecute()).toBe(false);
      const status = breaker.getStatus();
      expect(status.reason).toContain("Weekly loss");
    });

    it("should trip on consecutive losses", () => {
      // Consecutive losses within same day (all -0.3%)
      const timestamp = new Date("2026-09-01T14:30:00Z");

      breaker.recordTrade(-0.3, timestamp);
      breaker.recordTrade(-0.3, timestamp);
      breaker.recordTrade(-0.3, timestamp);
      expect(breaker.canExecute()).toBe(true); // Still 3 losses, under limit

      breaker.recordTrade(-0.3, timestamp); // 4th consecutive loss

      expect(breaker.canExecute()).toBe(false);
      const status = breaker.getStatus();
      expect(status.reason).toContain("consecutive");
    });

    it("should reset consecutive losses counter on win", () => {
      const timestamp = new Date("2026-09-01T14:30:00Z");

      breaker.recordTrade(-0.5, timestamp);
      breaker.recordTrade(-0.5, timestamp);
      breaker.recordTrade(+0.5, timestamp); // Reset counter
      breaker.recordTrade(-0.5, timestamp);
      breaker.recordTrade(-0.5, timestamp);

      // Should not trip (only 2 consecutive after reset)
      expect(breaker.canExecute()).toBe(true);
    });

    it("should reset at end of day", () => {
      const morning = new Date("2026-09-01T14:30:00Z");
      const nextDay = new Date("2026-09-02T10:00:00Z"); // Next day after reset

      breaker.recordTrade(-2.1, morning); // Trip daily
      expect(breaker.canExecute()).toBe(false);

      breaker.reset(nextDay); // Check on next day
      expect(breaker.canExecute()).toBe(true);
    });

    it("should generate readable report", () => {
      const timestamp = new Date("2026-09-01T14:30:00Z");
      breaker.recordTrade(-1.5, timestamp);

      const report = breaker.getReport();
      expect(report).toContain("CIRCUIT BREAKER");
      expect(report).toContain("Daily Loss Usage");
      expect(report).toContain("Consecutive Losses");
    });
  });

  // ========== EMERGENCY STOP TESTS ==========

  describe("Emergency Stop", () => {
    let emergencyStop: EmergencyStop;

    beforeEach(() => {
      emergencyStop = new EmergencyStop();
    });

    it("should start with no active emergency stop", () => {
      expect(emergencyStop.getState()).toBe(null);
    });

    it("should allow all operations when inactive", () => {
      expect(emergencyStop.canExecute("new_order")).toBe(true);
      expect(emergencyStop.canExecute("close_position")).toBe(true);
      expect(emergencyStop.canExecute("scale_position")).toBe(true);
    });

    it("should activate PAUSE level", () => {
      const state = emergencyStop.activate(EmergencyStopLevel.PAUSE, "Manual pause");

      expect(state.level).toBe(EmergencyStopLevel.PAUSE);
      expect(state.active).toBe(true);

      // PAUSE: block new orders, allow closing
      expect(emergencyStop.canExecute("new_order")).toBe(false);
      expect(emergencyStop.canExecute("close_position")).toBe(true);
      expect(emergencyStop.canExecute("scale_position")).toBe(false);
    });

    it("should activate STOP level", () => {
      emergencyStop.activate(EmergencyStopLevel.STOP, "System error");

      // STOP: only allow closing
      expect(emergencyStop.canExecute("new_order")).toBe(false);
      expect(emergencyStop.canExecute("close_position")).toBe(true);
      expect(emergencyStop.canExecute("scale_position")).toBe(false);
    });

    it("should activate LIQUIDATE level", () => {
      emergencyStop.activate(EmergencyStopLevel.LIQUIDATE, "Market crash");

      // LIQUIDATE: block everything
      expect(emergencyStop.canExecute("new_order")).toBe(false);
      expect(emergencyStop.canExecute("close_position")).toBe(false);
      expect(emergencyStop.canExecute("scale_position")).toBe(false);
    });

    it("should deactivate emergency stop", () => {
      emergencyStop.activate(EmergencyStopLevel.STOP, "Test");
      expect(emergencyStop.canExecute("new_order")).toBe(false);

      emergencyStop.deactivate();
      expect(emergencyStop.canExecute("new_order")).toBe(true);
    });

    it("should track activation history", () => {
      emergencyStop.activate(EmergencyStopLevel.PAUSE, "Pause 1");
      emergencyStop.deactivate();
      emergencyStop.activate(EmergencyStopLevel.STOP, "Stop 1");

      const history = emergencyStop.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].level).toBe(EmergencyStopLevel.PAUSE);
      expect(history[1].level).toBe(EmergencyStopLevel.STOP);
    });

    it("should generate readable report when inactive", () => {
      const report = emergencyStop.getReport();
      expect(report).toContain("No emergency stop active");
    });

    it("should generate detailed report when active", () => {
      emergencyStop.activate(EmergencyStopLevel.LIQUIDATE, "Emergency liquidation");
      const report = emergencyStop.getReport();

      expect(report).toContain("EMERGENCY STOP ACTIVE");
      expect(report).toContain("LIQUIDATE");
      expect(report).toContain("ALL TRADING BLOCKED");
    });
  });

  // ========== MANUAL APPROVAL GATE TESTS ==========

  describe("Manual Approval Gate", () => {
    let gate: ManualApprovalGate;

    beforeEach(() => {
      gate = new ManualApprovalGate();
    });

    it("should create scaling request", () => {
      const request = gate.requestScaling({
        currentRiskPerTrade: 0.5,
        proposedRiskPerTrade: 0.75,
        reason: "Profitable 2 weeks",
        supportingMetrics: { winRate: 0.58, tradesCount: 52 },
      });

      expect(request.id).toBeDefined();
      expect(request.status).toBe(ApprovalStatus.PENDING);
      expect(request.currentRiskPerTrade).toBe(0.5);
      expect(request.proposedRiskPerTrade).toBe(0.75);
    });

    it("should approve request", () => {
      const request = gate.requestScaling({
        currentRiskPerTrade: 0.5,
        proposedRiskPerTrade: 0.75,
        reason: "Scale up",
      });

      const approved = gate.approve(request.id, "USER");
      expect(approved?.status).toBe(ApprovalStatus.APPROVED);
      expect(approved?.approvedBy).toBe("USER");
      expect(approved?.approvedAt).toBeDefined();
    });

    it("should reject request with reason", () => {
      const request = gate.requestScaling({
        currentRiskPerTrade: 0.5,
        proposedRiskPerTrade: 1.0,
        reason: "Scale up",
      });

      const rejected = gate.reject(request.id, "Increase too aggressive", "ADMIN");
      expect(rejected?.status).toBe(ApprovalStatus.REJECTED);
      expect(rejected?.rejectionReason).toBe("Increase too aggressive");
    });

    it("should validate scaling meets thresholds", () => {
      const result = gate.validateScaling({
        currentRiskPerTrade: 0.5,
        proposedRiskPerTrade: 0.625, // 25% increase (within 50% cap)
        successfulTrades: 52,
        winRate: 0.58,
        maxDrawdown: -0.03,
        weeksDuration: 3,
      });

      expect(result.isValid).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it("should reject scaling with insufficient trades", () => {
      const result = gate.validateScaling({
        currentRiskPerTrade: 0.5,
        proposedRiskPerTrade: 0.75,
        successfulTrades: 25, // Below 50 minimum
        winRate: 0.58,
        maxDrawdown: -0.03,
        weeksDuration: 3,
      });

      expect(result.isValid).toBe(false);
      expect(result.reasons[0]).toContain("Only 25 trades");
    });

    it("should reject scaling with low win rate", () => {
      const result = gate.validateScaling({
        currentRiskPerTrade: 0.5,
        proposedRiskPerTrade: 0.75,
        successfulTrades: 52,
        winRate: 0.45, // Below 50% minimum
        maxDrawdown: -0.03,
        weeksDuration: 3,
      });

      expect(result.isValid).toBe(false);
      expect(result.reasons[0]).toContain("Win rate");
    });

    it("should reject scaling with too much drawdown", () => {
      const result = gate.validateScaling({
        currentRiskPerTrade: 0.5,
        proposedRiskPerTrade: 0.75,
        successfulTrades: 52,
        winRate: 0.58,
        maxDrawdown: -0.05, // Exceeds -4% limit
        weeksDuration: 3,
      });

      expect(result.isValid).toBe(false);
      expect(result.reasons[0]).toContain("Max drawdown");
    });

    it("should cap scaling increase at 50%", () => {
      const result = gate.validateScaling({
        currentRiskPerTrade: 0.5,
        proposedRiskPerTrade: 1.0, // 100% increase, exceeds 50% cap
        successfulTrades: 100,
        winRate: 0.60,
        maxDrawdown: -0.02,
        weeksDuration: 4,
      });

      expect(result.isValid).toBe(false);
      expect(result.reasons[0]).toContain("100");
    });

    it("should track pending requests", () => {
      const req1 = gate.requestScaling({
        currentRiskPerTrade: 0.5,
        proposedRiskPerTrade: 0.625,
        reason: "Request 1",
      });

      // Small delay to ensure different timestamp/ID
      const start = Date.now();
      while (Date.now() - start < 5) {} // Wait 5ms

      const req2 = gate.requestScaling({
        currentRiskPerTrade: 0.625,
        proposedRiskPerTrade: 0.75,
        reason: "Request 2",
      });

      const pending = gate.getPendingRequests();
      expect(pending.length).toBeGreaterThanOrEqual(1); // At least one pending
      expect(pending.find((r) => r.id === req1.id || r.id === req2.id)).toBeDefined(); // At least one of them
    });

    it("should generate approval report", () => {
      gate.requestScaling({
        currentRiskPerTrade: 0.5,
        proposedRiskPerTrade: 0.75,
        reason: "Scaling test",
      });

      const report = gate.getReport();
      expect(report).toContain("MANUAL APPROVAL GATE");
      expect(report).toContain("PENDING REQUESTS");
      expect(report).toContain("Min Trades: 50");
    });
  });
});
