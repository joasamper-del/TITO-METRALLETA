"use client";

import React, { useState, useEffect } from "react";

interface MarketRegime {
  classification: "BULLISH" | "BEARISH" | "SIDEWAYS";
  direction: "LONG" | "WAIT" | "NO TRADE";
  confidence: number;
  reasons: string[];
  invalidation: string;
  riskMultiplier: number;
}

interface CryptoAnalysisData {
  symbol: string;
  currentPrice: number;
  regime: MarketRegime;
  analysis: {
    signal: "BUY" | "WAIT" | "SELL";
    entry?: number;
    stopLoss?: number;
    takeProfit?: number;
    recommendedSize?: number;
  };
  timestamp: string;
}

const regimeColors: Record<string, { bg: string; text: string; border: string }> = {
  BULLISH: { bg: "bg-green-50", text: "text-green-900", border: "border-green-300" },
  BEARISH: { bg: "bg-red-50", text: "text-red-900", border: "border-red-300" },
  SIDEWAYS: { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-300" },
};

const directionColors: Record<string, string> = {
  LONG: "bg-green-200 text-green-900",
  WAIT: "bg-amber-200 text-amber-900",
  "NO TRADE": "bg-gray-200 text-gray-900",
};

const signalColors: Record<string, string> = {
  BUY: "bg-green-500 text-white",
  WAIT: "bg-amber-500 text-white",
  SELL: "bg-red-500 text-white",
};

export function CryptoAnalysis() {
  const [data, setData] = useState<CryptoAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegimeAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/crypto/regime");

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const analysisData = await response.json();
      setData(analysisData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching analysis");
      console.error("Regime analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegimeAnalysis();
    const interval = setInterval(fetchRegimeAnalysis, 10000); // Actualizar cada 10s

    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="bg-blue-50 border border-blue-300 rounded-lg p-6">
        <p className="text-blue-900">📊 Cargando análisis de régimen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 rounded-lg p-6">
        <p className="text-red-900">⚠️ Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
        <p className="text-gray-900">📊 Sin datos disponibles</p>
      </div>
    );
  }

  const colors = regimeColors[data.regime.classification];

  return (
    <div className={`${colors.bg} border-2 ${colors.border} rounded-lg p-6 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`text-2xl font-bold ${colors.text}`}>
          📈 Análisis de Régimen: {data.symbol}
        </h3>
        <span className="text-sm text-gray-600">
          Actualizado: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Precio actual */}
      <div className={`${colors.bg} rounded border ${colors.border} p-4`}>
        <p className={`text-sm ${colors.text} font-semibold`}>Precio Actual</p>
        <p className={`text-3xl font-bold ${colors.text}`}>${data.currentPrice.toFixed(2)}</p>
      </div>

      {/* Régimen y dirección */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded border border-gray-300 p-4">
          <p className={`text-sm ${colors.text} font-semibold`}>Régimen de Mercado</p>
          <p className={`text-2xl font-bold ${colors.text}`}>{data.regime.classification}</p>
        </div>
        <div className="bg-white rounded border border-gray-300 p-4">
          <p className={`text-sm ${colors.text} font-semibold`}>Dirección</p>
          <span className={`inline-block px-3 py-1 rounded font-bold ${directionColors[data.regime.direction]}`}>
            {data.regime.direction}
          </span>
        </div>
      </div>

      {/* Confianza y multiplicador de riesgo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded border border-gray-300 p-4">
          <p className={`text-sm ${colors.text} font-semibold`}>Confianza</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-bold ${colors.text}`}>{data.regime.confidence.toFixed(0)}%</p>
            <div className="flex-1 bg-gray-300 rounded-full h-2">
              <div
                className={`h-full rounded-full ${
                  data.regime.classification === "BULLISH"
                    ? "bg-green-500"
                    : data.regime.classification === "BEARISH"
                      ? "bg-red-500"
                      : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(data.regime.confidence, 100)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="bg-white rounded border border-gray-300 p-4">
          <p className={`text-sm ${colors.text} font-semibold`}>Multiplicador de Riesgo</p>
          <p className={`text-2xl font-bold ${colors.text}`}>{data.regime.riskMultiplier.toFixed(1)}x</p>
          <p className="text-xs text-gray-600">
            {data.regime.riskMultiplier === 1.0 && "Tamaño completo"}
            {data.regime.riskMultiplier === 0.5 && "50% del tamaño"}
            {data.regime.riskMultiplier === 0.7 && "70% del tamaño"}
          </p>
        </div>
      </div>

      {/* Razones del régimen */}
      <div className="bg-white rounded border border-gray-300 p-4">
        <p className={`text-sm ${colors.text} font-semibold mb-2`}>Razones del Régimen</p>
        <ul className="space-y-1">
          {data.regime.reasons.map((reason, idx) => (
            <li key={idx} className={`text-sm ${colors.text} flex items-start gap-2`}>
              <span className="mt-1">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Invalidación */}
      <div className="bg-white rounded border border-gray-300 p-4">
        <p className={`text-sm ${colors.text} font-semibold mb-1`}>Nivel de Invalidación</p>
        <p className={`text-sm ${colors.text}`}>{data.regime.invalidation}</p>
      </div>

      {/* Señal de trading */}
      <div className="bg-white rounded border border-gray-300 p-4">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${colors.text} font-semibold`}>Señal de Trading</span>
          <span className={`px-4 py-2 rounded font-bold ${signalColors[data.analysis.signal]}`}>
            {data.analysis.signal}
          </span>
        </div>
      </div>

      {/* Análisis de entrada */}
      {data.analysis.entry && (
        <div className="bg-white rounded border border-gray-300 p-4">
          <p className={`text-sm ${colors.text} font-semibold mb-3`}>Parámetros Sugeridos</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-gray-600">Entry</p>
              <p className={`font-bold ${colors.text}`}>${data.analysis.entry.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">Stop Loss (-3%)</p>
              <p className={`font-bold ${colors.text}`}>${data.analysis.stopLoss?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">Take Profit (+5%)</p>
              <p className={`font-bold ${colors.text}`}>${data.analysis.takeProfit?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">Tamaño Recomendado</p>
              <p className={`font-bold ${colors.text}`}>${data.analysis.recommendedSize?.toFixed(0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-600 text-center pt-2">
        ✅ Análisis realizado en dry-run. No se ejecutan operaciones automáticamente.
      </div>
    </div>
  );
}
