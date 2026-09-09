/**
 * MarketSnacks Provider Tests
 */

import { describe, it, expect } from 'vitest';
import { MarketSnacksProvider } from './market-snacks.provider';

describe('MarketSnacksProvider', () => {
  it('should be defined', () => {
    expect(MarketSnacksProvider).toBeDefined();
  });

  it('should have required properties', () => {
    const provider = new MarketSnacksProvider();
    expect(provider.name).toBe('MarketSnacks');
    expect(provider.priority).toBe(50);
  });

  it('should indicate not available (stub)', () => {
    const provider = new MarketSnacksProvider();
    expect(provider.isAvailable()).toBe(false);
  });

  it('should return empty news when not configured', async () => {
    const provider = new MarketSnacksProvider();
    const news = await provider.getNews('AAPL');
    expect(Array.isArray(news)).toBe(true);
    expect(news.length).toBe(0);
  });
});
