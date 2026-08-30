/**
 * Risk Gate
 * Implements 6 mandatory gates that MUST pass before any trade
 * A single gate failure = DO NOT OPERATE
 */

export interface GateCheckResult {
  gateName: string;
  passed: boolean;
  value: number | string;
  threshold: number | string;
  failureReason?: string;
}

export interface RiskGateResult {
  allPassed: boolean;
  gateResults: GateCheckResult[];
  failureCount: number;
  recommendation: "OPERATE" | "DO_NOT_OPERATE";
  reasons: string[];
}

export class RiskGate {
  // Gate 1: Win Rate >45% minimum
  checkWinRateGate(winRate: number): GateCheckResult {
    const passed = winRate >= 45;
    return {
      gateName: "Win Rate",
      passed,
      value: `${winRate.toFixed(1)}%`,
      threshold: "45%",
      failureReason: passed ? undefined : `Win rate ${winRate.toFixed(1)}% is below 45% minimum (too risky)`,
    };
  }

  // Gate 2: Sharpe Ratio >0.5 minimum
  checkSharpeRatioGate(sharpeRatio: number): GateCheckResult {
    const passed = sharpeRatio >= 0.5;
    return {
      gateName: "Sharpe Ratio",
      passed,
      value: sharpeRatio.toFixed(2),
      threshold: "0.5",
      failureReason: passed ? undefined : `Sharpe ratio ${sharpeRatio.toFixed(2)} below 0.5 (inadequate risk-adjusted returns)`,
    };
  }

  // Gate 3: Overfitting <50% maximum
  checkOverfittingGate(overfittingScore: number): GateCheckResult {
    const passed = overfittingScore < 50;
    return {
      gateName: "Overfitting",
      passed,
      value: `${overfittingScore.toFixed(1)}%`,
      threshold: "<50%",
      failureReason: passed ? undefined : `Overfitting ${overfittingScore.toFixed(1)}% exceeds 50% threshold (poor generalization)`,
    };
  }

  // Gate 4: Max Drawdown <6% maximum
  checkDrawdownGate(maxDrawdown: number): GateCheckResult {
    const passed = Math.abs(maxDrawdown) < 6;
    return {
      gateName: "Max Drawdown",
      passed,
      value: `${maxDrawdown.toFixed(1)}%`,
      threshold: "<6%",
      failureReason: passed ? undefined : `Drawdown ${Math.abs(maxDrawdown).toFixed(1)}% exceeds 6% (excessive risk)`,
    };
  }

  // Gate 5: Liquidity adequate
  checkLiquidityGate(symbol: string, volume: number): GateCheckResult {
    const minimums: Record<string, number> = {
      SPY: 20000000, // 20M
      QQQ: 15000000, // 15M
      BTC: 500000000, // 500M
      VIX: 100000000, // 100M (estimated)
    };

    const minimum = minimums[symbol] || 10000000;
    const passed = volume >= minimum;

    return {
      gateName: "Liquidity",
      passed,
      value: `${(volume / 1000000).toFixed(1)}M`,
      threshold: `${(minimum / 1000000).toFixed(0)}M`,
      failureReason: passed ? undefined : `Volume ${(volume / 1000000).toFixed(1)}M below required ${(minimum / 1000000).toFixed(0)}M`,
    };
  }

  // Gate 6: No earnings within 24 hours (only for individual stocks, NOT indices/crypto)
  checkEarningsGate(symbol: string, earningsWithin24h: boolean): GateCheckResult {
    // Only apply to individual stocks, NOT to indices or crypto
    const isIndividualStock = !["SPY", "QQQ", "VIX", "BTC", "ETH"].includes(symbol);

    if (!isIndividualStock) {
      // Gate passes automatically for indices and crypto
      return {
        gateName: "Earnings",
        passed: true,
        value: "N/A (index/crypto)",
        threshold: "N/A",
      };
    }

    const passed = !earningsWithin24h;
    return {
      gateName: "Earnings",
      passed,
      value: earningsWithin24h ? "YES (earnings 24h)" : "NO (safe)",
      threshold: "No earnings 24h before",
      failureReason: passed ? undefined : "Earnings announced within 24 hours (block trade)",
    };
  }

  // Run all 6 gates
  validateStrategy(
    strategyName: string,
    symbol: string,
    winRate: number,
    sharpeRatio: number,
    overfittingScore: number,
    maxDrawdown: number,
    volume: number,
    earningsWithin24h: boolean
  ): RiskGateResult {
    const gateResults: GateCheckResult[] = [
      this.checkWinRateGate(winRate),
      this.checkSharpeRatioGate(sharpeRatio),
      this.checkOverfittingGate(overfittingScore),
      this.checkDrawdownGate(maxDrawdown),
      this.checkLiquidityGate(symbol, volume),
      this.checkEarningsGate(symbol, earningsWithin24h),
    ];

    const allPassed = gateResults.every((g) => g.passed);
    const failureCount = gateResults.filter((g) => !g.passed).length;
    const reasons = gateResults.filter((g) => g.failureReason).map((g) => g.failureReason!);

    return {
      allPassed,
      gateResults,
      failureCount,
      recommendation: allPassed ? "OPERATE" : "DO_NOT_OPERATE",
      reasons,
    };
  }

  // Get gate summary as string
  getSummary(result: RiskGateResult): string {
    const header = `Risk Gate Analysis: ${result.recommendation}`;
    const summary = result.gateResults.map((g) => `  ${g.gateName}: ${g.passed ? "✅" : "❌"} (${g.value})`).join("\n");
    const failures = result.reasons.length > 0 ? `\nFailures:\n${result.reasons.map((r) => `  - ${r}`).join("\n")}` : "";

    return `${header}\n${summary}${failures}`;
  }
}
