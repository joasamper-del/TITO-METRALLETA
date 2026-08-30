/**
 * Supervisor Gate v4
 * 5 mandatory safety checks before ANY trade execution
 * ALL gates must pass, or trade is blocked
 */

export interface SupervisorGateResult {
  gateName: string;
  passed: boolean;
  value: number | string;
  threshold: number | string;
  reason?: string;
}

export interface SupervisorDecision {
  allPassed: boolean;
  gateResults: SupervisorGateResult[];
  failureCount: number;
  recommendation: "APPROVE" | "REJECT";
  failureReasons: string[];
}

export interface AccountData {
  totalBalance: number;
  dailyPnL: number;
  openPositions: number;
  buyingPower: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  bid: number;
  ask: number;
  vix: number;
  timestamp: Date;
}

export interface ProposedTrade {
  strategy: string;
  symbol: string;
  positionSize: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
}

export class SupervisorGate {
  // Gate 1: Max Daily Loss (-2% account)
  checkDailyLossGate(accountData: AccountData): SupervisorGateResult {
    const maxDailyLoss = accountData.totalBalance * -0.02; // -2%
    const passed = accountData.dailyPnL >= maxDailyLoss;

    return {
      gateName: "Daily Loss Limit",
      passed,
      value: `${accountData.dailyPnL.toFixed(2)} (${((accountData.dailyPnL / accountData.totalBalance) * 100).toFixed(2)}%)`,
      threshold: `-2% (${maxDailyLoss.toFixed(2)})`,
      reason: passed
        ? undefined
        : `Daily loss ${Math.abs(accountData.dailyPnL).toFixed(0)} exceeds 2% limit. Trading halted for day.`,
    };
  }

  // Gate 2: Max Open Positions (3 concurrent)
  checkOpenPositionsGate(accountData: AccountData): SupervisorGateResult {
    const maxPositions = 3;
    const passed = accountData.openPositions < maxPositions;

    return {
      gateName: "Open Positions Limit",
      passed,
      value: accountData.openPositions,
      threshold: maxPositions,
      reason: passed ? undefined : `Already have ${accountData.openPositions} open positions. Max is ${maxPositions}.`,
    };
  }

  // Gate 3: Correlation Check (no 2+ highly correlated positions)
  checkCorrelationGate(symbol: string, openPositions: any[]): SupervisorGateResult {
    const correlationMap: Record<string, string[]> = {
      SPY: ["QQQ", "IVV", "VOO"], // All broad market
      QQQ: ["SPY", "TQQQ"], // Tech-heavy
      BTC: ["ETH"], // Both crypto
      ETH: ["BTC"], // Both crypto
    };

    const correlatedSymbols = correlationMap[symbol] || [];
    const hasCorrelated = openPositions.some((pos) => correlatedSymbols.includes(pos.symbol));

    return {
      gateName: "Correlation Risk",
      passed: !hasCorrelated,
      value: hasCorrelated ? "HIGH" : "LOW",
      threshold: "No 2+ correlated positions",
      reason: hasCorrelated
        ? `New ${symbol} trade correlates with existing position. Risk too high.`
        : undefined,
    };
  }

  // Gate 4: Liquidity Re-Check (volume validation at entry time)
  checkLiquidityGate(marketData: MarketData): SupervisorGateResult {
    const minimumVolume: Record<string, number> = {
      SPY: 20000000, // 20M
      QQQ: 15000000, // 15M
      BTC: 500000000, // 500M
      ETH: 300000000, // 300M
    };

    const minimum = minimumVolume[marketData.symbol] || 10000000;
    const passed = marketData.volume >= minimum;

    return {
      gateName: "Liquidity Check",
      passed,
      value: `${(marketData.volume / 1000000).toFixed(1)}M`,
      threshold: `${(minimum / 1000000).toFixed(0)}M`,
      reason: passed
        ? undefined
        : `Volume ${(marketData.volume / 1000000).toFixed(1)}M below ${(minimum / 1000000).toFixed(0)}M minimum. Too illiquid.`,
    };
  }

  // Gate 5: Real-Time Macro Veto
  // In future: integrate with Red Pill source, news API, Fed calendar
  // For now: placeholder that checks high-risk conditions
  checkMacroVetoGate(marketData: MarketData, _accountData: AccountData): SupervisorGateResult {
    // Placeholder: VIX > 50 is extreme panic (rare)
    const isExtremeFear = marketData.vix > 50;

    return {
      gateName: "Macro Veto",
      passed: !isExtremeFear,
      value: `VIX ${marketData.vix.toFixed(1)}`,
      threshold: "VIX < 50 (no extreme panic)",
      reason: isExtremeFear
        ? `VIX ${marketData.vix.toFixed(1)} indicates panic conditions. Wait for stabilization.`
        : undefined,
    };
  }

  /**
   * Run all 5 gates
   * Returns: all gates must pass (AND logic)
   */
  validate(
    accountData: AccountData,
    marketData: MarketData,
    openPositions: any[] = []
  ): SupervisorDecision {
    const gateResults: SupervisorGateResult[] = [
      this.checkDailyLossGate(accountData),
      this.checkOpenPositionsGate(accountData),
      this.checkCorrelationGate(marketData.symbol, openPositions),
      this.checkLiquidityGate(marketData),
      this.checkMacroVetoGate(marketData, accountData),
    ];

    const allPassed = gateResults.every((g) => g.passed);
    const failureCount = gateResults.filter((g) => !g.passed).length;
    const failureReasons = gateResults.filter((g) => g.reason).map((g) => g.reason!);

    return {
      allPassed,
      gateResults,
      failureCount,
      recommendation: allPassed ? "APPROVE" : "REJECT",
      failureReasons,
    };
  }

  /**
   * Human-readable supervisor report
   */
  formatReport(decision: SupervisorDecision): string {
    const lines: string[] = [
      `═══════════════════════════════════════════════════════`,
      decision.allPassed ? `✅ SUPERVISOR APPROVAL` : `❌ SUPERVISOR REJECTION`,
      `═══════════════════════════════════════════════════════`,
      ``,
      `Gate Results:`,
    ];

    decision.gateResults.forEach((gate) => {
      const status = gate.passed ? "✅" : "❌";
      lines.push(`  ${status} ${gate.gateName.padEnd(25)} ${gate.value} (threshold: ${gate.threshold})`);
    });

    if (decision.failureReasons.length > 0) {
      lines.push(``, `Failures:`);
      decision.failureReasons.forEach((reason) => {
        lines.push(`  ❌ ${reason}`);
      });
    }

    lines.push(
      ``,
      `Recommendation: ${decision.recommendation}`,
      `═══════════════════════════════════════════════════════`
    );

    return lines.join("\n");
  }
}
