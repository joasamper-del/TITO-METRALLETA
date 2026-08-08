import { describe, expect, it } from "vitest";
import {
  atmIV,
  buildChainTable,
  buildForecast,
  closingForecast,
  dealerFlow,
  etDate,
  expirationDates,
  hoursToClose,
  shortTermOutlook,
  summarize,
  topByVolume,
  toSchwabSymbol,
  zeroDteGex,
} from "./zerodte";
import type { ZeroDteGex } from "./zerodte";
import type { ContractType, Row } from "./types";

/** Row mínima: solo lo que mira el ranking. */
function row(
  contractType: ContractType,
  strike: number,
  volume: number,
  extra: { oi?: number; iv?: number; gamma?: number } = {},
): Row {
  return {
    optionTicker: `O:SPXW260724${contractType === "call" ? "C" : "P"}${strike}`,
    contractType,
    expiration: "2026-07-24",
    strike,
    openInterest: extra.oi ?? 0,
    volume,
    price: null,
    priceSource: "none",
    openPremium: null,
    notionalValue: 0,
    greeks: extra.iv == null && extra.gamma == null ? null : {
      delta: null, gamma: extra.gamma ?? null, theta: null, vega: null, rho: null,
      iv: extra.iv ?? null,
    },
  };
}

describe("toSchwabSymbol", () => {
  it("antepone $ a los índices — pedir SPX a secas responde 400", () => {
    expect(toSchwabSymbol("SPX")).toBe("$SPX");
    expect(toSchwabSymbol("NDX")).toBe("$NDX");
  });

  it("deja los ETF y acciones tal cual", () => {
    expect(toSchwabSymbol("SPY")).toBe("SPY");
    expect(toSchwabSymbol("QQQ")).toBe("QQQ");
  });

  it("normaliza espacios y minúsculas", () => {
    expect(toSchwabSymbol("  spx ")).toBe("$SPX");
  });

  it("devuelve cadena vacía si no hay ticker", () => {
    expect(toSchwabSymbol("   ")).toBe("");
  });
});

describe("expirationDates", () => {
  it("hoy + N días hábiles, saltando fin de semana", () => {
    // 2026-07-24 es viernes. hoy=vie, +1 debe saltar sab/dom -> lunes 27, etc.
    const d = expirationDates(new Date("2026-07-24T15:00:00Z"), 3);
    expect(d[0]).toBe("2026-07-24");
    expect(d).toHaveLength(4);
    expect(d).not.toContain("2026-07-25"); // sábado
    expect(d).not.toContain("2026-07-26"); // domingo
    expect(d[1]).toBe("2026-07-27"); // lunes
  });

  it("devuelve count+1 fechas (hoy incluido)", () => {
    expect(expirationDates(new Date("2026-07-22T15:00:00Z"), 5)).toHaveLength(6);
  });
});

describe("etDate", () => {
  it("da la fecha de Nueva York, no la de UTC", () => {
    // 2026-07-25T01:30:00Z son las 21:30 ET del día 24: en ET todavía es día 24.
    // Derivar la fecha de UTC pediría el vencimiento equivocado.
    expect(etDate(new Date("2026-07-25T01:30:00Z"))).toBe("2026-07-24");
  });

  it("a media sesión coincide con la fecha UTC", () => {
    expect(etDate(new Date("2026-07-24T15:30:00Z"))).toBe("2026-07-24");
  });
});

describe("topByVolume", () => {
  const rows = [
    row("call", 7450, 300),
    row("call", 7460, 500),
    row("call", 7470, 100),
    row("put", 7400, 900),
    row("put", 7410, 50),
  ];

  it("ordena por volumen descendente y solo del lado pedido", () => {
    expect(topByVolume(rows, "call", 2).map((r) => r.strike)).toEqual([7460, 7450]);
  });

  it("no mezcla calls con puts", () => {
    expect(topByVolume(rows, "put", 5).map((r) => r.strike)).toEqual([7400, 7410]);
  });

  it("devuelve menos de n si no hay suficientes contratos", () => {
    expect(topByVolume(rows, "put", 10)).toHaveLength(2);
  });
});

