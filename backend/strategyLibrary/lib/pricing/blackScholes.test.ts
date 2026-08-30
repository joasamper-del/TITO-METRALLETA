import { describe, it, expect } from "vitest";
import { bsPrice, bsDelta, bsGamma, normCdf, bsVega, bsTheta } from "./blackScholes";

describe("Black-Scholes", () => {
  it("normCdf should return value between 0 and 1", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 1);
    expect(normCdf(1)).toBeGreaterThan(0.8);
    expect(normCdf(-1)).toBeLessThan(0.2);
  });

  it("bsPrice should calculate call and put prices", () => {
    const S = 100, K = 100, T = 0.25, r = 0.05, sigma = 0.2;
    const prices = bsPrice(S, K, T, r, sigma);
    expect(prices.call).toBeGreaterThan(0);
    expect(prices.put).toBeGreaterThan(0);
    expect(prices.call + K * Math.exp(-r * T)).toBeCloseTo(prices.put + S, 1);
  });

  it("bsDelta should be between -1 and 1", () => {
    const delta = bsDelta(100, 100, 0.25, 0.05, 0.2, "call");
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(1);
  });

  it("bsGamma should be positive", () => {
    const gamma = bsGamma(100, 100, 0.25, 0.05, 0.2);
    expect(gamma).toBeGreaterThan(0);
  });

  it("bsVega should be positive", () => {
    const vega = bsVega(100, 100, 0.25, 0.05, 0.2);
    expect(vega).toBeGreaterThan(0);
  });

  it("bsTheta should be negative for long call", () => {
    const theta = bsTheta(100, 100, 0.25, 0.05, 0.2, "call");
    expect(theta).toBeLessThan(0);
  });
});
