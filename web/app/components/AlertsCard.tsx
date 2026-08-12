"use client";

import { useEffect, useState } from "react";
import type { TradingViewAlert } from "@/lib/alert";
import { useVerdicts } from "./useVerdicts";
import VerdictBadge from "./VerdictBadge";

// Buzón de alertas de TradingView. Lee GET /api/tradingview (buzón pasivo que llena el
// webhook) y refresca cada REFRESH_MS. Solo muestra; no dispara nada. La lógica de
// parseo/validación vive en el servidor (lib/alert.ts).

const REFRESH_MS = 15_000;

const ACTION: Record<TradingViewAlert["action"], { label: string; cls: string }> = {
  buy: { label: "COMPRA", cls: "agg-ask" },
  sell: { label: "VENTA", cls: "agg-bid" },
  neutral: { label: "NEUTRAL", cls: "agg-mid" },
};

const px = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function when(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

export default function AlertsCard({ ticker }: { ticker?: string }) {
  const [alerts, setAlerts] = useState<TradingViewAlert[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Veredicto 0DTE (hoy) de cada ticker con alerta.
  const verdicts = useVerdicts((alerts ?? []).map((a) => a.ticker));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const q = new URLSearchParams({ limit: "50" });
        if (ticker?.trim()) q.set("ticker", ticker.trim());
        const res = await fetch(`/api/tradingview?${q}`, { cache: "no-store" });
        if (!res.ok) throw new Error("alerts");
        const data = (await res.json()) as { alerts: TradingViewAlert[] };
        if (!cancelled) {
          setAlerts(data.alerts);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [ticker]);

  return (
    <section className="card">
      <div>
        <div className="card-title">
          Alertas de TradingView
          {alerts && <span className="muted"> · {alerts.length}</span>}
        </div>
        <div className="card-sub">
          Señales que TradingView envía por webhook a Tito. Se refresca solo cada 15s
          {ticker?.trim() ? ` · filtrando ${ticker.trim().toUpperCase()}` : ""}.
        </div>
      </div>

      {!alerts && !failed && <div className="feed-empty">Leyendo el buzón de alertas…</div>}
      {failed && <div className="feed-empty">No se pudo leer el buzón de alertas ahora mismo.</div>}
      {alerts && alerts.length === 0 && (
        <div className="feed-empty">
          Sin alertas todavía. Apunta el webhook de TradingView a <code>/api/tradingview</code>.
        </div>
      )}

      {alerts && alerts.length > 0 && (
        <div className="tablewrap tall">
          <table>
            <thead>
              <tr>
                <th className="left">Recibida</th>
                <th className="left">Ticker</th>
                <th className="left">0DTE</th>
                <th>Acción</th>
                <th>Precio</th>
                <th>TF</th>
                <th className="left">Estrategia</th>
                <th className="left">Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => {
                const act = ACTION[a.action];
                return (
                  <tr key={a.id}>
                    <td className="left muted">{when(a.receivedAt)}</td>
                    <td className="left">{a.ticker}</td>
                    <td className="left">
                      {verdicts[a.ticker.toUpperCase()]
                        ? <VerdictBadge verdict={verdicts[a.ticker.toUpperCase()]!} />
                        : <span className="muted">—</span>}
                    </td>
                    <td>
                      <span className={`pill ${act.cls}`}>{act.label}</span>
                    </td>
                    <td>{a.price != null ? px.format(a.price) : "—"}</td>
                    <td className="muted">{a.timeframe ?? "—"}</td>
                    <td className="left">{a.strategy ?? "—"}</td>
                    <td className="left muted">{a.message ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
