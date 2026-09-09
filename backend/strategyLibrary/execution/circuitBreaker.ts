/**
 * Circuit Breaker
 * Automatic kill switch if daily/weekly losses exceed threshold
 * "We stop when we should stop, not when we feel like it"
 */

export interface CircuitBreakerConfig {
  dailyLossLimit: number; // -2% stop all trading
  weeklyLossLimit: number; // -5% stop all trading
  maxConsecutiveLosses: number; // 4 losses in a row = stop
}

export interface CircuitBreakerStatus {
  isTripped: boolean;
  reason: string;
  tripTime?: Date;
  resetAvailableAt?: Date;
  resetInMs?: number;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private dailyPnL: number = 0;
  private weeklyPnL: number = 0;
  private consecutiveLosses: number = 0;
  private isTripped: boolean = false;
  private tripReason: string = "";
  private tripTime?: Date;
  private dailyResetTime: Date = new Date();
  private weeklyResetTime: Date = new Date();

  constructor(config: CircuitBreakerConfig = {
    dailyLossLimit: -2,
    weeklyLossLimit: -5,
    maxConsecutiveLosses: 4,
  }) {
    this.config = config;
  }

  /**
   * Record trade result and check if breaker should trip
   */
  recordTrade(pnlPercent: number, timestamp: Date = new Date()): CircuitBreakerStatus {
    // Reset daily if new day
    if (this.isNewDay(timestamp)) {
      this.dailyPnL = 0;
      this.dailyResetTime = timestamp;
      this.consecutiveLosses = 0;
    }

    // Reset weekly if new week
    if (this.isNewWeek(timestamp)) {
      this.weeklyPnL = 0;
      this.weeklyResetTime = timestamp;
    }

    // Update PnL
    this.dailyPnL += pnlPercent;
    this.weeklyPnL += pnlPercent;

    // Track consecutive losses
    if (pnlPercent < 0) {
      this.consecutiveLosses++;
    } else {
      this.consecutiveLosses = 0;
    }

    // Check thresholds
    const dailyViolation = this.dailyPnL <= this.config.dailyLossLimit;
    const weeklyViolation = this.weeklyPnL <= this.config.weeklyLossLimit;
    const consecutiveViolation = this.consecutiveLosses >= this.config.maxConsecutiveLosses;

    if (dailyViolation) {
      this.trip(
        `Daily loss limit exceeded: ${this.dailyPnL.toFixed(2)}% <= ${this.config.dailyLossLimit}%`,
        timestamp
      );
    } else if (weeklyViolation) {
      this.trip(
        `Weekly loss limit exceeded: ${this.weeklyPnL.toFixed(2)}% <= ${this.config.weeklyLossLimit}%`,
        timestamp
      );
    } else if (consecutiveViolation) {
      this.trip(
        `${this.consecutiveLosses} consecutive losses (max: ${this.config.maxConsecutiveLosses})`,
        timestamp
      );
    }

    return this.getStatus();
  }

  /**
   * Get current status
   */
  getStatus(): CircuitBreakerStatus {
    if (!this.isTripped) {
      return {
        isTripped: false,
        reason: "OK",
      };
    }

    // Calculate reset time (EOD if daily, EOW if weekly, after 1 hour if consecutive)
    let resetTime: Date | undefined;
    if (this.tripReason.includes("Daily")) {
      resetTime = this.getEndOfDay(this.tripTime!);
    } else if (this.tripReason.includes("Weekly")) {
      resetTime = this.getEndOfWeek(this.tripTime!);
    } else if (this.tripReason.includes("consecutive")) {
      resetTime = new Date(this.tripTime!.getTime() + 60 * 60 * 1000); // 1 hour
    }

    const resetInMs = resetTime ? resetTime.getTime() - Date.now() : undefined;

    return {
      isTripped: true,
      reason: this.tripReason,
      tripTime: this.tripTime,
      resetAvailableAt: resetTime,
      resetInMs: resetInMs ? Math.max(0, resetInMs) : undefined,
    };
  }

  /**
   * Can we execute a new trade?
   */
  canExecute(): boolean {
    return !this.isTripped;
  }

