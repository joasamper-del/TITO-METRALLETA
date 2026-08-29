/**
 * useOperativePipeline — Sesión 27
 * Hook que obtiene datos reales del pipeline para modo Operativo
 * Conecta a /api/strategy?ticker=X&direction=LONG/SHORT
 * Fail-safe: si faltan datos, muestra null (NO fallback)
 */

import { useEffect, useState, useCallback } from "react";
import type { StrategyOperativeData } from "@/app/api/strategy/route";

interface PipelineState {
  data: StrategyOperativeData | null;
  loading: boolean;
  error: string | null;
}

export function useOperativePipeline(
  ticker: string | null,
  direction: "LONG" | "SHORT" = "LONG"
): PipelineState {
  const [state, setState] = useState<PipelineState>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchPipelineData = useCallback(async () => {
    if (!ticker) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams({
        ticker: ticker.toUpperCase(),
        direction,
      });

      const response = await fetch(`/api/strategy?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: StrategyOperativeData = await response.json();

      // Verificar fail-safe
      if (data.failSafeReason) {
        setState({
          data: { ...data },
          loading: false,
          error: `⚠️ Fail-safe: ${data.failSafeReason}`,
        });
      } else {
        setState({
          data,
          loading: false,
          error: null,
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error desconocido";
      setState({
        data: null,
        loading: false,
        error: `Error obtención datos pipeline: ${errMsg}`,
      });
    }
  }, [ticker, direction]);

  useEffect(() => {
    fetchPipelineData();
    // Refresco cada 30s en modo operativo
    const interval = setInterval(fetchPipelineData, 30000);
    return () => clearInterval(interval);
  }, [fetchPipelineData]);

  return state;
}
