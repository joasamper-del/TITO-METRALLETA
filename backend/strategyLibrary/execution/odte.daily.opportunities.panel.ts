/**
 * 0DTE Daily Opportunities Panel
 * Analyzes SPY, QQQ, IWM + other symbols
 * Shows: ENTER / WAIT / DO_NOT_OPERATE with reasoning and confidence
 */

export interface OpportunityScore {
  symbol: string;
  recommendation: "ENTER" | "WAIT" | "DO_NOT_OPERATE";
  confidence: number; // 0-100
  reasoning: string[];
  technicalScore: number; // 0-100
  liquidityScore: number; // 0-100
  volatilityScore: number; // 0-100
  riskScore: number; // 0-100 (lower = safer)
  timeUntilExpiration: number; // minutes
  suggestedCallStrike?: number;
  suggestedPutStrike?: number;
  estimatedPremium?: {
    call: number;
    put: number;
  };
}

export interface DailyOpportunitiesPanel {
  timestamp: Date;
  marketConditions: {
    vix: number;
    regime: "CALM" | "NORMAL" | "ELEVATED" | "EXTREME";
    trend: "BULLISH" | "NEUTRAL" | "BEARISH";
  };
  opportunities: {
    primary: OpportunityScore[]; // SPY, QQQ, IWM
    secondary: OpportunityScore[]; // Other liquid symbols
  };
  topThreeOpportunities: OpportunityScore[];
  summary: {
    bestOpportunity: OpportunityScore;
    riskAssessment: string;
    recommendedAction: string;
  };
}

export class OdteDailyOpportunitiesPanel {
  /**
   * Analyze daily opportunities for 0DTE
   */
  analyzeOpportunities(marketData: {
    symbols: Array<{
      symbol: string;
      price: number;
      bidAskSpread: number; // percentage
      volume: number; // per hour
      openInterest: number;
      vix?: number;
      iv?: number;
      trend: "UP" | "DOWN" | "FLAT";
      recentVolatility: number; // %
    }>;
    generalVix: number;
    marketRegime: "CALM" | "NORMAL" | "ELEVATED" | "EXTREME";
    timeUntilMarketClose: number; // minutes
  }): DailyOpportunitiesPanel {
    const primarySymbols = ["SPY", "QQQ", "IWM"];
    const opportunities: OpportunityScore[] = [];

    // Analyze each symbol
    marketData.symbols.forEach((data) => {
      const score = this.scoreSymbol(data, marketData);
      opportunities.push(score);
    });

    // Separate primary and secondary
    const primary = opportunities.filter((o) => primarySymbols.includes(o.symbol));
    const secondary = opportunities.filter((o) => !primarySymbols.includes(o.symbol));

    // Sort by recommendation strength
    primary.sort((a, b) => b.confidence - a.confidence);
    secondary.sort((a, b) => b.confidence - a.confidence);

    // Top 3 opportunities overall
    const allSorted = opportunities.sort((a, b) => b.confidence - a.confidence);
    const topThree = allSorted.slice(0, 3);

    // Market summary
    const panel: DailyOpportunitiesPanel = {
      timestamp: new Date(),
      marketConditions: {
        vix: marketData.generalVix,
        regime: marketData.marketRegime,
        trend: this.determineTrend(opportunities),
      },
      opportunities: {
        primary,
        secondary,
      },
      topThreeOpportunities: topThree,
      summary: {
        bestOpportunity: topThree[0],
        riskAssessment: this.assessRisk(topThree, marketData.marketRegime),
        recommendedAction: this.recommendAction(topThree[0], marketData.timeUntilMarketClose),
      },
    };

    return panel;
  }

