// Extension Framework — espejo de sdk/tito-internal-sdk/src/contracts/extension.ts
// (Tito_Metralleta_ClaudeCode_Bundle_2026-08-16). El SDK ya define este contrato como
// código funcional (no solo diseño en prosa, a diferencia de otras piezas de
// ARCHITECTURE.md); este archivo lo porta al repo real sin cambiarlo, adaptando solo el
// import de OpportunityReport a la copia local del contrato (../types, commit 1).
//
// "Core rule" del SDK: las extensiones pueden agregar capacidades, pero no pueden mutar
// Tito Core, estrategias de producción, estado de gobernanza o de deployment
// directamente — por eso ExtensionContext expone servicios acotados (logger, now,
// publish), nunca acceso directo a historyStore ni a los engines internos.

import type { OpportunityReport } from "../types";

export type TitoCapability =
  | "market-data" | "economic-news" | "portfolio" | "analytics" | "historical-data";

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  sdkVersion: string;
  capabilities: TitoCapability[];
  description: string;
}

export interface TitoLogger {
  info(message: string, details?: Record<string, unknown>): void;
  warn(message: string, details?: Record<string, unknown>): void;
  error(message: string, details?: Record<string, unknown>): void;
}

export interface TitoServices {
  logger: TitoLogger;
  now(): string;
  publish(report: OpportunityReport): Promise<void>;
}

export interface ExtensionContext {
  services: TitoServices;
  config: Readonly<Record<string, unknown>>;
}

export interface HealthResult {
  status: "healthy" | "degraded" | "unavailable";
  message?: string;
}

export interface TitoExtension {
  manifest: ExtensionManifest;
  initialize(context: ExtensionContext): Promise<void>;
  healthCheck(): Promise<HealthResult>;
  shutdown(): Promise<void>;
}
