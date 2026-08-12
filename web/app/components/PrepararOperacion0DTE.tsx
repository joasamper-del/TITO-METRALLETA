"use client";

// Preparar operación — 0DTE (Fase 2).
//
// Cuando el veredicto es COMPRAR (gate `canPrepareTrade`), arma el ticket exacto
// de la operación sugerida a partir del veredicto + la cadena + el perfil de
// riesgo. NO coloca nada: solo prepara para que el usuario revise y ejecute a
// mano. Dos salidas ("ambos"): (1) ticket para copiar + abrir Robinhood, y
// (2) comando para que Claude corra `review_option_order` (preview vía MCP).
//
// "No es consejo financiero. Solo análisis inteligente." Tito nunca ejecuta.

import { useEffect, useState } from "react";
import type { ZeroDteResult } from "@/lib/zerodte";
import { buildVerdict } from "@/lib/zerodteVerdict";
import { canPrepareTrade, fromZeroDte } from "@/lib/verdict";
import { DEFAULT_PROFILE, loadProfile } from "./RiskProfileCard";

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const money2 = (n: number | null) => (n == null ? "—" : `$${n.toFixed(2)}`);

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="po-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? "✓ copiado" : label}
    </button>
  );
}

export default function PrepararOperacion0DTE({ data }: { data: ZeroDteResult }) {
  const v = buildVerdict(data);
  const uv = fromZeroDte(v);

  // Perfil de riesgo: solo en cliente (localStorage). Evita mismatch de hidratación.
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  useEffect(() => setProfile(loadProfile()), []);

  // Gate duro: solo un COMPRAR habilita preparar la operación.
  if (!canPrepareTrade(uv)) return null;

  const right: "call" | "put" = v.bias === "alcista" ? "call" : "put";
  const rightLabel = right === "call" ? "CALL" : "PUT";
  // Strike sugerido por el veredicto (muro en la dirección del trade, o el imán).
  const strike =
    (right === "call" ? v.levels.resistance : v.levels.support) ?? v.levels.magnet;

  // Precio de la opción para ese strike, si está en la cadena rankeada.
  const line = strike != null ? data.lines.find((l) => l.strike === strike) : undefined;
  const row = right === "call" ? line?.call ?? null : line?.put ?? null;
  const price = row?.price ?? row?.ask ?? null;

  // Sizing: presupuesto = cuenta × tolerancia%. Compra de opción: coste = prima×100.
  const budget = (profile.accountSize * profile.tolerancePct) / 100;
  const costPerContract = price != null ? price * 100 : null;
  const maxContracts =
    costPerContract && costPerContract > 0 ? Math.floor(budget / costPerContract) : null;
  const totalCost = maxContracts != null && costPerContract != null ? maxContracts * costPerContract : null;

  const strikeTxt = strike != null ? `$${strike}` : "(elige strike)";
  const qtyTxt = maxContracts && maxContracts > 0 ? `${maxContracts}` : "?";

  // Ticket legible para copiar / tu bróker.
  const ticket =
    `COMPRAR ${qtyTxt}x ${data.ticker} ${data.expiration} ${strikeTxt} ${rightLabel} 0DTE` +
    (price != null ? ` · límite ${money2(price)}` : " · límite: confírmalo en tu bróker");

  // Comando para el MCP de Robinhood: PREVIEW (review), nunca coloca.
  const mcpCommand =
    `Revisa esta orden en Robinhood con review_option_order (solo PREVIEW, NO la coloques): ` +
    `comprar ${qtyTxt} contrato(s) de ${data.ticker}, vencimiento ${data.expiration}, ` +
    `strike ${strikeTxt}, tipo ${right}, ` +
    (price != null ? `precio límite ${money2(price)}.` : `a precio de mercado (confírmalo).`);

  const rhUrl = `https://robinhood.com/stocks/${encodeURIComponent(data.ticker)}`;

  return (
    <section className="po">
      <style>{CSS}</style>

      <div className="po-head">
        <span className="po-kicker">Preparar operación</span>
        <span className="po-badge">{v.actionLabel}</span>
      </div>

      <div className="po-ticket">
        <div className="po-line"><span>Contrato</span><b>{data.ticker} {strikeTxt} {rightLabel}</b></div>
        <div className="po-line"><span>Vencimiento</span><b>{data.expiration} (0DTE)</b></div>
        <div className="po-line"><span>Prima (límite sug.)</span><b>{money2(price)}{price == null && <em className="po-note"> · no está en la cadena rankeada, confírmalo</em>}</b></div>
        <div className="po-line">
          <span>Cantidad (a tu perfil)</span>
          <b>{maxContracts != null ? `${maxContracts} contrato${maxContracts === 1 ? "" : "s"}` : "—"}</b>
        </div>
        <div className="po-line">
          <span>Coste estimado</span>
          <b>{totalCost != null ? money(totalCost) : "—"}
            <em className="po-note"> · presupuesto {money(budget)} ({profile.tolerancePct}% de {money(profile.accountSize)})</em>
          </b>
        </div>
      </div>

      <div className="po-out">
        <div className="po-out-row">
          <code className="po-code">{ticket}</code>
          <CopyButton text={ticket} label="copiar ticket" />
        </div>
        <div className="po-out-row">
          <span className="po-out-lbl">Para revisar en Robinhood vía Claude (preview, no coloca):</span>
          <CopyButton text={mcpCommand} label="copiar comando MCP" />
        </div>
        <a className="po-rh" href={rhUrl} target="_blank" rel="noopener noreferrer">
          Abrir {data.ticker} en Robinhood ↗
        </a>
      </div>

      <p className="po-foot">
        ⚠️ Tito <b>nunca coloca la orden</b>: esto solo prepara y revisa. La ejecución la haces
        tú manualmente en tu bróker. Cantidad y límite son sugerencias a partir de tu perfil de
        riesgo y la cadena — <b>confírmalos antes de operar</b>. No es consejo financiero.
      </p>
    </section>
  );
}

const CSS = `
.po { border: 1px solid var(--green); border-radius: 12px; background: var(--green-bg);
  padding: 16px 18px; margin: 14px 0 4px; }
.po-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.po-kicker { font-size: 11px; text-transform: uppercase; letter-spacing: .07em; font-weight: 800; color: var(--green-dark); }
.po-badge { font-size: 12px; font-weight: 800; padding: 3px 10px; border-radius: 999px; background: var(--green); color: #fff; }
.po-ticket { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; }
.po-line { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; font-size: 13px; border-bottom: 1px solid var(--border-soft); }
.po-line:last-child { border-bottom: 0; }
.po-line > span { color: var(--muted); }
.po-line b { color: var(--text); font-variant-numeric: tabular-nums; text-align: right; }
.po-note { font-style: normal; font-weight: 400; color: var(--faint); font-size: 11px; }
.po-out { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.po-out-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.po-out-lbl { font-size: 12px; color: var(--muted); }
.po-code { flex: 1; min-width: 200px; font-size: 12.5px; background: var(--panel); border: 1px solid var(--border);
  border-radius: 8px; padding: 8px 10px; color: var(--text); font-variant-numeric: tabular-nums; }
.po-copy { font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;
  padding: 7px 12px; border-radius: 8px; border: 1px solid var(--green-dark); background: var(--panel); color: var(--green-dark); }
.po-rh { align-self: flex-start; font-size: 12.5px; font-weight: 700; color: var(--accent); text-decoration: none; }
.po-rh:hover { text-decoration: underline; }
.po-foot { margin: 0; font-size: 11.5px; color: var(--green-dark); line-height: 1.5; }
`;
