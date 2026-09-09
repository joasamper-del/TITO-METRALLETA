/**
 * Confirmation Source - Abstract Base Class
 * Every confirmation source (TradingView, VIX, OptionLevels, etc.) extends this
 * Ensures consistent interface + robust failure handling
 * Standard output format: verdict + vote + data quality
 */

import { ConfirmationContext, SourceVerdictRaw, ConfirmationSourceConfig, SourceVerdict, DataQualityRating, ConfidenceVote } from "./types";

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
   * Optional: convert score to qualitative verdict (CONFIRM/NEUTRAL/CONTRADICT)
   * Override if source has custom verdict logic
   * Default: <40=CONTRADICT, 40-60=NEUTRAL, >60=CONFIRM
   */
  async scoreToVerdict(vote: ConfidenceVote): Promise<SourceVerdict> {
    if (vote > 60) return "CONFIRM";
    if (vote < 40) return "CONTRADICT";
    return "NEUTRAL";
  }

  /**
   * Optional: provide reasoning for the vote
   * Default implementation returns empty string (sources can override)
   */
  async getReasoning(context: ConfirmationContext, vote: ConfidenceVote, verdict: SourceVerdict): Promise<string> {
    return `${verdict} (${vote}/100)`;
  }

  /**
   * Optional: assess data quality of this source
   * Override if source quality varies (e.g., if API down, quality drops)
   * Default: GOOD
   */
  async assessDataQuality(context: ConfirmationContext): Promise<{ quality: DataQualityRating; score: number }> {
    return { quality: "GOOD", score: 80 };
  }

  /**
   * Optional: get data points used for this evaluation (for debugging)
   * Default: empty array (sources can override to show what data was used)
   */
  async getDataPoints(context: ConfirmationContext): Promise<string[]> {
    return [];
  }

  /**
   * Health check: can this source currently provide data?
   * Override if source has external dependencies (API, database, etc.)
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Final verdict: encapsulates vote + verdict + reasoning + data quality + metadata
   * STANDARD FORMAT for all sources
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

      // Get all components
      const vote = await this.evaluate(context);
      const verdict = await this.scoreToVerdict(vote);
      const reasoning = await this.getReasoning(context, vote, verdict);
      const { quality: dataQuality, score: dataQualityScore } = await this.assessDataQuality(context);
      const dataPoints = await this.getDataPoints(context);

      this.successCount++;
      this.lastRun = new Date();

      return {
        sourceId: this.config.sourceId,
        sourceName: this.config.sourceName,
        verdict, // CONFIRM, NEUTRAL, or CONTRADICT
        vote: Math.max(0, Math.min(100, vote)), // Clamp to 0-100
        weight: this.config.weight,
        reasoning,
        dataQuality, // EXCELLENT, GOOD, FAIR, POOR, FAILED
        dataQualityScore: Math.max(0, Math.min(100, dataQualityScore)), // 0-100
        dataPoints, // For debugging
        timestamp: new Date(),
        isHealthy: true,
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
          verdict: "NEUTRAL", // Neutral when failing
          vote: 50, // Neutral vote on error
          weight: this.config.weight,
          reasoning: `Error (neutral fallback): ${this.lastError.message}`,
          dataQuality: "FAILED", // Mark data as failed
          dataQualityScore: 0,
          dataPoints: [`Error: ${this.lastError.message}`],
          timestamp: new Date(),
          isHealthy: false, // Source unhealthy
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
