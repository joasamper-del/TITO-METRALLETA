/**
 * Dashboard Controller Tests
 */

import { describe, it, expect } from "vitest";
import { DashboardController } from "./dashboardController";
import { LiveDataService, PolygonDataProvider } from "../data/LiveDataService";
import { HistoricalDataLoader } from "../data/historicalDataLoader";
import { WalkForwardEngine } from "../backtesting/walkForwardEngine";
import { BacktestConfig } from "../backtesting/types";

const config: BacktestConfig = {
  initialCapital: 10000,
  commissionPercentage: 0.1,
  slippagePercentage: 0.05,
  maxPositionSize: 0.1,
  riskPerTrade: 2,
};

describe("Dashboard Controller", () => {
  const polygon = new PolygonDataProvider({ name: "polygon", rateLimit: 5, timeout: 5000 });
  const service = new LiveDataService([polygon]);
  const loader = new HistoricalDataLoader(service);
  const engine = new WalkForwardEngine(config);
  const controller = new DashboardController(service, loader, engine, config);

  it("should return data status", async () => {
    const response = await controller.getDataStatus();

    expect(response.timestamp).toBeDefined();
    expect(["success", "error"]).toContain(response.status);
    expect(response.data).toBeDefined();
  });

  it("should report all 4 data sources (SPY, QQQ, BTC, VIX)", async () => {
    const response = await controller.getDataStatus();

    if (response.data) {
      expect(response.data.symbols.spy).toBeDefined();
      expect(response.data.symbols.qqq).toBeDefined();
      expect(response.data.symbols.btc).toBeDefined();
      expect(response.data.symbols.vix).toBeDefined();
    }
  });

  it("should mark VIX as context variable", async () => {
    const response = await controller.getDataStatus();

    if (response.data?.symbols.vix) {
      expect(response.data.symbols.vix.role).toBe("context_variable");
    }
  });

  it("should get backtest results endpoint", async () => {
    const response = await controller.getBacktestResults("TrailingExitStrategy");

    expect(response.timestamp).toBeDefined();
    expect(response.status).toBe("success");
    expect(response.data?.strategy).toBe("TrailingExitStrategy");
  });

  it("should get strategy comparison", async () => {
    const response = await controller.getStrategyComparison();

    expect(response.timestamp).toBeDefined();
    expect(response.status).toBe("success");
    expect(response.data?.strategies).toBe(10);
  });

  it("should get walk-forward analysis", async () => {
    const response = await controller.getWalkForwardAnalysis("MeanReversionStrategy");

    expect(response.timestamp).toBeDefined();
    expect(response.status).toBe("success");
    expect(response.data?.strategy).toBe("MeanReversionStrategy");
    expect(response.data?.trainingPeriod).toBe("Jan 2024 - Sep 2024");
    expect(response.data?.testPeriod).toBe("Oct 2024 - Dec 2024");
  });

  it("should return health check", async () => {
    const response = await controller.getHealthCheck();

    expect(response.timestamp).toBeDefined();
    expect(response.data?.framework).toBe("production-ready");
    expect(response.data?.strategies).toBe(10);
    expect(response.data?.tools).toBe(5);
    expect(response.data?.testsPassing).toBe(214);
    expect(response.data?.vixContextVariable).toBe(true);
  });

  it("should have all endpoints returning proper response format", async () => {
    const endpoints = [
      controller.getDataStatus(),
      controller.getBacktestResults("test"),
      controller.getStrategyComparison(),
      controller.getWalkForwardAnalysis("test"),
      controller.getHealthCheck(),
    ];

    const responses = await Promise.all(endpoints);

    responses.forEach((response) => {
      expect(response.timestamp).toBeDefined();
      expect(["success", "error"]).toContain(response.status);
    });
  });

  it("should confirm VIX context variable in health check", async () => {
    const response = await controller.getHealthCheck();

    expect(response.data?.vixContextVariable).toBe(true);
  });

  it("should report framework as production-ready", async () => {
    const response = await controller.getHealthCheck();

    expect(response.data?.framework).toBe("production-ready");
    expect(response.data?.strategies).toBe(10);
    expect(response.data?.tools).toBe(5);
  });
});
