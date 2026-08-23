// Datos de mercado del activo
export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  liquidity: number; // volumen promedio / spread
  trend: 'alcista' | 'bajista' | 'lateral' | 'desconocido';
  rsi: number | null; // 0-100
  gex: number | null; // gamma exposure
  premiumDiscount: 'premium' | 'discount' | 'neutral' | 'desconocido';
  support: number | null;
  resistance: number | null;
  timestamp: Date;
  dataSource?: string;
}

// Datos de contexto de mercado general
export interface MarketContext {
  spy: MarketData;
  qqq: MarketData;
  vix: MarketData;
  marketIsOpen: boolean;
  timeUntilClose: number | null; // minutos
}

// Configuración de una regla
export interface RuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  weight: number; // puntos a asignar si se cumple
  condition: (data: MarketData, context: MarketContext) => boolean;
  description: string;
}

// Evaluación de una regla individual
export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  points: number;
  reason: string;
}

// Resultado del análisis completo
export interface AnalysisResult {
  symbol: string;
  strategy: string;
  marketData: MarketData;
  marketContext: MarketContext;
  ruleEvaluations: RuleEvaluation[];
  totalScore: number;
  maxScore: number;
  percentageScore: number;
  decision: 'operar' | 'esperar' | 'no_operar';
  confidence: number; // porcentaje
  riskLevel: 'bajo' | 'medio' | 'alto';
  mainReasons: string[];
  invalidationConditions: string[];
  manualReviewNeeded: boolean;
  manualReviewReasons: string[];
  timestamp: Date;
}

// Plan de operación
export interface OperationPlan {
  entry: number | null;
  target: number | null;
  stop: number | null;
  notes: string;
}

// Reporte completo de oportunidad
export interface OpportunityReport {
  id: string;
  symbol: string;
  strategy: string;
  state: 'operar' | 'esperar' | 'no_operar';
  confidence: number; // porcentaje
  risk: 'bajo' | 'medio' | 'alto';
  mainReasons: string[];
  invalidationConditions: string[];
  plan: OperationPlan;
  analysis: AnalysisResult;
  createdAt: Date;
  result?: 'ganancia' | 'pérdida' | null;
  points?: number;
  successReasons?: string[];
  failureReasons?: string[];
  lessons?: string[];
}

// Resultado de una operación (paper trading)
export interface TradeResult {
  reportId: string;
  symbol: string;
  result: 'ganancia' | 'pérdida';
  points: number; // puntos que obtuvo en el análisis
  pnl?: number; // profit/loss
  successReasons: string[];
  failureReasons: string[];
  lessons: string[];
  recordedAt: Date;
}
