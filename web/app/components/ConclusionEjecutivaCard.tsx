"use client";

// Conclusión Ejecutiva — módulo 0DTE.
//
// La tarjeta que abre el análisis: una decisión clara (COMPRAR · ESPERAR ·
// NO OPERAR) con estrategia sugerida, el porqué, la invalidación, los niveles,
// los escenarios y la confianza. Va en la PARTE SUPERIOR de /0dte, antes de la
// tabla del descubridor. Solo ilustra el veredicto que calcula buildVerdict();
// no decide nada por su cuenta. "No es consejo financiero. Solo análisis
// inteligente." — toda ejecución la hace el usuario a mano.

import type { ZeroDteResult } from "@/lib/zerodte";
import { buildVerdict, type Verdict } from "@/lib/zerodteVerdict";

const lvl = (n: number | null | undefined) =>
  n == null ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");

const ACTION_TXT: Record<Verdict["action"], string> = {
  COMPRAR: "operar",
  ESPERAR: "esperar",
  NO_OPERAR: "no-operar",
};

export default function ConclusionEjecutivaCard({ data }: { data: ZeroDteResult | null }) {
  if (!data) return null;
  const v = buildVerdict(data);
  const cls = ACTION_TXT[v.action];

  return (
    <section className={`ce ce-${cls}`}>
      <style>{CSS}</style>

      <div className="ce-top">
        <span className="ce-kicker">Conclusión ejecutiva — {data.ticker} · 0DTE</span>
        <span className={`ce-conf ce-conf-${v.confidence}`}>
          Confianza {v.confidence} · {v.confidencePct}%
        </span>
      </div>

      {/* Franja de acción: el veredicto en una palabra. */}
      <div className="ce-strip">
        <div className="ce-verdict">
          <span className="ce-badge">{v.actionLabel}</span>
          <span className={`ce-bias ce-bias-${v.bias}`}>
            {v.bias === "alcista" ? "▲ sesgo alcista" : v.bias === "bajista" ? "▼ sesgo bajista" : "▬ neutral"}
          </span>
        </div>
        {v.noTrade && <span className="ce-notrade">HOY NO HAY TRADE</span>}
        <div className="ce-confbar" aria-hidden>
          <i style={{ width: `${v.confidencePct}%` }} />
        </div>
      </div>

      {/* Estrategia sugerida — lo primero que Joaquín necesita ver. */}
      <div className="ce-strategy">
        <span className="ce-lbl">Estrategia sugerida</span>
        <p>{v.strategy}</p>
      </div>

      {/* El porqué + niveles + invalidación + cuándo revisar. */}
      <div className="ce-grid">
        <div className="ce-block">
          <span className="ce-lbl">Por qué</span>
          <p>{v.reason}</p>
        </div>
        <div className="ce-block">
          <span className="ce-lbl">Niveles clave</span>
          <ul className="ce-levels">
            <li><em>🧲 Imán</em><b>{lvl(v.levels.magnet)}</b></li>
            <li><em>Resistencia</em><b>{lvl(v.levels.resistance)}</b></li>
            <li><em>Soporte</em><b>{lvl(v.levels.support)}</b></li>
            <li><em>Flip γ</em><b>{lvl(v.levels.flip)}</b></li>
          </ul>
        </div>
        <div className="ce-block">
          <span className="ce-lbl">Invalidación</span>
          <p>{v.invalidation}</p>
        </div>
        <div className="ce-block">
          <span className="ce-lbl">Objetivo (rango)</span>
          <p className="ce-target">
            {v.targetRange ? `${lvl(v.targetRange[0])} – ${lvl(v.targetRange[1])}` : "—"}
          </p>
          <span className="ce-when">Revisar: {v.reviewWhen}</span>
        </div>
      </div>

      {/* Escenarios más probables, cada uno con su condición/prob. */}
      {v.scenarios.length > 0 && (
        <div className="ce-scen">
          <span className="ce-lbl">Escenarios más probables</span>
          <div className="ce-scen-row">
            {v.scenarios.map((s) => (
              <div key={s.kind} className={`ce-scen-card ce-scen-${s.kind}`}>
                <span className="ce-scen-k">{s.label}</span>
                <b>{lvl(s.target)}</b>
                <span className="ce-scen-pct">
                  {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}% · {(s.probTouch * 100).toFixed(0)}% de tocarlo
                </span>
                <p>{s.reason}</p>
              </div>
            ))}
          </div>
          {v.assumptions && <p className="ce-assume">Supuestos: {v.assumptions}</p>}
        </div>
      )}

      <p className="ce-foot">
        Clasificación de research, no una orden de compra/venta. No es consejo financiero, solo
        análisis inteligente — toda ejecución la haces tú manualmente.
      </p>
    </section>
  );
}

