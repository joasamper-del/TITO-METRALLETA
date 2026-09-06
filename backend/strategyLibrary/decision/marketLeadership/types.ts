/**
 * Market Leadership Index Types
 * The gatekeeper that observes and advises before any strategy touches the market
 */

export type ComponentVerdict = "BULLISH" | "NEUTRAL" | "BEARISH";
export type DataAvailability = "REAL" | "MOCK" | "UNAVAILABLE";
export type MarketDirection = "BULLISH" | "BEARISH" | "NEUTRAL";
export type Action = "ENTER" | "ESPERAR" | "EVITAR";

export interface ComponentScore {
  name: string; // e.g., "SPY Trend", "VIX", "Volume"
  verdict: ComponentVerdict;
  score: number; // 0-100
  weight: number; // 0-1
  contribution: number; // score * weight
  reasoning: string;
  dataAvailability: DataAvailability;
  dataPoints: string[]; // What was actually measured
  isHealthy: boolean; // Can this component provide reliable data?
}

export interface MarketLeadershipResult {
  timestamp: Date;
  marketLeadershipIndex: number; // 0-100, main score
  marketRegime: string; // BULLISH_STRONG, BEARISH_WEAK, etc.
  direction: MarketDirection;
  confidence: number; // 0-100, overall confidence in the index
  action: Action; // ENTER, ESPERAR, EVITAR
  components: ComponentScore[];
  scoreBreakdown: {
    bullishVotes: number;
    neutralVotes: number;
    bearishVotes: number;
    weightedSum: number;
    explanation: string;
  };
  unavailableComponents: string[]; // Which data sources failed
  warnings: string[]; // e.g., "3 components missing, confidence reduced by 15%"
  auditTrail: {
    whatSourcesWereConsulted: string[];
    whatWasFoundInEachSource: Record<string, string>;
    whatSignalsApprovedTheDecision: string[];
    whatSignalsContradictedIt: string[];
    whatInformationWasDiscarded: string[];
    howMuchWeightEachComponentHad: Record<string, number>;
    whatWouldInvalidateTheConclusion: string[];
  };
}

export interface MarketLeadershipLearning {
  entryId: string;
  timestamp: Date;
  indexSnapshot: MarketLeadershipResult;
  expectedDirection: MarketDirection;
  expectedAction: Action;
  expectedConfidence: number;
  actualOutcome: {
    direction: MarketDirection;
    action: Action;
    whatReallyHappened: string;
    correctPredictions: string[];
    incorrectPredictions: string[];
  };
  componentEvaluation: {
    componentName: string;
    wasAccurate: boolean;
    reasoning: string;
  }[];
  suggestedAdjustments: {
    componentName: string;
    currentWeight: number;
    suggestedWeight?: number;
    confidence: number; // 0-100, how confident in the adjustment
    reasoning: string;
  }[];
}