  /**
   * Score individual symbol
   */
  private scoreSymbol(
    data: {
      symbol: string;
      price: number;
      bidAskSpread: number;
      volume: number;
      openInterest: number;
      iv?: number;
      trend: "UP" | "DOWN" | "FLAT";
      recentVolatility: number;
    },
    market: {
      generalVix: number;
      marketRegime: "CALM" | "NORMAL" | "ELEVATED" | "EXTREME";
      timeUntilMarketClose: number;
    }
  ): OpportunityScore {
    // Technical score (trend + volatility)
    let technicalScore = 50;
    if (data.trend === "UP") technicalScore += 20;
    if (data.trend === "DOWN") technicalScore += 20;
    if (data.trend === "FLAT" && market.marketRegime === "ELEVATED") technicalScore += 15;
    if (data.recentVolatility > 2) technicalScore += 10;

    // Liquidity score (spread + volume + OI)
    let liquidityScore = 0;
    if (data.bidAskSpread < 2) liquidityScore += 40;
    else if (data.bidAskSpread < 5) liquidityScore += 30;
    else liquidityScore += 10;

    if (data.volume > 1000) liquidityScore += 30;
    else if (data.volume > 500) liquidityScore += 20;
    else liquidityScore += 5;

    if (data.openInterest > 500) liquidityScore += 30;
    else if (data.openInterest > 200) liquidityScore += 20;
    else liquidityScore += 5;

    liquidityScore = Math.min(liquidityScore, 100);

    // Volatility score (higher vol = more opportunity, but also more risk)
    let volatilityScore = Math.min(data.recentVolatility * 5, 100);

    // Risk score (spread + market regime)
    let riskScore = 30; // Base risk
    if (data.bidAskSpread > 5) riskScore += 20;
    if (market.marketRegime === "EXTREME") riskScore += 30;
    else if (market.marketRegime === "ELEVATED") riskScore += 15;

    riskScore = Math.min(riskScore, 100);

    // Determine recommendation
    let recommendation: "ENTER" | "WAIT" | "DO_NOT_OPERATE" = "DO_NOT_OPERATE";
    let confidence = 0;

    if (data.bidAskSpread <= 5 && data.volume >= 500 && data.openInterest >= 100) {
      // Passes basic liquidity filters
      if (technicalScore >= 65 && volatilityScore >= 40) {
        recommendation = "ENTER";
        confidence = (technicalScore + liquidityScore + volatilityScore) / 3 - riskScore / 2;
      } else if (technicalScore >= 55 || volatilityScore >= 50) {
        recommendation = "WAIT";
        confidence = (technicalScore + liquidityScore) / 2;
      } else {
        recommendation = "DO_NOT_OPERATE";
        confidence = 30;
      }
    } else if (data.bidAskSpread <= 7 && data.volume >= 300) {
      recommendation = "WAIT";
      confidence = (technicalScore + liquidityScore) / 3;
    }

    confidence = Math.max(20, Math.min(confidence, 100));

    const reasoning: string[] = [];

    if (data.trend === "UP") reasoning.push("Uptrend present");
    if (data.trend === "DOWN") reasoning.push("Downtrend present");
    if (data.recentVolatility > 3) reasoning.push("High volatility - good premium");
    if (data.bidAskSpread < 3) reasoning.push("Tight spreads - good liquidity");
    if (market.marketRegime === "CALM") reasoning.push("Low VIX environment");
    if (market.marketRegime === "ELEVATED") reasoning.push("Elevated VIX - premium attractive");
    if (market.timeUntilMarketClose < 60) reasoning.push("Late in session - limited time");

    return {
      symbol: data.symbol,
      recommendation,
      confidence,
      reasoning,
      technicalScore,
      liquidityScore,
      volatilityScore,
      riskScore,
      timeUntilExpiration: market.timeUntilMarketClose,
      suggestedCallStrike: data.price + (data.price * 0.005), // ATM
      suggestedPutStrike: data.price - (data.price * 0.005),
      estimatedPremium: {
        call: data.recentVolatility > 2 ? 0.15 * data.price : 0.08 * data.price,
        put: data.recentVolatility > 2 ? 0.15 * data.price : 0.08 * data.price,
      },
    };
  }

