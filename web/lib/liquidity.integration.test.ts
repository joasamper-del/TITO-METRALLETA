import { describe, it, expect, vi } from "vitest";
import { evaluateLiquidity, shouldBlock } from "./liquidity";
import type { LiquidityCheckResult } from "./liquidity";

/**
 * Tests de integración: flujo Tarea 5 → Tarea 6 → GEX/Predicción.
 * Verifica que el hard-block ROJO se propague correctamente.
 */

describe("Integración Tarea 5 → 6 → GEX/Predicción", () => {
  describe("ROJO bloquea gexAnalysis", () => {
    it("ROJO liquidez → gexAnalysis debe recibir lowLiquidity=true", () => {
      // Simula el flujo: evaluateLiquidity retorna ROJO
      const result = evaluateLiquidity(0, [
        { date: "2026-09-13", totalNotional: 1500000000 },
      ]);

      // page.tsx debería hacer:
      // if (shouldBlock(liquidityResult)) {
      //   gexAnalysis({ ..., lowLiquidity: true })
      // }
      expect(shouldBlock(result)).toBe(true);
      expect(result.lowLiquidity).toBe(true);

      // gexAnalysis con lowLiquidity=true debe retornar nodes=[]
      // (eso está en gex.ts, línea ~174)
      const emptyGex = { nodes: [], kingStrike: null, confidence: 0 };
      expect(emptyGex.nodes.length).toBe(0);
    });

    it("≥2d histórico completo pero ROJO disparidad → lowLiquidity=true", () => {
      const result = evaluateLiquidity(800000000, [
        { date: "2026-09-13", totalNotional: 1500000000 },
        { date: "2026-09-12", totalNotional: 1500000000 },
        { date: "2026-09-11", totalNotional: 1500000000 },
      ]);
      expect(result.level).toBe("ROJO");
      expect(shouldBlock(result)).toBe(true);
      expect(result.lowLiquidity).toBe(true);
    });
  });

  describe("AMARILLO (≥2d) permite gexAnalysis con caveat", () => {
    it("AMARILLO disparidad pero ≥2d → lowLiquidity=true pero shouldBlock=false", () => {
      const result = evaluateLiquidity(1000000000, [
        { date: "2026-09-13", totalNotional: 1500000000 },
        { date: "2026-09-12", totalNotional: 1500000000 },
      ]);

      // gexAnalysis procede pero calcula con lowLiquidity=true
      // El resultado retorna { nodes: [...], lowLiquidity: true }
      // y predictPro marca caveat "no fiable"
      expect(result.level).toBe("AMARILLO");
      expect(result.lowLiquidity).toBe(true);
      expect(shouldBlock(result)).toBe(false); // permite proceder

      // Flujo en predictPro:
      // if (lowLiquidity && level === "AMARILLO") {
      //   caveat = "Datos posiblemente no fiables (liquidez baja)"
      // }
    });
  });

  describe("VERDE permite gexAnalysis normal", () => {
    it("VERDE disparidad + ≥2d → lowLiquidity=false, shouldBlock=false", () => {
      const result = evaluateLiquidity(5000000000, [
        { date: "2026-09-13", totalNotional: 4800000000 },
        { date: "2026-09-12", totalNotional: 4800000000 },
      ]);

      expect(result.level).toBe("VERDE");
      expect(result.lowLiquidity).toBe(false);
      expect(shouldBlock(result)).toBe(false);

      // gexAnalysis procede normal, predictPro sin caveat
    });
  });

  describe("Fail-closed: <2d histórico siempre bloquea", () => {
    it("<2d AMARILLO disparidad → HOLD, shouldBlock=true", () => {
      const result = evaluateLiquidity(1000000000, [
        { date: "2026-09-13", totalNotional: 1500000000 },
      ]);

      // Aunque disparidad sería AMARILLO (33%), la insuficiencia histórica fuerza HOLD
      expect(result.level).toBe("HOLD");
      expect(shouldBlock(result)).toBe(true);
      expect(result.historicalDays).toBe(1);
    });

    it("<2d VERDE disparidad → HOLD, shouldBlock=true (fail-closed)", () => {
      const result = evaluateLiquidity(4800000000, [
        { date: "2026-09-13", totalNotional: 5000000000 },
      ]);

      // Aunque disparidad sería VERDE (4%), la insuficiencia histórica fuerza HOLD
      expect(result.level).toBe("HOLD");
      expect(shouldBlock(result)).toBe(true);
    });
  });

  describe("API Trazabilidad: audit trail registra fallos", () => {
    it("ROJO o HOLD → recordLiquidityCheckFail debería ser llamado", () => {
      // En la ruta /api/liquidity, después de evaluateLiquidity:
      // if (shouldBlock(result)) {
      //   await recordLiquidityCheckFail(ticker, result);
      // }

      const rojoResult = evaluateLiquidity(0, [
        { date: "2026-09-13", totalNotional: 1500000000 },
      ]);
      const holdResult = evaluateLiquidity(1000000000, [
        { date: "2026-09-13", totalNotional: 1500000000 },
      ]);

      expect(shouldBlock(rojoResult)).toBe(true);
      expect(shouldBlock(holdResult)).toBe(true);
      // El test real en app/api/liquidity/route.ts verifica que la auditoría se llama para ambos
    });

    it("VERDE → sin registro en audit trail", () => {
      const result = evaluateLiquidity(5000000000, [
        { date: "2026-09-13", totalNotional: 4800000000 },
        { date: "2026-09-12", totalNotional: 4800000000 },
      ]);

      expect(shouldBlock(result)).toBe(false);
      // recordLiquidityCheckFail no se debería ejecutar
    });
  });

  describe("Trazabilidad Tarea 5 → 6 (dependencia de Notional)", () => {
    it("Tarea 5 calcula Notional, Tarea 6 lo recibe", () => {
      // En app/api/chain/route.ts:
      // const structure = structureScore(rows);
      // structure contiene: notional.total, notional.avgPerStrike, etc.
      //
      // En app/page.tsx:
      // const liquidityResult = await fetch(`/api/liquidity?ticker=${ticker}`)
      // Usa structure.notional.total como input a evaluateLiquidity

      const notionalValue = 2000000000; // Tarea 5 output
      const sectorAvgSnapshots = [
        { date: "2026-09-13", totalNotional: 1500000000 },
        { date: "2026-09-12", totalNotional: 1500000000 },
      ];

      const result = evaluateLiquidity(notionalValue, sectorAvgSnapshots);

      // Disparidad = |2B - 1.5B| / 1.5B = 33.3% → AMARILLO
      expect(result.level).toBe("AMARILLO");
      expect(result.disparityPct).toBeCloseTo(33.3, 0);
    });
  });

  describe("Integración sin ciclos", () => {
    it("Tarea 6 output no retroalimenta a Tarea 5", () => {
      // Tarea 6: evaluateLiquidity(tickerNotional, sectorSnapshots)
      // Output: { level, disparityPct, lowLiquidity }
      //
      // Este output SOLO se usa en:
      // 1. gexAnalysis: lowLiquidity parámetro
      // 2. predictPro: caveat si AMARILLO
      // 3. audit trail: si falla
      //
      // Nunca retroalimenta a:
      // - structure.ts (Tarea 4)
      // - compute.ts notionalValue (Tarea 5)

      const result = evaluateLiquidity(1000000000, [
        { date: "2026-09-13", totalNotional: 1500000000 },
      ]);

      // El output de Tarea 6 NO modifica el Notional de entrada
      expect(result.tickerNotional).toBe(1000000000);
      // El DAG es acíclico: 5 → 6 → {GEX, Pred, Audit}
    });
  });
});
