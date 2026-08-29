/**
 * useTitoDecision — Hook que obtiene decisiones REALES de Tito Core v0.3.0
 * CONGELADO: Sin cambios a la lógica de trading, reglas, pesos o umbrales
 */

import { useEffect, useState, useCallback } from "react";
import { buildDecision } from "./tito-core/decisionEngine";
import { evaluateRules } from "./tito-core/ruleEngine";
import type { DecisionDetails, DataQuality } from "./tito-core/types";
import type { MarketSnapshot } from "./tito-core/marketSnapshot";

interface TitoDecisionState {
  decision: DecisionDetails | null;
  loading: boolean;
  error: string | null;
}

/**
 * Crea un MarketSnapshot a partir de datos de mercado actual
 * Solo adapta formato — no cambia lógica de decisiones
 */
function createSnapshot(
  ticker: string,
  spot: number,
  iv: number,
  direction: "LONG" | "SHORT" = "LONG",
  trend: "alcista" | "bajista" | "lateral" = "lateral",
  volumeSufficient: boolean = true,
  liquidityAdequate: boolean = true
): MarketSnapshot {
  return {
    symbol: ticker,
    direction,
    trend,
    volumeSufficient,
    liquidityAdequate,
    regimeValidated: iv > 15 && iv < 60, // Régimen operables
    patternDetected: null, // Placeholder — requiere lógica de patrones real
    candleConfirmed: true, // Snapshot ya es dato confirmado
    volatilityInRange: iv > 10 && iv < 80,
    blockingEvent: false, // No tenemos info de eventos en tiempo real (aún)
    historicalProbability: null,
    dataQuality: spot > 0 && volumeSufficient ? "alta" : "media",
  };
}

/**
 * Hook que obtiene decisiones reales de Tito Core
 * Llamar cuando el ticker o precios cambien
 * @param direction LONG (compra) o SHORT (venta) — determina si se requiere alcista o bajista
 */
export function useTitoDecision(
  ticker: string | null,
  spot: number | null,
  iv: number | null,
  trend?: "alcista" | "bajista" | "lateral",
  direction: "LONG" | "SHORT" = "LONG"
): TitoDecisionState {
  const [state, setState] = useState<TitoDecisionState>({
    decision: null,
    loading: false,
    error: null,
  });

  const computeDecision = useCallback(() => {
    if (!ticker || spot === null || iv === null) {
      setState({ decision: null, loading: false, error: null });
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // Crear snapshot a partir de datos actuales
      const snapshot = createSnapshot(
        ticker,
        spot,
        iv / 100, // IV como decimal
        direction,
        trend || "lateral"
      );

      // Evaluar reglas (sin modificar lógica)
      const rules = evaluateRules(snapshot);

      // Obtener decisión REAL de Tito Core (sin cambios)
      const decision = buildDecision(
        rules,
        snapshot.dataQuality as DataQuality,
        { spot, iv: iv / 100 }
      );

      setState({
        decision,
        loading: false,
        error: null,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error desconocido";
      setState({
        decision: null,
        loading: false,
        error: `Error en Tito Core: ${errMsg}`,
      });
    }
  }, [ticker, spot, iv, trend, direction]);

  // Recomputar cuando los datos cambien
  useEffect(() => {
    computeDecision();
  }, [computeDecision]);

  return state;
}
