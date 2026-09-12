import { Injectable, Logger } from '@nestjs/common';
import { GateResult } from '../seatbelt.types';

/**
 * Gate 5: Broker Connectivity Proof
 * Validates that broker is online and responsive
 *
 * Validations (using ABSTRACTIONS, NOT real broker calls):
 * - Broker connectivity check (mocked)
 * - Quote freshness (timestamp < 2 seconds)
 * - Quote format validation (bid/ask/last present)
 * - Dry-run order validation (would broker accept this order?)
 * - Retry logic with exponential backoff (3x attempts)
 *
 * NOTE: All broker calls are abstracted/mocked. NO real Alpaca/Schwab calls.
 * NOTE: Gate 5 does NOT execute orders
 */
@Injectable()
export class Gate5BrokerConnectivityService {
  private readonly logger = new Logger('Gate5BrokerConnectivityService');
  private readonly MAX_QUOTE_AGE_MS = 2000; // 2 seconds
  private readonly MAX_RETRIES = 3;

  /**
   * Validate broker connectivity
   * @param symbol Symbol to get quote for
   * @param orderType Order type for dry-run validation
   * @returns GateResult with connectivity status
   */
  async validate(symbol: string, orderType = 'market'): Promise<GateResult> {
    // Retry loop with exponential backoff
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.validateAttempt(symbol, orderType);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Early exit if not retryable
        if (attempt < this.MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          this.logger.warn(
            `Gate5 attempt ${attempt} failed, retrying in ${backoffMs}ms: ${lastError.message}`,
          );
          await this.sleep(backoffMs);
        }
      }
    }

    // All retries exhausted
    return {
      valid: false,
      reason: `Broker connectivity failed after ${this.MAX_RETRIES} attempts: ${
        lastError?.message || 'unknown error'
      }`,
      gate: 'gate5',
      timestamp: new Date(),
    };
  }

  /**
   * Single validation attempt
   */
  private async validateAttempt(symbol: string, orderType: string): Promise<GateResult> {
    // Validation 1: Check symbol format
    if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
      throw new Error('Symbol is required');
    }

    // Validation 2: Mock broker connectivity check
    // In production this would ping the broker API
    // For now we mock success 95% of the time
    const isConnected = this.mockBrokerConnectivity();
    if (!isConnected) {
      throw new Error('Broker not responding (mock)');
    }

    // Validation 3: Get and validate quote (mocked)
    const quote = this.mockGetQuote(symbol);
    if (!this.isQuoteFresh(quote.timestamp)) {
      throw new Error(`Quote is stale (${Date.now() - quote.timestamp}ms old)`);
    }

    if (!this.isQuoteValid(quote)) {
      throw new Error('Quote missing bid/ask/last fields');
    }

    // Validation 4: Mock dry-run order validation
    const dryRunAccepted = this.mockDryRun(symbol, orderType);
    if (!dryRunAccepted) {
      throw new Error(`Broker rejected dry-run for ${symbol} ${orderType}`);
    }

    // All validations passed
    return {
      valid: true,
      reason: `Broker online, quote fresh (${Math.round(
        (Date.now() - quote.timestamp) / 100,
      )}0ms old), dry-run accepted`,
      gate: 'gate5',
      timestamp: new Date(),
    };
  }

  /**
   * Mock broker connectivity (95% success rate for testing)
   */
  private mockBrokerConnectivity(): boolean {
    return Math.random() > 0.05; // 95% pass, 5% fail
  }

  /**
   * Mock quote retrieval
   * Returns quote with timestamp (real timestamp for staleness testing)
   */
  private mockGetQuote(symbol: string) {
    const now = Date.now();
    // Simulate varying quote ages: mostly fresh, sometimes stale
    const age = Math.random() > 0.9 ? 5000 : 1000; // 10% stale, 90% fresh

    return {
      symbol,
      bid: 450.0,
      ask: 450.1,
      last: 450.05,
      timestamp: now - age, // Quote age varies
    };
  }

  /**
   * Check if quote is fresh (< 2 seconds old)
   */
  private isQuoteFresh(quoteTimestamp: number): boolean {
    const age = Date.now() - quoteTimestamp;
    return age < this.MAX_QUOTE_AGE_MS;
  }

  /**
   * Validate quote has required fields
   */
  private isQuoteValid(quote: any): boolean {
    return (
      typeof quote.bid === 'number' &&
      typeof quote.ask === 'number' &&
      typeof quote.last === 'number' &&
      quote.bid > 0 &&
      quote.ask > 0 &&
      quote.last > 0
    );
  }

  /**
   * Mock dry-run order validation (99% success rate)
   */
  private mockDryRun(symbol: string, orderType: string): boolean {
    // Only reject if orderType is obviously invalid
    if (!['market', 'limit', 'stop', 'stop_limit'].includes(orderType)) {
      return false;
    }

    return Math.random() > 0.01; // 99% pass, 1% fail
  }

  /**
   * Utility: sleep for given milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
