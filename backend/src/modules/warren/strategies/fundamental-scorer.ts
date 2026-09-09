import { Injectable } from '@nestjs/common';

export interface FundamentalMetrics {
  roe: number; // Return on Equity (%)
  roic: number; // Return on Invested Capital (%)
  debtToEquity: number; // D/E ratio
  fcfTrend: 'growing' | 'stable' | 'declining' | 'negative'; // FCF trajectory
  fcfValue?: number; // FCF in millions
  priceToBook: number; // P/B ratio
  priceToEarnings: number; // P/E current
  peHistorical: number; // P/E historical average
  earningsCagr5y: number; // 5-year earnings CAGR (%)
  revenueGrowth: number; // Revenue growth rate (%)
  dividendYears?: number; // Years of dividend history
  industryTailwind: 'strong' | 'normal' | 'headwind' | 'severe'; // Sector growth
  marketVIX: number; // VIX level for macro adjustment
  spPE: number; // S&P 500 P/E for market valuation
}

export interface FundamentalScores {
  valuation: number; // 0-30 points
  quality: number; // 0-35 points
  growth: number; // 0-20 points
  macro: number; // -5 to +15 points
  totalScore: number; // 0-100 (or above with macro boost)
  scoreCategory: 'avoid' | 'watch' | 'candidate' | 'approved'; // Action category
  details: {
    pbScore: number;
    peScore: number;
    roeScore: number;
    deScore: number;
    fcfScore: number;
    divScore: number;
    cagScore: number;
    revScore: number;
    tailwindScore: number;
    marketAdjustment: number;
  };
}

@Injectable()
export class FundamentalScorerService {
  /**
   * Calculate fundamental score for Warren Buffett Jr. system
   * Scoring: 0-100 with specific category thresholds
   * - <50: AVOID
   * - 50-69: NEUTRAL
   * - 70-79: WATCH (no new entry)
   * - 80-84: CANDIDATE (second interview, gatekeep required)
   * - 85+: APPROVED (if all validations pass)
   *
   * CRITICAL: Score >= 80 is MINIMUM to consider, never automatic buy
   */
  public calculateScore(metrics: FundamentalMetrics): FundamentalScores {
    const valuation = this.calculateValuation(metrics);
    const quality = this.calculateQuality(metrics);
    const growth = this.calculateGrowth(metrics);
    const macro = this.calculateMacro(metrics);

    const totalScore = valuation + quality + growth + macro;

    return {
      valuation,
      quality,
      growth,
      macro,
      totalScore: Math.max(0, Math.min(100, totalScore)), // Clamp to 0-100
      scoreCategory: this.categorizeScore(totalScore),
      details: {
        pbScore: this.scorePriceToBook(metrics.priceToBook),
        peScore: this.scorePriceToEarnings(metrics.priceToEarnings, metrics.peHistorical),
        roeScore: this.scoreROE(metrics.roe),
        deScore: this.scoreDebtToEquity(metrics.debtToEquity),
        fcfScore: this.scoreFCFQuality(metrics.fcfTrend),
        divScore: this.scoreDividend(metrics.dividendYears),
        cagScore: this.scoreEarningsCagr(metrics.earningsCagr5y),
        revScore: this.scoreRevenueGrowth(metrics.revenueGrowth),
        tailwindScore: this.scoreTailwind(metrics.industryTailwind),
        marketAdjustment: this.calculateMarketAdjustment(metrics.spPE, metrics.marketVIX),
      },
    };
  }

  /**
   * VALUATION (30 points max)
   * P/B (15) + P/E vs Historical (15)
   */
  private calculateValuation(metrics: FundamentalMetrics): number {
    const pbScore = this.scorePriceToBook(metrics.priceToBook);
    const peScore = this.scorePriceToEarnings(metrics.priceToEarnings, metrics.peHistorical);
    return pbScore + peScore;
  }

  private scorePriceToBook(pb: number): number {
    if (pb < 1.0) return 15;
    if (pb <= 2.0) return 10;
    if (pb <= 3.0) return 5;
    return 0;
  }

  private scorePriceToEarnings(currentPE: number, historicalPE: number): number {
    if (historicalPE === 0) return 0; // Safety check
    const peRatio = currentPE / historicalPE;

    if (peRatio < 0.8) return 15;
    if (peRatio <= 1.0) return 10;
    if (peRatio <= 1.3) return 5;
    return 0;
  }

  /**
   * QUALITY (35 points max)
   * ROE (10) + Debt/Equity (10) + FCF Quality (8) + Dividend (7)
   */
  private calculateQuality(metrics: FundamentalMetrics): number {
    const roeScore = this.scoreROE(metrics.roe);
    const deScore = this.scoreDebtToEquity(metrics.debtToEquity);
    const fcfScore = this.scoreFCFQuality(metrics.fcfTrend);
    const divScore = this.scoreDividend(metrics.dividendYears);

    return roeScore + deScore + fcfScore + divScore;
  }

  private scoreROE(roe: number): number {
    if (roe >= 20) return 10;
    if (roe >= 15) return 7;
    if (roe >= 10) return 4;
    return 0;
  }

  private scoreDebtToEquity(de: number): number {
    if (de <= 0.3) return 10;
    if (de <= 0.5) return 7;
    if (de <= 0.8) return 4;
    return 0;
  }

