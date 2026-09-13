/**
 * Segmentation Module — Tarea 5 Exports
 *
 * Servicio puro para cálculo de métricas de opciones
 */

export {
  calculateOpenPremiumEstimate,
  calculateNotionalValue,
  enrichStrikeData,
  aggregateByExpiration,
  evaluateLiquidity,
} from './segmentation.service';

export type {
  RawStrike,
  EnrichedStrike,
  AggregateResult,
  LiquidityInput,
  LiquidityGate,
} from './segmentation.service';
