import { Injectable } from '@nestjs/common';

export interface MacroIndicators {
  // Federal Reserve
  fedRate: number; // Federal Funds Rate (%)
  fedRateTimestamp: Date;
  fedRateSource: string;

  // Inflation
  cpi: number; // Consumer Price Index year-over-year change (%)
  cpiTimestamp: Date;
  cpiSource: string;

  // Market Volatility
  vix: number; // VIX (Volatility Index)
  vixTimestamp: Date;
  vixSource: string;

  // Market Valuation
  spPE: number; // S&P 500 Price-to-Earnings ratio
  spPETimestamp: Date;
  spPESource: string;

  // Data freshness (stale/late data reduces confidence)
  dataFreshnessHours?: number; // How old is the data (hours ago)
}

export interface MacroContext {
  // Raw indicators
  indicators: MacroIndicators;

  // Signals
  fedRateSignal: 'rising' | 'stable' | 'falling';
  inflationSignal: 'high' | 'moderate' | 'low';
  volatilitySignal: 'high' | 'moderate' | 'low';
  valuationSignal: 'cheap' | 'fair' | 'expensive';

  // Overall macro stance
  macroContext: 'bullish' | 'neutral' | 'bearish';
  contextReason: string;

  // Confidence in macro assessment
  confidenceLevel: 'high' | 'medium' | 'low';
  confidenceReasons: string[];

  // Impact on Warren's aggressiveness
  aggressivenessAdjustment: number; // -2 to +2 (reduce/increase position sizing)
  marginAdjustment: number; // -5 to +10 (reduce/increase margin of safety %)

  // Data quality flags
  dataQualityWarnings: string[];
}

@Injectable()
export class MacroContextService {
  /**
   * Analyze macro context from indicators
   *
   * CRITICAL DESIGN:
   * - Macro is a MODIFIER of risk/aggressiveness, never replaces fundamentals
   * - Cannot flip score <80 to candidate
   * - Cannot flip expensive valuation to buy
   * - Only adjusts: position sizing, margin requirements, timing
   * - Fundamentals Score remains UNTOUCHED
   * - Data freshness is tracked explicitly (no stale data illusions)
   */
  public analyzeMacro(indicators: MacroIndicators): MacroContext {
    const fedRateSignal = this.assessFedRateSignal(indicators);
    const inflationSignal = this.assessInflationSignal(indicators);
    const volatilitySignal = this.assessVolatilitySignal(indicators);
    const valuationSignal = this.assessValuationSignal(indicators);

    const macroContext = this.determineMacroContext(
      fedRateSignal,
      inflationSignal,
      volatilitySignal,
      valuationSignal,
    );

    const { aggressivenessAdjustment, marginAdjustment } = this.calculateAdjustments(macroContext, indicators);

    const dataQualityWarnings = this.assessDataQuality(indicators);
    const confidenceAssessment = this.assessConfidence(dataQualityWarnings);

    return {
      indicators,
      fedRateSignal,
      inflationSignal,
      volatilitySignal,
      valuationSignal,
      macroContext,
      contextReason: this.generateContextReason(fedRateSignal, inflationSignal, volatilitySignal, valuationSignal),
      confidenceLevel: confidenceAssessment.level,
      confidenceReasons: confidenceAssessment.reasons,
      aggressivenessAdjustment,
      marginAdjustment,
      dataQualityWarnings,
    };
  }

  /**
   * Assess Fed Rate signal
   * Rising rates = headwind for growth stocks, valuations compress
   * Falling rates = tailwind for equities
   */
  private assessFedRateSignal(indicators: MacroIndicators): 'rising' | 'stable' | 'falling' {
    // In real impl, compare to prior month/quarter
    // For now, use simple thresholds as reference
    // Typical Fed rate: 0-5.5%

    if (indicators.fedRate > 5.0) {
      return 'rising'; // Restrictive
    }

    if (indicators.fedRate > 3.5 && indicators.fedRate <= 5.0) {
      return 'stable'; // Neutral
    }

    return 'falling'; // Accommodative
  }

