"use client";

// Tarjeta 0DTE por ticker (estilo wheel) para el descubridor: veredicto
// (COMPRAR CALL / COMPRAR PUT / ESPERAR / NO OPERAR / SIN 0DTE), el porqué,
// stop (invalidación), objetivos (rango), confianza y —si es COMPRAR— el panel
// de preparar operación con contrato sugerido + copiar + abrir en Robinhood.
// El veredicto es el mismo buildVerdict que la Conclusión Ejecutiva. No ejecuta.

import { useEffect, useState } from "react";
import type { DiscoverCandidate } from "@/lib/zerodteDiscover";
import type { OrderSpec } from "@/lib/orderTicket";
import { DEFAULT_PROFILE, loadProfile } from "./RiskProfileCard";
import VerdictBadge from "./VerdictBadge";
import PrepararOperacion from "./PrepararOperacion";

const money0 = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const dec = (v: number | null | undefined, d = 2) => (v == null ? "—" : v.toFixed(d));

export default function ZeroDteCard({
  c,
  onPick,
}: {
  c: DiscoverCandidate;
  onPick: (t: string) => void;
}) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  useEffect(() => setProfile(loadProfile()), []);

  const v = c.verdict;
  const isBuy = v.action === "COMPRAR" && c.contract != null;
  const cls = `${v.action.toLowerCase()}-${v.bias}`;

  // OrderSpec para el panel de preparar (solo COMPRAR con contrato).
  let spec: OrderSpec | null = null;
  let budgetNote: string | undefined;
  if (isBuy && c.contract) {
    const budget = (profile.accountSize * profile.tolerancePct) / 100;
    const costPerContract = c.contract.price != null ? c.contract.price * 100 : null;
    const quantity = costPerContract && costPerContract > 0 ? Math.floor(budget / costPerContract) : null;
    spec = {
      side: "buy",
      ticker: c.ticker,
      instrument: "option",
      label: v.actionLabel,
      right: c.contract.right,
      strike: c.contract.strike ?? undefined,
      expiration: c.contract.expiration,
      quantity,
      limit: c.contract.price,
    };
    budgetNote = `presupuesto ${money0(budget)} (${profile.tolerancePct}% de ${money0(profile.accountSize)})`;
  }

  return (
    <section className={`zc zc-${cls}`}>
      <style>{CSS}</style>

      <button className="zc-head" onClick={() => onPick(c.ticker)} title="Cargar la cadena de este ticker">
        <span className="zc-tk">{c.ticker}</span>
        <span className="zc-spot">{c.hasZeroDte && c.spot ? dec(c.spot) : "—"}</span>
        <span className="zc-badge">
          <VerdictBadge verdict={v} />
        </span>
      </button>

      <p className="zc-reason">{v.reason}</p>

      <div className="zc-grid">
        <div className="zc-cell">
          <span className="zc-lbl">Stop / invalidación</span>
          <b>{v.stop}</b>
        </div>
        <div className="zc-cell">
          <span className="zc-lbl">Objetivo (rango)</span>
          <b className="zc-target">
            {v.targetRange ? `${dec(v.targetRange[0])} – ${dec(v.targetRange[1])}` : "—"}
          </b>
        </div>
        <div className="zc-cell">
          <span className="zc-lbl">Confianza</span>
          <b className={`zc-conf zc-conf-${v.confidence}`}>{v.confidence} · {v.confidencePct}%</b>
        </div>
      </div>

      {v.strategy && <p className="zc-strategy"><b>Estrategia:</b> {v.strategy}</p>}

      {spec && <PrepararOperacion spec={spec} budgetNote={budgetNote} />}
    </section>
  );
}

const CSS = `
.zc { border: 1px solid var(--border); border-left-width: 5px; background: var(--panel);
  border-radius: 12px; padding: 14px 16px; }
.zc-comprar-alcista { border-left-color: var(--green); }
.zc-comprar-bajista { border-left-color: var(--red); }
.zc-esperar-alcista, .zc-esperar-bajista, .zc-esperar-neutral { border-left-color: var(--amber-border); }
.zc-no_operar-alcista, .zc-no_operar-bajista, .zc-no_operar-neutral { border-left-color: var(--faint); }

.zc-head { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
  font: inherit; cursor: pointer; background: transparent; border: 0; padding: 0 0 8px; }
.zc-tk { font-size: 18px; font-weight: 800; color: var(--text); }
.zc-spot { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
.zc-badge { margin-left: auto; }

.zc-reason { margin: 0 0 10px; font-size: 12.5px; color: var(--text); line-height: 1.5; }
.zc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px; margin-bottom: 10px; }
.zc-cell { display: flex; flex-direction: column; gap: 2px; }
.zc-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; font-weight: 700; color: var(--muted); }
.zc-cell b { font-size: 13px; color: var(--text); line-height: 1.4; font-variant-numeric: tabular-nums; }
.zc-target { color: var(--accent) !important; font-size: 15px !important; }
.zc-conf-alta { color: var(--green-dark); } .zc-conf-media { color: var(--amber-text); } .zc-conf-baja { color: var(--muted); }
.zc-strategy { margin: 0 0 4px; font-size: 12px; color: var(--muted); line-height: 1.5; }
.zc-strategy b { color: var(--text); }
`;