  /**
   * Determine overall market trend
   */
  private determineTrend(opportunities: OpportunityScore[]): "BULLISH" | "NEUTRAL" | "BEARISH" {
    const trends = opportunities.map((o) => o.reasoning.find((r) => r.includes("trend")));
    const upCount = trends.filter((t) => t?.includes("Up")).length;
    const downCount = trends.filter((t) => t?.includes("Down")).length;

    if (upCount > downCount) return "BULLISH";
    if (downCount > upCount) return "BEARISH";
    return "NEUTRAL";
  }

  /**
   * Assess overall risk
   */
  private assessRisk(
    topThree: OpportunityScore[],
    regime: "CALM" | "NORMAL" | "ELEVATED" | "EXTREME"
  ): string {
    const avgRisk = topThree.reduce((sum, o) => sum + o.riskScore, 0) / topThree.length;

    if (regime === "EXTREME") return "🔴 EXTREME: Market volatility very high. SL very tight (5% premium). Single contract only.";
    if (regime === "ELEVATED") return "🟠 ELEVATED: Market stressed. Use wide SL (15% premium). Limited position size.";
    if (avgRisk > 60) return "🟠 HIGH: Spreads wide or low liquidity. Be selective. Maximum 1 contract.";
    if (avgRisk > 40) return "🟡 MODERATE: Normal conditions. Standard Phase 1 rules apply.";
    return "🟢 LOW: Excellent conditions. Liquidity strong, spreads tight.";
  }

  /**
   * Recommend action
   */
  private recommendAction(best: OpportunityScore, timeUntilClose: number): string {
    if (timeUntilClose < 30) {
      return "⏰ LATE SESSION: Only enter if high confidence (>85%). Theta decay accelerating.";
    }

    switch (best.recommendation) {
      case "ENTER":
        return `✅ ENTER: ${best.symbol} ${best.type || "OPTION"} with ${best.confidence.toFixed(0)}% confidence. Follow Phase 1 rules (SL 10%, TP 20%).`;
      case "WAIT":
        return `⏳ WAIT: ${best.symbol} shows potential but needs confirmation. Monitor next 5-10 minutes.`;
      case "DO_NOT_OPERATE":
        return `🛑 DO NOT OPERATE: Conditions not optimal. Wait for better setup or lower VIX.`;
    }
  }

  /**
   * Display panel in terminal
   */
  displayPanel(panel: DailyOpportunitiesPanel): void {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║        0DTE DAILY OPPORTUNITIES PANEL                      ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log(`📊 MARKET CONDITIONS`);
    console.log(`   VIX: ${panel.marketConditions.vix.toFixed(1)}`);
    console.log(`   Regime: ${panel.marketConditions.regime}`);
    console.log(`   Trend: ${panel.marketConditions.trend}\n`);

    console.log(`🎯 TOP 3 OPPORTUNITIES TODAY\n`);

    panel.topThreeOpportunities.forEach((opp, idx) => {
      const icon = opp.recommendation === "ENTER" ? "✅" : opp.recommendation === "WAIT" ? "⏳" : "🛑";
      console.log(
        `${idx + 1}. ${icon} ${opp.symbol} - ${opp.recommendation} (${opp.confidence.toFixed(0)}% confidence)`
      );
      console.log(`   Technical: ${opp.technicalScore.toFixed(0)} | Liquidity: ${opp.liquidityScore.toFixed(0)} | Vol: ${opp.volatilityScore.toFixed(0)}`);
      opp.reasoning.forEach((r) => console.log(`   • ${r}`));
      if (opp.estimatedPremium) {
        console.log(`   Est. Premium: CALL $${opp.estimatedPremium.call.toFixed(3)} / PUT $${opp.estimatedPremium.put.toFixed(3)}\n`);
      }
    });

    console.log(`📋 SUMMARY`);
    console.log(`   ${panel.summary.riskAssessment}`);
    console.log(`   ${panel.summary.recommendedAction}\n`);

    console.log("═══════════════════════════════════════════════════════════\n");
  }
}

export default OdteDailyOpportunitiesPanel;
