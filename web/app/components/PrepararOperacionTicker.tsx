"use client";

// Preparar operación — vista Ticker (Fase 2). Para una tesis multi-día, el
// instrumento concreto es el subyacente: arma una orden de ACCIONES (comprar si
// el sesgo es alcista, vender si es bajista), dimensionada al perfil de riesgo.
// Solo aparece si el veredicto es OPERAR (gate). NO coloca nada.

import { useEffect, useState } from "react";
import type { ProPrediction } from "@/lib/prediction";
import { canPrepareTrade, fromPrediction } from "@/lib/verdict";
import type { OrderSpec } from "@/lib/orderTicket";
import { DEFAULT_PROFILE, loadProfile } from "./RiskProfileCard";
import PrepararOperacion from "./PrepararOperacion";

const money0 = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export default function PrepararOperacionTicker({
  ticker,
  prediction,
}: {
  ticker: string;
  prediction: ProPrediction | null;
}) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  useEffect(() => setProfile(loadProfile()), []);

  if (!prediction) return null;
  const uv = fromPrediction(prediction);
  if (!canPrepareTrade(uv)) return null;

  // Sizing por capital a desplegar = cuenta × tolerancia%. Acciones = budget / spot.
  const budget = (profile.accountSize * profile.tolerancePct) / 100;
  const shares = prediction.spot > 0 ? Math.floor(budget / prediction.spot) : null;

  const spec: OrderSpec = {
    side: prediction.direction === "up" ? "buy" : "sell",
    ticker,
    instrument: "equity",
    label: prediction.direction === "up" ? "COMPRAR acciones" : "VENDER acciones",
    quantity: shares,
    limit: prediction.spot,
  };

  return (
    <PrepararOperacion
      spec={spec}
      budgetNote={`presupuesto ${money0(budget)} (${profile.tolerancePct}% de ${money0(profile.accountSize)})`}
    />
  );
}
