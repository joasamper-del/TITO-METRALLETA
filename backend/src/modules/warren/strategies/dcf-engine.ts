import { Injectable } from '@nestjs/common';

export interface DCFInputs {
  // Company metrics
  fcf: number; // Most recent Free Cash Flow in millions
  fcfGrowthRate: number; // Expected FCF growth rate (%) for projection period
  projectionYears: number; // Years to project (typically 5-10)
  terminalGrowthRate?: number; // Long-term perpetual growth (default 3%)

  // Valuation parameters
  wacc: number; // Weighted Average Cost of Capital (discount rate %)
  equityShares: number; // Outstanding shares (millions)
  netDebt: number; // Net debt in millions (debt - cash)

  // Confidence / stability indicators
  fcfQuality: 'excellent' | 'good' | 'fair' | 'poor'; // Historical FCF stability
  earningsQuality: 'stable' | 'volatile' | 'declining'; // Earnings predictability
}

export interface DCFScenario {
  name: 'conservative' | 'base' | 'optimistic';
  wacc: number;
  terminalGrowth: number;
  fcfGrowthRate: number;
  enterpriseValue: number; // Calculated EV
  equityValue: number; // EV - net debt
  fairValue: number; // Fair value per share
  terminalValue: number; // Terminal value component
}

export interface DCFValuation {
  baseCase: DCFScenario;
  conservativeCase: DCFScenario;
  optimisticCase: DCFScenario;

  // Summary
  fairValueRange: {
    low: number; // Conservative
    mid: number; // Base
    high: number; // Optimistic
  };

  // Confidence & sensitivity
  confidenceLevel: 'high' | 'medium' | 'low'; // Based on FCF stability, earnings quality
  confidenceReason: string;

  // Sensitivity analysis
  sensitivityWarnings: string[]; // Warnings about key assumptions

  // Valuation status
  valuationStatus: 'attractive' | 'fair' | 'expensive';
  marginOfSafety: {
    atPrice: number; // Current market price
    percentDiscount: number; // How far below fair value
    assessmentAtPrice: 'strong-buy' | 'buy' | 'hold' | 'sell' | 'strong-sell';
  };
}

@Injectable()
export class DCFEngineService {
  /**
   * Calculate DCF valuation with multiple scenarios
   *
   * CRITICAL DESIGN:
   * - Fair value is NOT a single number, but a range (conservative to optimistic)
   * - Base case is reference, but all scenarios are equally valid
   * - Confidence is LOW when FCF unstable or earnings volatile
   * - Valuation status is gatekeeping: even if score >=80, bad valuation blocks buy
   */
  public calculateDCF(inputs: DCFInputs): DCFValuation {
    const defaults = this.applyDefaults(inputs);

    const conservativeCase = this.buildScenario(
      'conservative',
      defaults,
      defaults.wacc + 0.5, // Higher discount rate = lower valuation
      (defaults.terminalGrowthRate || 3) - 0.5,
      defaults.fcfGrowthRate - 2 // Lower growth assumption
    );

    const baseCase = this.buildScenario(
      'base',
      defaults,
      defaults.wacc,
      defaults.terminalGrowthRate || 3,
      defaults.fcfGrowthRate
    );

    const optimisticCase = this.buildScenario(
      'optimistic',
      defaults,
      defaults.wacc - 0.5, // Lower discount rate = higher valuation
      (defaults.terminalGrowthRate || 3) + 0.5,
      defaults.fcfGrowthRate + 2 // Higher growth assumption
    );

    const confidenceAssessment = this.assessConfidence(inputs);
    const sensitivityWarnings = this.identifySensitivities(inputs, defaults);

    return {
      baseCase,
      conservativeCase,
      optimisticCase,

      fairValueRange: {
        low: conservativeCase.fairValue,
        mid: baseCase.fairValue,
        high: optimisticCase.fairValue,
      },

      confidenceLevel: confidenceAssessment.level,
      confidenceReason: confidenceAssessment.reason,

      sensitivityWarnings,

      valuationStatus: baseCase.fairValue > 0 ? 'fair' : 'expensive',

      marginOfSafety: {
        atPrice: 0, // Will be set by caller with current price
        percentDiscount: 0,
        assessmentAtPrice: 'hold',
      },
    };
  }

  /**
   * Apply defaults and validate inputs
   */
  private applyDefaults(inputs: DCFInputs): Required<DCFInputs> {
    return {
      ...inputs,
      terminalGrowthRate: inputs.terminalGrowthRate || 3,
    };
  }

  /**
   * Build a single DCF scenario
   */
  private buildScenario(
    name: 'conservative' | 'base' | 'optimistic',
    inputs: Required<DCFInputs>,
    wacc: number,
    terminalGrowth: number,
    fcfGrowthRate: number,
  ): DCFScenario {
    // Project FCF for projection period
    let projectedFCF = inputs.fcf;
    let pvOfProjectedFCF = 0;

    for (let year = 1; year <= inputs.projectionYears; year++) {
      projectedFCF *= (1 + fcfGrowthRate / 100);
      const discountFactor = 1 / Math.pow(1 + wacc / 100, year);
      pvOfProjectedFCF += projectedFCF * discountFactor;
    }

    // Calculate terminal value
    const fcfInTerminalYear = projectedFCF * (1 + terminalGrowth / 100);
    const terminalValue = fcfInTerminalYear / (wacc / 100 - terminalGrowth / 100);
    const pvOfTerminalValue = terminalValue / Math.pow(1 + wacc / 100, inputs.projectionYears);

    // Enterprise Value
    const enterpriseValue = pvOfProjectedFCF + pvOfTerminalValue;
    const equityValue = enterpriseValue - inputs.netDebt;
    const fairValue = equityValue / inputs.equityShares;

    return {
      name,
      wacc,
      terminalGrowth,
      fcfGrowthRate,
      enterpriseValue: Math.max(0, enterpriseValue),
      equityValue: Math.max(0, equityValue),
      fairValue: Math.max(0, fairValue),
      terminalValue: Math.max(0, pvOfTerminalValue),
    };
  }