  private scoreFCFQuality(trend: 'growing' | 'stable' | 'declining' | 'negative'): number {
    switch (trend) {
      case 'growing':
        return 8;
      case 'stable':
        return 5;
      case 'declining':
        return 2;
      case 'negative':
        return 0;
      default:
        return 0;
    }
  }

  private scoreDividend(dividendYears?: number): number {
    if (!dividendYears) return 0;
    if (dividendYears >= 15) return 7;
    if (dividendYears >= 5) return 5;
    if (dividendYears > 0) return 2;
    return 0;
  }

  /**
   * GROWTH (20 points max)
   * 5-Year CAGR (10) + Revenue Growth (10)
   */
  private calculateGrowth(metrics: FundamentalMetrics): number {
    const cagScore = this.scoreEarningsCagr(metrics.earningsCagr5y);
    const revScore = this.scoreRevenueGrowth(metrics.revenueGrowth);
    return cagScore + revScore;
  }

  private scoreEarningsCagr(cagr: number): number {
    if (cagr >= 15) return 10;
    if (cagr >= 10) return 7;
    if (cagr >= 5) return 4;
    return 2;
  }

  private scoreRevenueGrowth(growth: number): number {
    if (growth >= 10) return 10;
    if (growth >= 5) return 7;
    if (growth >= 2) return 4;
    return 0;
  }

  /**
   * MACRO (-5 to +15 points)
   * Industry Tailwind (10) + Market Valuation Adjustment (-5 to +5)
   */
  private calculateMacro(metrics: FundamentalMetrics): number {
    const tailwindScore = this.scoreTailwind(metrics.industryTailwind);
    const marketAdjustment = this.calculateMarketAdjustment(metrics.spPE, metrics.marketVIX);
    return tailwindScore + marketAdjustment;
  }

  private scoreTailwind(tailwind: 'strong' | 'normal' | 'headwind' | 'severe'): number {
    switch (tailwind) {
      case 'strong':
        return 10;
      case 'normal':
        return 7;
      case 'headwind':
        return 4;
      case 'severe':
        return 0;
      default:
        return 0;
    }
  }

  private calculateMarketAdjustment(spPE: number, vix: number): number {
    let adjustment = 0;

    // Market valuation based on S&P 500 P/E
    if (spPE < 15) {
      adjustment += 5; // Market cheap
    } else if (spPE < 18) {
      adjustment += 2; // Market normal
    } else if (spPE < 22) {
      adjustment += 0; // Market fair
    } else {
      adjustment -= 5; // Market expensive
    }

    // VIX adjustment for stress
    if (vix > 25) {
      adjustment -= 3; // High stress, reduce aggressiveness
    } else if (vix > 20) {
      adjustment -= 1; // Elevated stress
    }

    return Math.max(-5, Math.min(5, adjustment)); // Clamp to -5 to +5
  }

  /**
   * Categorize score into action category
   * CRITICAL: Score >= 80 is minimum threshold, never automatic buy
   */
  private categorizeScore(score: number): 'avoid' | 'watch' | 'candidate' | 'approved' {
    if (score < 50) {
      return 'avoid';
    }
    if (score < 70) {
      return 'watch';
    }
    if (score < 80) {
      // 70-79: WATCH category, NO new entries
      return 'watch';
    }
    if (score < 85) {
      // 80-84: CANDIDATE for second interview
      // Requires additional gatekeeping (DCF, margen de seguridad, calidad, riesgo)
      return 'candidate';
    }
    // 85+: APPROVED for evaluation if all validations pass
    // Still requires final gatekeeping before execution
    return 'approved';
  }

  /**
   * Validate that score meets minimum threshold AND all other gates pass
   * @returns true if position can proceed to next validation stage
   */
  public isScoreValid(score: FundamentalScores): boolean {
    // CRITICAL: Minimum score to even consider is 80
    if (score.totalScore < 80) {
      return false; // Automatic reject for scores < 80
    }

    // Score 80+ is candidata, but other gates must validate
    // This is the FIRST gate only. Other validations (DCF, margen, quality, risk) handled separately
    return true;
  }

  /**
   * Get action recommendation based purely on score
   * NOTE: This is FIRST gate only. Full decision requires additional validations
   */
  public getScoreAction(
    score: FundamentalScores,
  ): {
    canConsider: boolean;
    category: string;
    minThresholdMessage?: string;
  } {
    if (score.totalScore < 80) {
      return {
        canConsider: false,
        category: score.scoreCategory,
        minThresholdMessage: `Score ${score.totalScore.toFixed(1)} is below minimum 80 threshold. Action: ${score.scoreCategory.toUpperCase()}`,
      };
    }

    if (score.totalScore < 85) {
      return {
        canConsider: true,
        category: 'CANDIDATE',
        minThresholdMessage: `Score ${score.totalScore.toFixed(1)} qualifies as CANDIDATE. Requires second interview (DCF, margin of safety, quality, risk validation).`,
      };
    }

    return {
      canConsider: true,
      category: 'APPROVED',
      minThresholdMessage: `Score ${score.totalScore.toFixed(1)} qualifies as APPROVED. Proceed to final gatekeeping validation.`,
    };
  }
}