describe("buildChainTable", () => {
  // Los dos rankings son independientes: los strikes ganadores de cada lado
  // no tienen por qué coincidir.
  const rows = [
    row("call", 7500, 900), row("put", 7500, 1),
    row("call", 7450, 800), row("put", 7450, 2),
    row("call", 7400, 3), row("put", 7400, 700),
    row("call", 7350, 4), row("put", 7350, 600),
  ];

  it("ordena de mayor a menor strike, no por volumen", () => {
    const t = buildChainTable(rows, 2);
    expect(t.map((l) => l.strike)).toEqual([7500, 7450, 7400, 7350]);
  });

  it("une los dos rankings: hasta 2n strikes distintos", () => {
    expect(buildChainTable(rows, 2)).toHaveLength(4);
  });

  it("rellena el lado que no clasificó en vez de dejarlo vacío", () => {
    // 7400 entró por sus puts; su columna de calls debe traer el dato real.
    const line = buildChainTable(rows, 2).find((l) => l.strike === 7400)!;
    expect(line.from).toBe("put");
    expect(line.call?.volume).toBe(3);
    expect(line.put?.volume).toBe(700);
  });

  it("marca 'both' cuando el strike gana por los dos lados", () => {
    const both = [row("call", 7450, 900), row("put", 7450, 900)];
    expect(buildChainTable(both, 1)[0].from).toBe("both");
  });

  it("descarta los strikes que no entraron en ningún ranking", () => {
    const t = buildChainTable(rows, 1);
    expect(t.map((l) => l.strike)).toEqual([7500, 7400]);
  });
});

describe("summarize", () => {
  const rows = [
    row("call", 7450, 800), row("call", 7460, 200),
    row("put", 7400, 600), row("put", 7410, 400),
  ];

  it("encuentra el strike de mayor volumen de cada lado", () => {
    const s = summarize(rows);
    expect(s.maxCallStrike).toBe(7450);
    expect(s.maxCallVolume).toBe(800);
    expect(s.maxPutStrike).toBe(7400);
    expect(s.maxPutVolume).toBe(600);
  });

  it("no mezcla lados al buscar el máximo", () => {
    // El put de 7400 (600) supera al call de 7460 (200): cada lado va aparte.
    const s = summarize(rows);
    expect(s.maxCallStrike).not.toBe(7400);
  });

  it("suma los totales de cada lado y calcula el ratio", () => {
    const s = summarize(rows);
    expect(s.callVolume).toBe(1000);
    expect(s.putVolume).toBe(1000);
    expect(s.putCallRatio).toBe(1);
  });

  it("evita dividir por cero cuando no hay calls", () => {
    const s = summarize([row("put", 7400, 500)]);
    expect(s.putCallRatio).toBeNull();
    expect(s.maxCallStrike).toBeNull();
  });

  it("con la cadena vacía no revienta", () => {
    const s = summarize([]);
    expect(s.maxCallStrike).toBeNull();
    expect(s.maxPutStrike).toBeNull();
    expect(s.callVolume).toBe(0);
  });
});

describe("hoursToClose", () => {
  it("cuenta las horas hasta las 16:00 ET", () => {
    // 16:00 UTC = 12:00 ET en julio (EDT, UTC-4) → faltan 4 horas.
    expect(hoursToClose(new Date("2026-07-24T16:00:00Z"))).toBeCloseTo(4, 5);
  });

  it("cuenta medias horas", () => {
    expect(hoursToClose(new Date("2026-07-24T17:30:00Z"))).toBeCloseTo(2.5, 5);
  });

  it("devuelve 0 una vez cerrado, nunca negativo", () => {
    expect(hoursToClose(new Date("2026-07-24T21:00:00Z"))).toBe(0);
  });
});

describe("atmIV", () => {
  const spot = 7450;

  it("pondera por Open Interest", () => {
    const rows = [
      row("call", 7450, 0, { oi: 900, iv: 0.20 }),
      row("call", 7460, 0, { oi: 100, iv: 0.40 }),
    ];
    // (0.20·900 + 0.40·100) / 1000 = 0.22
    expect(atmIV(rows, spot)!).toBeCloseTo(0.22, 6);
  });

  it("ignora los strikes lejanos, que en 0DTE cotizan con IV disparatada", () => {
    const rows = [
      row("call", 7450, 0, { oi: 100, iv: 0.20 }),
      row("call", 8900, 0, { oi: 9999, iv: 2.9 }), // fuera de ±2%
    ];
    expect(atmIV(rows, spot)!).toBeCloseTo(0.20, 6);
  });

  it("descarta IV por encima del tope de cordura", () => {
    const rows = [
      row("call", 7450, 0, { oi: 100, iv: 0.25 }),
      row("call", 7455, 0, { oi: 100, iv: 5 }),
    ];
    expect(atmIV(rows, spot)!).toBeCloseTo(0.25, 6);
  });

  it("devuelve null si la cadena no trae IV real", () => {
    expect(atmIV([row("call", 7450, 10)], spot)).toBeNull();
  });
});

