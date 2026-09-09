/**
 * Historical Data Loader
 * Loads OHLCV data and pre-computes technical indicators
 */

import { Bar, MarketData, OHLCV } from "./types";

export function computeMA(data: OHLCV[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, bar) => acc + bar.close, 0);
      result.push(sum / period);
    }
  }
  return result;
}

export function computeRSI(data: OHLCV[], period: number = 14): number[] {
  const result: number[] = [];
  const changes = data.map((d, i) => (i === 0 ? 0 : d.close - data[i - 1].close));

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(NaN);
    } else {
      const gains = changes.slice(i - period + 1, i + 1).filter((c) => c > 0);
      const losses = changes.slice(i - period + 1, i + 1).filter((c) => c < 0).map((c) => Math.abs(c));
      const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
      const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

export function computeATR(data: OHLCV[], period: number = 14): number[] {
  const result: number[] = [];
  const tr: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    let trValue = high - low;

    if (i > 0) {
      const prevClose = data[i - 1].close;
      trValue = Math.max(trValue, Math.abs(high - prevClose), Math.abs(low - prevClose));
    }
    tr.push(trValue);
  }

  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      const sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    } else {
      const prevATR = result[i - 1];
      const atr = (prevATR * (period - 1) + tr[i]) / period;
      result.push(atr);
    }
  }
  return result;
}

export function computeBollingerBands(
  data: OHLCV[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; mid: number[]; lower: number[] } {
  const mid = computeMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1).map((d) => d.close);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(mid[i] + stdDev * std);
      lower.push(mid[i] - stdDev * std);
    }
  }
  return { upper, mid, lower };
}

export function computeVWAP(data: OHLCV[]): number[] {
  const result: number[] = [];
  let cumPV = 0;
  let cumV = 0;

  for (let i = 0; i < data.length; i++) {
    const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
    cumPV += typicalPrice * data[i].volume;
    cumV += data[i].volume;
    result.push(cumV > 0 ? cumPV / cumV : NaN);
  }
  return result;
}

export function enrichBars(rawData: OHLCV[]): Bar[] {
  const ma50 = computeMA(rawData, 50);
  const ma200 = computeMA(rawData, 200);
  const rsi = computeRSI(rawData, 14);
  const atr = computeATR(rawData, 14);
  const bb = computeBollingerBands(rawData, 20, 2);
  const vwap = computeVWAP(rawData);

  return rawData.map((bar, i) => ({
    ...bar,
    ma50: ma50[i],
    ma200: ma200[i],
    rsi: rsi[i],
    bollingerUpper: bb.upper[i],
    bollingerMid: bb.mid[i],
    bollingerLower: bb.lower[i],
    vwap: vwap[i],
    atr: atr[i],
  }));
}

export function createMockData(symbol: string, startDate: Date, endDate: Date, daysCount: number = 252): MarketData {
  const bars: OHLCV[] = [];
  let currentDate = new Date(startDate);
  let currentPrice = symbol === "SPY" ? 380 : symbol === "QQQ" ? 380 : 40000;

  for (let i = 0; i < daysCount; i++) {
    if (currentDate > endDate) break;
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      const change = (Math.random() - 0.5) * 2;
      const open = currentPrice;
      const close = currentPrice * (1 + change / 100);
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      const volume = Math.floor(1000000 + Math.random() * 5000000);

      bars.push({
        timestamp: new Date(currentDate),
        open,
        high,
        low,
        close,
        volume,
      });

      currentPrice = close;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    symbol,
    bars: enrichBars(bars),
    startDate,
    endDate,
  };
}
