/**
 * Metrics Calculator
 * Computes performance statistics from trades
 */

import { Trade } from "./types";

export function calculateStats(trades: Trade[]) {
  const completedTrades = trades.filter((t) => t.pnl !== undefined);

  if (completedTrades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      avgWin: 0,
      avgLoss: 0,
      maxWin: 0,
      maxLoss: 0,
      maxDrawdown: 0,
      drawdownDuration: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
    };
  }

  const pnls = completedTrades.map((t) => t.pnl!);
  const pnlPercents = completedTrades.map((t) => t.pnlPercent!);

  const winningTrades = pnls.filter((p) => p > 0);
  const losingTrades = pnls.filter((p) => p < 0);

  const totalPnL = pnls.reduce((a, b) => a + b, 0);
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((a, b) => a + b, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((a, b) => a + b, 0) / losingTrades.length : 0;
  const maxWin = Math.max(...pnls, 0);
  const maxLoss = Math.min(...pnls, 0);

  const grossProfit = winningTrades.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losingTrades.reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

  const winRate = (winningTrades.length / completedTrades.length) * 100;

  // Max Drawdown & Duration
  let maxDD = 0;
  let ddStart = 0;
  let ddDuration = 0;
  let peak = 0;

  let runningPnL = 0;
  for (let i = 0; i < pnls.length; i++) {
    runningPnL += pnls[i];
    if (runningPnL > peak) {
      peak = runningPnL;
      ddStart = i;
    }
    const dd = peak - runningPnL;
    if (dd > maxDD) {
      maxDD = dd;
      ddDuration = i - ddStart;
    }
  }

  const maxDrawdown = peak > 0 ? (maxDD / peak) * 100 : 0;

  // Sharpe Ratio (assuming 252 trading days, 0% risk-free rate)
  const meanReturn = pnlPercents.reduce((a, b) => a + b, 0) / pnlPercents.length;
  const variance = pnlPercents.reduce((acc, val) => acc + Math.pow(val - meanReturn, 2), 0) / pnlPercents.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

  // Sortino Ratio (only downside deviation)
  const downsideReturns = pnlPercents.filter((r) => r < 0);
  const downsideVariance =
    downsideReturns.length > 0
      ? downsideReturns.reduce((acc, val) => acc + Math.pow(val, 2), 0) / pnlPercents.length
      : 0;
  const downsideStdDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideStdDev > 0 ? (meanReturn / downsideStdDev) * Math.sqrt(252) : 0;

  return {
    totalTrades: completedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    totalPnL,
    totalPnLPercent: (totalPnL / 10000) * 100, // Assuming 10k starting capital
    avgWin,
    avgLoss,
    maxWin,
    maxLoss,
    maxDrawdown,
    drawdownDuration: ddDuration,
    profitFactor,
    sharpeRatio,
    sortinoRatio,
  };
}

export function validateStats(stats: ReturnType<typeof calculateStats>): string[] {
  const issues: string[] = [];

  if (stats.totalTrades === 0) {
    issues.push("No completed trades");
  }

  if (stats.winRate < 30) {
    issues.push(`Low win rate: ${stats.winRate.toFixed(1)}%`);
  }

  if (stats.maxDrawdown > 50) {
    issues.push(`High max drawdown: ${stats.maxDrawdown.toFixed(1)}%`);
  }

  if (stats.profitFactor < 1.5) {
    issues.push(`Low profit factor: ${stats.profitFactor.toFixed(2)}`);
  }

  if (stats.sharpeRatio < 1.0) {
    issues.push(`Low Sharpe ratio: ${stats.sharpeRatio.toFixed(2)}`);
  }

  return issues;
}
