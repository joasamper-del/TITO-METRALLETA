import { Injectable } from '@nestjs/common';
import { GateResult, Quote } from '../seatbelt.types';

@Injectable()
export class Gate1MarketHealthService {
  /**
   * Gate 1: Market Health
   * Validate that the market is healthy and liquid
   * - Quote available and fresh (< 5 seconds)
   * - Bid/Ask spread reasonable
   * - Market open (not closed/suspended)
   */
  async validate(symbol: string, maxSpreadBps = 20): Promise<GateResult> {
    try {
      const quote = await this.getQuoteWithTimeout(symbol, 5000);

      if (!quote) {
        return { valid: false, reason: 'Quote not available', gate: 'gate1' };
      }

      if (this.isQuoteStale(quote)) {
        return { valid: false, reason: 'Quote stale (> 5s)', gate: 'gate1' };
      }

      const spreadBps = this.calculateSpread(quote);
      if (spreadBps > maxSpreadBps) {
        return {
          valid: false,
          reason: `Spread too wide: ${spreadBps.toFixed(2)} bps > ${maxSpreadBps} max`,
          gate: 'gate1',
        };
      }

      if (!this.isMarketOpen(quote)) {
        return { valid: false, reason: 'Market closed or suspended', gate: 'gate1' };
      }

      return { valid: true, reason: 'Market healthy', gate: 'gate1', timestamp: new Date() };
    } catch (error) {
      return {
        valid: false,
        reason: `Market check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        gate: 'gate1',
        timestamp: new Date(),
      };
    }
  }

  private async getQuoteWithTimeout(symbol: string, timeoutMs: number): Promise<Quote | null> {
    try {
      return await Promise.race([this.getQuoteMock(symbol), this.timeout(timeoutMs)]);
    } catch {
      return null;
    }
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => setTimeout(() => reject(new Error('Quote timeout')), ms));
  }

  private getQuoteMock(symbol: string): Promise<Quote> {
    // Mock implementation - in production would call AlpacaService
    return Promise.resolve({
      symbol,
      bid: 100,
      ask: 100.1,
      timestamp: new Date(),
      status: 'OPEN',
    });
  }

  private isQuoteStale(quote: Quote): boolean {
    const ageMs = Date.now() - quote.timestamp.getTime();
    return ageMs > 5000;
  }

  private calculateSpread(quote: Quote): number {
    // Spread in basis points
    return ((quote.ask - quote.bid) / quote.bid) * 10000;
  }

  private isMarketOpen(quote: Quote): boolean {
    return quote.status === 'OPEN' || quote.status === 'EXTENDED';
  }
}
