// Internal API v1 — envelope de request/response para comunicación entre módulos y
// futuras extensiones (handoff/EXTENSIONS_AND_INTERNAL_API.md). Es "el siguiente gran
// contrato transversal pendiente" según el propio bundle
// (bundle-manifest.json: nextMajorContract "TM-INTERNAL-API-v1") — no existía como
// código en ningún lado (ni en el repo real, ni en sdk/tito-internal-sdk) antes de este
// commit; el SDK solo define el lifecycle de extensión (manifest/initialize/healthCheck/
// shutdown), no el envelope de mensajes entre capacidades.
//
// Los 10 códigos de error son exactamente los listados en EXTENSIONS_AND_INTERNAL_API.md.
// Varios (DATA_UNAVAILABLE, STALE_DATA, TIMEOUT, RATE_LIMIT, DEPENDENCY_FAILURE,
// PERMISSION_DENIED) no son alcanzables todavía por analyzeOpportunity.ts — no hay datos
// reales ni permisos en esta fase — pero el catálogo se define completo desde ahora
// porque es un contrato transversal para todo el sistema, no solo para este wrapper.

export type TitoErrorCode =
  | "INVALID_INPUT"
  | "INCOMPATIBLE_VERSION"
  | "PERMISSION_DENIED"
  | "DATA_UNAVAILABLE"
  | "STALE_DATA"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "DEPENDENCY_FAILURE"
  | "VALIDATION_FAILED"
  | "INTERNAL_ERROR";

export interface TitoError {
  code: TitoErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface TitoRequestMeta {
  requestId: string;
  timestamp: string;
  source: string;
  systemVersion: string;
  apiVersion: string;
  analysisId?: string;
  opportunityId?: string;
  strategyVersion?: string;
  configVersion?: string;
  extensionVersion?: string;
  /** Mismo idempotencyKey en dos requests → la segunda devuelve la respuesta cacheada. */
  idempotencyKey?: string;
  auditContext?: Record<string, unknown>;
}

export interface TitoRequest<TPayload> {
  meta: TitoRequestMeta;
  payload: TPayload;
}

export interface TitoResponse<TData> {
  meta: TitoRequestMeta;
  ok: boolean;
  data?: TData;
  error?: TitoError;
}

/** Versión del envelope que este commit implementa. */
export const TITO_API_VERSION = "TM-INTERNAL-API-v1";
