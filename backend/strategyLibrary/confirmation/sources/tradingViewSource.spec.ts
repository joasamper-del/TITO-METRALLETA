/**
 * TradingView Source - Unit Tests
 *
 * Verify that RSI/ADX/SuperTrend/Squeeze/VolumeProfile return real scores,
 * not always neutral 50.
 */

import { TradingViewSource } from './tradingViewSource';
import { ConfirmationContext } from '../types';

describe('TradingViewSource', () => {
  let source: TradingViewSource;

  beforeEach(() => {
    source = new TradingViewSource();
  });

  // ════════════════════════════════════════════════════════════════
  // PART 1: RSI SIGNALS
  // ════════════════════════════════════════════════════════════════

  describe('RSI Signals', () => {
    it('[CRITICAL] should score bullish when RSI ≥55', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bullish', value: 65, label: '65 · sobrecompra' }
        ]
      } as any;

      const score = await source.evaluate(context);
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThanOrEqual(80); // Clamped to max
    });

    it('[CRITICAL] should score bearish when RSI ≤45', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bearish', value: 35, label: '35 · sobreventa' }
        ]
      } as any;

      const score = await source.evaluate(context);
      expect(score).toBeLessThan(50);
      expect(score).toBeGreaterThanOrEqual(20); // Clamped to min
    });

    it('should NOT return neutral (50) for strong RSI', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bullish', value: 75 }
        ]
      } as any;

      const score = await source.evaluate(context);
      expect(score).not.toBe(50);
    });

    it('should scale RSI intensity: extreme (70+) > moderate (55-70)', async () => {
      const moderate: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bullish', value: 58 }
        ]
      } as any;

      const extreme: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bullish', value: 75 }
        ]
      } as any;

      const scoreModerate = await source.evaluate(moderate);
      const scoreExtreme = await source.evaluate(extreme);

      expect(scoreExtreme).toBeGreaterThan(scoreModerate);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // PART 2: SUPERTREND SIGNALS (DIRECTIONAL)
  // ════════════════════════════════════════════════════════════════

  describe('SuperTrend Signals', () => {
    it('[CRITICAL] should score bullish for SuperTrend up', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'SuperTrend', bias: 'bullish', label: 'alcista' }
        ]
      } as any;

      const score = await source.evaluate(context);
      expect(score).toBeGreaterThan(50);
    });

    it('[CRITICAL] should score bearish for SuperTrend down', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'SuperTrend', bias: 'bearish', label: 'bajista' }
        ]
      } as any;

      const score = await source.evaluate(context);
      expect(score).toBeLessThan(50);
    });

    it('should NOT return neutral (50) for SuperTrend', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'SuperTrend', bias: 'bullish' }
        ]
      } as any;

      const score = await source.evaluate(context);
      expect(score).not.toBe(50);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // PART 3: ADX SIGNALS (TREND STRENGTH)
  // ════════════════════════════════════════════════════════════════

  describe('ADX Signals', () => {
    it('[CRITICAL] should amplify score when ADX ≥25 + bullish RSI', async () => {
      const withoutAdx: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bullish', value: 60 }
        ]
      } as any;

      const withAdx: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bullish', value: 60 },
          { source: 'ADX', bias: 'neutral', value: 28, label: '28 · tendencia fuerte' }
        ]
      } as any;

      const scoreWithout = await source.evaluate(withoutAdx);
      const scoreWith = await source.evaluate(withAdx);

      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });

    it('should NOT amplify when ADX <25 (weak trend)', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bullish', value: 60 },
          { source: 'ADX', bias: 'neutral', value: 18, label: '18 · rango' }
        ]
      } as any;

      // ADX <25 doesn't add contribution
      const score = await source.evaluate(context);
      expect(score).toBeGreaterThan(50); // Still bullish from RSI
    });
  });

  // ════════════════════════════════════════════════════════════════
  // PART 4: SQUEEZE SIGNALS (MOMENTUM)
  // ════════════════════════════════════════════════════════════════

  describe('Squeeze Signals', () => {
    it('[CRITICAL] should score bullish when Squeeze compressed + momentum+', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'Squeeze', bias: 'bullish', value: 5, label: 'comprimido · momentum+' }
        ]
      } as any;

      const score = await source.evaluate(context);
      expect(score).toBeGreaterThan(50);
    });

    it('[CRITICAL] should score bearish when Squeeze compressed + momentum−', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'Squeeze', bias: 'bearish', value: -5, label: 'comprimido · momentum−' }
        ]
      } as any;

      const score = await source.evaluate(context);
      expect(score).toBeLessThan(50);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // PART 5: MULTI-SIGNAL CONFLUENCE
  // ════════════════════════════════════════════════════════════════

  describe('Multi-Signal Confluence', () => {
    it('[CRITICAL] should amplify when RSI + SuperTrend + ADX all align bullish', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bullish', value: 68 },
          { source: 'SuperTrend', bias: 'bullish', label: 'alcista' },
          { source: 'ADX', bias: 'neutral', value: 28 },
        ]
      } as any;

      const score = await source.evaluate(context);
      expect(score).toBeGreaterThan(65); // Strong bullish
      expect(score).toBeLessThanOrEqual(80);
    });

    it('[CRITICAL] should contradict when RSI bullish but SuperTrend bearish', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bullish', value: 65 },
          { source: 'SuperTrend', bias: 'bearish', label: 'bajista' },
        ]
      } as any;

      const score = await source.evaluate(context);
      expect(score).toBeLessThan(60); // Mixed/contradictory
      expect(score).toBeGreaterThan(40);
    });

    it('[CRITICAL] should NOT return 50 when signals present', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bullish', value: 62 },
          { source: 'SuperTrend', bias: 'bullish', label: 'alcista' },
        ]
      } as any;

      const score = await source.evaluate(context);
      expect(score).not.toBe(50);
      expect(score).toBeGreaterThan(50);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // PART 6: SCORETOUERDICT (VERDICT LOGIC)
  // ════════════════════════════════════════════════════════════════

  describe('Score to Verdict', () => {
    it('should CONFIRM when score ≥65', async () => {
      const verdict = await source.scoreToVerdict(70);
      expect(verdict).toBe('CONFIRM');
    });

    it('should CONTRADICT when score ≤40', async () => {
      const verdict = await source.scoreToVerdict(35);
      expect(verdict).toBe('CONTRADICT');
    });

    it('should NEUTRAL when score 41-64', async () => {
      const verdict1 = await source.scoreToVerdict(50);
      const verdict2 = await source.scoreToVerdict(60);
      expect(verdict1).toBe('NEUTRAL');
      expect(verdict2).toBe('NEUTRAL');
    });
  });

  // ════════════════════════════════════════════════════════════════
  // PART 7: DATA QUALITY ASSESSMENT
  // ════════════════════════════════════════════════════════════════

  describe('Data Quality', () => {
    it('should return EXCELLENT when 3+ active signals', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bullish', value: 65 },
          { source: 'SuperTrend', bias: 'bullish' },
          { source: 'Squeeze', bias: 'bullish' },
        ]
      } as any;

      const quality = await source.assessDataQuality(context);
      expect(quality.quality).toBe('EXCELLENT');
      expect(quality.score).toBeGreaterThanOrEqual(90);
    });

    it('should return POOR when no signals', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: []
      } as any;

      const quality = await source.assessDataQuality(context);
      expect(quality.quality).toBe('POOR');
    });
  });

  // ════════════════════════════════════════════════════════════════
  // PART 8: REASONING
  // ════════════════════════════════════════════════════════════════

  describe('Reasoning', () => {
    it('should explain bullish verdict', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bullish', value: 70 }
        ]
      } as any;

      const reasoning = await source.getReasoning(context, 72, 'CONFIRM');
      expect(reasoning).toContain('Bullish');
      expect(reasoning).toContain('72');
      expect(reasoning).toContain('RSI');
    });

    it('should explain bearish verdict', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'SuperTrend', bias: 'bearish' }
        ]
      } as any;

      const reasoning = await source.getReasoning(context, 38, 'CONTRADICT');
      expect(reasoning).toContain('Bearish');
      expect(reasoning).toContain('38');
    });

    it('should explain neutral verdict', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bullish', value: 55 },
          { source: 'SuperTrend', bias: 'bearish' }
        ]
      } as any;

      const reasoning = await source.getReasoning(context, 52, 'NEUTRAL');
      expect(reasoning).toContain('Mixed');
    });
  });

  // ════════════════════════════════════════════════════════════════
  // PART 9: RANGE CLAMPING (SAFETY)
  // ════════════════════════════════════════════════════════════════

  describe('Range Clamping', () => {
    it('should clamp max to 80 (never 100)', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bullish', value: 95 },
          { source: 'SuperTrend', bias: 'bullish' },
          { source: 'ADX', bias: 'neutral', value: 35 },
          { source: 'Squeeze', bias: 'bullish' },
        ]
      } as any;

      const score = await source.evaluate(context);
      expect(score).toBeLessThanOrEqual(80);
    });

    it('should clamp min to 20 (never 0)', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'bearish', value: 5 },
          { source: 'SuperTrend', bias: 'bearish' },
          { source: 'ADX', bias: 'neutral', value: 35 },
          { source: 'Squeeze', bias: 'bearish' },
        ]
      } as any;

      const score = await source.evaluate(context);
      expect(score).toBeGreaterThanOrEqual(20);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // SUMMARY: PRODUCTION READINESS
  // ════════════════════════════════════════════════════════════════

  describe('📊 Production Readiness', () => {
    it('[GATE] should NEVER return 50 when ANY signal is bullish/bearish', async () => {
      const signalTypes = [
        { source: 'RSI', bias: 'bullish', value: 60 },
        { source: 'SuperTrend', bias: 'bullish' },
        { source: 'ADX', bias: 'neutral', value: 28 },
        { source: 'Squeeze', bias: 'bullish' },
        { source: 'VolumeProfile', bias: 'bearish' },
      ];

      for (const signal of signalTypes) {
        if (signal.bias === 'neutral') continue;

        const context: ConfirmationContext = {
          ticker: 'SPY',
          tvSignals: [signal]
        } as any;

        const score = await source.evaluate(context);
        expect(score).not.toBe(50);
      }
    });

    it('[GATE] should return 50 ONLY when all signals neutral or none present', async () => {
      const context: ConfirmationContext = {
        ticker: 'SPY',
        tvSignals: [
          { source: 'RSI', bias: 'neutral', value: 50 },
          { source: 'ADX', bias: 'neutral', value: 18 },
        ]
      } as any;

      const score = await source.evaluate(context);
      expect(score).toBe(50);
    });
  });
});
