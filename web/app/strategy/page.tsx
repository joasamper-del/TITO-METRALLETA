/**
 * ESTRATEGIA — Dashboard de decisiones Tito Core
 * Sesión 24-25: Integra TitoDecisionPanel.tsx
 * Entrada manual (debug) + Modo operativo (datos reales pipeline)
 * CONGELADO: Tito Core v0.3.0 sin cambios
 */

"use client";

import { useEffect, useState } from "react";
import type { DecisionDetails } from "@/lib/tito-core/types";
import { useTitoDecision } from "@/lib/useTitoDecision";
import TitoDecisionPanel from "@/app/components/TitoDecisionPanel";

export default function StrategyPage() {
  const [ticker, setTicker] = useState<string>("SPY");
  const [spot, setSpot] = useState<number>(450);
  const [iv, setIv] = useState<number>(25);
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [trend, setTrend] = useState<"alcista" | "bajista" | "lateral">("alcista");
  const [mode, setMode] = useState<"manual" | "operative">("manual");

  // Hook de Tito Core
  const { decision, loading, error } = useTitoDecision(ticker, spot, iv, trend, direction);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">🎲 Estrategia</h1>
          <p className="text-lg text-gray-600 mt-2">Dashboard de decisiones — Tito Core v0.3.0</p>
          <p className="text-sm text-gray-500 mt-1">
            Arquitectura congelada • Entrada manual (debug) + Modo operativo (datos reales)
          </p>
        </div>

        {/* Modo selector */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="manual"
                checked={mode === "manual"}
                onChange={(e) => setMode(e.target.value as "manual" | "operative")}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Manual (Debug)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="operative"
                checked={mode === "operative"}
                onChange={(e) => setMode(e.target.value as "manual" | "operative")}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Operativo (Datos Reales)</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {mode === "manual"
              ? "Entrada manual de parámetros para pruebas"
              : "Consumirá datos reales del pipeline de Tito (cuando estén disponibles)"}
          </p>
        </div>

        {/* Controles Manual */}
        {mode === "manual" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Parámetros de Entrada</h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Ticker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Símbolo</label>
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="SPY, QQQ, BTC..."
                />
              </div>

              {/* Spot */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spot: ${spot.toFixed(2)}
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IV (Volatilidad): {iv.toFixed(1)}%
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Tendencia</label>
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

              {/* Direction */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección de Trading
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDirection("LONG")}
                    className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                      direction === "LONG"
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    🔵 LONG (Compra)
                  </button>
                  <button
                    onClick={() => setDirection("SHORT")}
                    className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                      direction === "SHORT"
                        ? "bg-red-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    🔴 SHORT (Venta)
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 rounded">
              💡 Ajusta estos parámetros para ver las decisiones de Tito Core cambiar en tiempo real.
            </p>
          </div>
        )}

        {/* Decision Panel */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Decisión Tito Core {mode === "operative" && "(Datos Reales)"}
          </h2>
          <TitoDecisionPanel
            decision={decision}
            ticker={ticker}
            loading={loading}
            error={error}
          />
        </div>

        {/* Info Panel */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Parámetros actuales */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Entrada Actual</h3>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Símbolo:</dt>
                <dd className="font-medium">{ticker}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Dirección:</dt>
                <dd className="font-medium">{direction}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Spot:</dt>
                <dd className="font-medium">${spot.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">IV:</dt>
                <dd className="font-medium">{iv.toFixed(1)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Tendencia:</dt>
                <dd className="font-medium">{trend}</dd>
              </div>
            </dl>
          </div>

          {/* Estado Tito Core */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Estado Tito Core</h3>
            {loading && (
              <p className="text-sm text-gray-600">⏳ Cargando decisión...</p>
            )}
            {error && (
              <p className="text-sm text-red-600">❌ Error: {error}</p>
            )}
            {decision && !loading && !error && (
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Decisión:</dt>
                  <dd className="font-bold">
                    {decision.status === "operar" && "✅ OPERAR"}
                    {decision.status === "esperar" && "⏸️ ESPERAR"}
                    {decision.status === "no operar" && "❌ NO OPERAR"}
                    {decision.status === "revisar manualmente" && "🔍 REVISAR MANUALMENTE"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Confianza:</dt>
                  <dd className="font-medium">{decision.confidence}%</dd>
                </div>
              </dl>
            )}
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-gray-100 rounded-lg border border-gray-300 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Debug Info (Development Only)</h3>
          <pre className="text-xs text-gray-700 overflow-auto max-h-48 bg-white p-2 rounded border border-gray-200">
            {JSON.stringify(
              {
                mode,
                input: { ticker, spot, iv, direction, trend },
                decision: decision ? {
                  status: decision.status,
                  confidence: decision.confidence,
                } : null,
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
            <strong>⚠️ Modo Debug:</strong> Los parámetros son entrada manual. En modo operativo, Tito consumirá datos reales del pipeline.
          </p>
          <p className="text-sm text-yellow-900 mt-2">
            <strong>🔒 Congelado:</strong> Tito Core v0.3.0 — Arquitectura y lógica congeladas. No se han realizado cambios.
          </p>
          <p className="text-sm text-yellow-900 mt-2">
            <strong>🚫 Autonomía OFF:</strong> No se ejecutarán órdenes. Modo visualización únicamente.
          </p>
        </div>
      </div>
    </div>
  );
}
