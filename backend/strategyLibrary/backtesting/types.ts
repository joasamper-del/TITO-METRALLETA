/**
 * Backtesting Types & Interfaces
 */

export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Bar extends OHLCV {
  ma50?: number;
  ma200?: number;
  rsi?: number;
  supertrend?: number;
  bollingerUpper?: number;
  bollingerLower?: number;
  bollingerMid?: number;
  vwap?: number;
  atr?: number;
}

export interface BacktestConfig {
  initialCapital: number;
  commissionPercentage: number;
  slippagePercentage: number;
  maxPositionSize: number;
  riskPerTrade: number;
}

export interface Trade {
  entryDate: Date;
  entryPrice: number;
  entrySize: number;
  exitDate?: Date;
  exitPrice?: number;
  exitReason?: "SL" | "TP" | "Trailing" | "Expiration" | "Manual";
  pnl?: number;
  pnlPercent?: number;
  maxProfit?: number;
  maxLoss?: number;
  strategy: string;
  symbol: string;
}

export interface BacktestResult {
  trades: Trade[];
  stats: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnL: number;
    totalPnLPercent: number;
    avgWin: number;
    avgLoss: number;
    maxWin: number;
    maxLoss: number;
    maxDrawdown: number;
    drawdownDuration: number;
    profitFactor: number;
    sharpeRatio: number;
    sortinoRatio: number;
  };
}

export interface MarketData {
  symbol: string;
  bars: Bar[];
  startDate: Date;
  endDate: Date;
}
