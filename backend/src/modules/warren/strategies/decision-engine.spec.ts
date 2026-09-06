import { describe, it, expect, beforeEach } from 'vitest';
import { DecisionEngineService } from './decision-engine';
import { FundamentalScores } from './fundamental-scorer';
import { DCFValuation } from './dcf-engine';
import { MacroContext } from './macro-context';

describe('DecisionEngineService', () => {
  let service: DecisionEngineService;

  beforeEach(() => {
    service = new DecisionEngineService();
  });

  describe('Happy Path: Full Green Light (BUY)', () => {
    it('should recommend BUY when all gates pass perfectly', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(90, 'approved'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60, // 25% below conservative (80)
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.decision).toBe('BUY');
      expect(decision.gateResults.scoreGate.severity).toBe('pass');
      expect(decision.gateResults.valuationGate.severity).toBe('pass');
      expect(decision.gateResults.marginGate.severity).toBe('pass');
      expect(decision.gateResults.confidenceGate.severity).toBe('pass');
      expect(decision.gateResults.dataQualityGate.severity).toBe('pass');
    });

    it('should reflect bullish macro adjustment in position sizing', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(92, 'approved'),
        dcfValuation: createValuation('attractive', 110, 90),
        currentPrice: 60, // 33% discount (strong margin)
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.decision).toBe('BUY');
      expect(decision.positionSizing.macroAdjusted).toBe(4); // 3% + 1% bullish
      expect(decision.marginRequired.macroAdjusted).toBe(15); // 20% - 5% bullish
    });
  });

  describe('Score Gate: Automatic Rejection (<80)', () => {
    it('should REJECT (SELL) when score is below 80', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(75, 'watch'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.decision).toBe('SELL');
      expect(decision.gateResults.scoreGate.passed).toBe(false);
      expect(decision.gateResults.scoreGate.severity).toBe('reject');
      expect(decision.gateResults.valuationGate.severity).toBe('reject'); // Not evaluated
    });

    it('should REJECT even if macro is bullish (score cannot be rescued)', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(79, 'watch'),
        dcfValuation: createValuation('attractive', 150, 120),
        currentPrice: 70,
        macroContext: createMacro('bullish', 'high', []), // Bullish, but score is 79
      });

      expect(decision.decision).toBe('SELL');
      expect(decision.gateResults.scoreGate.passed).toBe(false);
    });

    it('should allow CANDIDATE (80-84) to proceed to other gates', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(82, 'candidate'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.gateResults.scoreGate.passed).toBe(true);
      expect(decision.gateResults.scoreGate.severity).toBe('caution'); // Candidate = caution
    });

    it('should allow APPROVED (85+) to proceed to other gates', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.gateResults.scoreGate.passed).toBe(true);
      expect(decision.gateResults.scoreGate.severity).toBe('pass');
    });
  });

  describe('Valuation Gate: Expensive Blocks BUY', () => {
    it('should recommend TRIM when valuation is expensive', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('expensive', 50, 40), // Expensive: price well above fair value
        currentPrice: 60,
        macroContext: createMacro('neutral', 'high', []),
      });

      expect(decision.decision).toBe('TRIM');
      expect(decision.gateResults.valuationGate.passed).toBe(false);
      expect(decision.gateResults.valuationGate.severity).toBe('reject');
    });

    it('should not allow BUY even with bullish macro if valuation is expensive', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(90, 'approved'),
        dcfValuation: createValuation('expensive', 60, 50),
        currentPrice: 80,
        macroContext: createMacro('bullish', 'high', []), // Bullish, but expensive valuation
      });

      expect(decision.decision).toBe('TRIM');
      expect(decision.gateResults.valuationGate.severity).toBe('reject');
    });

    it('should allow fair valuation to proceed to margin gate', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('fair', 100, 80), // Fair = middle ground
        currentPrice: 70,
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.gateResults.valuationGate.passed).toBe(true);
      expect(decision.gateResults.valuationGate.severity).toBe('caution'); // Fair = caution
    });
  });

  describe('Margin of Safety Gate: Blocks Insufficient Protection', () => {
    it('should recommend HOLD when margin is insufficient (<20%)', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('attractive', 100, 85),
        currentPrice: 70, // Only 17.6% below conservative (85), less than 20%
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.decision).toBe('HOLD');
      expect(decision.gateResults.marginGate.passed).toBe(false);
      expect(decision.gateResults.marginGate.severity).toBe('reject');
    });

    it('should allow BUY with adequate margin (20-25%)', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('attractive', 100, 85),
        currentPrice: 68, // 20% below conservative (85)
        macroContext: createMacro('neutral', 'high', []),
      });

      expect(decision.gateResults.marginGate.passed).toBe(true);
      expect(decision.gateResults.marginGate.severity).toBe('caution');
    });

    it('should reward strong margin with pass severity (>25%)', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(90, 'approved'),
        dcfValuation: createValuation('attractive', 100, 85),
        currentPrice: 60, // 29.4% below conservative (85)
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.gateResults.marginGate.severity).toBe('pass');
    });
  });

  describe('Confidence Gate: Low Confidence Recommends HOLD', () => {
    it('should recommend HOLD when confidence is LOW', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('neutral', 'low', []),
      });

      expect(decision.decision).toBe('HOLD');
      expect(decision.gateResults.confidenceGate.severity).toBe('reject');
    });

    it('should allow medium confidence to proceed with caution', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('neutral', 'medium', []),
      });

      expect(decision.gateResults.confidenceGate.passed).toBe(true);
      expect(decision.gateResults.confidenceGate.severity).toBe('caution');
    });
  });

  describe('Data Quality Gate: Stale/Contradictory Data', () => {
    it('should recommend HOLD when multiple data quality issues exist', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('neutral', 'high', [
          'Fed Rate data is 48 hours old (stale)',
          'VIX data is 30 hours old (stale)',
          'CONTRADICTION: High Fed rate but VIX very low',
        ]),
      });

      expect(decision.decision).toBe('HOLD');
      expect(decision.gateResults.dataQualityGate.severity).toBe('reject');
    });

    it('should allow caution with 1-2 data quality warnings', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('neutral', 'high', ['Fed Rate data is 30 hours old (stale)']),
      });

      expect(decision.gateResults.dataQualityGate.passed).toBe(true);
      expect(decision.gateResults.dataQualityGate.severity).toBe('caution');
    });

    it('should allow full decision with no data quality warnings', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('neutral', 'high', []),
      });

      expect(decision.gateResults.dataQualityGate.passed).toBe(true);
      expect(decision.gateResults.dataQualityGate.severity).toBe('pass');
    });
  });

  describe('Macro Modifier: Adjusts Prudence, Never Flips', () => {
    it('should reduce margin when bearish (but not flip decision)', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('bearish', 'high', []),
      });

      // Bearish adds +10 margin (20 + 10 = 30), but clamped to max 15
      expect(decision.marginRequired.macroAdjusted).toBe(15);
      expect(decision.positionSizing.macroAdjusted).toBe(2); // 3% - 1% bearish
      // Decision can still be BUY if ALL gates pass (bearish macro doesn't block)
    });

    it('should increase aggressiveness when bullish', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.positionSizing.macroAdjusted).toBe(4); // 3% + 1% bullish
      expect(decision.marginRequired.macroAdjusted).toBe(15); // 20% - 5% bullish
    });

    it('should not allow bearish macro to rescue expensive valuation', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('expensive', 50, 40),
        currentPrice: 60,
        macroContext: createMacro('bullish', 'high', []), // Even bullish
      });

      expect(decision.decision).toBe('TRIM');
      expect(decision.gateResults.valuationGate.passed).toBe(false);
    });

    it('should not allow bullish macro to rescue score <80', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(75, 'watch'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('bullish', 'high', []), // Even bullish
      });

      expect(decision.decision).toBe('SELL');
      expect(decision.gateResults.scoreGate.passed).toBe(false);
    });
  });

  describe('Conflict Resolution: Cautions Lead to HOLD', () => {
    it('should recommend HOLD when score is CANDIDATE with fair valuation', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(82, 'candidate'), // 80-84 = caution
        dcfValuation: createValuation('fair', 100, 80),
        currentPrice: 70,
        macroContext: createMacro('bullish', 'high', []),
      });

      // Score caution + fair valuation = HOLD
      expect(decision.decision).toBe('HOLD');
    });

    it('should recommend HOLD when multiple gates show caution', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(82, 'candidate'),
        dcfValuation: createValuation('fair', 100, 80),
        currentPrice: 68, // 15% below conservative, caution margin
        macroContext: createMacro('neutral', 'medium', ['VIX data is 20 hours old']),
      });

      expect(decision.decision).toBe('HOLD');
    });

    it('should recommend BUY only when ALL gates are pass', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(90, 'approved'), // Pass
        dcfValuation: createValuation('attractive', 100, 80), // Pass
        currentPrice: 60, // 25% discount, Pass
        macroContext: createMacro('bullish', 'high', []), // Pass
      });

      expect(decision.decision).toBe('BUY');
    });
  });

  describe('Extreme Scenarios: Gates Tested at Boundaries', () => {
    it('should handle edge case: score exactly 80 (boundary)', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(80, 'candidate'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.gateResults.scoreGate.passed).toBe(true);
      expect(decision.gateResults.scoreGate.severity).toBe('caution');
    });

    it('should handle edge case: score exactly 85 (boundary)', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(85, 'approved'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.gateResults.scoreGate.passed).toBe(true);
      expect(decision.gateResults.scoreGate.severity).toBe('pass');
    });

    it('should handle edge case: margin exactly 20% (boundary)', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('attractive', 100, 85),
        currentPrice: 68, // Exactly 20% discount
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.gateResults.marginGate.passed).toBe(true);
      expect(decision.gateResults.marginGate.severity).toBe('caution');
    });

    it('should handle zero current price (stress test)', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(88, 'approved'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 0,
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.gateResults.marginGate.passed).toBe(true);
    });
  });

  describe('Explanation Generation: Readable Output', () => {
    it('should generate clear explanation for BUY decision', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(90, 'approved'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.explanation).toContain('WARREN BUFFETT JR. DECISION ANALYSIS');
      expect(decision.explanation).toContain('FINAL DECISION: BUY');
      expect(decision.explanation).toContain('90.0');
    });

    it('should generate explanation for SELL decision (score rejection)', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(70, 'avoid'),
        dcfValuation: createValuation('attractive', 100, 80),
        currentPrice: 60,
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.explanation).toContain('AUTOMATIC REJECTION');
      expect(decision.explanation).toContain('FINAL DECISION: SELL');
    });
  });

  describe('Integration: Complete Decision Pipeline', () => {
    it('should handle realistic scenario: score candidate + margin caution + bullish macro', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(83, 'candidate'),
        dcfValuation: createValuation('attractive', 110, 90),
        currentPrice: 75, // 16.7% discount (below 20%)
        macroContext: createMacro('bullish', 'high', []),
      });

      expect(decision.decision).toBe('HOLD'); // Margin below 20%, blocks BUY
      expect(decision.gateResults.marginGate.severity).toBe('reject');
    });

    it('should handle realistic scenario: score high + but expensive + bearish macro', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(92, 'approved'),
        dcfValuation: createValuation('expensive', 60, 50),
        currentPrice: 70,
        macroContext: createMacro('bearish', 'high', []),
      });

      expect(decision.decision).toBe('TRIM');
      // Bearish adds +10 margin (20 + 10 = 30), but clamped to max 15
      expect(decision.marginRequired.macroAdjusted).toBe(15);
    });

    it('should handle realistic scenario: stale data prevents BUY despite strong gates', () => {
      const decision = service.makeDecision({
        fundamentalScore: createScore(92, 'approved'),
        dcfValuation: createValuation('attractive', 110, 90),
        currentPrice: 70,
        macroContext: createMacro('bullish', 'high', [
          'Fed Rate data is 48 hours old',
          'CPI data is 30 days old (monthly)',
          'CONTRADICTION: High Fed rate but VIX very low',
        ]),
      });

      expect(decision.decision).toBe('HOLD');
      expect(decision.gateResults.dataQualityGate.severity).toBe('reject');
    });
  });
});

