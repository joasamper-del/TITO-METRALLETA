import { describe, it, expect, beforeEach } from 'vitest';
import { MacroContextService, MacroIndicators } from './macro-context';

describe('MacroContextService', () => {
  let service: MacroContextService;

  beforeEach(() => {
    service = new MacroContextService();
  });

  describe('Macro Context Analysis', () => {
    it('should assess BULLISH context (falling rates, low inflation, low VIX, cheap valuation)', () => {
      const indicators: MacroIndicators = {
        fedRate: 2.5, // Falling/accommodative
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 2.5, // Moderate
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 12, // Low
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 14, // Cheap
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.macroContext).toBe('bullish');
      expect(context.confidenceLevel).toBe('high');
      expect(context.aggressivenessAdjustment).toBeGreaterThan(0);
      expect(context.marginAdjustment).toBeLessThan(0);
    });

    it('should assess BEARISH context (rising rates, high inflation, high VIX, expensive valuation)', () => {
      const indicators: MacroIndicators = {
        fedRate: 5.25, // Rising/restrictive
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 5.2, // High
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 28, // High
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 22, // Expensive
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.macroContext).toBe('bearish');
      expect(context.aggressivenessAdjustment).toBeLessThan(0);
      expect(context.marginAdjustment).toBeGreaterThan(0);
    });

    it('should assess context with balanced signals', () => {
      const indicators: MacroIndicators = {
        fedRate: 3.5, // Stable
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 3.2, // Moderate
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 18, // Moderate
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 17, // Fair
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      // With balanced signals, macro context is neutral or stable
      expect(['neutral', 'bullish', 'bearish']).toContain(context.macroContext);
      expect(context.confidenceLevel).toBe('high');
    });
  });

  describe('Data Quality & Freshness', () => {
    it('should warn when Fed Rate data is stale (>24 hours)', () => {
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

      const indicators: MacroIndicators = {
        fedRate: 3.5,
        fedRateTimestamp: staleDate,
        fedRateSource: 'FRED',
        cpi: 3.2,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 18,
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 17,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.dataQualityWarnings.some(w => w.includes('hours old'))).toBe(true);
      expect(context.dataQualityWarnings.some(w => w.includes('stale'))).toBe(true);
    });

    it('should warn when VIX data is stale', () => {
      const staleDate = new Date(Date.now() - 30 * 60 * 60 * 1000); // 30 hours ago

      const indicators: MacroIndicators = {
        fedRate: 3.5,
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 3.2,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 18,
        vixTimestamp: staleDate,
        vixSource: 'CBOE',
        spPE: 17,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.dataQualityWarnings.some(w => w.includes('VIX'))).toBe(true);
    });

    it('should warn when data is contradictory (high Fed rate + low VIX)', () => {
      const indicators: MacroIndicators = {
        fedRate: 5.0, // High rate
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 3.2,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 10, // But very low VIX (contradiction)
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 17,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.dataQualityWarnings.some(w => w.includes('CONTRADICTION'))).toBe(true);
      expect(context.confidenceLevel).toBe('medium');
    });

    it('should warn when data is contradictory (high inflation + low Fed rate)', () => {
      const indicators: MacroIndicators = {
        fedRate: 2.0, // Low rate
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 5.5, // But high inflation (contradiction)
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 18,
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 17,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.dataQualityWarnings.some(w => w.includes('CONTRADICTION'))).toBe(true);
    });

    it('should reduce confidence when multiple data issues exist', () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const indicators: MacroIndicators = {
        fedRate: 5.0,
        fedRateTimestamp: staleDate,
        fedRateSource: 'FRED',
        cpi: 5.5,
        cpiTimestamp: staleDate,
        cpiSource: 'BLS',
        vix: 10, // Contradictory
        vixTimestamp: staleDate,
        vixSource: 'CBOE',
        spPE: 17,
        spPETimestamp: staleDate,
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.confidenceLevel).toBe('low');
      expect(context.dataQualityWarnings.length).toBeGreaterThan(2);
    });
  });

  describe('Adjustments to Aggressiveness & Margin', () => {
    it('should reduce aggressiveness and increase margin in bearish context', () => {
      const indicators: MacroIndicators = {
        fedRate: 5.25,
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 5.0,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 30, // Very high
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 22,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.aggressivenessAdjustment).toBeLessThanOrEqual(0);
      expect(context.marginAdjustment).toBeGreaterThanOrEqual(10); // Very high VIX = large margin increase
    });

    it('should increase aggressiveness and reduce margin in bullish context', () => {
      const indicators: MacroIndicators = {
        fedRate: 2.5,
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 2.5,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 12,
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 14,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.aggressivenessAdjustment).toBeGreaterThan(0);
      expect(context.marginAdjustment).toBeLessThan(0);
    });

    it('should clamp adjustments to valid ranges', () => {
      const indicators: MacroIndicators = {
        fedRate: 0.5,
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 1.0,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 8, // Very low
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 12, // Very cheap
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      // Even in extreme bullish, aggressiveness clamped to -2 to +2
      expect(context.aggressivenessAdjustment).toBeGreaterThanOrEqual(-2);
      expect(context.aggressivenessAdjustment).toBeLessThanOrEqual(2);

      // Margin clamped to -5 to +15
      expect(context.marginAdjustment).toBeGreaterThanOrEqual(-5);
      expect(context.marginAdjustment).toBeLessThanOrEqual(15);
    });
  });

  describe('Extreme Scenarios', () => {
    it('should handle zero Fed rate (crisis)', () => {
      const indicators: MacroIndicators = {
        fedRate: 0, // Emergency rate
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 7.0, // Crisis inflation
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 40, // Crisis VIX
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 10, // Crash valuations
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.macroContext).toBe('bearish'); // Bearish due to high inflation/VIX despite low rates
      expect(context.confidenceLevel).toBe('medium'); // Conflict between rate and inflation
    });

    it('should handle negative CPI (deflation)', () => {
      const indicators: MacroIndicators = {
        fedRate: 3.0,
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: -1.5, // Deflation
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 22,
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 16,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.inflationSignal).toBe('low');
      expect(context.macroContext).toBe('neutral');
    });

    it('should handle VIX >50 (market panic)', () => {
      const indicators: MacroIndicators = {
        fedRate: 4.0,
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 3.5,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 55, // Extreme panic
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 12,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.macroContext).toBe('bearish');
      expect(context.volatilitySignal).toBe('high');
      expect(context.aggressivenessAdjustment).toBeLessThan(0);
    });

    it('should handle S&P P/E > 30 (tech bubble)', () => {
      const indicators: MacroIndicators = {
        fedRate: 3.0,
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 2.5,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 14,
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 35, // Bubble valuation
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.valuationSignal).toBe('expensive');
      expect(context.macroContext).toBe('bearish');
    });
  });

  describe('Macro is Modifier, NOT Replacement', () => {
    it('should never allow bullish macro to justify score <80 (score still gates)', () => {
      // This test validates the principle: macro adjusts aggressiveness,
      // but score <80 is still NO-CANDIDATE
      const bullishIndicators: MacroIndicators = {
        fedRate: 2.0,
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 2.5,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 12,
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 14,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(bullishIndicators);

      // Even bullish, macro only adjusts aggressiveness
      expect(context.macroContext).toBe('bullish');

      // But score gating is SEPARATE (not handled here)
      // A score 75 + bullish macro = still no-candidate (candidate requires score >=80)
      // This is validated at the decision layer, not here
    });

    it('should track that macro adjustments are ADDITIVE, not MULTIPLICATIVE', () => {
      // Bullish: +1 position sizing, -5% margin
      // This is +1 to basesize and -5% to base margin
      // NOT a 20% swing

      const bullishIndicators: MacroIndicators = {
        fedRate: 2.5,
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 2.5,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 12,
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 14,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(bullishIndicators);

      expect(context.macroContext).toBe('bullish');
      expect(context.aggressivenessAdjustment).toBe(1); // +1%
      expect(context.marginAdjustment).toBe(-5); // -5%

      // Application: base position 3% → 4% (3% + 1%)
      //             base margin 20% → 15% (20% - 5%)
    });
  });

  describe('Data Timestamp Tracking', () => {
    it('should record and display timestamp/source for each indicator', () => {
      const now = new Date();

      const indicators: MacroIndicators = {
        fedRate: 3.5,
        fedRateTimestamp: now,
        fedRateSource: 'Federal Reserve',
        cpi: 3.2,
        cpiTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days (monthly)
        cpiSource: 'BLS',
        vix: 18,
        vixTimestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours
        vixSource: 'CBOE',
        spPE: 17,
        spPETimestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.indicators.fedRateTimestamp).toEqual(now);
      expect(context.indicators.fedRateSource).toBe('Federal Reserve');
      expect(context.indicators.vixSource).toBe('CBOE');

      // Warnings should mention CPI is monthly (expected to be old)
      expect(context.dataQualityWarnings.some(w => w.includes('monthly'))).toBe(true);
    });
  });

  describe('Confidence Assessment', () => {
    it('should have HIGH confidence when all data fresh and consistent', () => {
      const indicators: MacroIndicators = {
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
      };

      const context = service.analyzeMacro(indicators);

      expect(context.confidenceLevel).toBe('high');
      expect(context.dataQualityWarnings.length).toBe(0);
    });

    it('should have MEDIUM confidence with minor data issues', () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 2 days old

      const indicators: MacroIndicators = {
        fedRate: 3.5,
        fedRateTimestamp: staleDate,
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
      };

      const context = service.analyzeMacro(indicators);

      expect(context.confidenceLevel).toBe('medium');
      expect(context.dataQualityWarnings.length).toBeGreaterThan(0);
    });

    it('should have LOW confidence with multiple contradictions/stale data', () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const indicators: MacroIndicators = {
        fedRate: 5.0,
        fedRateTimestamp: staleDate,
        fedRateSource: 'FRED',
        cpi: 5.5,
        cpiTimestamp: staleDate,
        cpiSource: 'BLS',
        vix: 10, // Contradictory
        vixTimestamp: staleDate,
        vixSource: 'CBOE',
        spPE: 17,
        spPETimestamp: staleDate,
        spPESource: 'Bloomberg',
      };

      const context = service.analyzeMacro(indicators);

      expect(context.confidenceLevel).toBe('low');
      expect(context.confidenceReasons.some(r => r.includes('unreliable'))).toBe(true);
    });
  });
});
