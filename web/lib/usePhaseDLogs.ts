/**
 * Hook to fetch and display Phase D trading logs
 * Reads real trade records from tradingLogger.ts
 */

import { useState, useEffect } from "react";

export interface TradeRecord {
  timestamp: string;
  date: string;
  time: string;
  ticker: string;
  decision: "CALL" | "PUT" | "WAIT" | "NO TRADE";
  confidence: number;
  entryReason: string;
  entryPrice: number;
  entryTime: string;
  stopLoss: number;
  takeProfit: number;
  exitPrice: number;
  exitTime: string;
  exitReason: string;
  slippageEntry: number;
  slippageExit: number;
  duration: string;
  pnlDollars: number;
  pnlPercent: number;
  result: "WIN" | "LOSS" | "BREAK_EVEN";
  titoReasons: string[];
  titoValidation: string;
}

export interface TickerStats {
  ticker: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  pnlDollars: number;
  pnlPercent: number;
}

export interface TradingSummary {
  date: string;
  totalTrades: number;
  winnersCount: number;
  losersCount: number;
  breakEvenCount: number;
  winRate: number;
  totalPnlDollars: number;
  totalPnlPercent: number;
  byTicker: Record<string, TickerStats>;
  lastUpdate: string;
}

export interface PhaseDLogsData {
  trades: TradeRecord[];
  summary: TradingSummary | null;
  timestamp: string;
  paperStatus: string;
  autonomyEnabled: boolean;
  loading: boolean;
  error: string | null;
}

export function usePhaseDLogs() {
  const [data, setData] = useState<PhaseDLogsData>({
    trades: [],
    summary: null,
    timestamp: new Date().toISOString(),
    paperStatus: "ACTIVE",
    autonomyEnabled: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setData((prev) => ({ ...prev, loading: true, error: null }));
        const response = await fetch("/api/phase-d/logs");

        if (!response.ok) {
          throw new Error(`Failed to fetch logs: ${response.statusText}`);
        }

        const result = await response.json();
        setData({
          trades: result.trades || [],
          summary: result.summary || null,
          timestamp: result.timestamp,
          paperStatus: result.paperStatus || "ACTIVE",
          autonomyEnabled: result.autonomyEnabled || false,
          loading: false,
          error: null,
        });
      } catch (err: any) {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: err.message,
        }));
      }
    };

    fetchLogs();

    // Refresh every 5 seconds
    const interval = setInterval(fetchLogs, 5000);

    return () => clearInterval(interval);
  }, []);

  return data;
}
