import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authedGet,
  dteWindows,
  DTE_WINDOWS,
  parseExpirationKey,
  parseSchwabChain,
  resetSchwabToken,
  toOccTicker,
  toRawContract,
  type SchwabChainResponse,
  type SchwabOption,
} from "./schwab";

// Contrato real devuelto por Schwab (AAPL, 24-jul-2026), recortado.
const SAMPLE: SchwabOption = {
  putCall: "CALL",
  symbol: "AAPL  260724C00322500",
  bid: 1.47,
  ask: 1.68,
  last: 1.59,
  mark: 1.58,
  closePrice: 1.58,
  totalVolume: 0,
  openInterest: 5918,
  volatility: 30.53,
  delta: 0.435,
  gamma: 0.08,
  theta: -1.575,
  vega: 0.064,
  rho: 0.003,
  strikePrice: 322.5,
  daysToExpiration: 0,
  multiplier: 100,
};

describe("parseExpirationKey", () => {
  it("quita el sufijo de días", () => {
    expect(parseExpirationKey("2026-07-24:0")).toBe("2026-07-24");
    expect(parseExpirationKey("2026-09-18:56")).toBe("2026-09-18");
  });
  it("tolera una clave sin sufijo", () => {
    expect(parseExpirationKey("2026-07-24")).toBe("2026-07-24");
  });
});

describe("toOccTicker", () => {
  it("quita el relleno y antepone O:", () => {
    expect(toOccTicker("AAPL  260724C00322500")).toBe("O:AAPL260724C00322500");
  });
  it("funciona con raíces de 6 letras (sin relleno)", () => {
    expect(toOccTicker("GOOGL 260918P00150000")).toBe("O:GOOGL260918P00150000");
  });
  it("devuelve vacío si no hay símbolo", () => {
    expect(toOccTicker(undefined)).toBe("");
    expect(toOccTicker("")).toBe("");
  });
});

describe("toRawContract", () => {
  const raw = toRawContract(SAMPLE, "2026-07-24", "AAPL", 321.66);

  it("mapea los detalles del contrato", () => {
    expect(raw.details?.contract_type).toBe("call");
    expect(raw.details?.expiration_date).toBe("2026-07-24");
    expect(raw.details?.strike_price).toBe(322.5);
    expect(raw.details?.shares_per_contract).toBe(100);
    expect(raw.details?.ticker).toBe("O:AAPL260724C00322500");
  });

  it("expone el bid y el ask reales", () => {
    expect(raw.quote?.bid).toBe(1.47);
    expect(raw.quote?.ask).toBe(1.68);
  });

  it("convierte la IV de porcentaje a decimal", () => {
    expect(raw.greeks?.iv).toBeCloseTo(0.3053);
  });

  it("conserva los griegos reales", () => {
    expect(raw.greeks?.delta).toBe(0.435);
    expect(raw.greeks?.gamma).toBe(0.08);
    expect(raw.greeks?.theta).toBe(-1.575);
  });

  it("mapea open interest y volumen", () => {
    expect(raw.open_interest).toBe(5918);
    expect(raw.day?.volume).toBe(0);
  });

  it("detecta puts", () => {
    const put = toRawContract({ ...SAMPLE, putCall: "PUT" }, "2026-07-24", "AAPL", 321.66);
    expect(put.details?.contract_type).toBe("put");
  });

  it("descarta los centinelas de Schwab (-999) en los griegos", () => {
    const sinGriegos = toRawContract(
      { ...SAMPLE, delta: -999, gamma: -999, volatility: -999 },
      "2026-07-24",
      "AAPL",
      321.66,
    );
    expect(sinGriegos.greeks?.delta).toBeNull();
    expect(sinGriegos.greeks?.gamma).toBeNull();
    expect(sinGriegos.greeks?.iv).toBeNull();
  });

  it("ignora bid/ask en 0 (contrato sin mercado)", () => {
    const sinQuote = toRawContract(
      { ...SAMPLE, bid: 0, ask: 0 },
      "2026-07-24",
      "AAPL",
      321.66,
    );
    expect(sinQuote.quote?.bid).toBeUndefined();
    expect(sinQuote.quote?.ask).toBeUndefined();
  });

  it("usa mark como respaldo cuando no hay last", () => {
    const sinLast = toRawContract(
      { ...SAMPLE, last: 0, mark: 2.22 },
      "2026-07-24",
      "AAPL",
      321.66,
    );
    expect(sinLast.last_trade?.price).toBe(2.22);
  });
});

