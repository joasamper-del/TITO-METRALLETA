// Punto de entrada público de Tito Core. Fuera de este módulo solo se debería importar
// desde aquí — mantiene el resto del pipeline (motores internos, forma de MarketSnapshot)
// libre de re-organizarse sin romper consumidores externos.

export * from "./types";
export * from "./marketSnapshot";
export * from "./ruleEngine";
export * from "./metricsEngine";
export * from "./decisionEngine";
export * from "./explanationEngine";
export * from "./reportBuilder";
export * from "./validator";
export * from "./mockDataSource";
export * from "./historyStore";
export * from "./workflow";
