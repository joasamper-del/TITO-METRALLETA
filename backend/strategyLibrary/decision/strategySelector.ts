/**
 * Strategy Selector
 * Brain of Tito: analyzes market → selects strategy OR decides NOT to operate
 */

import { StrategyMatcher, RegimeMatch, StrategyProfile } from "./strategyMatcher";
import { RiskGate, RiskGateResult } from "./riskGate";
import { AuditTrailIntegration, AuditContext } from "../execution/auditTrailIntegration";

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
  private auditTrail?: AuditTrailIntegration;

  constructor(auditTrail?: AuditTrailIntegration) {
    this.matcher = new StrategyMatcher();
    this.riskGate = new RiskGate(auditTrail);
    this.auditTrail = auditTrail;
  }

  async selectStrategy(conditions: MarketConditions): Promise<SelectionResult> {
    // Step 0: Verify regime is recognized
    const validRegimes = ["BULLISH_STRONG", "BULLISH_WEAK", "BEARISH_STRONG", "BEARISH_WEAK", "LATERAL", "HIGH_VOLATILITY", "EARNINGS_EVENT"];
    if (!validRegimes.includes(conditions.regime)) {
      const result: SelectionResult = {
        status: "DO_NOT_OPERATE",
        confidence: 0,
        compatibilityScore: 0,
        explanation: `Unknown market regime: ${conditions.regime}. Cannot determine appropriate strategy.`,
        reasons: [`Regime "${conditions.regime}" is not recognized. Valid regimes: ${validRegimes.join(", ")}`],
      };
      await this.recordDecisionAsync(conditions, result);
      return result;
    }

    // Step 1: Get all strategies matched to this regime
    const regimeMatches = this.matcher.matchStrategiesToRegime(conditions.regime);

    // Step 2: Filter to only unblocked strategies
    const unblockedStrategies = this.matcher.getUnblockedStrategies();
    const validMatches = regimeMatches.filter((m) => unblockedStrategies.includes(m.strategy) && !m.blockedReason);

    if (validMatches.length === 0) {
      const result: SelectionResult = {
        status: "DO_NOT_OPERATE",
        confidence: 0,
        compatibilityScore: 0,
        explanation: `No valid strategies for regime ${conditions.regime}. All candidates blocked or incompatible.`,
        reasons: ["No unblocked strategies match current regime"],
      };
      await this.recordDecisionAsync(conditions, result);
      return result;
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
        // [S57] Record gate failure
        await this.riskGate.recordGateDecision(
          conditions.symbol,
          match.strategy,
          conditions.vix,
          conditions.volume,
          gateResult
        );
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
      await this.recordDecisionAsync(conditions, bestValidStrategy);
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

        // [S57] Record each strategy's gate failure
        if (!gateResult.allPassed) {
          this.riskGate.recordGateDecision(
            conditions.symbol,
            match.strategy,
            conditions.vix,
            conditions.volume,
            gateResult
          ).catch(err => {
            console.error('[S57] Failed to record gate failure:', err.message);
          });
        }

        return { strategy: match.strategy, failures: gateResult.reasons };
      })
      .filter((x) => x !== null);

    const result: SelectionResult = {
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
    await this.recordDecisionAsync(conditions, result);
    return result;
  }

  private async recordDecisionAsync(conditions: MarketConditions, result: SelectionResult): Promise<void> {
    if (!this.auditTrail) return;

    try {
      const context: AuditContext = {
        timestamp: new Date(),
        symbol: conditions.symbol,
        strategy: result.selectedStrategy || 'UNKNOWN',
        marketData: {
          price: conditions.price,
          vix: conditions.vix,
          volume: conditions.volume,
        },
        dataAvailability: {
          price: 'REAL',
          vix: 'REAL',
          volume: 'REAL',
        },
      };

      this.auditTrail.recordSelectionDecision(context, result).catch(err => {
        console.error('[S57] Selection decision logging failed (non-blocking):', err.message);
      });
    } catch (err) {
      console.error('[S57] Selection audit error:', err.message);
    }
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