  /**
   * Assess inflation signal
   * High CPI (>4%) = stagflation risk, reduce aggressiveness
   * Moderate (2-4%) = healthy
   * Low (<2%) = deflationary risk
   */
  private assessInflationSignal(indicators: MacroIndicators): 'high' | 'moderate' | 'low' {
    if (indicators.cpi > 4) {
      return 'high';
    }

    if (indicators.cpi >= 2 && indicators.cpi <= 4) {
      return 'moderate';
    }

    return 'low';
  }

  /**
   * Assess VIX signal
   * VIX > 25 = high market stress
   * VIX 15-25 = moderate
   * VIX < 15 = low (complacency risk?)
   */
  private assessVolatilitySignal(indicators: MacroIndicators): 'high' | 'moderate' | 'low' {
    if (indicators.vix > 25) {
      return 'high';
    }

    if (indicators.vix >= 15 && indicators.vix <= 25) {
      return 'moderate';
    }

    return 'low';
  }

  /**
   * Assess S&P 500 valuation signal
   * Based on historical average (~17-18x)
   */
  private assessValuationSignal(indicators: MacroIndicators): 'cheap' | 'fair' | 'expensive' {
    if (indicators.spPE < 15) {
      return 'cheap';
    }

    if (indicators.spPE >= 15 && indicators.spPE <= 20) {
      return 'fair';
    }

    return 'expensive';
  }

  /**
   * Determine overall macro context (bullish/neutral/bearish)
   * This is a COMPOSITE, not a replacement for fundamentals
   */
  private determineMacroContext(
    fedRate: 'rising' | 'stable' | 'falling',
    inflation: 'high' | 'moderate' | 'low',
    volatility: 'high' | 'moderate' | 'low',
    valuation: 'cheap' | 'fair' | 'expensive',
  ): 'bullish' | 'neutral' | 'bearish' {
    let bullishScore = 0;
    let bearishScore = 0;

    // Fed rates: falling = bullish, rising = bearish
    if (fedRate === 'falling') bullishScore += 2;
    if (fedRate === 'rising') bearishScore += 2;

    // Inflation: moderate = neutral (good goldilocks), high/low = bearish
    if (inflation === 'high' || inflation === 'low') bearishScore += 2;

    // Volatility: low = bullish, high = bearish
    if (volatility === 'low') bullishScore += 1;
    if (volatility === 'high') bearishScore += 2;

    // Valuation: cheap = bullish, expensive = bearish
    if (valuation === 'cheap') bullishScore += 2;
    if (valuation === 'expensive') bearishScore += 2;

    if (bullishScore > bearishScore) {
      return 'bullish';
    }

    if (bearishScore > bullishScore) {
      return 'bearish';
    }

    return 'neutral';
  }

  /**
   * Calculate adjustments to aggressiveness and margin
   * CRITICAL: These are MODIFIERS ONLY
   * - Bullish: can increase position size, reduce margin
   * - Bearish: can decrease position size, increase margin
   * - BUT cannot flip a NO-SCORE or EXPENSIVE into BUY
   */
  private calculateAdjustments(
    context: 'bullish' | 'neutral' | 'bearish',
    indicators: MacroIndicators,
  ): { aggressivenessAdjustment: number; marginAdjustment: number } {
    let aggressivenessAdjustment = 0;
    let marginAdjustment = 0;

    if (context === 'bullish') {
      // Bullish: slightly more aggressive
      aggressivenessAdjustment = 1; // +1% position sizing
      marginAdjustment = -5; // -5% margin (from 20% → 15%)

      // But VIX still matters: high VIX = reduce benefits
      if (indicators.vix > 20) {
        aggressivenessAdjustment = 0;
        marginAdjustment = -2;
      }
    } else if (context === 'bearish') {
      // Bearish: more conservative
      aggressivenessAdjustment = -1; // -1% position sizing
      marginAdjustment = 10; // +10% margin (from 20% → 30%)

      // Very high VIX: even more conservative
      if (indicators.vix > 30) {
        aggressivenessAdjustment = -2;
        marginAdjustment = 15;
      }
    }

    // Clamp adjustments
    aggressivenessAdjustment = Math.max(-2, Math.min(2, aggressivenessAdjustment));
    marginAdjustment = Math.max(-5, Math.min(15, marginAdjustment));

    return { aggressivenessAdjustment, marginAdjustment };
  }

