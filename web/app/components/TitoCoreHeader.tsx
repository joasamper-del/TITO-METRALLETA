/**
 * TitoCoreHeader — Sección Tito Core en dashboard principal
 * AISLADO: No toca código existente, solo agrega información
 * Muestra decisión actual de Tito v0.3.0 (congelada, real)
 */

"use client";

import { useState, useEffect } from "react";
import { useTitoDecision } from "@/lib/useTitoDecision";
import TitoDecisionPanel from "./TitoDecisionPanel";

interface TitoCoreHeaderProps {
  ticker: string | null;
  spot: number | null;
  iv: number | null;
  compact?: boolean;
}

export default function TitoCoreHeader({
  ticker,
  spot,
  iv,
  compact = false,
}: TitoCoreHeaderProps) {
  const { decision, loading, error } = useTitoDecision(ticker, spot, iv);

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-3 mb-4 rounded">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-900">Tito Core v0.3.0</p>
            <p className="text-sm font-bold text-gray-900 mt-1">
              {decision?.status.toUpperCase() || "—"} • {decision?.confidence}%
            </p>
          </div>
          {decision?.razones[0] && (
            <p className="text-xs text-gray-600 max-w-xs text-right">{decision.razones[0]}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">🤖</div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tito Core v0.3.0</h2>
          <p className="text-xs text-gray-600">Decisión REAL • Fase B Backtested</p>
        </div>
      </div>

      {ticker && spot && iv ? (
        <TitoDecisionPanel
          decision={decision}
          ticker={ticker}
          loading={loading}
          error={error}
        />
      ) : (
        <div className="text-center py-4 text-gray-600">
          <p className="text-sm">Selecciona un ticker para ver decisión de Tito Core</p>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-600 p-2 bg-white/50 rounded border border-blue-100">
        <p>
          ⚠️ <strong>Disclaimer:</strong> VIX es proxy. Arquitectura congelada. Decisiones 100% reproducibles.
        </p>
      </div>
    </div>
  );
}
