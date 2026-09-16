/**
 * DecisionRecord — Interfaz compartida (tipo de datos)
 * Refleja la estructura que el backend envía al frontend a través del wire.
 *
 * NOTA: timestamp y questionsForJay[].timestamp son strings (ISO 8601)
 * porque vienen como JSON del backend. Convertir a Date en componentes si es necesario.
 */

export interface DecisionRecord {
  id: string;
  timestamp: string; // ISO 8601 string, no Date
  symbol: string;
  decision: string;
  confidence: number;
  mliScore: number;
  mliBreakdown: Record<string, any>;
  riskGatesApplied: string[];
  marketData: {
    price: number;
    vix: number;
    volume: number;
  };
  executionId?: string;
  outcome?: string;
  profitLoss?: number;
  profitLossPercent?: number;
  lessons?: Record<string, any>;
  questionsForJay?: Array<{
    timestamp: string; // ISO 8601 string, no Date
    situation: string;
    missingInfo: string;
    question: string;
  }>;
}
