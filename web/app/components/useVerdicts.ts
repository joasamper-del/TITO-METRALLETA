"use client";

// Hook compartido: dado un conjunto de tickers, devuelve su veredicto 0DTE
// unificado (misma fuente que el header y el descubridor, vía /api/0dte/verdict).
// Un ticker sin 0DTE hoy → null (no badge). Degrada en silencio si falla.

import { useEffect, useState } from "react";
import type { UnifiedVerdict } from "@/lib/verdict";

export function useVerdicts(tickers: string[]): Record<string, UnifiedVerdict | null> {
  const [verdicts, setVerdicts] = useState<Record<string, UnifiedVerdict | null>>({});
  // Clave estable (deduplicada y ordenada) para no re-pedir en cada render.
  const key = [...new Set(tickers.map((t) => t.toUpperCase()).filter(Boolean))].sort().join(",");

  useEffect(() => {
    if (!key) { setVerdicts({}); return; }
    let alive = true;
    fetch(`/api/0dte/verdict?tickers=${key}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { if (alive && j?.verdicts) setVerdicts(j.verdicts); })
      .catch(() => {});
    return () => { alive = false; };
  }, [key]);

  return verdicts;
}
