/**
 * Strategy Selector
 * Brain of Tito: analyzes market → selects strategy OR decides NOT to operate
 */

import { StrategyMatcher, RegimeMatch, StrategyProfile } from "./strategyMatcher";
import { RiskGate, RiskGateResult } from "./riskGate";

export interface MarketConditions {
  regime: string; // BULLISH_STRONG, BEARISH_WEAK, etc.
  vix: number;
  symbol: string;
  price: number;
  volume: number;
  volatility: number;
  earningsWithin24h: boolean;
}

export interface SelectionResult {
  status: "OPERATE" | "DO_NOT_OPERATE";
  selectedStrategy?: string;
  selectedSymbol?: string;
  confidence: number; // 0-100
  compatibilityScore: number; // 0-100
  riskGateResult?: RiskGateResult;
  explanation: string;
  reasons: string[];
}

export class StrategySelector {
  private matcher: StrategyMatcher;
  private riskGate: RiskGate;

  constructor() {
    this.matcher = new StrategyMatcher();
    this.riskGate = new RiskGate();
  }

  selectStrategy(conditions: MarketConditions): SelectionResult {
    // Step 1: Get all strategies matched to this regime
    const regimeMatches = this.matcher.matchStrategiesToRegime(conditions.regime);

    // Step 2: Filter to only unblocked strategies
    const unblockedStrategies = this.matcher.getUnblockedStrategies();
    const validMatches = regimeMatches.filter((m) => unblockedStrategies.includes(m.strategy) && !m.blockedReason);

    if (validMatches.length === 0) {
      return {
        status: "DO_NOT_OPERATE",
        confidence: 0,
        compatibilityScore: 0,
        explanation: `No valid strategies for regime ${conditions.regime}. All candidates blocked or incompatible.`,
        reasons: ["No unblocked strategies match current regime"],
      };
    }

    // Step 3: For each candidate, check risk gates
    let bestValidStrategy: SelectionResult | null = null;

    for (const match of validMatches) {
      const profile = this.matcher.getStrategyProfile(match.strategy);
      if (!profile) continue;

      // Apply risk gates
      const gateResult = this.riskGate.validateStrategy(
        match.strategy,
        profile.symbol,
        profile.testWinRate,
        profile.testSharpe,
        profile.overfittingScore,
        profile.maxDrawdown,
        conditions.volume,
        conditions.earningsWithin24h
      );

      // If gates fail, skip this strategy
      if (!gateResult.allPassed) {
        continue;
      }

      // This strategy passed all gates
      const confidence = Math.min(match.confidence, 100 - profile.overfittingScore);

      const result: SelectionResult = {
        status: "OPERATE",
        selectedStrategy: match.strategy,
        selectedSymbol: profile.symbol,
        confidence: Math.floor(confidence),
        compatibilityScore: Math.floor(match.compatibilityScore),
        riskGateResult: gateResult,
        explanation: `✅ OPERATE: ${match.strategy} selected for ${conditions.regime} regime. All risk gates passed.`,
        reasons: [
          `Regime preference: ${match.compatibilityScore.toFixed(0)}/100 compatibility`,
          `Generalization: ${profile.generalizationQuality} (${100 - profile.overfittingScore}% reliability)`,
          `Test performance: ${profile.testWinRate}% win rate, ${profile.testSharpe.toFixed(2)} Sharpe`,
          `All 6 risk gates passed`,
        ],
      };

      // Keep track of best strategy (highest confidence)
      if (!bestValidStrategy || result.confidence > bestValidStrategy.confidence) {
        bestValidStrategy = result;
      }
    }

    if (bestValidStrategy) {
      return bestValidStrategy;
    }

    // No strategy passed all gates
    const failedStrategies = validMatches
      .map((match) => {
        const profile = this.matcher.getStrategyProfile(match.strategy);
        if (!profile) return null;

        const gateResult = this.riskGate.validateStrategy(
          match.strategy,
          profile.symbol,
          profile.testWinRate,
          profile.testSharpe,
          profile.overfittingScore,
          profile.maxDrawdown,
          conditions.volume,
          conditions.earningsWithin24h
        );

        return { strategy: match.strategy, failures: gateResult.reasons };
      })
      .filter((x) => x !== null);

    return {
      status: "DO_NOT_OPERATE",
      confidence: 0,
      compatibilityScore: 0,
      explanation:
        "❌ DO NOT OPERATE: All strategies failed risk gate validation. Conditions not favorable for trading.",
      reasons: [
        `Regime: ${conditions.regime}`,
        `VIX: ${conditions.vix}`,
        `Failures:`,
        ...failedStrategies.flatMap((f) => (f ? [`  ${f.strategy}: ${f.failures.join("; ")}`] : [])),
      ],
    };
  }

  getBlockedStrategies(): string[] {
    return this.matcher.getBlockedStrategies();
  }

  isLongStraddleDisabled(): boolean {
    return this.matcher.isStrategyBlocked("LongStraddleStrategy");
  }

  getDecisionExplanation(result: SelectionResult): string {
    const lines: string[] = [
      `═══════════════════════════════════════════════════════`,
      result.status === "OPERATE"
        ? `✅ DECISION: OPERATE`
        : `❌ DECISION: DO NOT OPERATE`,
      `═══════════════════════════════════════════════════════`,
      ``,
      result.explanation,
      ``,
      `Reasoning:`,
    ];

    result.reasons.forEach((reason) => {
      lines.push(`  • ${reason}`);
    });

    if (result.riskGateResult) {
      lines.push(``, `Risk Gates:`);
      result.riskGateResult.gateResults.forEach((gate) => {
        const status = gate.passed ? "✅" : "❌";
        lines.push(`  ${status} ${gate.gateName}: ${gate.value} (threshold: ${gate.threshold})`);
      });
    }

    if (result.status === "OPERATE") {
      lines.push(
        ``,
        `Selected Strategy: ${result.selectedStrategy}`,
        `Target: ${result.selectedSymbol}`,
        `Confidence: ${result.confidence}/100`,
        `Compatibility: ${result.compatibilityScore}/100`
      );
    }

    lines.push(``, `═══════════════════════════════════════════════════════`);

    return lines.join("\n");
  }
}
