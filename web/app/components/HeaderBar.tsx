"use client";

import { useEffect, useState } from "react";
import type { CompanyInfo } from "@/lib/types";
import type { UnifiedVerdict } from "@/lib/verdict";
import { pct, px } from "../format";
import NavTabs from "./NavTabs";
import VerdictBadge from "./VerdictBadge";

// Watchlist 0DTE (fuente: lista ⚡0DTE de Robinhood). SPY queda como ancla de
// índice —único con 0DTE garantizado a diario— seguido de la watchlist.
const QUICK = ["SPY", "QQQ", "AMD", "SMH", "INTU", "SHOP"];

export default function HeaderBar({
  ticker,
  company,
  busy,
  onSearch,
}: {
  ticker: string | null;
  company: CompanyInfo | null;
  busy: boolean;
  onSearch: (t: string) => void;
}) {
  const [q, setQ] = useState("");
  // Veredicto 0DTE de cada quick-link (null = sin 0DTE hoy / aún cargando).
  const [verdicts, setVerdicts] = useState<Record<string, UnifiedVerdict | null>>({});

  // Propaga el estado NO OPERAR a los accesos rápidos: un solo request al montar.
  // Degrada en silencio — si falla, los botones quedan sin badge.
  useEffect(() => {
    let alive = true;
    fetch(`/api/0dte/verdict?tickers=${QUICK.join(",")}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { if (alive && j?.verdicts) setVerdicts(j.verdicts); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const submit = () => {
    const t = q.trim().toUpperCase();
    if (!t || busy) return;
    setQ("");
    onSearch(t);
  };

  return (
    <div className="hb">
      <div className="hb-brand">
        <div className="hb-logo">T</div>
        <div className="hb-name">Tito Metralleta</div>
        <div className="hb-chip">AI Options Agent</div>
      </div>
      <NavTabs />
      <div className="hb-tabs">
        {QUICK.map((s) => {
          const v = verdicts[s];
          return (
            <button
              key={s}
              type="button"
              className={`hb-tab ${ticker === s ? "on" : ""}`}
              onClick={() => !busy && onSearch(s)}
              title={v ? `Veredicto 0DTE: ${v.label} (${v.confidencePct}%)` : undefined}
            >
              <span>{s}</span>
              {v && <VerdictBadge verdict={v} showPct={false} />}
            </button>
          );
        })}
      </div>
      <input
        className="hb-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        placeholder="Buscar ticker…"
        spellCheck={false}
      />
      <div className="hb-right">
        {company && (
          <>
            <div className="hb-ticker-name">{company.name ?? company.ticker}</div>
            {company.price != null && <div className="hb-price">${px.format(company.price)}</div>}
            {company.changePercent != null && (
              <div className="hb-chg" style={{ color: company.changePercent >= 0 ? "#12b76a" : "#f04438" }}>
                {pct.format(company.changePercent)}%
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
