/**
 * TitoDecisionPanel — Displays real DecisionDetails from Tito Core v0.3.0
 * Integración CONGELADA: No changes to trading logic, rules, weights, or thresholds
 * Shows: status, confidence, razones, riskFactors, invalidationConditions, stopLoss, takeProfit
 */

import type { DecisionDetails } from "@/lib/tito-core/types";

interface TitoDecisionPanelProps {
  decision: DecisionDetails | null;
  ticker: string;
  loading?: boolean;
  error?: string | null;
}

export default function TitoDecisionPanel({
  decision,
  ticker,
  loading = false,
  error = null,
}: TitoDecisionPanelProps) {
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h3 className="font-semibold text-red-900">Error cargando Tito Core</h3>
        <p className="text-sm text-red-700 mt-1">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded">
        <p className="text-sm text-gray-600">Cargando decisión de Tito Core...</p>
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded">
        <p className="text-sm text-gray-600">Sin decisión disponible para {ticker}</p>
      </div>
    );
  }

  // Status colors
  const statusColors: Record<string, { bg: string; text: string; badge: string }> = {
    operar: {
      bg: "bg-green-50",
      text: "text-green-900",
      badge: "bg-green-200 text-green-900",
    },
    esperar: {
      bg: "bg-yellow-50",
      text: "text-yellow-900",
      badge: "bg-yellow-200 text-yellow-900",
    },
    "no operar": {
      bg: "bg-red-50",
      text: "text-red-900",
      badge: "bg-red-200 text-red-900",
    },
    "revisar manualmente": {
      bg: "bg-blue-50",
      text: "text-blue-900",
      badge: "bg-blue-200 text-blue-900",
    },
  };

  const colors = statusColors[decision.status] || statusColors["esperar"];

  return (
    <div className={`p-6 border border-gray-200 rounded-lg ${colors.bg}`}>
      {/* Header: Status + Confidence */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Decisión Tito Core</h3>
          <p className="text-sm text-gray-600 mt-1">v0.3.0 (Fase B Backtested)</p>
        </div>
        <div className="text-right">
          <div className={`inline-block px-3 py-1 rounded font-semibold text-sm ${colors.badge}`}>
            {decision.status.toUpperCase()}
          </div>
          <p className="text-3xl font-bold mt-2 text-gray-900">{decision.confidence}%</p>
          <p className="text-xs text-gray-600">Confianza</p>
        </div>
      </div>

      {/* Razones (Why) */}
      {decision.razones.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Por qué:</p>
          <ul className="list-disc list-inside space-y-1">
            {decision.razones.map((razon, i) => (
              <li key={i} className={`text-sm ${colors.text}`}>
                {razon}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Factors */}
      {decision.riskFactors.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Factores de Riesgo:</p>
          <ul className="space-y-1">
            {decision.riskFactors.map((factor, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start">
                <span className="mr-2">⚠️</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stop Loss & Take Profit */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="bg-white/50 p-3 rounded">
          <p className="text-xs text-gray-600 font-semibold">Stop Loss</p>
          <p className="text-lg font-semibold text-gray-900">
            {decision.stopLoss !== null ? `$${decision.stopLoss.toFixed(2)}` : "N/A"}
          </p>
        </div>
        <div className="bg-white/50 p-3 rounded">
          <p className="text-xs text-gray-600 font-semibold">Take Profit</p>
          <p className="text-lg font-semibold text-gray-900">
            {decision.takeProfit !== null ? `$${decision.takeProfit.toFixed(2)}` : "N/A"}
          </p>
        </div>
      </div>

      {/* Invalidation Conditions */}
      {decision.invalidationConditions.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Condiciones de Invalidación:</p>
          <ul className="space-y-1">
            {decision.invalidationConditions.map((cond, i) => (
              <li key={i} className="text-sm text-gray-700">
                • {cond}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer Disclaimer */}
      <div className="mt-4 pt-4 border-t border-gray-300/50 text-xs text-gray-600">
        <p>
          ⚠️ <strong>VIX Proxy:</strong> Las decisiones usan VIX como proxy (rolling volatility SPY), NO índice oficial CBOE.
        </p>
        <p className="mt-1">
          🔒 <strong>Arquitectura Congelada:</strong> Decisiones de Tito Core v0.3.0 sin cambios desde Fase B.
        </p>
      </div>
    </div>
  );
}
