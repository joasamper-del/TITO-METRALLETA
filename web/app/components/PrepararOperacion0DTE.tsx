"use client";

// Preparar operación — 0DTE (Fase 2). Cuando el veredicto es COMPRAR, arma el
// OrderSpec (compra de call/put del vencimiento de hoy) desde el veredicto + la
// cadena + el perfil de riesgo, y lo pasa al panel compartido. NO coloca nada.

import { useEffect, useState } from "react";
import type { ZeroDteResult } from "@/lib/zerodte";
import { buildVerdict } from "@/lib/zerodteVerdict";
import { canPrepareTrade, fromZeroDte } from "@/lib/verdict";
import type { OrderSpec } from "@/lib/orderTicket";
import { DEFAULT_PROFILE, loadProfile } from "./RiskProfileCard";
import PrepararOperacion from "./PrepararOperacion";

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export default function PrepararOperacion0DTE({ data }: { data: ZeroDteResult }) {
  const v = buildVerdict(data);

  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  useEffect(() => setProfile(loadProfile()), []);

  // Gate duro: solo un COMPRAR habilita preparar la operación.
  if (!canPrepareTrade(fromZeroDte(v))) return null;

  const right: "call" | "put" = v.bias === "alcista" ? "call" : "put";
  const strike = (right === "call" ? v.levels.resistance : v.levels.support) ?? v.levels.magnet ?? undefined;

  const line = strike != null ? data.lines.find((l) => l.strike === strike) : undefined;
  const row = right === "call" ? line?.call ?? null : line?.put ?? null;
  const limit = row?.price ?? row?.ask ?? null;

  // Sizing: presupuesto = cuenta × tolerancia%. Compra de opción: coste = prima×100.
  const budget = (profile.accountSize * profile.tolerancePct) / 100;
  const costPerContract = limit != null ? limit * 100 : null;
  const quantity = costPerContract && costPerContract > 0 ? Math.floor(budget / costPerContract) : null;

  const spec: OrderSpec = {
    side: "buy",
    ticker: data.ticker,
    instrument: "option",
    label: v.actionLabel, // "COMPRAR CALLS" / "COMPRAR PUTS"
    right,
    strike,
    expiration: data.expiration,
    quantity,
    limit,
  };

  const budgetNote = `presupuesto ${money(budget)} (${profile.tolerancePct}% de ${money(profile.accountSize)})`;

  return <PrepararOperacion spec={spec} budgetNote={budgetNote} />;
}
