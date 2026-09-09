/**
 * Strategy Library Selector
 *
 * Objective: Tito has access to a strategy library and CHOOSES
 * the most appropriate one based on current market conditions.
 * NOT forcing the same strategy every time.
 *
 * Strategy Library:
 * 1. 0DTE Tendencial — Clear trend (MA50 > MA200, ADX > 25)
 * 2. Smart Re-Entry — Pullback within uptrend
 * 3. Pullback Strategy — Retracement inside trend (variation)
 * 4. Breakout Strategy — Breaking resistance/support
 * 5. Range Trading — Lateral market (no trend, RSI 30-70)
 * 6. Mean Reversion — Oversold (RSI < 30) or Overbought (RSI > 70)
 * 7. Volatility Expansion — VIX rising + price expanding
 * 8. Do Not Trade — No setup fits well
 *
 * Selection Rule: Before EVERY operation, Tito says:
 * 1. WHICH strategy it chose
 * 2. WHY (market conditions that apply)
 * 3. CONFIDENCE (based on Quality Score + VIX)
 *
 * If NONE apply well: "Do Not Trade" (valid option)
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

interface StrategyConditions {
  name: string;
  description: string;
  marketConditions: {
    trendRequired: 'STRONG_UP' | 'STRONG_DOWN' | 'PULLBACK' | 'BREAKOUT' | 'LATERAL' | 'ANY';
    minADX?: number;
    rsiRange?: [number, number];
    volatilityRange?: string;
    maAlignment?: string;
  };
  confidence: number; // 0-100 based on how well market fits
  applicability: 'PERFECT' | 'GOOD' | 'ACCEPTABLE' | 'POOR' | 'UNSUITABLE';
  recommendation: string;
}

interface MarketConditions {
  trend: 'STRONG_UP' | 'STRONG_DOWN' | 'PULLBACK_UP' | 'PULLBACK_DOWN' | 'LATERAL' | 'UNCERTAIN';
  adx: number;
  rsi: number;
  ma50: number;
  ma200: number;
  recentHigh: number;
  recentLow: number;
  currentPrice: number;
  vixLevel: string; // LOW, NORMAL, ELEVATED, EXTREME
}

export class StrategyLibrarySelector {
  private strategyLibrary: StrategyConditions[] = [];
  private alpacaClient: any;

  constructor() {
    this.initializeStrategyLibrary();
    this.initializeAlpacaClient();
  }

  private initializeStrategyLibrary() {
    this.strategyLibrary = [
      {
        name: '0DTE Tendencial',
        description: 'Trade the trend end-of-day when direction is clear',
        marketConditions: {
          trendRequired: 'STRONG_UP',
          minADX: 25,
          maAlignment: 'MA50 > MA200 (clear uptrend)',
        },
        confidence: 0,
        applicability: 'POOR',
        recommendation: '',
      },
      {
        name: 'Smart Re-Entry',
        description: 'Re-enter after pullback within strong trend',
        marketConditions: {
          trendRequired: 'PULLBACK',
          minADX: 20,
          maAlignment: 'Price > MA50 > MA200',
        },
        confidence: 0,
        applicability: 'POOR',
        recommendation: '',
      },
      {
        name: 'Pullback Strategy',
        description: 'Trade retracement within existing trend',
        marketConditions: {
          trendRequired: 'PULLBACK',
          minADX: 18,
          maAlignment: 'Price testing MA for bounce',
        },
        confidence: 0,
        applicability: 'POOR',
        recommendation: '',
      },
      {
        name: 'Breakout Strategy',
        description: 'Trade break of resistance/support levels',
        marketConditions: {
          trendRequired: 'BREAKOUT',
          minADX: 15,
        },
        confidence: 0,
        applicability: 'POOR',
        recommendation: '',
      },
      {
        name: 'Range Trading',
        description: 'Trade bounces within lateral range',
        marketConditions: {
          trendRequired: 'LATERAL',
          rsiRange: [30, 70],
        },
        confidence: 0,
        applicability: 'POOR',
        recommendation: '',
      },
      {
        name: 'Mean Reversion',
        description: 'Trade oversold/overbought back to mean',
        marketConditions: {
          trendRequired: 'ANY',
          rsiRange: [20, 40],
        },
        confidence: 0,
        applicability: 'POOR',
        recommendation: '',
      },
      {
        name: 'Volatility Expansion',
        description: 'Trade when volatility expands with price move',
        marketConditions: {
          trendRequired: 'STRONG_UP',
          volatilityRange: 'Rising VIX + expanding range',
        },
        confidence: 0,
        applicability: 'POOR',
        recommendation: '',
      },
      {
        name: 'Do Not Trade',
        description: 'No setup fits current market conditions',
        marketConditions: {
          trendRequired: 'ANY',
        },
        confidence: 0,
        applicability: 'UNSUITABLE',
        recommendation: 'Wait for clearer setup',
      },
    ];
  }

  private initializeAlpacaClient() {
    const apiKey = process.env.ALPACA_API_KEY;
    const apiSecret = process.env.ALPACA_SECRET_KEY;

    if (!apiKey || !apiSecret) {
      throw new Error('Missing Alpaca credentials');
    }

    this.alpacaClient = axios.create({
      baseURL: 'https://paper-api.alpaca.markets',
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    });
  }

  /**
   * Analyze market and recommend best strategy
   */
  async selectBestStrategy(symbol: string): Promise<{ strategy: StrategyConditions; reasoning: string }> {
    const conditions = await this.analyzeMarketConditions(symbol);

    // Score each strategy against current conditions
    const scoredStrategies = this.strategyLibrary.map(strategy => ({
      ...strategy,
      ...this.scoreStrategyForConditions(strategy, conditions),
    }));

    // Sort by confidence (highest first)
    const ranked = scoredStrategies.sort((a, b) => b.confidence - a.confidence);

    // Get best fit
    const bestStrategy = ranked[0];

    // Generate reasoning
    const reasoning = this.generateSelectionReasoning(conditions, bestStrategy);

    return {
      strategy: bestStrategy,
      reasoning,
    };
  }

  /**
   * Analyze current market conditions
   */
  private async analyzeMarketConditions(symbol: string): Promise<MarketConditions> {
    try {
      // Fetch bars for analysis (simplified)
      // In real implementation, would fetch real data
      return {
        trend: 'STRONG_UP',
        adx: 28,
        rsi: 55,
        ma50: 424.50,
        ma200: 420.00,
        recentHigh: 427.00,
        recentLow: 422.50,
        currentPrice: 425.50,
        vixLevel: 'NORMAL',
      };
    } catch (error) {
      console.error('Error analyzing market:', error);
      return {
        trend: 'UNCERTAIN',
        adx: 0,
        rsi: 50,
        ma50: 0,
        ma200: 0,
        recentHigh: 0,
        recentLow: 0,
        currentPrice: 0,
        vixLevel: 'NORMAL',
      };
    }
  }

  /**
   * Score each strategy against current conditions
   */
  private scoreStrategyForConditions(
    strategy: StrategyConditions,
    conditions: MarketConditions
  ): { confidence: number; applicability: 'PERFECT' | 'GOOD' | 'ACCEPTABLE' | 'POOR' | 'UNSUITABLE' } {
    let score = 50; // Base score

    // Check trend alignment
    switch (strategy.name) {
      case '0DTE Tendencial':
        if (conditions.trend === 'STRONG_UP' && conditions.adx > 25) {
          score = 90;
        } else if (conditions.trend === 'STRONG_UP') {
          score = 70;
        } else if (conditions.trend === 'PULLBACK_UP') {
          score = 50;
        } else {
          score = 20;
        }
        break;

      case 'Smart Re-Entry':
        if (conditions.trend === 'PULLBACK_UP' && conditions.adx > 20) {
          score = 85;
        } else if (conditions.trend === 'PULLBACK_UP') {
          score = 65;
        } else {
          score = 25;
        }
        break;

      case 'Pullback Strategy':
        if (conditions.trend === 'PULLBACK_UP' && conditions.adx > 18) {
          score = 80;
        } else if (conditions.trend === 'PULLBACK_UP') {
          score = 60;
        } else {
          score = 30;
        }
        break;

      case 'Breakout Strategy':
        if (conditions.currentPrice > conditions.recentHigh && conditions.adx > 15) {
          score = 75;
        } else if (conditions.currentPrice > conditions.recentHigh) {
          score = 55;
        } else {
          score = 25;
        }
        break;

      case 'Range Trading':
        if (conditions.trend === 'LATERAL' && conditions.rsi > 30 && conditions.rsi < 70) {
          score = 75;
        } else if (conditions.trend === 'LATERAL') {
          score = 55;
        } else {
          score = 20;
        }
        break;

      case 'Mean Reversion':
        if (conditions.rsi < 35 && conditions.trend !== 'STRONG_DOWN') {
          score = 70;
        } else if (conditions.rsi < 40) {
          score = 50;
        } else {
          score = 25;
        }
        break;

      case 'Volatility Expansion':
        if (conditions.vixLevel === 'ELEVATED' && conditions.trend === 'STRONG_UP') {
          score = 60;
        } else if (conditions.vixLevel === 'ELEVATED') {
          score = 40;
        } else {
          score = 20;
        }
        break;

      case 'Do Not Trade':
        // Always available as fallback
        score = 0;
        break;
    }

    // Determine applicability
    let applicability: 'PERFECT' | 'GOOD' | 'ACCEPTABLE' | 'POOR' | 'UNSUITABLE';
    if (score >= 80) applicability = 'PERFECT';
    else if (score >= 65) applicability = 'GOOD';
    else if (score >= 50) applicability = 'ACCEPTABLE';
    else if (score >= 30) applicability = 'POOR';
    else applicability = 'UNSUITABLE';

    return {
      confidence: score,
      applicability,
    };
  }

  /**
   * Generate clear reasoning for strategy selection
   */
  private generateSelectionReasoning(
    conditions: MarketConditions,
    selectedStrategy: StrategyConditions
  ): string {
    const parts: string[] = [];

    parts.push(`📊 Market Analysis:`);
    parts.push(`   • Trend: ${conditions.trend}`);
    parts.push(`   • ADX: ${conditions.adx.toFixed(1)} (${conditions.adx > 25 ? 'strong' : 'weak'} directional)`);
    parts.push(`   • RSI: ${conditions.rsi.toFixed(1)} (${conditions.rsi > 70 ? 'overbought' : conditions.rsi < 30 ? 'oversold' : 'neutral'})`);
    parts.push(`   • Price vs MA: ${conditions.currentPrice > conditions.ma50 ? 'Above' : 'Below'} 50-MA`);
    parts.push(`   • VIX Level: ${conditions.vixLevel}`);

    parts.push(``);
    parts.push(`🎯 Selected Strategy: ${selectedStrategy.name}`);
    parts.push(`   Confidence: ${selectedStrategy.confidence}/100 (${selectedStrategy.applicability})`);
    parts.push(`   Description: ${selectedStrategy.description}`);
    parts.push(`   Rationale: ${selectedStrategy.recommendation}`);

    parts.push(``);
    parts.push(`💡 Why this strategy:`);
    if (selectedStrategy.name === '0DTE Tendencial') {
      parts.push(`   Strong uptrend (MA50 > MA200) + High ADX → Trend follow`);
    } else if (selectedStrategy.name === 'Smart Re-Entry') {
      parts.push(`   Pullback within uptrend → Wait for confirmation + re-enter`);
    } else if (selectedStrategy.name === 'Range Trading') {
      parts.push(`   Lateral market (no strong trend) → Trade bounces within range`);
    } else if (selectedStrategy.name === 'Do Not Trade') {
      parts.push(`   Market conditions unclear or unfavorable for any setup`);
    }

    return parts.join('\n');
  }

  /**
   * Print strategy selection report
   */
  printStrategySelection(result: { strategy: StrategyConditions; reasoning: string }): void {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║          STRATEGY LIBRARY SELECTOR - RECOMMENDATION        ║
╠════════════════════════════════════════════════════════════╣

${result.reasoning}

╚════════════════════════════════════════════════════════════╝
    `);
  }

  getStrategyLibrary(): StrategyConditions[] {
    return this.strategyLibrary;
  }
}

export async function createStrategySelector(): Promise<StrategyLibrarySelector> {
  return new StrategyLibrarySelector();
}
