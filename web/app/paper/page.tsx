/**
 * Paper Trading — Fase D
 * Displays real-time trading logs from tradingLogger.ts
 * Reads and visualizes every trade, summary, and ticker stats
 */

"use client";

import PhaseDResults from "@/app/components/PhaseDResults";
import { OpenPositions } from "@/app/components/OpenPositions";
import { CryptoAnalysis } from "@/app/components/CryptoAnalysis";

export default function PaperTrading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Fase D — Paper Trading</h1>
          <p className="text-lg text-gray-600 mt-2">Tito Core v0.3.0 en Alpaca Paper Trading</p>
          <p className="text-sm text-gray-500 mt-1">
            Validación en mercado real • Sin capital en riesgo • Arquitectura congelada
          </p>
        </div>

        {/* Open Positions — Real-time */}
        <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
          <OpenPositions />
        </div>

        {/* Crypto Market Regime Analysis — Session 22 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📈 Análisis de Régimen Crypto — Sesión 22</h2>
          <CryptoAnalysis />
        </div>

        {/* Results Component */}
        <PhaseDResults />

        {/* Instructions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="font-semibold text-blue-900 mb-3">📋 Estado Fase D</h3>
            <ul className="text-sm text-blue-900 space-y-2">
              <li>✅ Sistema de logging implementado</li>
              <li>✅ Credenciales Alpaca Paper validadas</li>
              <li>✅ Endpoint PAPER verificado (no LIVE)</li>
              <li>✅ Autonomía desactivada (requiere autorización por operación)</li>
              <li>✅ 0 órdenes ejecutadas</li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg border border-green-200 p-6">
            <h3 className="font-semibold text-green-900 mb-3">🔐 Seguridad</h3>
            <ul className="text-sm text-green-900 space-y-2">
              <li>✅ Credenciales en .env.local (gitignored)</li>
              <li>✅ Tito Core v0.3.0 congelado (sin cambios)</li>
              <li>✅ Logging completo de cada operación</li>
              <li>✅ Resumen diario en tiempo real</li>
              <li>✅ Solo 1 orden pequeña por sesión (con pausa obligatoria)</li>
            </ul>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-8 bg-amber-50 rounded-lg border border-amber-200 p-6">
          <h3 className="font-semibold text-amber-900 mb-3">📝 Próximos Pasos</h3>
          <p className="text-sm text-amber-900 mb-4">
            Cuando el mercado esté abierto (09:30-16:00 ET) y el usuario autorice:
          </p>
          <div className="bg-white rounded p-3 border border-amber-300 font-mono text-xs text-gray-900 overflow-x-auto">
            PHASE_D_APPROVED=true npx ts-node phaseD_ControlledExecution.ts
          </div>
          <p className="text-xs text-amber-900 mt-3">
            Sistema ejecutará 1 orden pequeña de SPY en Paper Trading, registrará todo automáticamente y se detendrá.
            Los resultados aparecerán aquí en tiempo real.
          </p>
        </div>
      </div>
    </div>
  );
}
