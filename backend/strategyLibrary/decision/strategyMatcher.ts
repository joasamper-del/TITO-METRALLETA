/**
 * Strategy Matcher
 * Matches strategies to current market regime
 * Scores each strategy's compatibility (0-100)
 */

export interface StrategyProfile {
  name: string;
  symbol: string;
  testWinRate: number; // %
  testSharpe: number;
  overfittingScore: number; // %
  maxDrawdown: number; // %
  profitFactor: number;
  generalizationQuality: "excellent" | "good" | "fair" | "poor";
  blockReason?: string; // If strategy should be blocked
}

export interface RegimeMatch {
  strategy: string;
  compatibilityScore: number; // 0-100
  confidence: number; // 0-100
  passed: boolean;
  blockedReason?: string;
}

export const STRATEGY_PROFILES: Record<string, StrategyProfile> = {
  TrailingExitStrategy: {
    name: "TrailingExitStrategy",
    symbol: "SPY",
    testWinRate: 58,
    testSharpe: 1.08,
    overfittingScore: 18,
    maxDrawdown: -3.8,
    profitFactor: 1.8,
    generalizationQuality: "excellent",
  },
  MeanReversionStrategy: {
    name: "MeanReversionStrategy",
    symbol: "QQQ",
    testWinRate: 35,
    testSharpe: 0.61,
    overfittingScore: 42,
    maxDrawdown: -5.4,
    profitFactor: 1.2,
    generalizationQuality: "fair",
    blockReason: "Win rate 35% fails mandatory >45% gate",
  },
  BreakoutStrategy: {
    name: "BreakoutStrategy",
    symbol: "SPY",
    testWinRate: 48,
    testSharpe: 1.05,
    overfittingScore: 25,
    maxDrawdown: -3.1,
    profitFactor: 1.9,
    generalizationQuality: "good",
  },
  BullCallSpreadStrategy: {
    name: "BullCallSpreadStrategy",
    symbol: "QQQ",
    testWinRate: 50,
    testSharpe: 0.88,
    overfittingScore: 28,
    maxDrawdown: -1.9,
    profitFactor: 1.6,
    generalizationQuality: "good",
  },
  BearPutSpreadStrategy: {
    name: "BearPutSpreadStrategy",
    symbol: "SPY",
    testWinRate: 58,
    testSharpe: 0.82,
    overfittingScore: 32,
    maxDrawdown: -3.5,
    profitFactor: 1.7,
    generalizationQuality: "good",
  },
  LongStraddleStrategy: {
    name: "LongStraddleStrategy",
    symbol: "BTC",
    testWinRate: 35,
    testSharpe: 0.42,
    overfittingScore: 68,
    maxDrawdown: -8.1,
    profitFactor: 1.1,
    generalizationQuality: "poor",
    blockReason: "Overfitting 68% exceeds >50% gate + Win rate fails + Sharpe near threshold",
  },
  LongStrangleStrategy: {
    name: "LongStrangleStrategy",
    symbol: "QQQ",
    testWinRate: 42,
    testSharpe: 0.65,
    overfittingScore: 45,
    maxDrawdown: -4.8,
    profitFactor: 1.3,
    generalizationQuality: "fair",
    blockReason: "Win rate 42% fails mandatory >45% gate",
  },
  WheelStrategy: {
    name: "WheelStrategy",
    symbol: "SPY",
    testWinRate: 65,
    testSharpe: 0.95,
    overfittingScore: 35,
    maxDrawdown: -2.9,
    profitFactor: 1.8,
    generalizationQuality: "good",
  },
  PullbackVWAPStrategy: {
    name: "PullbackVWAPStrategy",
    symbol: "QQQ",
    testWinRate: 56,
    testSharpe: 1.22,
    overfittingScore: 20,
    maxDrawdown: -2.5,
    profitFactor: 2.1,
    generalizationQuality: "excellent",
  },
  VolatilityExpansionStrategy: {
    name: "VolatilityExpansionStrategy",
    symbol: "BTC",
    testWinRate: 48,
    testSharpe: 0.95,
    overfittingScore: 31,
    maxDrawdown: -4.1,
    profitFactor: 1.7,
    generalizationQuality: "good",
  },
};

export const REGIME_PREFERENCES: Record<string, string[]> = {
  BULLISH_STRONG: ["TrailingExitStrategy", "BreakoutStrategy", "BullCallSpreadStrategy"],
  BULLISH_WEAK: ["PullbackVWAPStrategy", "WheelStrategy", "VolatilityExpansionStrategy"],
  BEARISH_STRONG: ["BreakoutStrategy", "VolatilityExpansionStrategy", "BearPutSpreadStrategy"],
  BEARISH_WEAK: ["BearPutSpreadStrategy"],
  LATERAL: ["WheelStrategy", "BearPutSpreadStrategy", "BullCallSpreadStrategy"],
  HIGH_VOLATILITY: ["VolatilityExpansionStrategy", "BreakoutStrategy"],
  EARNINGS_EVENT: [],
};

export class StrategyMatcher {
  matchStrategiesToRegime(regime: string): RegimeMatch[] {
    const results: RegimeMatch[] = [];

    // Get preferred strategies for this regime
    const preferred = REGIME_PREFERENCES[regime] || [];

    for (const [strategyName, profile] of Object.entries(STRATEGY_PROFILES)) {
      // Check if blocked
      if (profile.blockReason) {
        results.push({
          strategy: strategyName,
          compatibilityScore: 0,
          confidence: 0,
          passed: false,
          blockedReason: profile.blockReason,
        });
        continue;
      }

      // Calculate compatibility score
      const isPreferred = preferred.includes(strategyName) ? 30 : 0;
      const generalizationBonus = profile.generalizationQuality === "excellent" ? 20 : profile.generalizationQuality === "good" ? 10 : 0;
      const drawdownBonus = Math.max(0, 20 - (Math.abs(profile.maxDrawdown) * 3));
      const winRateBonus = Math.max(0, (profile.testWinRate - 50) * 0.5);

      const compatibilityScore = isPreferred + generalizationBonus + drawdownBonus + winRateBonus;

      results.push({
        strategy: strategyName,
        compatibilityScore: Math.min(100, compatibilityScore),
        confidence: Math.min(100, 50 + (100 - profile.overfittingScore) * 0.5),
        passed: true,
      });
    }

    return results.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  getStrategyProfile(strategyName: string): StrategyProfile | null {
    return STRATEGY_PROFILES[strategyName] || null;
  }

  isStrategyBlocked(strategyName: string): boolean {
    const profile = STRATEGY_PROFILES[strategyName];
    return profile ? !!profile.blockReason : true;
  }

  getBlockedStrategies(): string[] {
    return Object.entries(STRATEGY_PROFILES)
      .filter(([_, profile]) => profile.blockReason)
      .map(([name, _]) => name);
  }

  getAllStrategies(): string[] {
    return Object.keys(STRATEGY_PROFILES);
  }

  getUnblockedStrategies(): string[] {
    return Object.entries(STRATEGY_PROFILES)
      .filter(([_, profile]) => !profile.blockReason)
      .map(([name, _]) => name);
  }
}
