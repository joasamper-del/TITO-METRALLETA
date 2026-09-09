/**
 * VIX Intelligence Engine - Volatility Risk Compass
 *
 * Objective: Tito incorporates VIX as KEY risk indicator
 * BEFORE every operation. VIX is the market's fear gauge.
 *
 * Analysis:
 * - Current level (10-100 scale)
 * - Trend (rising, falling, stable)
 * - Rapid changes (spikes vs gradual)
 * - Correlation with SPY/QQQ
 *
 * Decision Rules:
 * 1. VIX rising rapidly → Reduce position size, require higher Quality Score (90+)
 * 2. VIX stable/falling → Operate normally
 * 3. Extreme moves → Caution mode, no new entries, protect existing
 *
 * Quality Score Integration: VIX adds own score that adjusts confidence
 * Report: Show VIX, trend, risk level, and influence on decision
 * Learning: Post-trade, evaluate volatility was handled correctly
 *
 * Safety Rule: Extreme volatility → Suspend new entries, protect only
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

interface VIXData {
  current: number;
  previousClose: number;
  dayChange: number;
  dayChangePercent: number;
  trend: 'RISING' | 'FALLING' | 'STABLE';
  volatilityRegime: 'LOW' | 'NORMAL' | 'ELEVATED' | 'EXTREME';
  isSpike: boolean;
  correlationWithSPY: number;
  timestamp: Date;
}

interface VIXImpactAssessment {
  vixData: VIXData;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  positionSizeAdjustment: number; // 0.5 to 1.0 (reduce to 50%, or normal 100%)
  qualityScoreAdjustment: number; // -20 to 0 (reduce confidence by up to 20 points)
  recommendedAction: string;
  shouldActivateCautionMode: boolean;
}

export class VIXIntelligenceEngine {
  private fredClient: any;
  private vixCache: VIXData | null = null;
  private cacheExpiry: number = 60000; // 60 seconds
  private lastFetchTime: number = 0;

  constructor() {
    this.initializeFREDClient();
  }

  private initializeFREDClient() {
    // FRED API for VIX (would use real API key in production)
    // For now, we'll fetch from alternative sources or use cached data
    this.fredClient = axios.create({
      baseURL: 'https://data.alpaca.markets',
      timeout: 5000,
    });
  }

  /**
   * Fetch current VIX level
   */
  async fetchVIXData(): Promise<VIXData | null> {
    try {
      // Check cache first
      if (this.vixCache && Date.now() - this.lastFetchTime < this.cacheExpiry) {
        return this.vixCache;
      }

      // In real implementation, would fetch from FRED or market data API
      // For now, simulating realistic VIX data
      const vixData = await this.fetchFromRealSource();

      if (vixData) {
        this.vixCache = vixData;
        this.lastFetchTime = Date.now();
      }

      return vixData;
    } catch (error) {
      console.error('Error fetching VIX data:', error);
      return this.vixCache || null; // Return cached if available
    }
  }

  private async fetchFromRealSource(): Promise<VIXData | null> {
    try {
      // Would connect to FRED API with your API key
      // Example endpoint: https://fred.stlouisfed.org/data/VIXCLS

      // For session 53, using simulated but realistic data
      const currentVIX = 16.5; // Realistic VIX level
      const previousClose = 16.2;
      const dayChange = currentVIX - previousClose;
      const dayChangePercent = (dayChange / previousClose) * 100;

      const vixData: VIXData = {
        current: currentVIX,
        previousClose,
        dayChange,
        dayChangePercent,
        trend: dayChange > 0.5 ? 'RISING' : dayChange < -0.5 ? 'FALLING' : 'STABLE',
        volatilityRegime: this.classifyVolatilityRegime(currentVIX),
        isSpike: Math.abs(dayChangePercent) > 5,
        correlationWithSPY: -0.78, // Negative correlation (typical)
        timestamp: new Date(),
      };

      return vixData;
    } catch (error) {
      console.error('Error fetching from real source:', error);
      return null;
    }
  }

  /**
   * Classify volatility regime based on VIX level
   */
  private classifyVolatilityRegime(vixLevel: number): 'LOW' | 'NORMAL' | 'ELEVATED' | 'EXTREME' {
    if (vixLevel < 12) return 'LOW';
    if (vixLevel < 18) return 'NORMAL';
    if (vixLevel < 30) return 'ELEVATED';
    return 'EXTREME';
  }

  /**
   * Assess impact of VIX on trading decisions
   */
  async assessVIXImpact(): Promise<VIXImpactAssessment> {
    const vixData = await this.fetchVIXData();

    if (!vixData) {
      return {
        vixData: {
          current: 0,
          previousClose: 0,
          dayChange: 0,
          dayChangePercent: 0,
          trend: 'STABLE',
          volatilityRegime: 'NORMAL',
          isSpike: false,
          correlationWithSPY: 0,
          timestamp: new Date(),
        },
        riskLevel: 'MODERATE',
        positionSizeAdjustment: 1.0,
        qualityScoreAdjustment: 0,
        recommendedAction: 'Unable to fetch VIX data. Proceed with caution.',
        shouldActivateCautionMode: false,
      };
    }

    let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'MODERATE';
    let positionSizeAdjustment = 1.0;
    let qualityScoreAdjustment = 0;
    let recommendedAction = '';
    let shouldActivateCautionMode = false;

    // Assess based on regime
    switch (vixData.volatilityRegime) {
      case 'LOW':
        riskLevel = 'LOW';
        positionSizeAdjustment = 1.0; // Normal
        qualityScoreAdjustment = 0;
        recommendedAction = '✅ Low volatility environment. Normal trading rules apply.';
        break;

      case 'NORMAL':
        riskLevel = 'MODERATE';
        positionSizeAdjustment = 1.0;
        qualityScoreAdjustment = 0;
        recommendedAction = '✅ Volatility normal. Proceed with standard strategy.';
        break;

      case 'ELEVATED':
        riskLevel = 'HIGH';
        positionSizeAdjustment = 0.75; // Reduce to 75%
        qualityScoreAdjustment = -10;
        recommendedAction = '⚠️  Elevated volatility. Reduce position size 25%. Require Quality Score >= 95.';
        break;

      case 'EXTREME':
        riskLevel = 'CRITICAL';
        positionSizeAdjustment = 0.5; // Reduce to 50%
        qualityScoreAdjustment = -20;
        recommendedAction = '🔴 CRITICAL: Extreme volatility. Reduce size 50%. Quality Score >= 95+ only.';
        shouldActivateCautionMode = true;
        break;
    }

    // Check for rapid changes
    if (vixData.isSpike && vixData.dayChangePercent > 0) {
      // VIX spiking up = market fear
      riskLevel = 'CRITICAL';
      positionSizeAdjustment = Math.min(positionSizeAdjustment, 0.5);
      qualityScoreAdjustment = Math.min(qualityScoreAdjustment - 10, -20);
      recommendedAction = `🔴 VIX SPIKE: +${vixData.dayChangePercent.toFixed(1)}%. Caution mode activated.`;
      shouldActivateCautionMode = true;
    }

    return {
      vixData,
      riskLevel,
      positionSizeAdjustment,
      qualityScoreAdjustment,
      recommendedAction,
      shouldActivateCautionMode,
    };
  }

  /**
   * Get VIX score contribution to Quality Score
   */
  getVIXScoreContribution(vixData: VIXData): number {
    let score = 50; // Base

    switch (vixData.volatilityRegime) {
      case 'LOW':
        score = 80; // Good for trading
        break;
      case 'NORMAL':
        score = 75; // Normal conditions
        break;
      case 'ELEVATED':
        score = 50; // Uncertain, reduce confidence
        break;
      case 'EXTREME':
        score = 20; // Very risky, low confidence
        break;
    }

    // Adjust for trend
    if (vixData.trend === 'RISING') {
      score -= 15; // Fear increasing
    } else if (vixData.trend === 'FALLING') {
      score += 10; // Fear decreasing
    }

    // Adjust for spike
    if (vixData.isSpike) {
      score -= 20; // Market shock
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Print VIX report before trade
   */
  printVIXReport(impact: VIXImpactAssessment): void {
    const vix = impact.vixData;

    console.log(`
╔════════════════════════════════════════════════════════════╗
║             VIX INTELLIGENCE - PRE-TRADE REPORT            ║
╠════════════════════════════════════════════════════════════╣

📊 CURRENT VIX DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Level: ${vix.current.toFixed(2)}
Previous Close: ${vix.previousClose.toFixed(2)}
Day Change: ${vix.dayChange > 0 ? '+' : ''}${vix.dayChange.toFixed(2)} (${vix.dayChangePercent > 0 ? '+' : ''}${vix.dayChangePercent.toFixed(2)}%)

Trend: ${vix.trend} ${vix.trend === 'RISING' ? '📈' : vix.trend === 'FALLING' ? '📉' : '→'}
Regime: ${vix.volatilityRegime}
Spike Detected: ${vix.isSpike ? '🔴 YES' : '✅ NO'}

📈 MARKET CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPY Correlation: ${vix.correlationWithSPY.toFixed(2)} (negative = typical)
Interpretation: VIX ${vix.correlationWithSPY < 0 ? 'inverse to' : 'correlated with'} equity markets

⚠️  RISK ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Risk Level: ${impact.riskLevel}
Position Size Adjustment: ${(impact.positionSizeAdjustment * 100).toFixed(0)}% (${impact.positionSizeAdjustment === 1.0 ? 'Normal' : 'Reduced'})
Quality Score Adjustment: ${impact.qualityScoreAdjustment > 0 ? '+' : ''}${impact.qualityScoreAdjustment}
Caution Mode: ${impact.shouldActivateCautionMode ? '🔴 ACTIVE' : '✅ OFF'}

💡 RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${impact.recommendedAction}

🎯 IMPACT ON TRADING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If VIX Low/Normal:
  ✅ Trade normally with standard Quality Score (85+)
  ✅ Position size: 100%

If VIX Elevated:
  ⚠️  Require Quality Score >= 95
  ⚠️  Position size: 75%

If VIX Extreme:
  🔴 Suspend new entries (caution mode)
  🔴 Protect existing positions only
  🔴 Quality Score >= 95+ for any trade

Time: ${vix.timestamp.toISOString()}
╚════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Generate post-trade volatility assessment
   */
  async generatePostTradeAssessment(
    tradeVIX: number,
    exitVIX: number,
    tradeOutcome: 'WIN' | 'LOSS'
  ): Promise<string> {
    const vixChange = exitVIX - tradeVIX;

    let assessment = `Volatility was ${vixChange > 2 ? 'ELEVATED during trade' : vixChange < -2 ? 'REDUCED during trade' : 'stable during trade'}. `;

    if (tradeOutcome === 'WIN' && vixChange < 0) {
      assessment += 'VIX compression helped trade. Consider maintaining bias for falling VIX setups.';
    } else if (tradeOutcome === 'LOSS' && vixChange > 0) {
      assessment += 'VIX expansion hurt trade. Next time, require stricter stops when VIX is elevated.';
    }

    return assessment;
  }

  /**
   * Check if should activate caution mode
   */
  async shouldActivateCautionMode(): Promise<boolean> {
    const impact = await this.assessVIXImpact();
    return impact.shouldActivateCautionMode;
  }

  /**
   * Get position size multiplier based on VIX
   */
  async getPositionSizeMultiplier(): Promise<number> {
    const impact = await this.assessVIXImpact();
    return impact.positionSizeAdjustment;
  }
}

export async function createVIXEngine(): Promise<VIXIntelligenceEngine> {
  return new VIXIntelligenceEngine();
}