  /**
   * Manually reset (called at EOD/EOW)
   */
  reset(timestamp: Date = new Date()): void {
    if (!this.isTripped) return;

    const now = timestamp;

    // Reset daily at EOD
    if (this.tripReason.includes("Daily")) {
      if (now.getTime() > this.getEndOfDay(this.tripTime!).getTime()) {
        this.isTripped = false;
        this.dailyPnL = 0;
        this.consecutiveLosses = 0;
        this.tripReason = "";
      }
    }
    // Reset weekly at EOW
    else if (this.tripReason.includes("Weekly")) {
      if (now.getTime() > this.getEndOfWeek(this.tripTime!).getTime()) {
        this.isTripped = false;
        this.weeklyPnL = 0;
        this.consecutiveLosses = 0;
        this.tripReason = "";
      }
    }
    // Reset after 1 hour for consecutive
    else if (this.tripReason.includes("consecutive")) {
      if (this.tripTime && now.getTime() > this.tripTime.getTime() + 60 * 60 * 1000) {
        this.isTripped = false;
        this.consecutiveLosses = 0;
        this.tripReason = "";
      }
    }
  }

  /**
   * Emergency manual stop
   */
  emergencyStop(reason: string = "Manual intervention"): CircuitBreakerStatus {
    this.trip(reason, new Date());
    return this.getStatus();
  }

  /**
   * Get readable status report
   */
  getReport(): string {
    const dailyUsage = ((this.dailyPnL - this.config.dailyLossLimit) / -this.config.dailyLossLimit) * 100;
    const weeklyUsage = ((this.weeklyPnL - this.config.weeklyLossLimit) / -this.config.weeklyLossLimit) * 100;

    const lines: string[] = [
      `═══════════════════════════════════════════════════════════`,
      `CIRCUIT BREAKER STATUS`,
      `═══════════════════════════════════════════════════════════`,
      ``,
      `Status: ${this.isTripped ? "🔴 TRIPPED" : "🟢 OPERATIONAL"}`,
      ``,
      `Daily Loss Usage: ${this.dailyPnL.toFixed(2)}% / ${this.config.dailyLossLimit}% (${dailyUsage.toFixed(0)}%)`,
      `Weekly Loss Usage: ${this.weeklyPnL.toFixed(2)}% / ${this.config.weeklyLossLimit}% (${weeklyUsage.toFixed(0)}%)`,
      `Consecutive Losses: ${this.consecutiveLosses} / ${this.config.maxConsecutiveLosses}`,
      ``,
    ];

    if (this.isTripped) {
      lines.push(`Reason: ${this.tripReason}`);
      lines.push(`Tripped At: ${this.tripTime?.toISOString()}`);
      lines.push(`Resets At: ${this.getStatus().resetAvailableAt?.toISOString()}`);
    }

    lines.push(``, `═══════════════════════════════════════════════════════════`);
    return lines.join("\n");
  }

  // ========== PRIVATE ==========

  private trip(reason: string, timestamp: Date): void {
    this.isTripped = true;
    this.tripReason = reason;
    this.tripTime = timestamp;
  }

  private isNewDay(timestamp: Date): boolean {
    const today = new Date(timestamp);
    today.setHours(0, 0, 0, 0);

    const lastReset = new Date(this.dailyResetTime);
    lastReset.setHours(0, 0, 0, 0);

    return today.getTime() > lastReset.getTime();
  }

  private isNewWeek(timestamp: Date): boolean {
    const weekStart = new Date(timestamp);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const lastReset = new Date(this.weeklyResetTime);
    lastReset.setHours(0, 0, 0, 0);
    lastReset.setDate(lastReset.getDate() - lastReset.getDay());

    return weekStart.getTime() > lastReset.getTime();
  }

  private getEndOfDay(date: Date): Date {
    const eod = new Date(date);
    eod.setHours(16, 0, 0, 0); // 4 PM ET (market close)
    return eod;
  }

  private getEndOfWeek(date: Date): Date {
    const eow = new Date(date);
    const day = eow.getDay();
    const daysUntilFriday = (5 - day + 7) % 7 || 7;
    eow.setDate(eow.getDate() + daysUntilFriday);
    eow.setHours(16, 0, 0, 0); // Friday 4 PM ET
    return eow;
  }
}
