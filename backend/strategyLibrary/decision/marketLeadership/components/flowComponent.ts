import { ComponentScore, ComponentVerdict } from "../types";

export interface FlowData {
  gexValue?: number; // Gamma Exposure, if available
  callWallExists?: boolean;
  putWallExists?: boolean;
  putCallRatio?: number; // <0.5 bullish, >1.5 bearish
}

export class FlowComponent {
  /**
   * Evaluates options flow and gamma exposure
   * GEX = gamma exposure index
   * Walls = support/resistance from options concentration
   * Put/Call ratio = retail vs institutional sentiment
   */
  evaluate(data: FlowData): ComponentScore {
    let score = 50;
    let verdict: ComponentVerdict = "NEUTRAL";
    let reasoning = "";
    const dataPoints: string[] = [];

    // GEX analysis if available
    if (data.gexValue !== undefined) {
      if (data.gexValue > 0) {
        verdict = "BULLISH";
        score = Math.min(65 + (data.gexValue / 100) * 20, 100);
        reasoning = `Positive GEX ${data.gexValue.toFixed(2)}, markets can rally freely`;
      } else if (data.gexValue < -100) {
        verdict = "BEARISH";
        score = Math.max(35 - (Math.abs(data.gexValue) / 100) * 20, 0);
        reasoning = `Highly negative GEX ${data.gexValue.toFixed(2)}, gamma structure oppressive`;
      } else {
        reasoning = `Neutral GEX ${data.gexValue.toFixed(2)}`;
      }
      dataPoints.push(`GEX: ${data.gexValue.toFixed(2)}`);
    }

    // Wall analysis
    if (data.callWallExists && !data.putWallExists) {
      if (verdict !== "NEUTRAL") {
        score = Math.min(score + 8, 100);
      }
      reasoning += (reasoning ? "; " : "") + "Call wall provides resistance, capped upside";
      dataPoints.push("Call Wall: Present (resistance)");
    } else if (data.putWallExists && !data.callWallExists) {
      if (verdict !== "BEARISH") {
        score = Math.min(score + 10, 100);
      }
      reasoning += (reasoning ? "; " : "") + "Put wall provides support, protected downside";
      verdict = verdict === "BEARISH" ? "BEARISH" : "BULLISH";
      dataPoints.push("Put Wall: Present (support)");
    } else if (data.callWallExists && data.putWallExists) {
      reasoning += (reasoning ? "; " : "") + "Both walls present, high event risk";
      dataPoints.push("Call Wall & Put Wall: Both present");
    }

    // Put/Call ratio
    if (data.putCallRatio !== undefined) {
      if (data.putCallRatio < 0.5) {
        score = Math.min(score + 5, 100);
        reasoning += (reasoning ? "; " : "") + `Low put/call ${data.putCallRatio.toFixed(2)}, bullish sentiment`;
      } else if (data.putCallRatio > 1.5) {
        score = Math.max(score - 10, 0);
        reasoning += (reasoning ? "; " : "") + `High put/call ${data.putCallRatio.toFixed(2)}, fearful sentiment`;
      }
      dataPoints.push(`Put/Call Ratio: ${data.putCallRatio.toFixed(2)}`);
    }

    if (!reasoning) {
      reasoning = "Insufficient flow data available";
    }

    return {
      name: "Options Flow & Gamma",
      verdict,
      score,
      weight: 0.1,
      contribution: score * 0.1,
      reasoning,
      dataAvailability: dataPoints.length > 0 ? "REAL" : "UNAVAILABLE",
      dataPoints,
      isHealthy: dataPoints.length > 0,
    };
  }
}
