import { MarketLeadershipResult, ComponentScore, MarketDirection, Action } from "./types";
import { TrendComponent, TrendData } from "./components/trendComponent";
import { VolatilityComponent, VolatilityData } from "./components/volatilityComponent";
import { VolumeComponent, VolumeData } from "./components/volumeComponent";
import { FlowComponent, FlowData } from "./components/flowComponent";

export interface MarketData {
  timestamp: Date;
  // Trend data
  spyPrice: number;
  spyMA50: number;
  spyMA200: number;
  qqqPrice: number;
  qqqMA50: number;
  qqqMA200: number;
  // Volatility
  vix: number;
  vixMA20?: number;
  // Volume & Liquidity
  currentVolume: number;
  averageVolume: number;
  spreadBPS?: number;
  // Flow
  gexValue?: number;
  callWallExists?: boolean;
  putWallExists?: boolean;
  putCallRatio?: number;
}

export class MarketLeadershipCalculator {
  private trendComponent = new TrendComponent();
  private volatilityComponent = new VolatilityComponent();
  private volumeComponent = new VolumeComponent();
  private flowComponent = new FlowComponent();

  calculate(data: MarketData): MarketLeadershipResult {
    const allComponents: ComponentScore[] = [];
    const unavailableComponents: string[] = [];

    // Collect all component evaluations
    const trendData: TrendData = {
      spyPrice: data.spyPrice,
      spyMA50: data.spyMA50,
      spyMA200: data.spyMA200,
      qqqPrice: data.qqqPrice,
      qqqMA50: data.qqqMA50,
      qqqMA200: data.qqqMA200,
    };
    allComponents.push(...this.trendComponent.evaluate(trendData));

    const volatilityData: VolatilityData = {
      vix: data.vix,
      vixMA20: data.vixMA20,
    };
    allComponents.push(this.volatilityComponent.evaluate(volatilityData));

    const volumeData: VolumeData = {
      currentVolume: data.currentVolume,
      averageVolume: data.averageVolume,
      spreadBPS: data.spreadBPS,
    };
    allComponents.push(this.volumeComponent.evaluate(volumeData));

    const flowData: FlowData = {
      gexValue: data.gexValue,
      callWallExists: data.callWallExists,
      putWallExists: data.putWallExists,
      putCallRatio: data.putCallRatio,
    };
    allComponents.push(this.flowComponent.evaluate(flowData));

    // Track unavailable data
    allComponents.forEach((comp) => {
      if (!comp.isHealthy) {
        unavailableComponents.push(comp.name);
      }
    });

    // Calculate weighted score
    const totalWeight = allComponents.reduce((sum, c) => sum + c.weight, 0);
    const adjustedComponents = allComponents.map((c) => ({
      ...c,
      weight: c.weight / totalWeight, // Renormalize if some components missing
      contribution: (c.score * c.weight) / totalWeight,
    }));

    const marketLeadershipIndex = Math.round(
      adjustedComponents.reduce((sum, c) => sum + c.contribution, 0)
    );

    // Count verdicts
    const bullishCount = adjustedComponents.filter((c) => c.verdict === "BULLISH").length;
    const bearishCount = adjustedComponents.filter((c) => c.verdict === "BEARISH").length;
    const neutralCount = adjustedComponents.filter((c) => c.verdict === "NEUTRAL").length;

    // Determine direction and action
    let direction: MarketDirection;
    let action: Action;

    if (bullishCount >= bearishCount + neutralCount) {
      direction = "BULLISH";
      if (marketLeadershipIndex >= 70) {
        action = "ENTER";
      } else if (marketLeadershipIndex >= 55) {
        action = "ESPERAR";
      } else {
        action = "EVITAR";
      }
    } else if (bearishCount >= bullishCount + neutralCount) {
      direction = "BEARISH";
      action = "EVITAR";
    } else {
      direction = "NEUTRAL";
      if (marketLeadershipIndex >= 60) {
        action = "ESPERAR";
      } else {
        action = "EVITAR";
      }
    }

    // Calculate confidence (reduce if data missing)
    let confidence = marketLeadershipIndex;
    const confidenceReduction = unavailableComponents.length * 8; // -8% per missing component
    confidence = Math.max(confidence - confidenceReduction, 0);

    // Build regime description
    const marketRegime = this.buildRegimeDescription(direction, marketLeadershipIndex);

    // Build audit trail
    const auditTrail = {
      whatSourcesWereConsulted: adjustedComponents.map((c) => c.name),
      whatWasFoundInEachSource: Object.fromEntries(
        adjustedComponents.map((c) => [c.name, c.reasoning])
      ),
      whatSignalsApprovedTheDecision: adjustedComponents
        .filter((c) => c.verdict === direction)
        .map((c) => c.name),
      whatSignalsContradictedIt: adjustedComponents
        .filter((c) => c.verdict !== direction && c.verdict !== "NEUTRAL")
        .map((c) => c.name),
      whatInformationWasDiscarded: unavailableComponents,
      howMuchWeightEachComponentHad: Object.fromEntries(
        adjustedComponents.map((c) => [c.name, parseFloat((c.weight * 100).toFixed(1))])
      ),
      whatWouldInvalidateTheConclusion: this.buildInvalidationScenarios(direction, adjustedComponents),
    };

    const warnings: string[] = [];
    if (unavailableComponents.length > 0) {
      warnings.push(`${unavailableComponents.length} components missing: ${unavailableComponents.join(", ")}`);
      warnings.push(`Confidence reduced by ${confidenceReduction}%`);
    }

    return {
      timestamp: data.timestamp,
      marketLeadershipIndex,
      marketRegime,
      direction,
      confidence: Math.round(confidence),
      action,
      components: adjustedComponents,
      scoreBreakdown: {
        bullishVotes: bullishCount,
        neutralVotes: neutralCount,
        bearishVotes: bearishCount,
        weightedSum: marketLeadershipIndex,
        explanation: `${bullishCount} bullish, ${neutralCount} neutral, ${bearishCount} bearish signals → ${direction}`,
      },
      unavailableComponents,
      warnings,
      auditTrail,
    };
  }

  private buildRegimeDescription(direction: MarketDirection, score: number): string {
    const strength = score >= 75 ? "STRONG" : score >= 55 ? "MODERATE" : "WEAK";
    return `${direction}_${strength}`;
  }

  private buildInvalidationScenarios(direction: MarketDirection, components: ComponentScore[]): string[] {
    const scenarios: string[] = [];

    if (direction === "BULLISH") {
      scenarios.push("If SPY/QQQ break below MA50");
      scenarios.push("If VIX spikes above 35");
      scenarios.push("If volume drops below 50% of average");
    } else if (direction === "BEARISH") {
      scenarios.push("If SPY reclaims MA50");
      scenarios.push("If VIX falls below 15");
      scenarios.push("If volume accelerates on bounce");
    } else {
      scenarios.push("Clear break above or below consolidation range");
      scenarios.push("VIX expansion or contraction > 3 points");
    }

    return scenarios;
  }
}
