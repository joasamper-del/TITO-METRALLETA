"use client";

// Badge de veredicto compartido por TODA la app. Un solo componente para que el
// estado COMPRAR / ESPERAR / NO OPERAR se vea igual en el descubridor, la vista
// Ticker, el header, la watchlist y las alertas. Colorea por acción + sesgo:
// verde calls · rojo puts · ámbar esperar · gris NO OPERAR.

import type { UnifiedVerdict } from "@/lib/verdict";

const KEY = (v: Pick<UnifiedVerdict, "action" | "bias">) =>
  `${v.action.toLowerCase()}-${v.bias}`;

export default function VerdictBadge({
  verdict,
  showPct = true,
  size = "sm",
}: {
  verdict: Pick<UnifiedVerdict, "action" | "bias" | "confidencePct" | "label">;
  showPct?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <span className={`vb vb-${KEY(verdict)} vb-${size}`}>
      <style>{CSS}</style>
      {verdict.label}
      {showPct && <em>{verdict.confidencePct}%</em>}
    </span>
  );
}

const CSS = `
.vb { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
  font-weight: 800; letter-spacing: .03em; border-radius: 999px;
  background: var(--panel-2); color: var(--muted); }
.vb-sm { font-size: 11px; padding: 3px 8px; }
.vb-md { font-size: 13px; padding: 5px 12px; }
.vb em { font-style: normal; font-weight: 700; opacity: .85; font-variant-numeric: tabular-nums; }
.vb-sm em { font-size: 10px; }
.vb-md em { font-size: 11px; }
.vb-comprar-alcista { background: var(--green-bg); color: var(--green-dark); }
.vb-comprar-bajista { background: var(--red-bg); color: #b42318; }
.vb-esperar-alcista, .vb-esperar-bajista, .vb-esperar-neutral {
  background: var(--amber-bg); color: var(--amber-text); }
.vb-no_operar-alcista, .vb-no_operar-bajista, .vb-no_operar-neutral {
  background: var(--panel-2); color: var(--faint); }
`;
