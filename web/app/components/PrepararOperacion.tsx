"use client";

// Panel compartido "Preparar operación" (Fase 2). Renderiza un OrderSpec ya
// armado por cada módulo (0DTE compra de opción, Wheel venta de put, Ticker
// acciones). NO coloca nada: ticket para copiar, comando de PREVIEW para el MCP
// de Robinhood y deep-link. La ejecución es siempre manual del usuario.

import { useState } from "react";
import {
  buildMcpCommand,
  buildTicket,
  orderCost,
  robinhoodUrl,
  type OrderSpec,
} from "@/lib/orderTicket";

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

export default function PrepararOperacion({
  spec,
  budgetNote,
}: {
  spec: OrderSpec;
  /** Nota de sizing, ej. "presupuesto $400 (4% de $10,000)". */
  budgetNote?: string;
}) {
  const cost = orderCost(spec);
  const isOption = spec.instrument === "option";
  const unit = isOption ? "contrato" : "acción";
  const qty = spec.quantity;
  const contractLabel = isOption
    ? `${spec.ticker} ${spec.strike != null ? `$${spec.strike}` : "(strike)"} ${(spec.right ?? "").toUpperCase()}`
    : `${spec.ticker} · acciones`;

  return (
    <section className="po">
      <style>{CSS}</style>

      <div className="po-head">
        <span className="po-kicker">Preparar operación</span>
        <span className="po-badge">{spec.label}</span>
      </div>

      <div className="po-ticket">
        <div className="po-line"><span>{isOption ? "Contrato" : "Instrumento"}</span><b>{contractLabel}</b></div>
        {isOption && (
          <div className="po-line"><span>Vencimiento</span><b>{spec.expiration ?? "—"}</b></div>
        )}
        <div className="po-line">
          <span>{isOption ? "Prima (límite sug.)" : "Precio (límite sug.)"}</span>
          <b>{money2(spec.limit)}</b>
        </div>
        <div className="po-line">
          <span>Cantidad (a tu perfil)</span>
          <b>{qty != null ? `${qty} ${unit}${qty === 1 ? "" : "s"}` : "—"}</b>
        </div>
        <div className="po-line">
          <span>{spec.side === "sell" && isOption ? "Crédito estimado" : "Coste estimado"}</span>
          <b>
            {cost != null ? money(cost) : "—"}
            {budgetNote && <em className="po-note"> · {budgetNote}</em>}
          </b>
        </div>
      </div>

      <div className="po-out">
        <div className="po-out-row">
          <code className="po-code">{buildTicket(spec)}</code>
          <CopyButton text={buildTicket(spec)} label="copiar ticket" />
        </div>
        <div className="po-out-row">
          <span className="po-out-lbl">Para revisar en Robinhood vía Claude (preview, no coloca):</span>
          <CopyButton text={buildMcpCommand(spec)} label="copiar comando MCP" />
        </div>
        <a className="po-rh" href={robinhoodUrl(spec.ticker)} target="_blank" rel="noopener noreferrer">
          Abrir {spec.ticker} en Robinhood ↗
        </a>
      </div>

      <p className="po-foot">
        ⚠️ Tito <b>nunca coloca la orden</b>: esto solo prepara y revisa. La ejecución la haces
        tú manualmente en tu bróker. Cantidad y límite son sugerencias a partir de tu perfil de
        riesgo — <b>confírmalos antes de operar</b>. No es consejo financiero.
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
