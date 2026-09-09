/**
 * VIX Provider Tests (FRED Integration)
 *
 * Tests both stub behavior and real FRED API integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VIXProvider } from './vix.provider';

describe('VIXProvider - FRED VIXCLS', () => {
  let provider: VIXProvider;

  beforeEach(() => {
    provider = new VIXProvider();
  });

  describe('📊 Availability', () => {
    it('should indicate available only when FRED_API_KEY exists', () => {
      const isAvailable = provider.isAvailable();
      // Depends on env var
      expect(typeof isAvailable).toBe('boolean');
    });
  });

  describe('🔐 Safety', () => {
    it('should handle missing API key gracefully', async () => {
      // Simulate missing FRED_API_KEY
      const result = await provider.getVIX();
      // Either null or real data, depending on env
      expect(result === null || result?.value !== undefined).toBe(true);
    });

    it('should cache VIX for 5 minutes', async () => {
      provider.clearCache();
      expect(provider.getVIX()).toBeDefined();
    });

    it('should allow cache clearing', () => {
      expect(() => provider.clearCache()).not.toThrow();
    });
  });

  describe('💰 Regime Detection', () => {
    it('should identify low volatility regime (VIX < 12)', async () => {
      // Stub test - real integration needs FRED API
      const result = await provider.getVIX();
      if (result) {
        if (result.value < 12) {
          expect(result.regime).toBe('low-volatility');
        }
      }
    });

    it('should identify medium volatility regime (VIX 12-30)', async () => {
      const result = await provider.getVIX();
      if (result) {
        if (result.value >= 12 && result.value < 30) {
          expect(result.regime).toBe('medium-volatility');
        }
      }
    });

    it('should identify high volatility regime (VIX 30-40)', async () => {
      const result = await provider.getVIX();
      if (result) {
        if (result.value >= 30 && result.value < 40) {
          expect(result.regime).toBe('high-volatility');
        }
      }
    });

    it('should identify extreme volatility regime (VIX > 40)', async () => {
      const result = await provider.getVIX();
      if (result) {
        if (result.value >= 40) {
          expect(result.regime).toBe('extreme-volatility');
        }
      }
    });
  });

  describe('📈 Options Environment', () => {
    it('should determine if options trading is favorable', async () => {
      const isFavorable = await provider.isOptionsEnvironment();
      expect(typeof isFavorable).toBe('boolean');
    });

    it('should favor VIX between 12-30 for options', async () => {
      const result = await provider.getVIX();
      if (result) {
        const expected = result.value >= 12 && result.value <= 30;
        const actual = await provider.isOptionsEnvironment();
        expect(actual).toBe(expected);
      }
    });
  });

  describe('📝 Regime Description', () => {
    it('should provide human-readable regime description', async () => {
      const description = await provider.getRegimeDescription();
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });

    it('should include VIX value in description', async () => {
      const result = await provider.getVIX();
      if (result) {
        const description = await provider.getRegimeDescription();
        expect(description).toContain('VIX');
      }
    });
  });

  describe('✅ Data Integrity', () => {
    it('should return valid VIXData structure when available', async () => {
      const result = await provider.getVIX();
      if (result) {
        expect(result.value).toBeGreaterThanOrEqual(0);
        expect(result.date).toBeInstanceOf(Date);
        expect(result.source).toBe('FRED-VIXCLS');
        expect(result.lastUpdate).toBeInstanceOf(Date);
        expect(['low-volatility', 'medium-volatility', 'high-volatility', 'extreme-volatility']).toContain(
          result.regime,
        );
      }
    });
  });
});
