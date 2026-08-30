/**
 * Confirmation Engine Types
 * Core interfaces for modular, decoupled confirmation source architecture
 */

export type ConfidenceVote = number; // 0-100 scale
export type DataQualityRating = "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "FAILED";
export type SourceVerdict = "CONFIRM" | "NEUTRAL" | "CONTRADICT"; // Qualitative verdict

export interface SourceVerdictRaw {
  sourceId: string;
  sourceName: string;
  verdict: SourceVerdict; // CONFIRM (bullish), NEUTRAL (no signal), CONTRADICT (bearish)
  vote: ConfidenceVote; // 0-100 quantitative score
  weight: number; // 0-1, e.g., 0.15 for 15% weight
  reasoning: string; // Why this verdict + vote
  dataQuality: DataQualityRating; // Confidence in the data itself
  dataQualityScore: number; // 0-100, how reliable is the source data
  dataPoints: string[]; // What data was used (for debugging)
  timestamp: Date;
  isHealthy: boolean; // Can this source currently provide data?
}

export interface AggregatedConfidence {
  finalScore: number; // 0-100, weighted average
  votes: SourceVerdictRaw[];
  scoreBreakdown: SourceBreakdown[];
  timestamp: Date;
  recommendation: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
}

export interface SourceBreakdown {
  sourceName: string;
  weight: number;
  vote: ConfidenceVote;
  contribution: number; // vote * weight
}

export interface ConfirmationSourceConfig {
  sourceId: string;
  sourceName: string;
  isEnabled: boolean;
  weight: number; // 0-1
  failureMode: "VETO" | "NEUTRAL" | "SKIP"; // How to handle errors
}

export interface ConfirmationContext {
  symbol: string;
  regime: string; // BULLISH_STRONG, etc.
  vix: number;
  price: number;
  timestamp: Date;
  selectedStrategy?: string; // From Strategy Selector
}

export interface ConfirmationResult {
  context: ConfirmationContext;
  confidence: AggregatedConfidence;
  isConfirmed: boolean; // true if score >= threshold
  threshold: number; // e.g., 65 for 65% confidence minimum
  suggestions: string[]; // Actionable feedback
}

export interface SourceHealth {
  sourceId: string;
  lastUpdate: Date;
  uptime: number; // 0-100%
  successfulRuns: number;
  failedRuns: number;
  avgLatencyMs: number;
}

export interface ConfirmationEngineStats {
  sourcesActive: number;
  sourcesTotal: number;
  uptime: number; // 0-100%
  avgConfidenceScore: number;
  lastRun: Date;
  sourceHealth: SourceHealth[];
}