describe("buildForecast", () => {
  const now = new Date("2026-07-24T16:00:00Z"); // 12:00 ET, 4 h para el cierre
  const spot = 7450;
  const lines = buildChainTable([
    row("call", 7450, 90_000), row("put", 7450, 20_000),
    row("call", 7600, 40_000), row("put", 7600, 5_000),
    row("call", 7300, 5_000), row("put", 7300, 40_000),
    row("call", 7455, 80_000), row("put", 7455, 19_000),
  ], 4);

  it("sin IV no hay pronóstico", () => {
    expect(buildForecast(spot, null, lines, now)).toBeNull();
  });

  it("mantiene el orden estricto bear < base < bull", () => {
    const f = buildForecast(spot, 0.25, lines, now)!;
    const [bear, base, bull] = f.scenarios.map((s) => s.target);
    expect(bear).toBeLessThanOrEqual(base);
    expect(base).toBeLessThanOrEqual(bull);
  });

  it("separa los extremos del base: un escenario pegado al base no es escenario", () => {
    const f = buildForecast(spot, 0.25, lines, now)!;
    const base = f.scenarios.find((s) => s.kind === "base")!.target;
    const bull = f.scenarios.find((s) => s.kind === "bull")!.target;
    // 7455 tiene volumen enorme y esta pegado al base: no debe ganar el alcista.
    expect(bull).not.toBe(7455);
    expect(Math.abs(bull - base)).toBeGreaterThan(f.sigma * 0.4);
  });

  it("recorta los objetivos al cono de 2σ", () => {
    const f = buildForecast(spot, 0.25, lines, now)!;
    for (const s of f.scenarios) {
      expect(s.target).toBeLessThanOrEqual(f.upper2 + 1e-6);
      expect(s.target).toBeGreaterThanOrEqual(f.lower2 - 1e-6);
    }
  });

  it("avisa cuando queda muy poco para el cierre", () => {
    const f = buildForecast(spot, 0.25, lines, new Date("2026-07-24T19:50:00Z"))!;
    expect(f.caveat).toMatch(/30 minutos/);
  });

  it("da σ mayor que cero a media sesión — el fallo que colapsaba los escenarios", () => {
    const f = buildForecast(spot, 0.25, lines, now)!;
    expect(f.sigma).toBeGreaterThan(0);
  });
});

describe("zeroDteGex", () => {
  const spot = 7450;

  it("no descarta los contratos del vencimiento del día", () => {
    // gexAnalysis los filtra con `dte <= 0` y para 0DTE eso es la cadena entera.
    const g = zeroDteGex([row("call", 7450, 0, { oi: 1000, gamma: 0.01 })], spot);
    expect(g.n).toBe(1);
    expect(g.kingStrike).toBe(7450);
  });

  it("los calls suman GEX positivo y los puts negativo", () => {
    const call = zeroDteGex([row("call", 7450, 0, { oi: 100, gamma: 0.01 })], spot);
    const put = zeroDteGex([row("put", 7450, 0, { oi: 100, gamma: 0.01 })], spot);
    expect(call.totalNetGex).toBeGreaterThan(0);
    expect(put.totalNetGex).toBeLessThan(0);
    expect(call.regime).toBe("positive");
    expect(put.regime).toBe("negative");
  });

  it("el imán es el strike con más gamma total, sin importar el signo", () => {
    const g = zeroDteGex([
      row("call", 7440, 0, { oi: 100, gamma: 0.01 }),
      row("put", 7460, 0, { oi: 9000, gamma: 0.01 }),
    ], spot);
    expect(g.kingStrike).toBe(7460);
  });

  it("encuentra la zona de inversión donde el GEX acumulado cambia de signo", () => {
    const g = zeroDteGex([
      row("put", 7400, 0, { oi: 1000, gamma: 0.01 }),  // acumulado negativo
      row("call", 7500, 0, { oi: 5000, gamma: 0.01 }), // lo cruza a positivo
    ], spot, 0.05);
    expect(g.flipStrike).toBe(7500);
  });

  it("deja el flip en null si nunca cambia de signo", () => {
    const g = zeroDteGex([
      row("call", 7440, 0, { oi: 100, gamma: 0.01 }),
      row("call", 7460, 0, { oi: 100, gamma: 0.01 }),
    ], spot);
    expect(g.flipStrike).toBeNull();
  });

  it("ignora strikes fuera de la ventana y sin Open Interest", () => {
    const g = zeroDteGex([
      row("call", 7450, 0, { oi: 100, gamma: 0.01 }),
      row("call", 9000, 0, { oi: 100, gamma: 0.01 }), // fuera de ±3%
      row("call", 7455, 0, { oi: 0, gamma: 0.01 }),   // sin OI
    ], spot);
    expect(g.n).toBe(1);
  });

  it("reporta qué fracción de contratos traía gamma real", () => {
    const g = zeroDteGex([
      row("call", 7450, 0, { oi: 100, gamma: 0.01 }),
      row("call", 7455, 0, { oi: 100 }), // sin gamma
    ], spot);
    expect(g.realGammaShare).toBeCloseTo(0.5, 6);
    expect(g.n).toBe(1);
  });

  it("con la cadena vacía devuelve un análisis vacío, no revienta", () => {
    const g = zeroDteGex([], spot);
    expect(g.n).toBe(0);
    expect(g.kingStrike).toBeNull();
  });
});

