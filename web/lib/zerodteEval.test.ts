import { describe, expect, it } from "vitest";
import { closeSecFor, reviewForecasts, type EvalBar, type ForecastSnapshot } from "./zerodteEval";

const DATE = "2026-07-24";
const closeSec = closeSecFor(DATE);
const capSec = closeSec - 4 * 3600; // capturada 4 h antes del cierre

function snap(over: Partial<ForecastSnapshot> = {}): ForecastSnapshot {
  return {
    date: DATE,
    savedAt: new Date(capSec * 1000).toISOString(),
    capturedAtSec: capSec,
    spot: 7450,
    bear: 7430,
    base: 7450,
    bull: 7470,
    kingStrike: 7450,
    ...over,
  };
}

/** Barra a `hoursBeforeClose` del cierre. */
function bar(hoursBeforeClose: number, high: number, low: number, close: number): EvalBar {
  return { time: closeSec - hoursBeforeClose * 3600, high, low, close };
}

const AFTER = new Date((closeSec + 3600) * 1000); // una hora tras el cierre

describe("closeSecFor", () => {
  it("da las 16:00 ET en verano (EDT)", () => {
    // 2026-07-24 16:00 EDT = 20:00 UTC
    expect(closeSecFor("2026-07-24")).toBe(Math.floor(Date.parse("2026-07-24T20:00:00Z") / 1000));
  });

  it("da las 16:00 ET en invierno (EST)", () => {
    // 2026-01-15 16:00 EST = 21:00 UTC
    expect(closeSecFor("2026-01-15")).toBe(Math.floor(Date.parse("2026-01-15T21:00:00Z") / 1000));
  });
});

describe("reviewForecasts", () => {
  it("marca la foto como no madura si la sesión no ha cerrado", () => {
    const duringSession = new Date((closeSec - 3600) * 1000);
    const r = reviewForecasts([snap()], [bar(3, 7455, 7445, 7452)], duringSession);
    expect(r.evals[0].matured).toBe(false);
    expect(r.maturedCount).toBe(0);
  });

  it("computa high/low/close de la ventana", () => {
    const r = reviewForecasts([snap()], [
      bar(3, 7460, 7448, 7455),
      bar(2, 7472, 7450, 7468),
      bar(1, 7466, 7440, 7445),
    ], AFTER);
    const e = r.evals[0];
    expect(e.actualHigh).toBe(7472);
    expect(e.actualLow).toBe(7440);
    expect(e.actualClose).toBe(7445);
  });

  it("detecta qué targets tocó el precio", () => {
    const r = reviewForecasts([snap()], [bar(2, 7471, 7449, 7460)], AFTER);
    const e = r.evals[0];
    expect(e.bullTouched).toBe(true);  // llegó a 7471 ≥ 7470
    expect(e.bearTouched).toBe(false); // no bajó a 7430
    expect(e.baseTouched).toBe(true);  // 7450 entre low y high
  });

  it("mide el sesgo firmado del base: precio por encima = subestima", () => {
    // Cierra en 7460, base 7450, spot 7450 → +0.134%
    const r = reviewForecasts([snap()], [bar(1, 7461, 7449, 7460)], AFTER);
    expect(r.biasPct!).toBeCloseTo((10 / 7450) * 100, 4);
    expect(r.meanAbsErrorPct!).toBeCloseTo((10 / 7450) * 100, 4);
  });

  it("elige el mejor escenario por cercanía al cierre", () => {
    const r = reviewForecasts([snap()], [bar(1, 7475, 7450, 7469)], AFTER);
    expect(r.evals[0].best).toBe("bull"); // 7469 más cerca de 7470
  });

  it("ignora barras fuera de la ventana (antes de capturar o tras el cierre)", () => {
    const r = reviewForecasts([snap()], [
      bar(6, 9999, 0, 5000),   // antes de capturar (6 h < ventana de 4 h)
      bar(2, 7460, 7450, 7455),
      { time: closeSec + 7200, high: 9999, low: 0, close: 8000 }, // tras el cierre
    ], AFTER);
    const e = r.evals[0];
    expect(e.actualHigh).toBe(7460);
    expect(e.actualClose).toBe(7455);
  });

  it("sin barras en la ventana no revienta y deja los campos en null", () => {
    const r = reviewForecasts([snap()], [], AFTER);
    expect(r.evals[0].actualClose).toBeNull();
    expect(r.maturedCount).toBe(0);
  });

  it("agrega las tasas de acierto solo sobre fotos maduras", () => {
    const older = snap({ date: "2026-07-23", capturedAtSec: closeSecFor("2026-07-23") - 4 * 3600 });
    const olderClose = closeSecFor("2026-07-23");
    const r = reviewForecasts(
      [snap(), older],
      [
        bar(1, 7472, 7449, 7468),                                 // hoy
        { time: olderClose - 3600, high: 7455, low: 7440, close: 7445 }, // ayer
      ],
      AFTER,
    );
    expect(r.maturedCount).toBe(2);
    expect(r.bullTouchRate).not.toBeNull();
    expect(r.evals).toHaveLength(2);
  });
});

describe("reviewForecasts - pronostico de cierre", () => {
  const AFTER = new Date((closeSec + 3600) * 1000);

  it("mide el error del strike de cierre en puntos", () => {
    // predijo cierre en 7455; cerro en 7458 -> error 3 pts
    const s = snap({ closingStrike: 7455 });
    const r = reviewForecasts([s], [bar(1, 7460, 7450, 7458)], AFTER);
    expect(r.evals[0].closingErrorPts).toBeCloseTo(3, 6);
    expect(r.closingCount).toBe(1);
    expect(r.closingMeanAbsErrorPts).toBeCloseTo(3, 6);
  });

  it("cuenta como acierto si el cierre cae a <=5 pts del strike", () => {
    const r = reviewForecasts(
      [
        snap({ date: "2026-07-24", closingStrike: 7455 }),                                  // cierre 7458 -> 3 pts (acierto)
        snap({ date: "2026-07-23", closingStrike: 7400, capturedAtSec: closeSecFor("2026-07-23") - 3600 }), // cierre 7420 -> 20 pts (fallo)
      ],
      [
        bar(1, 7460, 7450, 7458),
        { time: closeSecFor("2026-07-23") - 1800, high: 7425, low: 7415, close: 7420 },
      ],
      new Date((closeSec + 3600) * 1000),
    );
    expect(r.closingCount).toBe(2);
    expect(r.closingHitRate).toBeCloseTo(50, 0); // 1 de 2
  });

  it("los dias sin pronostico de cierre no cuentan", () => {
    const r = reviewForecasts([snap()], [bar(1, 7460, 7450, 7458)], AFTER); // sin closingStrike
    expect(r.evals[0].closingStrike).toBeNull();
    expect(r.closingCount).toBe(0);
    expect(r.closingHitRate).toBeNull();
  });
});
