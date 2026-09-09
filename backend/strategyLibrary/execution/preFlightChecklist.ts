/**
 * Pre-Flight Validation Checklist
 * EVERY order (real or simulated) must pass these checks
 * Failure = "DO NOT OPERATE" with reason logged
 */

export type PreFlightStatus = "READY" | "BLOCKED" | "UNKNOWN";

export interface PreFlightCheckResult {
  check: string;
  passed: boolean;
  value: string | number | boolean;
  threshold?: string | number;
  reason?: string;
}

export interface PreFlightResult {
  status: PreFlightStatus;
  checks: PreFlightCheckResult[];
  blockedReasons: string[];
  timestamp: Date;
}

export class PreFlightChecklist {
  /**
   * Check 1: Is market open?
   * (U.S. equities: Mon-Fri 9:30 AM - 4:00 PM ET)
   * (Crypto: 24/7)
   * (Forex: Mon-Fri, specific hours)
   */
  checkMarketOpen(symbol: string, timestamp: Date): PreFlightCheckResult {
    // For equity trading
    if (["SPY", "QQQ"].includes(symbol)) {
      const hour = timestamp.getUTCHours();
      const day = timestamp.getUTCDay();

      // Market hours: 9:30 AM - 4:00 PM ET = 13:30 - 20:00 UTC
      const isWeekday = day >= 1 && day <= 5;
      const isDuringHours = hour >= 13 && hour < 20;
      const isOpen = isWeekday && isDuringHours;

      return {
        check: "Market Open",
        passed: isOpen,
        value: isOpen ? "YES" : "NO",
        threshold: "Mon-Fri 9:30 AM - 4:00 PM ET",
        reason: isOpen ? undefined : `Market closed (day=${day}, hour=${hour}UTC)`,
      };
    }

    // For crypto (24/7)
    if (["BTC", "ETH"].includes(symbol)) {
      return {
        check: "Market Open",
        passed: true,
        value: "YES (crypto 24/7)",
        threshold: "24/7 available",
      };
    }

    return {
      check: "Market Open",
      passed: false,
      value: "UNKNOWN",
      reason: `Unknown symbol: ${symbol}`,
    };
  }

  /**
   * Check 2: Is risk within limits?
   * - Stop loss distance > 0
   * - Risk/Reward ratio > 1:1
   * - Position size = valid number
   */
  checkRiskLimits(entryPrice: number, stopLoss: number, takeProfit: number, positionSize: number): PreFlightCheckResult {
    const riskPerShare = Math.abs(entryPrice - stopLoss);
    const rewardPerShare = Math.abs(takeProfit - entryPrice);

    // Check 1: SL distance valid
    if (riskPerShare <= 0) {
      return {
        check: "Risk Limits",
        passed: false,
        value: "INVALID",
        threshold: "SL != entry price",
        reason: `Stop loss equals entry price (both ${entryPrice})`,
      };
    }

    // Check 2: Risk/Reward ratio
    const riskRewardRatio = rewardPerShare / riskPerShare;
    if (riskRewardRatio < 1) {
      return {
        check: "Risk Limits",
        passed: false,
        value: riskRewardRatio.toFixed(2),
        threshold: ">= 1.0",
        reason: `Reward ${rewardPerShare.toFixed(2)} < Risk ${riskPerShare.toFixed(2)}`,
      };
    }

    // Check 3: Position size valid
    if (positionSize <= 0 || !Number.isInteger(positionSize)) {
      return {
        check: "Risk Limits",
        passed: false,
        value: positionSize,
        threshold: "> 0 and integer",
        reason: `Invalid position size: ${positionSize}`,
      };
    }

    return {
      check: "Risk Limits",
      passed: true,
      value: `Risk/Reward = ${riskRewardRatio.toFixed(2)}:1 | Position = ${positionSize}`,
      threshold: ">= 1:1 ratio, valid position",
    };
  }

