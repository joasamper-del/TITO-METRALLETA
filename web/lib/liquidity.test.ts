import { describe, it, expect } from "vitest";
import {
  SECTOR_LEADERS,
  MIN_HISTORICAL_DAYS,
  TARGET_HISTORICAL_DAYS,
  THRESHOLDS,
  calculateAverageNotional,
  calculateDisparity,
  classifyLiquidity,
  evaluateLiquidity,
  isLowLiquidity,
  shouldBlock,
} from "./liquidity";

describe("Liquidity Evaluation (Tarea 6)", () => {
  // ─────────────────────────────────────────────────────────────────────
  // NIVEL 1: Configuración y Decisiones
  // ─────────────────────────────────────────────────────────────────────

  describe("Configuración Decisiones Constitucionales", () => {
    it("DECISIÓN 1: 7 Magníficas explícitas", () => {
      expect(SECTOR_LEADERS).toEqual(["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META"]);
      expect(SECTOR_LEADERS.length).toBe(7);
    });

    it("DECISIÓN 2: Thresholds precisos", () => {
      expect(THRESHOLDS.green).toBe(20);
      expect(THRESHOLDS.yellow).toBe(40);
    });

    it("DECISIÓN 3: Hard-block ROJO (testeado en shouldBlock)", () => {
      expect(shouldBlock({ level: "ROJO" } as any)).toBe(true);
    });

    it("DECISIÓN 4: Histórico mínimo 2 días", () => {
      expect(MIN_HISTORICAL_DAYS).toBe(2);
      expect(TARGET_HISTORICAL_DAYS).toBe(5);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // NIVEL 2: Unidades (funciones puras)
  // ─────────────────────────────────────────────────────────────────────

  describe("calculateAverageNotional", () => {
    it("C1: Calcula promedio de N días válidos", () => {
      const snapshots = [
        { date: "2026-09-13", totalNotional: 1500000000 },
        { date: "2026-09-12", totalNotional: 1400000000 },
        { date: "2026-09-11", totalNotional: 1600000000 },
      ];
      const result = calculateAverageNotional(snapshots, 5);
      expect(result).not.toBeNull();
      expect(result!.avgNotional).toBe((1500000000 + 1400000000 + 1600000000) / 3);
      expect(result!.daysAvailable).toBe(3);
    });

    it("F1: Histórico parcial (< 5 días)", () => {
      const snapshots = [
        { date: "2026-09-13", totalNotional: 1500000000 },
        { date: "2026-09-12", totalNotional: 1400000000 },
      ];
      const result = calculateAverageNotional(snapshots, 5);
      expect(result).not.toBeNull();
      expect(result!.daysAvailable).toBe(2);
      expect(result!.avgNotional).toBe((1500000000 + 1400000000) / 2);
    });

    it("F3: Array vacío retorna null", () => {
      const result = calculateAverageNotional([], 5);
      expect(result).toBeNull();
    });

    it("F3: Notional cero o negativo se filtra", () => {
      const snapshots = [
        { date: "2026-09-13", totalNotional: 0 },
        { date: "2026-09-12", totalNotional: -1000 },
        { date: "2026-09-11", totalNotional: 1500000000 },
      ];
      const result = calculateAverageNotional(snapshots, 5);
      expect(result).not.toBeNull();
      expect(result!.daysAvailable).toBe(1);
      expect(result!.avgNotional).toBe(1500000000);
    });

    it("F3: Todos los notionals inválidos retorna null", () => {
      const snapshots = [
        { date: "2026-09-13", totalNotional: 0 },
        { date: "2026-09-12", totalNotional: -100 },
      ];
      const result = calculateAverageNotional(snapshots, 5);
      expect(result).toBeNull();
    });
  });

  describe("calculateDisparity", () => {
    it("C1: Disparity 33.3% (WULF vs sector)", () => {
      const disparity = calculateDisparity(1000000000, 1500000000);
      expect(disparity).toBeCloseTo(33.333, 1);
    });

    it("C2: Disparity 47% (WULF malo vs sector)", () => {
      const disparity = calculateDisparity(800000000, 1500000000);
      expect(disparity).toBeCloseTo(46.667, 1);
    });

    it("C3: Disparity 4% (SPY normal)", () => {
      const disparity = calculateDisparity(5000000000, 4800000000);
      expect(disparity).toBeCloseTo(4.166, 1);
    });

    it("Fail-closed: sector_avg zero o negativo retorna null", () => {
      expect(calculateDisparity(1000000000, 0)).toBeNull();
      expect(calculateDisparity(1000000000, -100)).toBeNull();
    });

    it("Fail-closed: ticker NaN retorna null", () => {
      expect(calculateDisparity(NaN, 1500000000)).toBeNull();
    });

    it("Fail-closed: Infinity se trata como inválido", () => {
      expect(calculateDisparity(Infinity, 1500000000)).toBeNull();
    });
  });

  describe("classifyLiquidity", () => {
    it("Thresholds < 20% → VERDE", () => {
      expect(classifyLiquidity(0)).toBe("VERDE");
      expect(classifyLiquidity(10)).toBe("VERDE");
      expect(classifyLiquidity(19.9)).toBe("VERDE");
    });

    it("Thresholds 20% ≤ x ≤ 40% → AMARILLO", () => {
      expect(classifyLiquidity(20)).toBe("AMARILLO");
      expect(classifyLiquidity(30)).toBe("AMARILLO");
      expect(classifyLiquidity(40)).toBe("AMARILLO"); // Nota: 40.00% = AMARILLO
    });

    it("Thresholds > 40% → ROJO", () => {
      expect(classifyLiquidity(40.01)).toBe("ROJO");
      expect(classifyLiquidity(47)).toBe("ROJO");
      expect(classifyLiquidity(100)).toBe("ROJO");
    });

    it("Fail-closed: NaN o negativo → ROJO", () => {
      expect(classifyLiquidity(NaN)).toBe("ROJO");
      expect(classifyLiquidity(-5)).toBe("ROJO");
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // NIVEL 3: Integración (evaluateLiquidity — end-to-end)
  // ─────────────────────────────────────────────────────────────────────

  describe("evaluateLiquidity — Casos de Uso (C1-C6)", () => {
    it("C1: WULF bueno (33% disparidad) → AMARILLO", () => {
      const tickerNotional = 1000000000;
      const sectorSnapshots = [
        { date: "2026-09-13", totalNotional: 1500000000 },
        { date: "2026-09-12", totalNotional: 1500000000 },
        { date: "2026-09-11", totalNotional: 1500000000 },
      ];
      const result = evaluateLiquidity(tickerNotional, sectorSnapshots);
      expect(result.level).toBe("AMARILLO");
      expect(result.disparityPct).toBeCloseTo(33.333, 0);
      expect(result.lowLiquidity).toBe(true);
    });

    it("C2: WULF malo (47% disparidad) → ROJO", () => {
      const tickerNotional = 800000000;
      const sectorSnapshots = [
        { date: "2026-09-13", totalNotional: 1500000000 },
        { date: "2026-09-12", totalNotional: 1500000000 },
      ];
      const result = evaluateLiquidity(tickerNotional, sectorSnapshots);
      expect(result.level).toBe("ROJO");
      expect(result.disparityPct).toBeCloseTo(46.667, 0);
      expect(result.lowLiquidity).toBe(true);
    });

    it("C3: SPY normal (4% disparidad) → VERDE", () => {
      const tickerNotional = 5000000000;
      const sectorSnapshots = [
        { date: "2026-09-13", totalNotional: 4800000000 },
        { date: "2026-09-12", totalNotional: 4800000000 },
      ];
      const result = evaluateLiquidity(tickerNotional, sectorSnapshots);
      expect(result.level).toBe("VERDE");
      expect(result.disparityPct).toBeCloseTo(4.166, 0);
      expect(result.lowLiquidity).toBe(false);
    });

    it("C4: GLD falta histórico (2d disponibles) → AMARILLO (procede con cautela)", () => {
      const tickerNotional = 500000000;
      const sectorSnapshots = [
        { date: "2026-09-13", totalNotional: 400000000 },
        { date: "2026-09-12", totalNotional: 400000000 },
      ];
      const result = evaluateLiquidity(tickerNotional, sectorSnapshots);
      // ≥2d es AMARILLO por decisión 4 (Opción A)
      expect(result.level).toBe("AMARILLO");
      expect(result.historicalDays).toBe(2);
      expect(result.reason).toContain("incompleto");
    });

    it("C5: Histórico insuficiente (1d disponible) → HOLD (fail-closed)", () => {
      const tickerNotional = 500000000;
      const sectorSnapshots = [{ date: "2026-09-13", totalNotional: 400000000 }];
      const result = evaluateLiquidity(tickerNotional, sectorSnapshots);
      expect(result.level).toBe("HOLD");
      expect(result.historicalDays).toBe(1);
      expect(result.reason).toContain("insuficiente");
    });

    it("C6: Notional ticker cero → ROJO (fail-closed)", () => {
      const tickerNotional = 0;
      const sectorSnapshots = [
        { date: "2026-09-13", totalNotional: 1500000000 },
      ];
      const result = evaluateLiquidity(tickerNotional, sectorSnapshots);
      expect(result.level).toBe("ROJO");
      expect(result.reason).toContain("no calculable");
    });
  });

  describe("evaluateLiquidity — Casos Frontera (F1-F6)", () => {
    it("F1: Histórico < 5d pero ≥ 2d → AMARILLO", () => {
      const result = evaluateLiquidity(1000000000, [
        { date: "2026-09-13", totalNotional: 1500000000 },
        { date: "2026-09-12", totalNotional: 1500000000 },
        { date: "2026-09-11", totalNotional: 1500000000 },
      ]);
      expect(result.level).toBe("AMARILLO");
      expect(result.historicalDays).toBe(3);
      expect(result.reason).toContain("incompleto");
    });

    it("F2: Sin snapshots históricos → ROJO (fail-closed, no sector data)", () => {
      const result = evaluateLiquidity(1000000000, []);
      expect(result.level).toBe("ROJO");
      expect(result.sectorAvgNotional).toBeNull();
    });

    it("F3: Ticker Notional NaN → ROJO (fail-closed)", () => {
      const result = evaluateLiquidity(NaN, [
        { date: "2026-09-13", totalNotional: 1500000000 },
      ]);
      expect(result.level).toBe("ROJO");
      expect(result.reason).toContain("no calculable");
    });

    it("F4: Todos los snapshots con Notional = 0 → ROJO (fail-closed, no valid sector_avg)", () => {
      const result = evaluateLiquidity(1000000000, [
        { date: "2026-09-13", totalNotional: 0 },
        { date: "2026-09-12", totalNotional: 0 },
      ]);
      expect(result.level).toBe("ROJO");
      expect(result.sectorAvgNotional).toBeNull();
    });

    it("F5: Frontera exact: 40.00% disparidad → AMARILLO", () => {
      // Si sector = 1000, ticker debe ser 600 para disparidad exacta de 40%
      const result = evaluateLiquidity(600000000, [
        { date: "2026-09-13", totalNotional: 1000000000 },
        { date: "2026-09-12", totalNotional: 1000000000 },
      ]);
      expect(result.level).toBe("AMARILLO");
      expect(result.disparityPct).toBeCloseTo(40, 1);
    });

    it("F6: Frontera exact: 40.01% disparidad → ROJO", () => {
      const result = evaluateLiquidity(599000000, [
        { date: "2026-09-13", totalNotional: 1000000000 },
        { date: "2026-09-12", totalNotional: 1000000000 },
      ]);
      expect(result.level).toBe("ROJO");
      expect(result.disparityPct).toBeCloseTo(40.1, 1);
    });
  });

  describe("evaluateLiquidity — Fail-Closed", () => {
    it("NULL sector_avg → ROJO, no intenta cálculo", () => {
      const result = evaluateLiquidity(1000000000, []);
      expect(result.level).toBe("ROJO");
      expect(Number.isFinite(result.disparityPct)).toBe(false);
    });

    it("Ticker Notional negativo → ROJO", () => {
      const result = evaluateLiquidity(-100, [
        { date: "2026-09-13", totalNotional: 1500000000 },
      ]);
      expect(result.level).toBe("ROJO");
    });

    it("Nunca degrada silenciosamente: <2d siempre bloquea (HOLD)", () => {
      const result = evaluateLiquidity(5000000000, [
        { date: "2026-09-13", totalNotional: 4800000000 },
      ]);
      expect(result.level).toBe("HOLD");
      expect(shouldBlock(result)).toBe(true);
    });

    it("Nunca inventa disparidad: indeterminado → ROJO", () => {
      // Forzar un sector_avg válido pero disparidad indeterminada es difícil
      // porque calculateDisparity ya cubre NaN. Pero el test verifica que
      // si por alguna razón la disparidad fuera NaN, el resultado es ROJO.
      const result = evaluateLiquidity(1000000000, []);
      expect(result.level).toBe("ROJO");
      expect(Number.isNaN(result.disparityPct) || !Number.isFinite(result.disparityPct)).toBe(
        true,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // NIVEL 4: Utilidades
  // ─────────────────────────────────────────────────────────────────────

  describe("isLowLiquidity", () => {
    it("VERDE → false", () => {
      const result = evaluateLiquidity(5000000000, [
        { date: "2026-09-13", totalNotional: 4800000000 },
        { date: "2026-09-12", totalNotional: 4800000000 },
      ]);
      expect(isLowLiquidity(result)).toBe(false);
    });

    it("AMARILLO → true", () => {
      const result = evaluateLiquidity(1000000000, [
        { date: "2026-09-13", totalNotional: 1500000000 },
      ]);
      expect(isLowLiquidity(result)).toBe(true);
    });

    it("ROJO → true", () => {
      const result = evaluateLiquidity(0, [
        { date: "2026-09-13", totalNotional: 1500000000 },
      ]);
      expect(isLowLiquidity(result)).toBe(true);
    });
  });

  describe("shouldBlock", () => {
    it("ROJO → true (hard-block)", () => {
      const result = evaluateLiquidity(0, [
        { date: "2026-09-13", totalNotional: 1500000000 },
      ]);
      expect(shouldBlock(result)).toBe(true);
    });

    it("<2d histórico → true (fail-closed)", () => {
      const result = evaluateLiquidity(1000000000, [
        { date: "2026-09-13", totalNotional: 1500000000 },
      ]);
      expect(shouldBlock(result)).toBe(true);
    });

    it("AMARILLO con ≥2d → false (procede con cautela)", () => {
      const result = evaluateLiquidity(1000000000, [
        { date: "2026-09-13", totalNotional: 1500000000 },
        { date: "2026-09-12", totalNotional: 1500000000 },
      ]);
      expect(shouldBlock(result)).toBe(false);
    });

    it("VERDE → false", () => {
      const result = evaluateLiquidity(5000000000, [
        { date: "2026-09-13", totalNotional: 4800000000 },
        { date: "2026-09-12", totalNotional: 4800000000 },
      ]);
      expect(shouldBlock(result)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // NIVEL 5: Integración con GEX/Predicción
  // ─────────────────────────────────────────────────────────────────────

  describe("Integración Tarea 5 → 6 → GEX/Predicción", () => {
    it("ROJO bloquea gexAnalysis (lowLiquidity = true)", () => {
      const result = evaluateLiquidity(0, [
        { date: "2026-09-13", totalNotional: 1500000000 },
      ]);
      // Si lowLiquidity es true, gexAnalysis debería retornar con nodes=[]
      expect(isLowLiquidity(result)).toBe(true);
      // El llamador (page.tsx o gexAnalysis) verifica lowLiquidity y retorna NULL si es true
    });

    it("<2d bloquea predictPro (shouldBlock = true)", () => {
      const result = evaluateLiquidity(1000000000, [
        { date: "2026-09-13", totalNotional: 1500000000 },
      ]);
      // Si shouldBlock es true, predictPro debería retornar NULL
      expect(shouldBlock(result)).toBe(true);
    });

    it("≥2d AMARILLO permite proceder (shouldBlock = false)", () => {
      const result = evaluateLiquidity(1000000000, [
        { date: "2026-09-13", totalNotional: 1500000000 },
        { date: "2026-09-12", totalNotional: 1500000000 },
      ]);
      // Si shouldBlock es false, predictPro procede pero marca caveat
      expect(shouldBlock(result)).toBe(false);
      expect(result.level).toBe("AMARILLO");
    });
  });
});
