import { Injectable } from '@nestjs/common';
import { FundamentalScores } from './fundamental-scorer';
import { DCFValuation } from './dcf-engine';
import { MacroContext } from './macro-context';

export interface DecisionInput {
  fundamentalScore: FundamentalScores;
  dcfValuation: DCFValuation;
  currentPrice: number;
  macroContext: MacroContext;
}

export interface GateResult {
  passed: boolean;
  reason: string;
  severity: 'pass' | 'caution' | 'reject';
}

export interface DecisionOutput {
  decision: 'BUY' | 'HOLD' | 'TRIM' | 'SELL';

  gateResults: {
    scoreGate: GateResult;
    valuationGate: GateResult;
    marginGate: GateResult;
    confidenceGate: GateResult;
    dataQualityGate: GateResult;
  };

  macroAdjustment: {
    context: 'bullish' | 'neutral' | 'bearish';
    aggressivenessAdjustment: number;
    marginAdjustment: number;
  };

  positionSizing: {
    baseAllocation: number; // %
    macroAdjusted: number; // %
  };

  marginRequired: {
    base: number; // %
    macroAdjusted: number; // %
  };

  explanation: string;
}

@Injectable()
export class DecisionEngineService {
  /**
   * WARREN BUFFETT JR. DECISION ENGINE
   *
   * Takes: Fundamental Score + DCF Valuation + Macro Context
   * Applies: Sequential gates (ANY failure blocks BUY)
   * Returns: BUY / HOLD / TRIM / SELL recommendation
   *
   * CRITICAL DESIGN:
   * - Score <80 = AUTOMATIC REJECT (never buys)
   * - Score ≥80 = CANDIDATA (other gates must validate)
   * - Valuation, Margin, Confidence gates are GATEKEEPERS
   * - Macro is MODIFIER ONLY (adjusts prudence, never flips decisions)
   * - NO execution, NO Alpaca connection, NO real capital
   */
  public makeDecision(input: DecisionInput): DecisionOutput {
    // Gate 1: Score gate
    const scoreGate = this.evaluateScoreGate(input.fundamentalScore);

    // If score <80, all other gates auto-fail
    if (!scoreGate.passed) {
      return this.buildRejectionDecision(input, scoreGate);
    }

    // Gate 2: Valuation gate
    const valuationGate = this.evaluateValuationGate(input.dcfValuation);

    // Gate 3: Margin of safety gate
    const marginGate = this.evaluateMarginGate(input.dcfValuation, input.currentPrice);

    // Gate 4: Confidence gate
    const confidenceGate = this.evaluateConfidenceGate(input.macroContext);

    // Gate 5: Data quality gate
    const dataQualityGate = this.evaluateDataQualityGate(input.macroContext);

    // Macro adjustment (NOT a gate, but modifies final decision)
    const macroAdjustment = {
      context: input.macroContext.macroContext as 'bullish' | 'neutral' | 'bearish',
      aggressivenessAdjustment: input.macroContext.aggressivenessAdjustment,
      marginAdjustment: input.macroContext.marginAdjustment,
    };

    // Position sizing
    const baseAllocation = 3; // Warren's standard 3% per position
    const macroAdjustedAllocation = Math.max(1, Math.min(5, baseAllocation + macroAdjustment.aggressivenessAdjustment));

    // Margin of safety
    const baseMargin = 20;
    const macroAdjustedMargin = Math.max(-5, Math.min(15, baseMargin + macroAdjustment.marginAdjustment));

    // Determine decision based on gate results
    const decision = this.determineDecision(scoreGate, valuationGate, marginGate, confidenceGate, dataQualityGate);

    const explanation = this.buildExplanation(
      input,
      scoreGate,
      valuationGate,
      marginGate,
      confidenceGate,
      dataQualityGate,
      decision,
    );

    return {
      decision,
      gateResults: {
        scoreGate,
        valuationGate,
        marginGate,
        confidenceGate,
        dataQualityGate,
      },
      macroAdjustment,
      positionSizing: {
        baseAllocation,
        macroAdjusted: macroAdjustedAllocation,
      },
      marginRequired: {
        base: baseMargin,
        macroAdjusted: macroAdjustedMargin,
      },
      explanation,
    };
  }

  /**
   * GATE 1: Score Gate
   * Score <80 = AUTOMATIC REJECT
   * Score 80-84 = CANDIDATE (proceed to other gates)
   * Score 85+ = APPROVED (proceed to other gates)
   */
  private evaluateScoreGate(score: FundamentalScores): GateResult {
    if (score.totalScore < 80) {
      return {
        passed: false,
        reason: `Score ${score.totalScore.toFixed(1)} is below minimum 80 threshold. Status: ${score.scoreCategory.toUpperCase()}. NO CANDIDATA.`,
        severity: 'reject',
      };
    }

    if (score.totalScore < 85) {
      return {
        passed: true,
        reason: `Score ${score.totalScore.toFixed(1)} qualifies as CANDIDATE (80-84 range). Requires validation by other gates.`,
        severity: 'caution',
      };
    }

    return {
      passed: true,
      reason: `Score ${score.totalScore.toFixed(1)} qualifies as APPROVED (85+ range). Proceed to validation gates.`,
      severity: 'pass',
    };
  }