describe("shortTermOutlook", () => {
  const spot = 7450;
  const gex = (over: Partial<ZeroDteGex> = {}): ZeroDteGex => ({
    nodes: [], kingStrike: 7450, flipStrike: null, regime: "positive",
    totalNetGex: 1, realGammaShare: 1, n: 5, ...over,
  });

  it("sin IV no hay panorama", () => {
    expect(shortTermOutlook(spot, null, gex())).toBeNull();
  });

  it("el rango de 5 min es diminuto comparado con el dia", () => {
    const o = shortTermOutlook(spot, 0.25, gex())!;
    expect(o.sigma).toBeGreaterThan(0);
    expect(o.sigma).toBeLessThan(spot * 0.005); // < 0.5% del spot en 5 min
    expect(o.rangeLow).toBeLessThan(spot);
    expect(o.rangeHigh).toBeGreaterThan(spot);
  });

  it("gamma positiva y precio sobre el imán: lateral, confianza media", () => {
    const o = shortTermOutlook(spot, 0.25, gex({ kingStrike: 7450 }))!;
    expect(o.lean).toBe("lateral");
    expect(o.confidence).toBe("media");
  });

  it("gamma positiva y el imán alcanzable arriba: sesgo alcista", () => {
    const base = shortTermOutlook(spot, 0.25, gex())!;
    const magnet = spot + base.sigma * 1.5; // dentro de 2σ
    const o = shortTermOutlook(spot, 0.25, gex({ kingStrike: magnet }))!;
    expect(o.lean).toBe("alcista");
    expect(o.headline).toContain("gravitando");
  });

  it("imán fuera de alcance en 5 min: lateral", () => {
    const o = shortTermOutlook(spot, 0.25, gex({ kingStrike: 8000 }))!;
    expect(o.lean).toBe("lateral");
  });

  it("gamma negativa: avisa de aceleración, no afirma dirección", () => {
    const o = shortTermOutlook(spot, 0.25, gex({ regime: "negative", flipStrike: 7460 }))!;
    expect(o.lean).toBe("lateral");
    expect(o.detail).toMatch(/amplific|acelera/i);
  });

  it("la frase incluye el precio actual y el rango", () => {
    const o = shortTermOutlook(spot, 0.25, gex())!;
    expect(o.headline).toContain("7450");
    expect(o.headline).toMatch(/entre .* y /);
  });
});

describe("dealerFlow", () => {
  const spot = 7450;
  // Cadena simetrica con OI cerca del dinero.
  const rows = [
    row("call", 7455, 0, { oi: 2000 }),
    row("call", 7470, 0, { oi: 1500 }),
    row("put", 7445, 0, { oi: 2000 }),
    row("put", 7430, 0, { oi: 1500 }),
  ];

  it("sin IV o sin tiempo no hay flujo", () => {
    expect(dealerFlow(rows, spot, null, 4)).toBeNull();
    expect(dealerFlow(rows, spot, 0.25, 0)).toBeNull();
  });

  it("la intensidad de charm sube al acercarse el cierre", () => {
    const manana = dealerFlow(rows, spot, 0.25, 6)!;   // recien abierto
    const tarde = dealerFlow(rows, spot, 0.25, 0.5)!;  // ultima media hora
    expect(tarde.charmIntensity).toBeGreaterThan(manana.charmIntensity);
    expect(tarde.charmIntensity).toBeLessThanOrEqual(1);
  });

  it("ignora strikes fuera de la ventana y sin OI", () => {
    const conRuido = [...rows, row("call", 9000, 0, { oi: 9999 }), row("put", 7448, 0, { oi: 0 })];
    const a = dealerFlow(rows, spot, 0.25, 4)!;
    const b = dealerFlow(conRuido, spot, 0.25, 4)!;
    // el strike a 9000 (fuera de +-3%) y el de OI 0 no cambian el neto
    expect(b.netCharm).toBeCloseTo(a.netCharm, 6);
  });

  it("da una nota legible con charm y vanna", () => {
    const f = dealerFlow(rows, spot, 0.25, 3)!;
    expect(f.note).toMatch(/[Cc]harm/);
    expect(["alcista", "bajista", "lateral"]).toContain(f.vannaIfVolDrops);
  });
});

