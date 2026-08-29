/**
 * Phase D Results Panel
 * Displays trading logs, summary, and statistics from tradingLogger.ts
 * Live updates every 5 seconds
 */

"use client";

import { usePhaseDLogs } from "@/lib/usePhaseDLogs";
import { useState } from "react";

export default function PhaseDResults() {
  const { trades, summary, paperStatus, autonomyEnabled, timestamp, loading, error } =
    usePhaseDLogs();
  const [expandedTrade, setExpandedTrade] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto"></div>
        <p className="text-gray-600 mt-4">Cargando resultados de Fase D...</p>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="bg-red-50 rounded-lg border border-red-200 p-6">
        <p className="text-red-900 font-semibold">Error cargando logs</p>
        <p className="text-red-700 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Fase D — Paper Trading</h2>
          <div className="flex gap-2">
            <div
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                paperStatus === "ACTIVE"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {paperStatus === "ACTIVE" ? "✅ PAPER ACTIVO" : "❌ NO DISPONIBLE"}
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                autonomyEnabled
                  ? "bg-orange-100 text-orange-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {autonomyEnabled ? "🔴 AUTONOMÍA ON" : "🟢 AUTONOMÍA OFF"}
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Actualizado: {new Date(timestamp).toLocaleTimeString("es-ES")}
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 uppercase font-semibold">Total Operaciones</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalTrades}</p>
            <p className="text-xs text-gray-500 mt-1">
              {summary.winnersCount} ✅ {summary.losersCount} ❌ {summary.breakEvenCount} ⚪
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 uppercase font-semibold">Win Rate</p>
            <p className={`text-3xl font-bold mt-2 ${
              summary.winRate >= 50 ? "text-green-600" : "text-red-600"
            }`}>
              {summary.winRate.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">{summary.winnersCount} ganadas</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 uppercase font-semibold">P&L Total</p>
            <p className={`text-3xl font-bold mt-2 ${
              summary.totalPnlDollars >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              ${summary.totalPnlDollars.toFixed(2)}
            </p>
            <p className={`text-xs mt-1 ${
              summary.totalPnlPercent >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {summary.totalPnlPercent >= 0 ? "+" : ""}{summary.totalPnlPercent.toFixed(2)}%
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 uppercase font-semibold">Últimas 5 ops</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{Math.min(trades.length, 5)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {trades.length === 0 ? "Sin operaciones" : "Registradas"}
            </p>
          </div>
        </div>
      )}

      {/* By Ticker Stats */}
      {summary && Object.keys(summary.byTicker).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Resultados por Ticker</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Ticker</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-900">Trades</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-900">Win Rate</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-900">P&L $</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-900">P&L %</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(summary.byTicker).map((ticker) => (
                  <tr key={ticker.ticker} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 font-semibold text-gray-900">{ticker.ticker}</td>
                    <td className="px-6 py-3 text-center text-gray-700">{ticker.trades}</td>
                    <td className={`px-6 py-3 text-center font-semibold ${
                      ticker.winRate >= 50 ? "text-green-600" : "text-red-600"
                    }`}>
                      {ticker.winRate.toFixed(1)}%
                    </td>
                    <td className={`px-6 py-3 text-right font-semibold ${
                      ticker.pnlDollars >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      ${ticker.pnlDollars.toFixed(2)}
                    </td>
                    <td className={`px-6 py-3 text-right font-semibold ${
                      ticker.pnlPercent >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {ticker.pnlPercent >= 0 ? "+" : ""}{ticker.pnlPercent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trades History */}
      {trades.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              Historial de Operaciones ({trades.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {trades.map((trade, idx) => (
              <div
                key={idx}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedTrade(expandedTrade === idx ? null : idx)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="font-semibold text-gray-900 min-w-fit">
                      {trade.ticker}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                      trade.decision === "CALL"
                        ? "bg-green-100 text-green-800"
                        : trade.decision === "PUT"
                          ? "bg-red-100 text-red-800"
                          : trade.decision === "WAIT"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                    }`}>
                      {trade.decision}
                    </div>
                    <div className="text-sm text-gray-600">{trade.time}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        ${trade.pnlDollars.toFixed(2)}
                      </p>
                      <p className={`text-xs ${
                        trade.result === "WIN"
                          ? "text-green-600"
                          : trade.result === "LOSS"
                            ? "text-red-600"
                            : "text-gray-600"
                      }`}>
                        {trade.result}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-semibold min-w-fit ${
                      trade.confidence >= 70
                        ? "bg-green-50 text-green-700"
                        : trade.confidence >= 50
                          ? "bg-blue-50 text-blue-700"
                          : "bg-gray-50 text-gray-700"
                    }`}>
                      {trade.confidence}%
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedTrade === idx && (
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">ENTRADA</p>
                      <p className="text-gray-900">${trade.entryPrice.toFixed(2)}</p>
                      <p className="text-xs text-gray-600">{trade.entryReason}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">SALIDA</p>
                      <p className="text-gray-900">${trade.exitPrice.toFixed(2)}</p>
                      <p className="text-xs text-gray-600">{trade.exitReason}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">RIESGO</p>
                      <p className="text-gray-900">S/L: ${trade.stopLoss.toFixed(2)}</p>
                      <p className="text-gray-900">T/P: ${trade.takeProfit.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">EJECUCIÓN</p>
                      <p className="text-gray-900">Slippage: {trade.slippageEntry.toFixed(4)}</p>
                      <p className="text-gray-900">Duración: {trade.duration}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-600 font-semibold">RAZONES TITO</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {trade.titoReasons.map((reason, i) => (
                          <span key={i} className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {trades.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-12 text-center border border-gray-200">
          <p className="text-gray-600 font-semibold">Sin operaciones registradas</p>
          <p className="text-sm text-gray-500 mt-1">
            Las operaciones de Paper Trading aparecerán aquí cuando se ejecuten.
          </p>
        </div>
      )}
    </div>
  );
}
