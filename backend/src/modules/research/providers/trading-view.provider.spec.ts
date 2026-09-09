/**
 * TradingView Provider Tests
 */

import { describe, it, expect } from 'vitest';
import { TradingViewProvider } from './trading-view.provider';

describe('TradingViewProvider', () => {
  it('should be defined', () => {
    expect(TradingViewProvider).toBeDefined();
  });

  it('should have required properties', () => {
    const provider = new TradingViewProvider();
    expect(provider.name).toBe('TradingView');
    expect(provider.priority).toBe(60);
  });

  it('should indicate not available (stub)', () => {
    const provider = new TradingViewProvider();
    expect(provider.isAvailable()).toBe(false);
  });

  it('should return null when not configured', async () => {
    const provider = new TradingViewProvider();
    const indicators = await provider.getIndicators('SPY');
    expect(indicators).toBeNull();
  });

  it('should validate signal returning false when no data', async () => {
    const provider = new TradingViewProvider();
    const isValid = await provider.validateSignal('SPY', { rsi: 50 });
    expect(isValid).toBe(false);
  });
});
