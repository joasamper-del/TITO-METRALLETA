/**
 * Confirmation Source - Abstract Base Class
 * Every confirmation source (TradingView, VIX, OptionLevels, etc.) extends this
 * Ensures consistent interface while allowing independent implementation
 */

import { ConfirmationContext, SourceVerdictRaw, ConfirmationSourceConfig } from "./types";

export abstract class ConfirmationSource {
  protected config: ConfirmationSourceConfig;
  protected lastError?: Error;
  protected lastRun?: Date;
  protected successCount: number = 0;
  protected failureCount: number = 0;

  constructor(config: ConfirmationSourceConfig) {
    this.config = config;
  }

  /**
   * Core method: evaluate context and return a confidence vote (0-100)
   * Each source implements its own logic completely independently
   */
  abstract evaluate(context: ConfirmationContext): Promise<ConfidenceVote>;

  /**
   * Optional: provide reasoning for the vote
   * Default implementation returns empty string (sources can override)
   */
  async getReasoning(context: ConfirmationContext, vote: ConfidenceVote): Promise<string> {
    return "";
  }

  /**
   * Health check: can this source currently provide data?
   * Override if source has external dependencies (API, database, etc.)
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Final verdict: encapsulates vote + reasoning + metadata
   */
  async getVerdict(context: ConfirmationContext): Promise<SourceVerdictRaw> {
    try {
      if (!this.config.isEnabled) {
        throw new Error(`Source ${this.config.sourceName} is disabled`);
      }

      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        throw new Error(`Source ${this.config.sourceName} failed health check`);
      }

      const vote = await this.evaluate(context);
      const reasoning = await this.getReasoning(context, vote);

      this.successCount++;
      this.lastRun = new Date();

      return {
        sourceId: this.config.sourceId,
        sourceName: this.config.sourceName,
        vote: Math.max(0, Math.min(100, vote)), // Clamp to 0-100
        weight: this.config.weight,
        reasoning,
        timestamp: new Date(),
      };
    } catch (error) {
      this.failureCount++;
      this.lastRun = new Date();
      this.lastError = error instanceof Error ? error : new Error(String(error));

      // Handle failure mode
      if (this.config.failureMode === "VETO") {
        throw this.lastError;
      } else if (this.config.failureMode === "NEUTRAL") {
        return {
          sourceId: this.config.sourceId,
          sourceName: this.config.sourceName,
          vote: 50, // Neutral vote on error
          weight: this.config.weight,
          reasoning: `Error (neutral fallback): ${this.lastError.message}`,
          timestamp: new Date(),
        };
      } else {
        // SKIP mode - return null (will be filtered by engine)
        throw this.lastError;
      }
    }
  }

  // Getters
  getConfig(): ConfirmationSourceConfig {
    return this.config;
  }

  getSuccessCount(): number {
    return this.successCount;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  getLastError(): Error | undefined {
    return this.lastError;
  }

  getLastRun(): Date | undefined {
    return this.lastRun;
  }

  getUptime(): number {
    const total = this.successCount + this.failureCount;
    if (total === 0) return 100;
    return (this.successCount / total) * 100;
  }
}

// Type alias for confidence vote score
export type ConfidenceVote = number;
