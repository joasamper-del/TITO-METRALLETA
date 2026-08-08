"use client";

import { useState } from "react";
import NavTabs from "@/app/components/NavTabs";
import AlertsCard from "@/app/components/AlertsCard";

export default function AlertasPage() {
  const [filter, setFilter] = useState("");
  const [applied, setApplied] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setApplied(filter.trim().toUpperCase());
  }

  return (
    <main className="wrap">
      <div className="header">
        <NavTabs standalone />
        <h1>Alertas · TradingView</h1>
        <p>Buzón de señales que TradingView envía por webhook para que Tito las procese.</p>
      </div>

      <form className="searchbar" onSubmit={submit}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por ticker — SPY, NVDA… (vacío = todas)"
          spellCheck={false}
        />
        <button type="submit">Filtrar</button>
        {applied && (
          <button
            type="button"
            onClick={() => {
              setFilter("");
              setApplied("");
            }}
          >
            Limpiar
          </button>
        )}
      </form>

      <AlertsCard ticker={applied || undefined} />
    </main>
  );
}