  /**
   * Assess data quality and freshness
   * Stale data = low confidence
   * Missing data = warning
   * Contradictory signals = warning
   */
  private assessDataQuality(indicators: MacroIndicators): string[] {
    const warnings: string[] = [];

    // Check freshness
    const now = new Date();
    const fedFreshness = (now.getTime() - indicators.fedRateTimestamp.getTime()) / (1000 * 60 * 60);
    const cpiFreshness = (now.getTime() - indicators.cpiTimestamp.getTime()) / (1000 * 60 * 60);
    const vixFreshness = (now.getTime() - indicators.vixTimestamp.getTime()) / (1000 * 60 * 60);
    const spPEFreshness = (now.getTime() - indicators.spPETimestamp.getTime()) / (1000 * 60 * 60);

    if (fedFreshness > 24) {
      warnings.push(`Fed Rate data is ${Math.floor(fedFreshness)} hours old (stale). Last update: ${indicators.fedRateTimestamp.toISOString()}`);
    }

    if (cpiFreshness > 720) {
      // CPI is monthly, so 30 days old is expected
      warnings.push(`CPI data is ${Math.floor(cpiFreshness)} hours old (monthly release). Last update: ${indicators.cpiTimestamp.toISOString()}`);
    }

    if (vixFreshness > 24) {
      warnings.push(`VIX data is ${Math.floor(vixFreshness)} hours old (stale). Last update: ${indicators.vixTimestamp.toISOString()}`);
    }

    if (spPEFreshness > 48) {
      warnings.push(`S&P P/E data is ${Math.floor(spPEFreshness)} hours old (stale). Last update: ${indicators.spPETimestamp.toISOString()}`);
    }

    // Check for contradictions
    if (indicators.fedRate > 4.5 && indicators.vix < 12) {
      warnings.push('CONTRADICTION: High Fed rate but VIX very low. Market may not be pricing rate risk. Data conflict?');
    }

    if (indicators.cpi > 5 && indicators.fedRate < 3) {
      warnings.push('CONTRADICTION: High inflation but low Fed rate. Policy lag or lagged CPI data?');
    }

    return warnings;
  }

  /**
   * Assess confidence in macro assessment
   */
  private assessConfidence(warnings: string[]): { level: 'high' | 'medium' | 'low'; reasons: string[] } {
    const reasons = [...warnings];

    const warningCount = warnings.length;

    if (warningCount === 0) {
      return {
        level: 'high',
        reasons: ['All data fresh and consistent. Macro context reliable.'],
      };
    }

    if (warningCount <= 2) {
      return {
        level: 'medium',
        reasons: [...reasons, 'Minor data issues but macro signal is likely sound.'],
      };
    }

    return {
      level: 'low',
      reasons: [...reasons, 'Multiple data quality issues. Macro assessment unreliable. Use with caution.'],
    };
  }

  /**
   * Generate human-readable explanation
   */
  private generateContextReason(
    fedRate: 'rising' | 'stable' | 'falling',
    inflation: 'high' | 'moderate' | 'low',
    volatility: 'high' | 'moderate' | 'low',
    valuation: 'cheap' | 'fair' | 'expensive',
  ): string {
    const factors: string[] = [];

    if (fedRate === 'falling') {
      factors.push('Fed cutting rates (tailwind)');
    } else if (fedRate === 'rising') {
      factors.push('Fed raising rates (headwind)');
    } else {
      factors.push('Fed rates stable');
    }

    if (inflation === 'high') {
      factors.push('inflation elevated');
    } else if (inflation === 'low') {
      factors.push('inflation low');
    }

    if (volatility === 'high') {
      factors.push('VIX elevated (stress)');
    } else if (volatility === 'low') {
      factors.push('VIX low (complacent)');
    }

    if (valuation === 'cheap') {
      factors.push('market cheap');
    } else if (valuation === 'expensive') {
      factors.push('market expensive');
    }

    return factors.join(', ');
  }
}
