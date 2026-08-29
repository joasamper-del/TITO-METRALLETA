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
import { useOperativePipeline } from "@/lib/useOperativePipeline";
import TitoDecisionPanel from "@/app/components/TitoDecisionPanel";

export default function StrategyPage() {
  const [ticker, setTicker] = useState<string>("SPY");
  const [spot, setSpot] = useState<number>(450);
  const [iv, setIv] = useState<number>(25);
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [trend, setTrend] = useState<"alcista" | "bajista" | "lateral">("alcista");
  const [mode, setMode] = useState<"manual" | "operative">("manual");

  // Datos operativos reales del pipeline
  const { data: operativeData, loading: opLoading, error: opError } = useOperativePipeline(
    mode === "operative" ? ticker : null,
    direction
  );

  // Modo operativo: usar datos del pipeline
  const activeSpot = mode === "operative" && operativeData?.price?.value ? operativeData.price.value : spot;
  const activeIv = mode === "operative" && operativeData?.volatility?.value ? operativeData.volatility.value : iv;
  const activeTrend =
    mode === "operative" && operativeData?.trend?.value ? operativeData.trend.value : trend;

  // Hook de Tito Core (usa parámetros activos según modo)
  const { decision, loading: coreLoading, error: coreError } = useTitoDecision(
    ticker,
    activeSpot,
    activeIv,
    activeTrend,
    direction
  );

  const loading = coreLoading || (mode === "operative" && opLoading);

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

        {/* Datos Operativos Reales (Modo Operativo) */}
        {mode === "operative" && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">📊 Datos del Pipeline (Operativo)</h2>

            {opError && (
              <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
                <p className="text-sm text-red-700">⚠️ {opError}</p>
              </div>
            )}

            {operativeData && !opLoading && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Precio */}
                {operativeData.price && (
                  <div className="bg-white rounded p-3 border border-blue-100">
                    <div className="text-xs text-gray-500">Precio</div>
                    <div className="font-semibold text-lg">${operativeData.price.value?.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {operativeData.price.source} • {new Date(operativeData.price.ts).toLocaleTimeString()}
                    </div>
                  </div>
                )}

                {/* Tendencia */}
                {operativeData.trend && (
                  <div className="bg-white rounded p-3 border border-blue-100">
                    <div className="text-xs text-gray-500">Tendencia</div>
                    <div className="font-semibold text-lg">
                      {operativeData.trend.value === "alcista" && "📈 Alcista"}
                      {operativeData.trend.value === "bajista" && "📉 Bajista"}
                      {operativeData.trend.value === "lateral" && "➡️ Lateral"}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {operativeData.trend.source} • {new Date(operativeData.trend.ts).toLocaleTimeString()}
                    </div>
                  </div>
                )}

                {/* Volatilidad */}
                {operativeData.volatility && (
                  <div className="bg-white rounded p-3 border border-blue-100">
                    <div className="text-xs text-gray-500">Volatilidad</div>
                    <div className="font-semibold text-lg">{operativeData.volatility.value?.toFixed(1)}%</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {operativeData.volatility.source} • {new Date(operativeData.volatility.ts).toLocaleTimeString()}
                    </div>
                  </div>
                )}

                {/* Volumen */}
                {operativeData.volume && (
                  <div className="bg-white rounded p-3 border border-blue-100">
                    <div className="text-xs text-gray-500">Volumen</div>
                    <div className="font-semibold text-lg">
                      {operativeData.volume.value && operativeData.volume.value > 1000000
                        ? `${(operativeData.volume.value / 1000000).toFixed(1)}M`
                        : `${(operativeData.volume.value || 0) / 1000}K`}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {operativeData.volume.source} • {new Date(operativeData.volume.ts).toLocaleTimeString()}
                    </div>
                  </div>
                )}

                {/* Liquidez */}
                {operativeData.liquidity && (
                  <div className="bg-white rounded p-3 border border-blue-100">
                    <div className="text-xs text-gray-500">Liquidez (Spread)</div>
                    <div className="font-semibold text-lg">{operativeData.liquidity.value}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {operativeData.liquidity.source} • {new Date(operativeData.liquidity.ts).toLocaleTimeString()}
                    </div>
                  </div>
                )}

                {/* Patrón */}
                {operativeData.pattern && (
                  <div className="bg-white rounded p-3 border border-blue-100">
                    <div className="text-xs text-gray-500">Patrón</div>
                    <div className="font-semibold text-sm">{operativeData.pattern.value}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {operativeData.pattern.source} • {new Date(operativeData.pattern.ts).toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {opLoading && <p className="text-sm text-blue-600">⏳ Cargando datos del pipeline...</p>}

            {/* Indicador de calidad */}
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="text-xs">
                <span className="font-semibold">Calidad de datos: </span>
                <span
                  className={
                    operativeData?.dataQuality === "alta"
                      ? "text-green-600 font-semibold"
                      : operativeData?.dataQuality === "media"
                        ? "text-yellow-600 font-semibold"
                        : "text-red-600 font-semibold"
                  }
                >
                  {operativeData?.dataQuality === "alta" && "✅ Alta"}
                  {operativeData?.dataQuality === "media" && "⚠️ Media"}
                  {operativeData?.dataQuality === "baja" && "❌ Baja"}
                </span>
              </div>
              {operativeData?.failSafeReason && (
                <div className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">
                  🚫 {operativeData.failSafeReason}
                </div>
              )}
            </div>
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
            error={coreError || (mode === "operative" ? opError : null)}
          />
        </div>

        {/* Info Panel */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Parámetros actuales */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Entrada {mode === "operative" ? "(Pipeline)" : "(Manual)"}
            </h3>
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
                <dd className="font-medium">
                  ${activeSpot.toFixed(2)}
                  {mode === "operative" && operativeData?.price && (
                    <span className="text-xs text-blue-600 ml-1">(Pipeline)</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">IV:</dt>
                <dd className="font-medium">
                  {activeIv.toFixed(1)}%
                  {mode === "operative" && operativeData?.volatility && (
                    <span className="text-xs text-blue-600 ml-1">(Pipeline)</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Tendencia:</dt>
                <dd className="font-medium">
                  {activeTrend}
                  {mode === "operative" && operativeData?.trend && (
                    <span className="text-xs text-blue-600 ml-1">(Pipeline)</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Estado Tito Core */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Estado Tito Core</h3>
            {loading && (
              <p className="text-sm text-gray-600">⏳ Cargando decisión...</p>
            )}
            {coreError && (
              <p className="text-sm text-red-600">❌ Error: {coreError}</p>
            )}
            {decision && !loading && !coreError && (
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
                input: { ticker, spot: activeSpot, iv: activeIv, direction, trend: activeTrend },
                decision: decision ? {
                  status: decision.status,
                  confidence: decision.confidence,
                } : null,
                loading,
                coreError,
                operativeError: mode === "operative" ? opError : null,
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