const CSS = `
.ce { border: 1px solid var(--border); border-left-width: 6px; background: var(--panel);
  border-radius: 14px; padding: 18px 20px 16px; margin: 4px 0 18px; }
.ce-operar { border-left-color: var(--green); }
.ce-esperar { border-left-color: var(--amber-border); }
.ce-no-operar { border-left-color: var(--faint); }

.ce-top { display: flex; align-items: center; justify-content: space-between; gap: 12px;
  flex-wrap: wrap; margin-bottom: 12px; }
.ce-kicker { font-size: 11px; text-transform: uppercase; letter-spacing: .07em;
  font-weight: 700; color: var(--muted); }
.ce-conf { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px;
  font-variant-numeric: tabular-nums; }
.ce-conf-alta { background: var(--green-bg); color: var(--green-dark); }
.ce-conf-media { background: var(--amber-bg); color: var(--amber-text); }
.ce-conf-baja { background: var(--panel-2); color: var(--muted); }

.ce-strip { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
.ce-verdict { display: flex; align-items: center; gap: 12px; }
.ce-badge { font-size: 22px; font-weight: 800; letter-spacing: .02em; padding: 8px 18px;
  border-radius: 12px; color: #fff; white-space: nowrap; }
.ce-operar .ce-badge { background: var(--green); }
.ce-esperar .ce-badge { background: #b45309; }
.ce-no-operar .ce-badge { background: #6b7280; }
.ce-bias { font-size: 13px; font-weight: 700; }
.ce-bias-alcista { color: var(--green-dark); }
.ce-bias-bajista { color: #b42318; }
.ce-bias-neutral { color: var(--muted); }
.ce-notrade { font-size: 12px; font-weight: 800; letter-spacing: .05em; color: #b42318;
  background: var(--red-bg); border: 1px solid var(--red-soft); padding: 4px 10px; border-radius: 8px; }
.ce-confbar { flex: 1; min-width: 120px; height: 8px; border-radius: 4px;
  background: var(--border-soft); overflow: hidden; }
.ce-confbar i { display: block; height: 100%; }
.ce-operar .ce-confbar i { background: var(--green); }
.ce-esperar .ce-confbar i { background: #b45309; }
.ce-no-operar .ce-confbar i { background: #9ca3af; }

.ce-lbl { font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em;
  font-weight: 700; color: var(--muted); }
.ce-strategy { background: var(--panel-2); border: 1px solid var(--border);
  border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
.ce-strategy p { margin: 4px 0 0; font-size: 14px; line-height: 1.5; color: var(--text); font-weight: 500; }

.ce-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-md, 14px); margin-bottom: 14px; }
.ce-block p { margin: 4px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--text); }
.ce-target { font-size: 18px !important; font-weight: 700; color: var(--accent) !important;
  font-variant-numeric: tabular-nums; }
.ce-when { display: block; margin-top: 4px; font-size: 11px; color: var(--faint); line-height: 1.4; }
.ce-levels { list-style: none; margin: 6px 0 0; padding: 0; display: grid;
  grid-template-columns: 1fr 1fr; gap: 4px 12px; }
.ce-levels li { display: flex; justify-content: space-between; gap: 8px; font-size: 12.5px;
  font-variant-numeric: tabular-nums; }
.ce-levels em { font-style: normal; color: var(--muted); }
.ce-levels b { color: var(--text); }

.ce-scen { border-top: 1px solid var(--border-soft); padding-top: 12px; margin-bottom: 12px; }
.ce-scen-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: var(--space-md, 12px); margin-top: 8px; }
.ce-scen-card { border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px;
  background: var(--panel-2); display: flex; flex-direction: column; gap: 2px; }
.ce-scen-card b { font-size: 18px; font-variant-numeric: tabular-nums; letter-spacing: -0.3px; }
.ce-scen-card p { margin: 5px 0 0; font-size: 11px; color: var(--muted); line-height: 1.4; }
.ce-scen-k { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
.ce-scen-pct { font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--muted); }
.ce-scen-bull { border-left: 3px solid var(--green); }
.ce-scen-bull b { color: var(--green-dark); }
.ce-scen-bear { border-left: 3px solid var(--red); }
.ce-scen-bear b { color: #b42318; }
.ce-scen-base { border-left: 3px solid var(--accent); }
.ce-scen-base b { color: var(--accent); }
.ce-assume { margin: 10px 0 0; font-size: 11px; color: var(--faint); line-height: 1.45; }

.ce-foot { margin: 4px 0 0; font-size: 11px; color: var(--faint); line-height: 1.45; }
`;
