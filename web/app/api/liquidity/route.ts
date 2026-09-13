// GET /api/liquidity?ticker=XXX
// Evalúa la liquidez del option chain comparando contra el promedio de las 7 Magníficas.
// Retorna { level, disparityPct, reason, lowLiquidity } para integración en GEX/Predicción.
// Si ROJO (<2d histórico), registra en audit trail y retorna hard-block.

import { loadChainHistory } from "@/lib/chainStore";
import { evaluateLiquidity, shouldBlock, SECTOR_LEADERS } from "@/lib/liquidity";
import { recordLiquidityCheckFail } from "@/lib/liquidityAudit";
import type { LiquidityCheckResult } from "@/lib/liquidity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get("ticker") ?? "").trim().toUpperCase();

  if (!ticker) {
    return Response.json({ error: "Ticker requerido." }, { status: 400 });
  }

  try {
    // Carga el histórico del ticker consultado
    const tickerHistory = await loadChainHistory(ticker);
    if (!tickerHistory || tickerHistory.snapshots.length === 0) {
      return Response.json(
        {
          level: "ROJO",
          disparityPct: NaN,
          reason: `Sin histórico de ${ticker}. Aguardar ≥${2} días.`,
          sectorAvgNotional: null,
          tickerNotional: 0,
          historicalDays: 0,
          lowLiquidity: true,
        } as LiquidityCheckResult,
        { status: 200 },
      );
    }

    // Extrae el notional de hoy (más reciente)
    const todaySnapshot = tickerHistory.snapshots[0];
    if (!todaySnapshot) {
      return Response.json(
        {
          level: "ROJO",
          disparityPct: NaN,
          reason: "Sin datos del día actual.",
          sectorAvgNotional: null,
          tickerNotional: 0,
          historicalDays: 0,
          lowLiquidity: true,
        } as LiquidityCheckResult,
        { status: 200 },
      );
    }

    // Carga el histórico de los 7 Magníficas y combina
    const sectorSnapshots: Array<{ date: string; totalNotional: number }> = [];
    for (const leader of SECTOR_LEADERS) {
      const leaderHistory = await loadChainHistory(leader);
      if (leaderHistory?.snapshots) {
        sectorSnapshots.push(
          ...leaderHistory.snapshots.map((s) => ({
            date: s.date,
            totalNotional: s.totalNotional,
          })),
        );
      }
    }

    // Evalúa liquidez
    const result = evaluateLiquidity(todaySnapshot.totalNotional, sectorSnapshots);

    // Registra en audit trail si falla (ROJO o <2d)
    if (shouldBlock(result)) {
      await recordLiquidityCheckFail(ticker, result);
    }

    return Response.json(result);
  } catch (err) {
    console.error("[/api/liquidity]", err);
    return Response.json(
      { error: "Error evaluando liquidez." },
      { status: 502 },
    );
  }
}
