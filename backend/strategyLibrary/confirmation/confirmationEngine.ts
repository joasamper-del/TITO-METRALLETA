/**
 * Confirmation Engine
 * Orchestrates multiple confirmation sources
 * Aggregates their votes into a single confidence score
 * Completely decoupled from Strategy Selector (complementary, not replacing)
 */

import { ConfirmationSource } from "./confirmationSource";
import { ConfirmationContext, ConfirmationResult, ConfirmationSourceConfig, SourceHealth, ConfirmationEngineStats } from "./types";
import { ConfidenceCalculator } from "./confidenceCalculator";

export class ConfirmationEngine {
  private sources: Map<string, ConfirmationSource> = new Map();
  private confidenceThreshold: number = 65; // 65% confidence required
  private lastResults: ConfirmationResult[] = [];

  constructor(sources: ConfirmationSource[] = [], confidenceThreshold: number = 65) {
    this.confidenceThreshold = confidenceThreshold;
    sources.forEach((source) => {
      this.registerSource(source);
    });
  }

  /**
   * Register a new confirmation source dynamically
   * Can be called at runtime to add new sources (e.g., after TradingView connector is ready)
   */
  registerSource(source: ConfirmationSource): void {
    const config = source.getConfig();
    this.sources.set(config.sourceId, source);
  }

  /**
   * Unregister a source (disable it without removing)
   */
  unregisterSource(sourceId: string): void {
    this.sources.delete(sourceId);
  }

  /**
   * Get all registered sources
   */
  getAllSources(): ConfirmationSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get a specific source by ID
   */
  getSource(sourceId: string): ConfirmationSource | undefined {
    return this.sources.get(sourceId);
  }

  /**
   * Core method: evaluate context with all active sources
   * Returns a ConfirmationResult with aggregated confidence
   */
  async evaluate(context: ConfirmationContext): Promise<ConfirmationResult> {
    const verdicts = [];

    // Collect verdicts from all sources
    for (const source of this.sources.values()) {
      try {
        const verdict = await source.getVerdict(context);
        verdicts.push(verdict);
      } catch (error) {
        // Source threw error (likely failureMode=VETO)
        // Log but continue with other sources
        console.warn(`Source ${source.getConfig().sourceName} rejected confirmation:`, error);
      }
    }

    if (verdicts.length === 0) {
      // No sources available
      return {
        context,
        confidence: {
          finalScore: 50,
          votes: [],
          scoreBreakdown: [],
          timestamp: new Date(),
          recommendation: "NEUTRAL",
        },
        isConfirmed: false,
        threshold: this.confidenceThreshold,
        suggestions: ["No confirmation sources available"],
      };
    }

    // Aggregate verdicts
    const confidence = ConfidenceCalculator.calculateWeightedConfidence(verdicts);
    const isConfirmed = confidence.finalScore >= this.confidenceThreshold;
    const consensus = ConfidenceCalculator.calculateConsensus(verdicts, 60);

    // Generate suggestions
    const suggestions = this.generateSuggestions(confidence, consensus, context);

    const result: ConfirmationResult = {
      context,
      confidence,
      isConfirmed,
      threshold: this.confidenceThreshold,
      suggestions,
    };

    this.lastResults.push(result);
    return result;
  }

  /**
   * Generate actionable suggestions based on confidence breakdown
   */
  private generateSuggestions(confidence: any, consensus: number, context: ConfirmationContext): string[] {
    const suggestions: string[] = [];

    if (confidence.finalScore >= 81) {
      suggestions.push("✅ Strong confirmation across sources — high confidence trade");
    } else if (confidence.finalScore >= 61) {
      suggestions.push("✅ Good confirmation — ready to trade");
    } else if (confidence.finalScore >= 41) {
      suggestions.push("⚠️ Mixed signals — consider additional data");
    } else {
      suggestions.push("❌ Weak confirmation — wait for better setup");
    }

    if (consensus < 50) {
      suggestions.push("⚠️ Sources disagree significantly — manual review recommended");
    }

    if (context.vix > 30) {
      suggestions.push("⚠️ High volatility (VIX > 30) — consider tighter stops");
    }

    if (context.regime === "HIGH_VOLATILITY" || context.regime === "EARNINGS_EVENT") {
      suggestions.push("⚠️ Challenging market regime — reduced position size advised");
    }

    return suggestions;
  }

  /**
   * Set confidence threshold dynamically
   */
  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0, Math.min(100, threshold));
  }

  /**
   * Get engine health stats
   */
  getStats(): ConfirmationEngineStats {
    const sourceHealth: SourceHealth[] = this.sources.size > 0
      ? Array.from(this.sources.values()).map((source) => {
          const total = source.getSuccessCount() + source.getFailureCount();
          return {
            sourceId: source.getConfig().sourceId,
            lastUpdate: source.getLastRun() || new Date(0),
            uptime: source.getUptime(),
            successfulRuns: source.getSuccessCount(),
            failedRuns: source.getFailureCount(),
            avgLatencyMs: 0, // Sources track their own latency if needed
          };
        })
      : [];

    const avgConfidenceScore =
      this.lastResults.length > 0
        ? Math.round(this.lastResults.reduce((sum, r) => sum + r.confidence.finalScore, 0) / this.lastResults.length)
        : 0;

    return {
      sourcesActive: this.sources.size,
      sourcesTotal: this.sources.size, // Since we remove disabled sources
      uptime: sourceHealth.length > 0 ? Math.round(sourceHealth.reduce((sum, h) => sum + h.uptime, 0) / sourceHealth.length) : 100,
      avgConfidenceScore,
      lastRun: this.lastResults[this.lastResults.length - 1]?.context.timestamp || new Date(0),
      sourceHealth,
    };
  }

  /**
   * Format engine status as readable string
   */
  formatStatus(): string {
    const stats = this.getStats();
    const lines: string[] = [
      `═══════════════════════════════════════════════════════`,
      `CONFIRMATION ENGINE STATUS`,
      `═══════════════════════════════════════════════════════`,
      ``,
      `Active Sources: ${stats.sourcesActive}/${stats.sourcesTotal}`,
      `Engine Uptime: ${stats.uptime.toFixed(0)}%`,
      `Average Confidence: ${stats.avgConfidenceScore}/100`,
      `Last Run: ${stats.lastRun.toISOString()}`,
      ``,
      `Source Health:`,
    ];

    stats.sourceHealth.forEach((health) => {
      lines.push(`  ${health.sourceId.padEnd(25)} Uptime: ${health.uptime.toFixed(0)}% (${health.successfulRuns}✓ ${health.failedRuns}✗)`);
    });

    return lines.join("\n");
  }
}
