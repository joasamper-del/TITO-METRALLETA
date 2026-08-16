// Envuelve runAnalysis (workflow.ts, commit 1) detrás del envelope Internal API v1.
// "Technical error != trading decision" (EXTENSIONS_AND_INTERNAL_API.md) aplica también
// a este nivel: ninguna excepción cruda debe escapar de analyzeOpportunity — todo se
// traduce a un TitoError tipado. Idempotente por requestId/idempotencyKey: repetir la
// misma clave devuelve la respuesta cacheada sin volver a correr el análisis.

import { runAnalysis } from "../workflow";
import type { OpportunityReport } from "../types";
import {
  TITO_API_VERSION, type TitoError, type TitoRequest, type TitoRequestMeta, type TitoResponse,
} from "./types";

export interface AnalyzeOpportunityPayload {
  symbol: string;
}

export interface InternalApiOptions {
  /** Caché de idempotencia inyectable. En memoria por default — no persiste a disco en
   *  esta fase; se pierde al reiniciar el proceso (limitación aceptada, no resuelta aquí). */
  idempotencyStore?: Map<string, TitoResponse<OpportunityReport>>;
  now?: Date;
}

/**
 * workflow.ts lanza (no devuelve un status) cuando validate_report falla — a propósito,
 * para que un fallo técnico nunca se disfrace de resultado. Aquí reclasificamos esa
 * excepción: si viene de esa etapa es VALIDATION_FAILED; cualquier otra es INTERNAL_ERROR.
 * Exportada aparte para poder probarla sin tener que forzar un fallo real end-to-end.
 */
export function classifyThrownError(err: unknown): TitoError {
  const message = err instanceof Error ? err.message : "Error interno no identificado";
  const isValidationFailure = message.startsWith("Tito Core: reporte inválido");
  return { code: isValidationFailure ? "VALIDATION_FAILED" : "INTERNAL_ERROR", message };
}

function errorResponse(meta: TitoRequestMeta, error: TitoError): TitoResponse<OpportunityReport> {
  return { meta, ok: false, error };
}

export async function analyzeOpportunity(
  request: TitoRequest<AnalyzeOpportunityPayload>,
  opts: InternalApiOptions = {},
): Promise<TitoResponse<OpportunityReport>> {
  const { meta, payload } = request;

  if (meta.apiVersion !== TITO_API_VERSION) {
    return errorResponse(meta, {
      code: "INCOMPATIBLE_VERSION",
      message: `apiVersion esperado ${TITO_API_VERSION}, recibido ${meta.apiVersion}`,
    });
  }

  const store = opts.idempotencyStore;
  const cached = meta.idempotencyKey ? store?.get(meta.idempotencyKey) : undefined;
  if (cached) return cached;

  if (!payload.symbol || !payload.symbol.trim()) {
    return errorResponse(meta, { code: "INVALID_INPUT", message: "symbol vacío o ausente" });
  }

  let response: TitoResponse<OpportunityReport>;
  try {
    const { report } = await runAnalysis(payload.symbol, { persist: false, now: opts.now });
    response = { meta, ok: true, data: report };
  } catch (err) {
    response = errorResponse(meta, classifyThrownError(err));
  }

  if (meta.idempotencyKey && store) store.set(meta.idempotencyKey, response);
  return response;
}