  /**
   * GATE 2: Valuation Gate
   * attractive = allows BUY (if other gates pass)
   * fair = allows HOLD/TRIM
   * expensive = BLOCKS BUY (TRIM/SELL recommended)
   */
  private evaluateValuationGate(valuation: DCFValuation): GateResult {
    // Valuation status comes directly from DCF calculation
    const status = valuation.valuationStatus;

    if (status === 'attractive') {
      return {
        passed: true,
        reason: `Valuation is ATTRACTIVE. Fair value range: ${valuation.fairValueRange.low.toFixed(2)} - ${valuation.fairValueRange.high.toFixed(2)} (base: ${valuation.baseCase.fairValue.toFixed(2)}). Allows BUY if other gates pass.`,
        severity: 'pass',
      };
    }

    if (status === 'fair') {
      return {
        passed: true,
        reason: `Valuation is FAIR. Fair value range: ${valuation.fairValueRange.low.toFixed(2)} - ${valuation.fairValueRange.high.toFixed(2)}. HOLD/TRIM recommended, BUY requires caution.`,
        severity: 'caution',
      };
    }

    return {
      passed: false,
      reason: `Valuation is EXPENSIVE. Fair value range: ${valuation.fairValueRange.low.toFixed(2)} - ${valuation.fairValueRange.high.toFixed(2)}. BLOCKS new BUY. TRIM/SELL recommended.`,
      severity: 'reject',
    };
  }

  /**
   * GATE 3: Margin of Safety Gate
   * Requires price ≥ 20% below conservative fair value
   */
  private evaluateMarginGate(valuation: DCFValuation, currentPrice: number): GateResult {
    const conservativeDiscount = ((valuation.conservativeCase.fairValue - currentPrice) / valuation.conservativeCase.fairValue) * 100;

    if (conservativeDiscount >= 25) {
      return {
        passed: true,
        reason: `Strong margin of safety: ${conservativeDiscount.toFixed(1)}% discount from conservative FV (${valuation.conservativeCase.fairValue.toFixed(2)}). Excellent risk/reward at current price ${currentPrice.toFixed(2)}.`,
        severity: 'pass',
      };
    }

    if (conservativeDiscount >= 20) {
      return {
        passed: true,
        reason: `Adequate margin of safety: ${conservativeDiscount.toFixed(1)}% discount from conservative FV (${valuation.conservativeCase.fairValue.toFixed(2)}). Fair risk/reward at current price ${currentPrice.toFixed(2)}.`,
        severity: 'caution',
      };
    }

    return {
      passed: false,
      reason: `Insufficient margin of safety: ${conservativeDiscount.toFixed(1)}% discount from conservative FV (${valuation.conservativeCase.fairValue.toFixed(2)}). Current price ${currentPrice.toFixed(2)} lacks downside protection. BLOCKS BUY.`,
      severity: 'reject',
    };
  }

  /**
   * GATE 4: Confidence Gate
   * HIGH confidence = full decision
   * MEDIUM confidence = cautious decision
   * LOW confidence = recommend HOLD
   */
  private evaluateConfidenceGate(macroContext: MacroContext): GateResult {
    if (macroContext.confidenceLevel === 'high') {
      return {
        passed: true,
        reason: `HIGH confidence in macro assessment. All data fresh and consistent. ${macroContext.confidenceReasons.join(' ')}`,
        severity: 'pass',
      };
    }

    if (macroContext.confidenceLevel === 'medium') {
      return {
        passed: true,
        reason: `MEDIUM confidence in macro assessment. Minor data issues present. ${macroContext.confidenceReasons.join(' ')} Proceed with caution.`,
        severity: 'caution',
      };
    }

    return {
      passed: false,
      reason: `LOW confidence in macro assessment. Multiple data quality issues. ${macroContext.confidenceReasons.join(' ')} Recommend HOLD pending data refresh.`,
      severity: 'reject',
    };
  }

  /**
   * GATE 5: Data Quality Gate
   * Checks for stale or contradictory data
   */
  private evaluateDataQualityGate(macroContext: MacroContext): GateResult {
    if (macroContext.dataQualityWarnings.length === 0) {
      return {
        passed: true,
        reason: `All macro data fresh and consistent. No warnings.`,
        severity: 'pass',
      };
    }

    if (macroContext.dataQualityWarnings.length <= 2) {
      return {
        passed: true,
        reason: `Minor data quality issues: ${macroContext.dataQualityWarnings.join(' | ')}. Proceed with awareness.`,
        severity: 'caution',
      };
    }

    return {
      passed: false,
      reason: `Multiple data quality issues: ${macroContext.dataQualityWarnings.join(' | ')}. Insufficient data freshness. Recommend HOLD pending refresh.`,
      severity: 'reject',
    };
  }

