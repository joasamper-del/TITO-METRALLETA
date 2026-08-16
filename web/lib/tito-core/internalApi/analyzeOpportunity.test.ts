import { describe, it, expect } from "vitest";
import { analyzeOpportunity, classifyThrownError } from "./analyzeOpportunity";
import { TITO_API_VERSION, type TitoRequestMeta, type TitoResponse } from "./types";
import type { OpportunityReport } from "../types";

function meta(over: Partial<TitoRequestMeta> = {}): TitoRequestMeta {
  return {
    requestId: "req-1",
    timestamp: "2026-08-16T14:00:00.000Z",
    source: "test-suite",
    systemVersion: "TM-SYSTEM-v0.1-MOCK",
    apiVersion: TITO_API_VERSION,
    ...over,
  };
}

describe("analyzeOpportunity", () => {
  it("devuelve ok:true con el reporte cuando el símbolo es válido", async () => {
    const res = await analyzeOpportunity({ meta: meta(), payload: { symbol: "META" } });
    expect(res.ok).toBe(true);
    expect(res.data?.symbol).toBe("META");
    expect(res.error).toBeUndefined();
    expect(res.meta).toEqual(meta()); // el envelope de request se refleja en la respuesta
  });

  it("INCOMPATIBLE_VERSION cuando apiVersion no coincide", async () => {
    const res = await analyzeOpportunity({
      meta: meta({ apiVersion: "TM-INTERNAL-API-v0" }),
      payload: { symbol: "META" },
    });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INCOMPATIBLE_VERSION");
  });

  it("INVALID_INPUT cuando el símbolo está vacío", async () => {
    const res = await analyzeOpportunity({ meta: meta(), payload: { symbol: "   " } });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_INPUT");
  });

  it("nunca lanza — cualquier resultado viaja dentro de TitoResponse", async () => {
    await expect(
      analyzeOpportunity({ meta: meta({ apiVersion: "boom" }), payload: { symbol: "" } }),
    ).resolves.toBeDefined();
  });

  it("idempotencia: mismo idempotencyKey devuelve la respuesta cacheada sin re-ejecutar", async () => {
    const store = new Map<string, TitoResponse<OpportunityReport>>();
    const first = await analyzeOpportunity(
      { meta: meta({ idempotencyKey: "key-1" }), payload: { symbol: "META" } },
      { idempotencyStore: store, now: new Date("2026-08-16T14:00:00.000Z") },
    );
    const second = await analyzeOpportunity(
      { meta: meta({ idempotencyKey: "key-1" }), payload: { symbol: "META" } },
      { idempotencyStore: store, now: new Date("2026-08-16T15:00:00.000Z") }, // 'now' distinto
    );
    // Si hubiera re-ejecutado, createdAt reflejaría el segundo 'now'. Como es la misma
    // respuesta cacheada, createdAt (y el id) deben ser idénticos al primer run.
    expect(second).toBe(first);
    expect(second.data?.createdAt).toBe("2026-08-16T14:00:00.000Z");
  });

  it("sin idempotencyKey, dos corridas del mismo símbolo NO se cachean entre sí", async () => {
    const store = new Map<string, TitoResponse<OpportunityReport>>();
    const a = await analyzeOpportunity(
      { meta: meta(), payload: { symbol: "META" } },
      { idempotencyStore: store, now: new Date("2026-08-16T14:00:00.000Z") },
    );
    const b = await analyzeOpportunity(
      { meta: meta(), payload: { symbol: "META" } },
      { idempotencyStore: store, now: new Date("2026-08-16T15:00:00.000Z") },
    );
    expect(a.data?.createdAt).not.toBe(b.data?.createdAt);
  });
});

describe("classifyThrownError", () => {
  it("clasifica un fallo de validate_report como VALIDATION_FAILED", () => {
    const err = new Error("Tito Core: reporte inválido para XYZ: campo x vacío");
    expect(classifyThrownError(err).code).toBe("VALIDATION_FAILED");
  });

  it("clasifica cualquier otro error como INTERNAL_ERROR", () => {
    expect(classifyThrownError(new Error("boom inesperado")).code).toBe("INTERNAL_ERROR");
  });

  it("maneja un throw que no es un Error sin lanzar", () => {
    expect(classifyThrownError("string plano").code).toBe("INTERNAL_ERROR");
  });
});
