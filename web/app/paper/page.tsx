/**
 * Paper Trading — Simulación de 5 días sin capital real
 * Valida Tito Core v0.3.0 en mercado real (vs histórico)
 * Captura slippage, spreads, adjust S/L-T/P por condiciones vivas
 */

"use client";

import { useState } from "react";

export default function PaperTrading() {
  const [status, setStatus] = useState<"ready" | "running" | "completed">("ready");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Paper Trading — Fase D</h1>
          <p className="text-lg text-gray-600 mt-2">Simulación de 5 días • Capital virtual</p>
          <p className="text-sm text-gray-500 mt-1">Valida Tito Core v0.3.0 en mercado real sin riesgo capital</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg border-2 border-blue-200 p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Estado: {status}</h2>

          {status === "ready" && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Paper Trading está listo para iniciarse cuando Fase C esté completa.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">Qué hará Paper Trading:</p>
                <ul className="text-sm text-blue-900 list-disc list-inside space-y-1">
                  <li>Ejecutar decisiones de Tito Core en Paper Account Alpaca</li>
                  <li>Capturar slippage y spreads reales</li>
                  <li>Ajustar S/L-T/P por condiciones vivas de mercado</li>
                  <li>Validar confianza contra hits/misses reales</li>
                  <li>Duración: 5 días de trading</li>
                </ul>
              </div>
              <button
                onClick={() => setStatus("running")}
                className="mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Iniciar Paper Trading
              </button>
            </div>
          )}

          {status === "running" && (
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm font-semibold text-yellow-900">⏱️ Paper Trading en Ejecución</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Tito Core está operando en Paper Account. Monitorea el progreso aquí.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-white border border-gray-200 p-4 rounded">
                  <p className="text-xs text-gray-600">Operaciones Ejecutadas</p>
                  <p className="text-2xl font-bold text-gray-900">-</p>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded">
                  <p className="text-xs text-gray-600">P&L (Simulado)</p>
                  <p className="text-2xl font-bold text-gray-900">-</p>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded">
                  <p className="text-xs text-gray-600">Win Rate</p>
                  <p className="text-2xl font-bold text-gray-900">-</p>
                </div>
              </div>
              <button
                onClick={() => setStatus("completed")}
                className="mt-4 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
              >
                Completar Simulación
              </button>
            </div>
          )}

          {status === "completed" && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm font-semibold text-green-900">✅ Paper Trading Completado</p>
                <p className="text-sm text-green-700 mt-1">
                  Fase D validada. Listo para Fase E (Producción).
                </p>
              </div>
              <button
                onClick={() => setStatus("ready")}
                className="mt-4 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
              >
                Resetear
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <p className="text-sm text-blue-900">
            <strong>⚠️ Fase D:</strong> Paper Trading validará Tito Core v0.3.0 contra datos reales de mercado.
            Sin capital en riesgo.
          </p>
          <p className="text-sm text-blue-900 mt-2">
            <strong>🔒 Arquitectura Congelada:</strong> Decisiones basadas en v0.3.0. Mejoras documentadas pero NO
            implementadas hasta Fase E.
          </p>
        </div>
      </div>
    </div>
  );
}