  /**
   * Determine final decision based on all gates
   */
  private determineDecision(
    scoreGate: GateResult,
    valuationGate: GateResult,
    marginGate: GateResult,
    confidenceGate: GateResult,
    dataQualityGate: GateResult,
  ): 'BUY' | 'HOLD' | 'TRIM' | 'SELL' {
    // If score fails, it's automatic rejection
    if (!scoreGate.passed) {
      return 'SELL'; // Strong rejection if score <80
    }

    // If valuation fails, trim position
    if (!valuationGate.passed) {
      return 'TRIM'; // Trim position, expensive valuation
    }

    // If margin fails, hold
    if (!marginGate.passed) {
      return 'HOLD'; // Hold, insufficient margin of safety
    }

    // If confidence fails, hold
    if (!confidenceGate.passed) {
      return 'HOLD'; // Hold pending clarity in macro data
    }

    // If data quality fails, hold
    if (!dataQualityGate.passed) {
      return 'HOLD'; // Hold pending data refresh
    }

    // All gates pass: can BUY
    // Check if all are 'pass' severity (no cautions)
    const allFullPass = [scoreGate, valuationGate, marginGate, confidenceGate, dataQualityGate].every((g) => g.severity === 'pass');

    if (allFullPass) {
      return 'BUY'; // Full green light
    }

    // Some cautions but no rejects: HOLD (conservative, caution approach)
    return 'HOLD';
  }

  /**
   * Build rejection decision when score fails
   */
  private buildRejectionDecision(input: DecisionInput, scoreGate: GateResult): DecisionOutput {
    return {
      decision: 'SELL',
      gateResults: {
        scoreGate,
        valuationGate: { passed: false, reason: 'Not evaluated due to score rejection', severity: 'reject' },
        marginGate: { passed: false, reason: 'Not evaluated due to score rejection', severity: 'reject' },
        confidenceGate: { passed: false, reason: 'Not evaluated due to score rejection', severity: 'reject' },
        dataQualityGate: { passed: false, reason: 'Not evaluated due to score rejection', severity: 'reject' },
      },
      macroAdjustment: {
        context: input.macroContext.macroContext as 'bullish' | 'neutral' | 'bearish',
        aggressivenessAdjustment: input.macroContext.aggressivenessAdjustment,
        marginAdjustment: input.macroContext.marginAdjustment,
      },
      positionSizing: {
        baseAllocation: 3,
        macroAdjusted: 3,
      },
      marginRequired: {
        base: 20,
        macroAdjusted: 20,
      },
      explanation: `AUTOMATIC REJECTION: ${scoreGate.reason}. NO gates evaluated. FINAL DECISION: SELL`,
    };
  }


  /**
   * Build human-readable explanation
   */
  private buildExplanation(
    input: DecisionInput,
    scoreGate: GateResult,
    valuationGate: GateResult,
    marginGate: GateResult,
    confidenceGate: GateResult,
    dataQualityGate: GateResult,
    decision: string,
  ): string {
    const parts: string[] = [
      `WARREN BUFFETT JR. DECISION ANALYSIS`,
      ``,
      `FUNDAMENTAL SCORE: ${input.fundamentalScore.totalScore.toFixed(1)}/100 (${input.fundamentalScore.scoreCategory.toUpperCase()})`,
      `  Valuation: ${input.fundamentalScore.valuation}/30 | Quality: ${input.fundamentalScore.quality}/35 | Growth: ${input.fundamentalScore.growth}/20 | Macro: ${input.fundamentalScore.macro}/15`,
      ``,
      `GATE RESULTS:`,
      `  1. SCORE GATE: ${scoreGate.severity.toUpperCase()} - ${scoreGate.reason}`,
      `  2. VALUATION GATE: ${valuationGate.severity.toUpperCase()} - ${valuationGate.reason}`,
      `  3. MARGIN OF SAFETY GATE: ${marginGate.severity.toUpperCase()} - ${marginGate.reason}`,
      `  4. CONFIDENCE GATE: ${confidenceGate.severity.toUpperCase()} - ${confidenceGate.reason}`,
      `  5. DATA QUALITY GATE: ${dataQualityGate.severity.toUpperCase()} - ${dataQualityGate.reason}`,
      ``,
      `MACRO CONTEXT: ${input.macroContext.macroContext.toUpperCase()} - ${input.macroContext.contextReason}`,
      `  Confidence: ${input.macroContext.confidenceLevel.toUpperCase()} | Aggressiveness Adj: ${input.macroContext.aggressivenessAdjustment > 0 ? '+' : ''}${input.macroContext.aggressivenessAdjustment}% | Margin Adj: ${input.macroContext.marginAdjustment > 0 ? '+' : ''}${input.macroContext.marginAdjustment}%`,
      ``,
      `FINAL DECISION: ${decision}`,
    ];

    return parts.join('\n');
  }
}
