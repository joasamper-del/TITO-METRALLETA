"use client";

// Cinta de contexto de TradingView. Lee las alertas del webhook para el ticker y
// muestra las señales de los 5 indicadores del shortlist con banderas de confluencia
// contra la tesis de opciones. Es SOLO contexto: no toca el scorecard 0-100.

import { useEffect, useState } from "react";
import type { TradingViewAlert } from "@/lib/alert";
import { tvContext, type ThesisDir } from "@/lib/tvContext";

const REFRESH_MS = 30_000;

const BIAS_CLASS: Record<string, string> = {
  bullish: "tv-up",
  bearish: "tv-down",
  neutral: "tv-flat",
};

export default function TvContextRibbon({
  ticker,
  thesis = null,
}: {
  ticker: string;
  thesis?: ThesisDir;
}) {
  const [alerts, setAlerts] = useState<TradingViewAlert[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/tradingview?ticker=${encodeURIComponent(ticker)}&limit=50`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("tv");
        const d = (await res.json()) as { alerts: TradingViewAlert[] };
        if (!cancelled) setAlerts(d.alerts);
      } catch {
        if (!cancelled) setAlerts([]);
      }
    }
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [ticker]);

  // Sin alertas de TradingView para el ticker → no ensuciar la vista.
  if (!alerts) return null;
  const signals = tvContext(alerts, { ticker, thesis });
  if (signals.length === 0) return null;

  return (
    <section className="tv-ribbon">
      <div className="tv-ribbon-head">
        Contexto TradingView
        <span className="muted"> — confirmación, no altera el score</span>
      </div>
      <div className="tv-ribbon-items">
        {signals.map((s) => (
          <div key={s.id} className={`tv-chip ${BIAS_CLASS[s.bias]}`} title={`${s.source} · ${s.label}`}>
            <span className="tv-src">{s.source}</span>
            <span className="tv-label">{s.label}</span>
            {s.timeframe && <span className="tv-tf">{s.timeframe}</span>}
            {s.agrees === "agree" && <span className="tv-flag ok" aria-label="acompaña la tesis">✓</span>}
            {s.agrees === "disagree" && <span className="tv-flag warn" aria-label="contradice la tesis">⚠</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