describe("parseSchwabChain", () => {
  const json: SchwabChainResponse = {
    symbol: "AAPL",
    status: "SUCCESS",
    isDelayed: true,
    underlyingPrice: 321.66,
    callExpDateMap: {
      "2026-07-24:0": { "322.5": [SAMPLE] },
      "2026-09-18:56": { "330.0": [{ ...SAMPLE, strikePrice: 330 }] },
    },
    putExpDateMap: {
      "2026-07-24:0": {
        "320.0": [{ ...SAMPLE, putCall: "PUT", strikePrice: 320 }],
      },
    },
  };

  const result = parseSchwabChain(json, "AAPL");

  it("aplana calls y puts en una sola lista", () => {
    expect(result.contracts).toHaveLength(3);
  });

  it("cuenta los vencimientos distintos sin duplicar entre calls y puts", () => {
    expect(result.expirationCount).toBe(2);
  });

  it("propaga el precio del subyacente y la marca de retraso", () => {
    expect(result.underlyingPrice).toBe(321.66);
    expect(result.delayed).toBe(true);
  });

  it("incluye tanto calls como puts", () => {
    const tipos = result.contracts.map((c) => c.details?.contract_type);
    expect(tipos).toContain("call");
    expect(tipos).toContain("put");
  });

  it("tolera una respuesta vacía", () => {
    const vacio = parseSchwabChain({ symbol: "XYZ" }, "XYZ");
    expect(vacio.contracts).toEqual([]);
    expect(vacio.expirationCount).toBe(0);
    expect(vacio.underlyingPrice).toBeNull();
    expect(vacio.delayed).toBe(false);
  });
});

// El gateway de Schwab corta el body ~10 MB (502 TooBigBody). SPY no cabe entero,
// así que la descarga se trocea por ventanas de vencimiento.
describe("dteWindows", () => {
  it("encadena los cortes sin dejar huecos", () => {
    const w = dteWindows();
    expect(w[0][0]).toBe(0);
    for (let i = 1; i < w.length; i++) {
      expect(w[i][0]).toBe(w[i - 1][1]);
    }
  });

  it("cubre hasta el último corte definido", () => {
    const w = dteWindows();
    expect(w[w.length - 1][1]).toBe(DTE_WINDOWS[DTE_WINDOWS.length - 1]);
  });

  it("los tramos son más finos cerca del spot", () => {
    const w = dteWindows();
    const primero = w[0][1] - w[0][0];
    const ultimo = w[w.length - 1][1] - w[w.length - 1][0];
    expect(primero).toBeLessThan(ultimo);
  });

  it("respeta un tope de días", () => {
    const w = dteWindows(60);
    expect(w[w.length - 1][1]).toBe(60);
    expect(w.every(([, to]) => to <= 60)).toBe(true);
  });

  it("con un tope menor al primer corte devuelve una sola ventana", () => {
    expect(dteWindows(10)).toEqual([[0, 10]]);
  });
});

describe("authedGet — reintento automático ante 401", () => {
  const okToken = () => ({
    ok: true,
    status: 200,
    json: async () => ({ access_token: "tok-" + Math.random(), expires_in: 3600 }),
    text: async () => "",
  });
  const apiRes = (status: number) => ({
    ok: status < 400,
    status,
    json: async () => ({}),
    text: async () => "",
  });

  beforeEach(() => {
    process.env.SCHWAB_CLIENT_ID = "test-id";
    process.env.SCHWAB_CLIENT_SECRET = "test-secret";
    resetSchwabToken();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reintenta una vez con token fresco y devuelve 200", async () => {
    // secuencia: token → api(401) → token(fresco) → api(200)
    const queue = [okToken(), apiRes(401), okToken(), apiRes(200)];
    const fetchMock = vi.fn(async () => queue.shift());
    vi.stubGlobal("fetch", fetchMock);
    const res = await authedGet("https://x/marketdata/v1/test");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("no reintenta cuando la respuesta no es 401", async () => {
    const queue = [okToken(), apiRes(200)];
    const fetchMock = vi.fn(async () => queue.shift());
    vi.stubGlobal("fetch", fetchMock);
    const res = await authedGet("https://x/marketdata/v1/test");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("propaga el 401 si persiste tras el reintento (credenciales malas)", async () => {
    const queue = [okToken(), apiRes(401), okToken(), apiRes(401)];
    const fetchMock = vi.fn(async () => queue.shift());
    vi.stubGlobal("fetch", fetchMock);
    const res = await authedGet("https://x/marketdata/v1/test");
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
