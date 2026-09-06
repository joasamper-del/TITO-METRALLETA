import { ComponentScore, ComponentVerdict } from "../types";

export interface TrendData {
  spyPrice: number;
  spyMA50: number;
  spyMA200: number;
  qqqPrice: number;
  qqqMA50: number;
  qqqMA200: number;
}

export class TrendComponent {
  /**
   * Evaluates SPY and QQQ trends using MA50/MA200
   * SPY = broad market, QQQ = tech leadership
   */
  evaluate(data: TrendData): ComponentScore[] {
    const spyTrend = this.analyzeTrend(data.spyPrice, data.spyMA50, data.spyMA200, "SPY");
    const qqqTrend = this.analyzeTrend(data.qqqPrice, data.qqqMA50, data.qqqMA200, "QQQ");
    const relativeStrength = this.analyzeRelativeStrength(
      data.qqqPrice,
      data.qqqMA50,
      data.spyPrice,
      data.spyMA50
    );

    return [spyTrend, qqqTrend, relativeStrength];
  }

  private analyzeTrend(price: number, ma50: number, ma200: number, ticker: string): ComponentScore {
    const priceAboveMA50 = price > ma50;
    const priceAboveMA200 = price > ma200;
    const ma50AboveMA200 = ma50 > ma200;

    let verdict: ComponentVerdict;
    let score: number;
    let reasoning: string;

    if (priceAboveMA50 && priceAboveMA200 && ma50AboveMA200) {
      verdict = "BULLISH";
      const distancePercent = ((price - ma200) / ma200) * 100;
      score = Math.min(85 + (distancePercent * 2), 100);
      reasoning = `${ticker} in strong uptrend: price ${price.toFixed(2)} > MA50 ${ma50.toFixed(2)} > MA200 ${ma200.toFixed(2)}`;
    } else if (priceAboveMA50 && priceAboveMA200) {
      verdict = "BULLISH";
      score = 70;
      reasoning = `${ticker} in uptrend but MA50 < MA200, may be early recovery`;
    } else if (priceAboveMA50) {
      verdict = "NEUTRAL";
      score = 50;
      reasoning = `${ticker} above MA50 but below MA200, mixed signals`;
    } else if (priceAboveMA200) {
      verdict = "NEUTRAL";
      score = 40;
      reasoning = `${ticker} below MA50 but above MA200, weakening trend`;
    } else if (ma50AboveMA200) {
      verdict = "BEARISH";
      score = 25;
      reasoning = `${ticker} below both MAs but MA50 > MA200, downtrend with potential support`;
    } else {
      verdict = "BEARISH";
      score = 15;
      reasoning = `${ticker} in strong downtrend: price ${price.toFixed(2)} < MA50 ${ma50.toFixed(2)} < MA200 ${ma200.toFixed(2)}`;
    }

    return {
      name: `${ticker} Trend`,
      verdict,
      score,
      weight: ticker === "SPY" ? 0.25 : 0.2,
      contribution: score * (ticker === "SPY" ? 0.25 : 0.2),
      reasoning,
      dataAvailability: "REAL",
      dataPoints: [
        `${ticker} Price: ${price.toFixed(2)}`,
        `MA50: ${ma50.toFixed(2)}`,
        `MA200: ${ma200.toFixed(2)}`,
      ],
      isHealthy: true,
    };
  }

  private analyzeRelativeStrength(
    qqqPrice: number,
    qqqMA50: number,
    spyPrice: number,
    spyMA50: number
  ): ComponentScore {
    // QQQ vs SPY momentum
    const qqqMomentum = qqqPrice > qqqMA50 ? 1 : -1;
    const spyMomentum = spyPrice > spyMA50 ? 1 : -1;
    const qqqOutperformance = (qqqMomentum - spyMomentum) / 2;

    let verdict: ComponentVerdict;
    let score: number;
    let reasoning: string;

    if (qqqMomentum === 1 && spyMomentum === 1) {
      verdict = "BULLISH";
      score = 75;
      reasoning = "Both SPY and QQQ showing momentum, tech leadership aligned";
    } else if (qqqMomentum === 1 && spyMomentum !== 1) {
      verdict = "BULLISH";
      score = 60;
      reasoning = "QQQ outperforming SPY, tech leading";
    } else if (qqqMomentum !== 1 && spyMomentum === 1) {
      verdict = "NEUTRAL";
      score = 45;
      reasoning = "SPY showing strength but QQQ lagging, divergence";
    } else {
      verdict = "BEARISH";
      score = 20;
      reasoning = "Both in downtrend, no tech leadership";
    }

    return {
      name: "QQQ vs SPY Leadership",
      verdict,
      score,
      weight: 0.15,
      contribution: score * 0.15,
      reasoning,
      dataAvailability: "REAL",
      dataPoints: [
        `QQQ Momentum: ${qqqMomentum > 0 ? "Positive" : "Negative"}`,
        `SPY Momentum: ${spyMomentum > 0 ? "Positive" : "Negative"}`,
      ],
      isHealthy: true,
    };
  }
}
