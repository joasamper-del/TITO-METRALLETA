/**
 * Emergency Stop
 * Human override: pause/stop all operations immediately
 * "Always have a big red button"
 */

export enum EmergencyStopLevel {
  PAUSE = "PAUSE", // Pause new orders, close existing at market
  STOP = "STOP", // Stop all operations immediately
  LIQUIDATE = "LIQUIDATE", // Close ALL positions ASAP at market
}

export interface EmergencyStopState {
  level: EmergencyStopLevel;
  active: boolean;
  activatedAt: Date;
  activatedBy: string; // "USER" | "CIRCUIT_BREAKER" | "SYSTEM"
  reason: string;
  affectedOperations: number;
}

export class EmergencyStop {
  private state: EmergencyStopState | null = null;
  private activationLog: EmergencyStopState[] = [];

  /**
   * Activate emergency stop
   */
  activate(level: EmergencyStopLevel, reason: string, activatedBy: string = "USER"): EmergencyStopState {
    const state: EmergencyStopState = {
      level,
      active: true,
      activatedAt: new Date(),
      activatedBy,
      reason,
      affectedOperations: 0,
    };

    this.state = state;
    this.activationLog.push(state);

    return state;
  }

  /**
   * Check if trading is allowed at given level
   */
  canExecute(operationType: "new_order" | "close_position" | "scale_position"): boolean {
    if (!this.state || !this.state.active) return true; // No restrictions

    switch (this.state.level) {
      case EmergencyStopLevel.PAUSE:
        // Allow closing existing positions, block new orders
        return operationType !== "new_order" && operationType !== "scale_position";

      case EmergencyStopLevel.STOP:
        // Block everything except closing
        return operationType === "close_position";

      case EmergencyStopLevel.LIQUIDATE:
        // Force close everything, block all new operations
        return false; // User must manually close positions

      default:
        return true;
    }
  }

  /**
   * Deactivate emergency stop
   */
  deactivate(): void {
    if (this.state) {
      this.state.active = false;
    }
  }

  /**
   * Get current state
   */
  getState(): EmergencyStopState | null {
    return this.state;
  }

  /**
   * Get activation history
   */
  getHistory(): EmergencyStopState[] {
    return [...this.activationLog];
  }

  /**
   * Generate report
   */
  getReport(): string {
    if (!this.state || !this.state.active) {
      return "🟢 No emergency stop active. All systems operational.";
    }

    const lines: string[] = [
      `═══════════════════════════════════════════════════════════`,
      `🔴 EMERGENCY STOP ACTIVE`,
      `═══════════════════════════════════════════════════════════`,
      ``,
      `Level: ${this.state.level}`,
      `Activated: ${this.state.activatedAt.toISOString()}`,
      `Activated By: ${this.state.activatedBy}`,
      `Reason: ${this.state.reason}`,
      ``,
      `RESTRICTIONS:`,
    ];

    switch (this.state.level) {
      case EmergencyStopLevel.PAUSE:
        lines.push(
          `  ❌ Cannot open NEW positions`,
          `  ❌ Cannot scale positions`,
          `  ✅ CAN close existing positions`,
          `  ℹ️  All new orders blocked; use close orders to exit`
        );
        break;

      case EmergencyStopLevel.STOP:
        lines.push(
          `  ❌ Cannot open NEW positions`,
          `  ❌ Cannot scale positions`,
          `  ✅ CAN close existing positions (market orders only)`,
          `  ℹ️  System is in read-only mode`
        );
        break;

      case EmergencyStopLevel.LIQUIDATE:
        lines.push(
          `  ❌ ALL TRADING BLOCKED`,
          `  ⚠️  IMMEDIATE LIQUIDATION REQUIRED`,
          `  ⚠️  Close all positions manually or via API immediately`,
          `  ℹ️  Market impact acceptable; speed prioritized`
        );
        break;
    }

    lines.push(
      ``,
      `HISTORY (Last 5 activations):`,
      ...this.activationLog
        .slice(-5)
        .map((s) => `  • ${s.activatedAt.toISOString()} (${s.level}): ${s.reason}`),
      ``,
      `═══════════════════════════════════════════════════════════`
    );

    return lines.join("\n");
  }
}
