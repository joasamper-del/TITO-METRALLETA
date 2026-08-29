/**
 * Tito Core Demo — Página para validar integración de Tito Core v0.3.0
 * Muestra decisiones REALES sin simulación
 * CONGELADO: Arquitectura sin cambios
 */

"use client";

import { useState } from "react";
import { useTitoDecision } from "@/lib/useTitoDecision";
import TitoDecisionPanel from "@/app/components/TitoDecisionPanel";

export default function TitoCoreDemo() {
  const [ticker, setTicker] = useState<string>("SPY");
  const [spot, setSpot] = useState<number>(450);
  const [iv, setIv] = useState<number>(25);
  const [trend, setTrend] = useState<"alcista" | "bajista" | "lateral">("alcista");

  const { decision, loading, error } = useTitoDecision(ticker, spot, iv, trend);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Tito Core v0.3.0 — Demo</h1>
          <p className="text-lg text-gray-600 mt-2">Validación de integración — Fase B Backtested</p>
          <p className="text-sm text-gray-500 mt-1">Arquitectura congelada • Sin cambios a reglas/pesos/umbrales</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Parámetros de Entrada</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Ticker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ticker</label>
              <select
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SPY">SPY</option>
                <option value="QQQ">QQQ</option>
                <option value="IWM">IWM</option>
              </select>
            </div>

            {/* Spot Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Spot Price: ${spot}</label>
              <input
                type="range"
                min="100"
                max="600"
                step="1"
                value={spot}
                onChange={(e) => setSpot(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* IV */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IV (VIX Proxy): {iv}%</label>
              <input
                type="range"
                min="5"
                max="80"
                step="1"
                value={iv}
                onChange={(e) => setIv(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Trend */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trend</label>
              <select
                value={trend}
                onChange={(e) => setTrend(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="alcista">Alcista ↑</option>
                <option value="lateral">Lateral →</option>
                <option value="bajista">Bajista ↓</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 rounded">
            💡 Adjust these inputs to see real Tito Core decisions change in real-time.
          </p>
        </div>

        {/* Decision Output */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Decisión de Tito Core (REAL)</h2>
          <TitoDecisionPanel
            decision={decision}
            ticker={ticker}
            loading={loading}
            error={error}
          />
        </div>

        {/* Debug Info */}
        <div className="bg-gray-100 rounded-lg border border-gray-300 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Debug Info</h3>
          <pre className="text-xs text-gray-700 overflow-auto max-h-48">
            {JSON.stringify(
              {
                input: { ticker, spot, iv, trend },
                output: decision,
                loading,
                error,
              },
              null,
              2
            )}
          </pre>
        </div>

        {/* Disclaimers */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-900">
            <strong>⚠️ VIX Proxy:</strong> Las decisiones usan VIX como proxy (rolling volatility SPY), NO índice oficial
            CBOE.
          </p>
          <p className="text-sm text-yellow-900 mt-2">
            <strong>🔒 Congelado:</strong> Tito Core v0.3.0 — Arquitectura y lógica congeladas desde Fase B. No se han
            realizado cambios.
          </p>
        </div>
      </div>
    </div>
  );
}