describe("shortTermOutlook con flujo de dealer", () => {
  const spot = 7450;
  const gex = (over: Partial<ZeroDteGex> = {}): ZeroDteGex => ({
    nodes: [], kingStrike: 7450, flipStrike: null, regime: "positive",
    totalNetGex: 1, realGammaShare: 1, n: 5, ...over,
  });
  const rows = [row("call", 7455, 0, { oi: 2000 }), row("put", 7445, 0, { oi: 2000 })];

  it("sin flujo, los campos de charm/vanna van en null", () => {
    const o = shortTermOutlook(spot, 0.25, gex())!;
    expect(o.charmIntensity).toBeNull();
    expect(o.charmNote).toBeNull();
  });

  it("con flujo, expone la intensidad de charm y una nota", () => {
    const f = dealerFlow(rows, spot, 0.25, 1)!; // cerca del cierre
    const o = shortTermOutlook(spot, 0.25, gex(), 5, f)!;
    expect(o.charmIntensity).not.toBeNull();
    expect(o.charmNote).toMatch(/pin|intensifica/i);
  });

  it("en gamma negativa el charm avisa de aceleracion, no de pin", () => {
    const f = dealerFlow(rows, spot, 0.25, 1)!;
    const o = shortTermOutlook(spot, 0.25, gex({ regime: "negative", flipStrike: 7460 }), 5, f)!;
    expect(o.charmNote).toMatch(/acelera/i);
  });
});

describe("closingForecast", () => {
  const spot = 7450;
  const gexOf = (over: Partial<ZeroDteGex> = {}): ZeroDteGex => ({
    nodes: [], kingStrike: 7455, flipStrike: null, regime: "positive",
    totalNetGex: 1, realGammaShare: 1, n: 5, ...over,
  });
  // 15:30 ET = 19:30 UTC en verano -> 30 min al cierre
  const at = (utc: string) => new Date(utc);

  it("fuera de la ultima hora devuelve null", () => {
    // 12:00 ET (16:00 UTC) -> 4 h al cierre, no activo
    expect(closingForecast(spot, 0.25, gexOf(), at("2026-07-24T16:00:00Z"))).toBeNull();
  });

  it("se activa dentro de la ultima hora (3-4pm)", () => {
    const c = closingForecast(spot, 0.25, gexOf(), at("2026-07-24T19:30:00Z"))!;
    expect(c).not.toBeNull();
    expect(c.minutesLeft).toBeCloseTo(30, 0);
  });

  it("redondea el estimado al strike (multiplo de 5)", () => {
    const c = closingForecast(spot, 0.25, gexOf(), at("2026-07-24T19:30:00Z"))!;
    expect(c.strike! % 5).toBe(0);
  });

  it("converge: a menos tiempo, menor sigma restante", () => {
    const temprano = closingForecast(spot, 0.25, gexOf(), at("2026-07-24T19:05:00Z"))!; // ~55 min
    const tarde = closingForecast(spot, 0.25, gexOf(), at("2026-07-24T19:55:00Z"))!;     // ~5 min
    expect(tarde.sigma).toBeLessThan(temprano.sigma);
  });

  it("en gamma positiva apunta al iman si esta a alcance", () => {
    const c = closingForecast(spot, 0.25, gexOf({ kingStrike: 7455 }), at("2026-07-24T19:30:00Z"))!;
    expect(c.estimate).toBeGreaterThan(spot); // gravita hacia 7455
  });

  it("en gamma negativa no ancla: estimado = precio actual, confianza baja", () => {
    const c = closingForecast(spot, 0.25, gexOf({ regime: "negative" }), at("2026-07-24T19:30:00Z"))!;
    expect(c.estimate).toBe(spot);
    expect(c.confidence).toBe("baja");
  });

  it("muy cerca del cierre la confianza sube a alta (gamma positiva)", () => {
    const c = closingForecast(spot, 0.25, gexOf(), at("2026-07-24T19:52:00Z"))!; // ~8 min
    expect(c.confidence).toBe("alta");
  });
});