  /**
   * Check 3: Are all required data fields complete?
   */
  checkDataComplete(data: {
    symbol?: string;
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    positionSize?: number;
    account?: { totalBalance?: number; dailyPnL?: number };
    market?: { volume?: number; vix?: number };
  }): PreFlightCheckResult {
    const required = {
      symbol: data.symbol,
      entryPrice: data.entryPrice,
      stopLoss: data.stopLoss,
      takeProfit: data.takeProfit,
      positionSize: data.positionSize,
      accountBalance: data.account?.totalBalance,
      marketVolume: data.market?.volume,
    };

    const missing = Object.entries(required)
      .filter(([_, value]) => value === undefined || value === null || Number.isNaN(value))
      .map(([key]) => key);

    return {
      check: "Data Complete",
      passed: missing.length === 0,
      value: missing.length === 0 ? "ALL" : `${missing.length} missing`,
      threshold: "All fields required",
      reason: missing.length === 0 ? undefined : `Missing: ${missing.join(", ")}`,
    };
  }

  /**
   * Check 4: Order can actually be placed (permissions, API, etc.)
   * In simulation: always passes
   * In real: check Alpaca connectivity
   */
  async checkExecutionReady(isSimulation: boolean, alpacaHealthy?: boolean): Promise<PreFlightCheckResult> {
    if (isSimulation) {
      return {
        check: "Execution Ready",
        passed: true,
        value: "SIMULATION MODE",
        threshold: "Any (simulation)",
      };
    }

    if (alpacaHealthy === undefined) {
      return {
        check: "Execution Ready",
        passed: false,
        value: "UNKNOWN",
        reason: "Alpaca health status unknown",
      };
    }

    return {
      check: "Execution Ready",
      passed: alpacaHealthy,
      value: alpacaHealthy ? "READY" : "DISCONNECTED",
      threshold: "Alpaca API healthy",
      reason: alpacaHealthy ? undefined : "Alpaca API not responding",
    };
  }

  /**
   * Run all 4 pre-flight checks
   */
  async runAll(config: {
    symbol: string;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    positionSize: number;
    accountData: { totalBalance: number; dailyPnL: number };
    marketData: { volume: number; vix: number };
    isSimulation: boolean;
    alpacaHealthy?: boolean;
    timestamp?: Date;
  }): Promise<PreFlightResult> {
    const timestamp = config.timestamp || new Date();

    const checks = [
      this.checkMarketOpen(config.symbol, timestamp),
      this.checkRiskLimits(config.entryPrice, config.stopLoss, config.takeProfit, config.positionSize),
      this.checkDataComplete({
        symbol: config.symbol,
        entryPrice: config.entryPrice,
        stopLoss: config.stopLoss,
        takeProfit: config.takeProfit,
        positionSize: config.positionSize,
        account: config.accountData,
        market: config.marketData,
      }),
      await this.checkExecutionReady(config.isSimulation, config.alpacaHealthy),
    ];

    const allPassed = checks.every((c) => c.passed);
    const blockedReasons = checks.filter((c) => c.reason).map((c) => c.reason!);

    return {
      status: allPassed ? "READY" : "BLOCKED",
      checks,
      blockedReasons,
      timestamp,
    };
  }

  /**
   * Format pre-flight report for logging
   */
  formatReport(result: PreFlightResult): string {
    const status = result.status === "READY" ? "✅ PRE-FLIGHT READY" : "❌ PRE-FLIGHT BLOCKED";
    const lines: string[] = [
      `═══════════════════════════════════════════════════════`,
      status,
      `═══════════════════════════════════════════════════════`,
      ``,
      `Checks:`,
    ];

    result.checks.forEach((check) => {
      const symbol = check.passed ? "✅" : "❌";
      lines.push(`  ${symbol} ${check.check.padEnd(20)} ${check.value} (threshold: ${check.threshold})`);
    });

    if (result.blockedReasons.length > 0) {
      lines.push(``, `Blocked Reasons:`);
      result.blockedReasons.forEach((reason) => {
        lines.push(`  ❌ ${reason}`);
      });
    }

    return lines.join("\n");
  }
}