// Helper functions
function createScore(total: number, category: 'avoid' | 'watch' | 'candidate' | 'approved'): FundamentalScores {
  return {
    valuation: 20,
    quality: 25,
    growth: 15,
    macro: 10,
    totalScore: total,
    scoreCategory: category,
    details: {
      pbScore: 10,
      peScore: 10,
      roeScore: 8,
      deScore: 7,
      fcfScore: 6,
      divScore: 4,
      cagScore: 7,
      revScore: 7,
      tailwindScore: 8,
      marketAdjustment: 2,
    },
  };
}

function createValuation(status: 'attractive' | 'fair' | 'expensive', baseCase: number, conservative: number): DCFValuation {
  return {
    baseCase: {
      name: 'base',
      wacc: 8,
      terminalGrowth: 3,
      fcfGrowthRate: 5,
      enterpriseValue: 1000,
      equityValue: 800,
      fairValue: baseCase,
      terminalValue: 600,
    },
    conservativeCase: {
      name: 'conservative',
      wacc: 9,
      terminalGrowth: 2,
      fcfGrowthRate: 3,
      enterpriseValue: 900,
      equityValue: 700,
      fairValue: conservative,
      terminalValue: 500,
    },
    optimisticCase: {
      name: 'optimistic',
      wacc: 7,
      terminalGrowth: 4,
      fcfGrowthRate: 7,
      enterpriseValue: 1100,
      equityValue: 900,
      fairValue: baseCase * 1.2,
      terminalValue: 700,
    },
    fairValueRange: {
      low: conservative,
      mid: baseCase,
      high: baseCase * 1.2,
    },
    confidenceLevel: 'high',
    confidenceReason: 'Strong FCF and earnings stability',
    sensitivityWarnings: [],
    valuationStatus: status, // ✓ Set directly from parameter
    marginOfSafety: {
      atPrice: 100,
      percentDiscount: 20,
      assessmentAtPrice: 'buy',
    },
  };
}

function createMacro(context: 'bullish' | 'neutral' | 'bearish', confidence: 'high' | 'medium' | 'low', warnings: string[]): MacroContext {
  const adjustments = context === 'bullish' ? { agg: 1, margin: -5 } : context === 'bearish' ? { agg: -1, margin: 10 } : { agg: 0, margin: 0 };

  return {
    indicators: {
      fedRate: 3.5,
      fedRateTimestamp: new Date(),
      fedRateSource: 'FRED',
      cpi: 3.0,
      cpiTimestamp: new Date(),
      cpiSource: 'BLS',
      vix: 18,
      vixTimestamp: new Date(),
      vixSource: 'CBOE',
      spPE: 17,
      spPETimestamp: new Date(),
      spPESource: 'Bloomberg',
    },
    fedRateSignal: 'stable',
    inflationSignal: 'moderate',
    volatilitySignal: 'moderate',
    valuationSignal: 'fair',
    macroContext: context,
    contextReason: `Market context is ${context}`,
    confidenceLevel: confidence,
    confidenceReasons: [`${confidence} confidence in macro assessment`],
    aggressivenessAdjustment: adjustments.agg,
    marginAdjustment: adjustments.margin,
    dataQualityWarnings: warnings,
  };
}
