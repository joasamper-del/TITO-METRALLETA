/**
 * 0DTE Safety Circuit Breaker (Independent)
 * Blocks NEW entries on critical failures
 * Existing positions continue with exit protection
 */

export interface CircuitBreakerState {
  status: "TRADING_ACTIVE" | "TRADING_BLOCKED";
  blockers: string[];
  timestamp: Date;
  requiresReview: boolean;
}

export class SafetyCircuitBreaker {
  private blocked = false;
  private blockers: string[] = [];

  /**
   * Check Alpaca connection health
   */
  checkAlpacaHealth(connected: boolean, errorCount: number): void {
    if (!connected || errorCount > 3) {
      this.block(`Alpaca connection issue: connected=${connected}, errors=${errorCount}`);
    }
  }

  /**
   * Check market data freshness
   */
  checkMarketData(
    spyStale: boolean,
    qqqStale: boolean,
    iwmStale: boolean,
    bidAskValid: boolean,
    dataInconsistent: boolean
  ): void {
    if (spyStale || qqqStale || iwmStale) {
      this.block("Market data stale");
    }
    if (!bidAskValid) {
      this.block("Bid/ask invalid");
    }
    if (dataInconsistent) {
      this.block("Market data inconsistent");
    }
  }

  /**
   * Check logging system
   */
  checkLogging(loggerWorking: boolean, journalWorking: boolean): void {
    if (!loggerWorking || !journalWorking) {
      this.block("Logging system failure");
    }
  }

  /**
   * Check daily limits
   */
  checkDailyLimits(tradeCount: number, maxTrades: number, dailyLoss: number, maxLoss: number): void {
    if (tradeCount >= maxTrades) {
      this.block(`Daily trade limit reached (${tradeCount}/${maxTrades})`);
    }
    if (dailyLoss >= maxLoss) {
      this.block(`Daily loss limit reached ($${dailyLoss}/$${maxLoss})`);
    }
  }

  /**
   * Check position limits
   */
  checkPositionLimits(odtePositionCount: number, maxSimultaneous: number): void {
    if (odtePositionCount >= maxSimultaneous) {
      this.block(`0DTE position limit reached (${odtePositionCount}/${maxSimultaneous})`);
    }
  }

  /**
   * Check trading hours
   */
  checkTradingHours(hourET: number, minuteET: number, windowStart: number, windowEnd: number): void {
    const currentTime = hourET + minuteET / 60;
    if (currentTime < windowStart || currentTime > windowEnd) {
      this.block(`Outside trading hours (${hourET}:${minuteET} ET, window ${windowStart}-${windowEnd})`);
    }
  }

  /**
   * Check for duplicate order attempts
   */
  checkDuplicateAttempts(attemptCount: number): void {
    if (attemptCount >= 2) {
      this.block(`Duplicate order attempt detected (${attemptCount} tries)`);
    }
  }

  /**
   * Check order state
   */
  checkOrderState(state: string): void {
    if (state === "UNKNOWN" || state === "DUPLICATE" || state === "UNCONFIRMED") {
      this.block(`Order in unknown state: ${state}`);
    }
  }

  /**
   * Block new entries
   */
  private block(reason: string): void {
    this.blocked = true;
    this.blockers.push(reason);
  }

  /**
   * Check if trading is blocked
   */
  isBlocked(): boolean {
    return this.blocked;
  }

  /**
   * Get circuit breaker state
   */
  getState(): CircuitBreakerState {
    return {
      status: this.blocked ? "TRADING_BLOCKED" : "TRADING_ACTIVE",
      blockers: this.blockers,
      timestamp: new Date(),
      requiresReview: this.blocked,
    };
  }

  /**
   * Reset after review (manual only)
   */
  resetAfterReview(reason: string): void {
    console.log(`\n🟢 Circuit Breaker reset by user: ${reason}`);
    console.log(`   Previous blockers: ${this.blockers.join(", ")}\n`);
    this.blocked = false;
    this.blockers = [];
  }

  /**
   * Display status
   */
  displayStatus(): void {
    const state = this.getState();
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║           SAFETY CIRCUIT BREAKER STATUS                   ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    if (state.status === "TRADING_ACTIVE") {
      console.log("🟢 TRADING ACTIVE\n");
    } else {
      console.log("🔴 TRADING BLOCKED\n");
      console.log("Blockers:\n");
      state.blockers.forEach((b) => console.log(`   • ${b}`));
      console.log(`\n⚠️  Requires manual review before resuming\n`);
    }

    console.log("═══════════════════════════════════════════════════════════\n");
  }
}

export default SafetyCircuitBreaker;