  /**
   * Assess confidence level based on FCF quality and earnings stability
   */
  private assessConfidence(inputs: DCFInputs): { level: 'high' | 'medium' | 'low'; reason: string } {
    const fcfQualityScore = {
      'excellent': 3,
      'good': 2,
      'fair': 1,
      'poor': 0,
    }[inputs.fcfQuality];

    const earningsQualityScore = {
      'stable': 2,
      'volatile': 1,
      'declining': 0,
    }[inputs.earningsQuality];

    const totalScore = fcfQualityScore + earningsQualityScore;

    if (totalScore >= 4) {
      return {
        level: 'high',
        reason: `FCF quality (${inputs.fcfQuality}) and earnings (${inputs.earningsQuality}) are both strong`,
      };
    }

    if (totalScore >= 2) {
      return {
        level: 'medium',
        reason: `Mixed signals: FCF quality (${inputs.fcfQuality}) and earnings (${inputs.earningsQuality}). Monitor assumptions carefully.`,
      };
    }

    return {
      level: 'low',
      reason: `WARNING: FCF quality (${inputs.fcfQuality}) or earnings (${inputs.earningsQuality}) are weak. Fair value range is unreliable.`,
    };
  }

  /**
   * Identify sensitivity risks
   */
  private identifySensitivities(inputs: DCFInputs, defaults: Required<DCFInputs>): string[] {
    const warnings: string[] = [];

    if (inputs.fcfQuality === 'poor') {
      warnings.push('CRITICAL: FCF is unpredictable. Valuation unreliable. Consider "baja confianza".');
    }

    if (inputs.earningsQuality === 'declining') {
      warnings.push('WARNING: Earnings declining. Terminal growth assumption may be optimistic.');
    }

    if (inputs.terminalGrowthRate && inputs.terminalGrowthRate > 4) {
      warnings.push(`Terminal growth (${inputs.terminalGrowthRate}%) exceeds expected GDP. Risks overvaluation.`);
    }

    if (defaults.wacc <= 5) {
      warnings.push(`WACC (${defaults.wacc}%) is very low. Validate discount rate assumptions.`);
    }

    if (inputs.fcfGrowthRate > 30) {
      warnings.push(`FCF growth projection (${inputs.fcfGrowthRate}%) is aggressive. Highly sensitive to assumption changes.`);
    }

    return warnings;
  }

  /**
   * Calculate margin of safety at current market price
   * Returns assessment: how far is price from fair value?
   */
  public calculateMarginAtPrice(
    valuation: DCFValuation,
    currentPrice: number,
  ): {
    percentDiscountFromBase: number;
    percentDiscountFromConservative: number;
    assessment: 'strong-buy' | 'buy' | 'hold' | 'sell' | 'strong-sell';
    recommendation: string;
  } {
    const baseDiscount = ((valuation.baseCase.fairValue - currentPrice) / valuation.baseCase.fairValue) * 100;
    const conservativeDiscount = ((valuation.conservativeCase.fairValue - currentPrice) / valuation.conservativeCase.fairValue) * 100;

    let assessment: 'strong-buy' | 'buy' | 'hold' | 'sell' | 'strong-sell' = 'hold';
    let recommendation = '';

    // Assessment based on conservative case (more downside protection)
    if (conservativeDiscount >= 35) {
      assessment = 'strong-buy';
      recommendation = `Price ${currentPrice.toFixed(2)} is ${conservativeDiscount.toFixed(1)}% below conservative fair value (${valuation.conservativeCase.fairValue.toFixed(2)}). Strong margin of safety.`;
    } else if (conservativeDiscount >= 25) {
      assessment = 'buy';
      recommendation = `Price ${currentPrice.toFixed(2)} is ${conservativeDiscount.toFixed(1)}% below conservative fair value. Adequate margin of safety.`;
    } else if (conservativeDiscount >= 15) {
      assessment = 'hold';
      recommendation = `Price ${currentPrice.toFixed(2)} is ${conservativeDiscount.toFixed(1)}% below conservative fair value. Limited margin of safety.`;
    } else if (conservativeDiscount >= 0) {
      assessment = 'hold';
      recommendation = `Price ${currentPrice.toFixed(2)} is within ${Math.abs(conservativeDiscount).toFixed(1)}% of conservative fair value. Fair valuation.`;
    } else if (conservativeDiscount > -15) {
      assessment = 'sell';
      recommendation = `Price ${currentPrice.toFixed(2)} is ${Math.abs(conservativeDiscount).toFixed(1)}% ABOVE conservative fair value. Limited upside, downside risk.`;
    } else {
      assessment = 'strong-sell';
      recommendation = `Price ${currentPrice.toFixed(2)} is ${Math.abs(conservativeDiscount).toFixed(1)}% ABOVE conservative fair value. Expensive.`;
    }

    return {
      percentDiscountFromBase: baseDiscount,
      percentDiscountFromConservative: conservativeDiscount,
      assessment,
      recommendation,
    };
  }

  /**
   * Determine valuation status (used as gatekeeping alongside score)
   */
  public getValuationStatus(valuation: DCFValuation, currentPrice: number): 'attractive' | 'fair' | 'expensive' {
    const margin = this.calculateMarginAtPrice(valuation, currentPrice);

    if (['strong-buy', 'buy'].includes(margin.assessment)) {
      return 'attractive';
    }

    if (margin.assessment === 'hold') {
      return 'fair';
    }

    return 'expensive';
  }
}
