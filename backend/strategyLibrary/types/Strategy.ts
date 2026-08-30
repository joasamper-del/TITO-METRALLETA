/**
 * TypeScript types para Strategy Library
 * Define interfaces para estrategias, señales, y configuración
 */

// ============================================================================
// ENUMERACIONES
// ============================================================================

export enum StrategyName {
  // CORE
  TRAILING_EXIT = "TRAILING_EXIT",
  TREND_CONTINUATION = "TREND_CONTINUATION",
  MEAN_REVERSION = "MEAN_REVERSION",
  BREAKOUT = "BREAKOUT",

  // OPTIONS
  BULL_CALL_SPREAD = "BULL_CALL_SPREAD",
  BEAR_PUT_SPREAD = "BEAR_PUT_SPREAD",
  LONG_STRADDLE = "LONG_STRADDLE",
  LONG_STRANGLE = "LONG_STRANGLE",

  // SPECIAL
  WHEEL = "WHEEL",
  PULLBACK_VWAP = "PULLBACK_VWAP",
  VOLATILITY_EXPANSION = "VOLATILITY_EXPANSION",
}

export enum MarketRegime {
  BULLISH_STRONG = "BULLISH_STRONG",
  BULLISH_WEAK = "BULLISH_WEAK",
  BEARISH_STRONG = "BEARISH_STRONG",
  BEARISH_WEAK = "BEARISH_WEAK",
  LATERAL = "LATERAL",
  HIGH_VOLATILITY = "HIGH_VOLATILITY",
  EARNINGS_EVENT = "EARNINGS_EVENT",
}

export enum SignalRecommendation {
  ENTER = "ENTER",
  HOLD = "HOLD",
  EXIT = "EXIT",
  BLOCKED = "BLOCKED",
}

export enum PositionType {
  LONG = "LONG",
  SHORT = "SHORT",
  CALL = "CALL",
  PUT = "PUT",
  CALL_SPREAD = "CALL_SPREAD",
  PUT_SPREAD = "PUT_SPREAD",
  STRADDLE = "STRADDLE",
  STRANGLE = "STRANGLE",
}

export enum ExitReason {
  TAKE_PROFIT = "TAKE_PROFIT",
  STOP_LOSS = "STOP_LOSS",
  TRAILING_STOP = "TRAILING_STOP",
  PATTERN_FAILURE = "PATTERN_FAILURE",
  REGIME_CHANGE = "REGIME_CHANGE",
  MANUAL = "MANUAL",
  EXPIRATION = "EXPIRATION",
  REENTRY_LIMIT = "REENTRY_LIMIT",
}

// ============================================================================
// MARKET DATA
// ============================================================================

export interface MarketData {
  symbol: string;
  timestamp: Date;

  // Precio
  open: number;
  high: number;
  low: number;
  close: number;

  // Volumen
  volume: number;
  volumeAvg30: number; // promedio últimas 30 barras

  // Liquidez
  bidPrice: number;
  askPrice: number;
  bid: number;
  ask: number;

  // Indicadores técnicos
  ma20: number;
  ma50: number;
  ma200: number;

  rsi: number; // 0-100
  stochasticK: number; // 0-100

  bollingerUpper: number;
  bollingerLower: number;

  atr: number; // Average True Range
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;

  supertrend: "BULLISH" | "BEARISH" | "NEUTRAL";
  vwap: number; // Volumen Weighted Average Price

  // Volatilidad
  volatilityRealized: number; // σ 30 barras
  volatilityPercentile: number; // 0-100, σ actual vs histórico 252d

  // Extras
  vix?: number; // Para equities
  fearIndex?: number; // Para crypto
  earnings?: boolean; // ¿Hay earnings hoy?
  newsAlert?: string | null;
}

// ============================================================================
// ESTRATEGIA
// ============================================================================

export interface StrategyConfig {
  name: StrategyName;
  enabled: boolean;
  minSignalScore: number;
  maxSimultaneousTrades: number;
  positionSizePercent: number; // 50-100%
  riskPercentage: number; // 0.5-2%
}

export interface StrategySignal {
  strategy: StrategyName;
  timestamp: Date;
  symbol: string;

  // Evaluación
  signalScore: number; // 0-100
  recommendation: SignalRecommendation;

  // Volumen
  volumeConfirmed: boolean; // Pasó las 4 capas
  volumeRatio: number; // Current / Average

  // Riesgo
  volatilityAdjustment: number; // 0.5-2x multiplicador

  // Entrada propuesta
  entryPrice?: number;
  entryQuantity?: number;
  stopLossPrice?: number;
  takeProfitTargets?: number[]; // [TP1, TP2, TP3...]

  // Explicación en lenguaje natural
  explanation: string;

  // Datos internos para learning
  evaluationDetails: Record<string, any>;
}

// ============================================================================
// POSICIÓN Y TRADE
// ============================================================================

export interface Position {
  positionId: string;
  strategy: StrategyName;
  symbol: string;
  positionType: PositionType;

  // Entrada
  entryPrice: number;
  entryQuantity: number;
  entryTimestamp: Date;

  // Estado actual
  currentPrice: number;
  maxPrice: number; // Para trailing
  minPrice: number;

  // Gestión
  stopLossPrice: number;
  takeProfitTargets: number[];

  // Trailing stop
  trailingActive: boolean;
  trailingDistance: number; // %
  trailingStopPrice: number;

  // Reentrada
  reentryCount: number;
  maxReentries: number;
  lastReentryTimestamp?: Date;

  // Ganancias
  profitLoss: number; // Precio actual - entrada
  profitLossPercent: number;

  // Estado
  isOpen: boolean;
  closedAt?: Date;
  exitReason?: ExitReason;

  // Learning log
  log: TradeLog;
}

export interface TradeLog {
  entries: TradeLogEntry[];
  exits: TradeLogExit[];
  reentries: ReentryLog[];
  learnings: string[];
}

export interface TradeLogEntry {
  timestamp: Date;
  price: number;
  quantity: number;
  signalScore: number;
  volumeConfirmed: boolean;
  explanation: string;
}

export interface TradeLogExit {
  timestamp: Date;
  price: number;
  reason: ExitReason;
  profitLoss: number;
  profitLossPercent: number;
  durationMinutes: number;
}

export interface ReentryLog {
  reentryNumber: number;
  timestamp: Date;
  previousExitPrice: number;
  reentryPrice: number;
  signalScore: number;
  success: boolean;
  exit: TradeLogExit;
  reasoning: string;
}

// ============================================================================
// OPERATION MANAGER
// ============================================================================

export interface OperationConfig {
  strategy: StrategyName;
  symbol: string;
  positionType: PositionType;

  entry: {
    price: number;
    quantity: number;
  };

  rules: {
    stopLossPct: number;
    takeProfitTargets: number[];

    // Trailing stop
    trailingEnabled: boolean;
    trailingDistancePct: number;

    // Reentrada
    reentryEnabled: boolean;
    maxReentries: number;
    reentryConfidenceThreshold: number;

    // Salida
    exitOnPatternFailure: boolean;
    exitOnRegimeChange: boolean;
    closeAtSessionEnd: boolean;
  };
}

export interface OperationResult {
  positionId: string;
  status: "CREATED" | "UPDATED" | "CLOSED" | "ERROR";
  message: string;
  position?: Position;
}

// ============================================================================
// EVALUADORES
// ============================================================================

export interface SignalScoreComponents {
  trend?: number;
  momentum?: number;
  volume?: number;
  pattern?: number;
  volatility?: number;
  liquidity?: number;
  regime?: number;

  weights: Record<string, number>; // { trend: 0.25, momentum: 0.20, ... }
  finalScore: number;
}

export interface VolumeConfirmation {
  layer1: {
    name: string;
    condition: boolean;
    weight: number;
  };
  layer2: {
    name: string;
    condition: boolean;
    weight: number;
  };
  layer3: {
    name: string;
    condition: boolean;
    weight: number;
  };
  layer4: {
    name: string;
    condition: boolean;
    weight: number;
  };

  isConfirmed: boolean; // Layer1 ✅ Y (Layer2 ✅ O Layer3 ✅)
  explanation: string;
}

export interface VolatilityFilterResult {
  volatilityLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  volatilityPercentile: number;
  adjustedStopLossPct: number;
  adjustedPositionSizePct: number;
  adjustedTrailingDistancePct: number;
  minSignalScoreRequired: number;
  isBlocked: boolean;
  explanation: string;
}

export interface RegimeDetection {
  regime: MarketRegime;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  momentum: "STRONG" | "WEAK" | "NEUTRAL";
  volatility: "LOW" | "MEDIUM" | "HIGH";
  event: string | null; // "EARNINGS", "FED", etc.

  recommendedStrategies: StrategyName[];
  avoidedStrategies: StrategyName[];
  explanation: string;
}

// ============================================================================
// PERFORMANCE
// ============================================================================

export interface PerformanceStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // %

  totalProfit: number;
  totalLoss: number;
  netProfit: number;

  avgProfit: number;
  avgLoss: number;
  profitFactor: number; // Total Profit / Total Loss

  averageDuration: number; // minutes

  byStrategy: Record<StrategyName, StrategyPerformance>;
}

export interface StrategyPerformance {
  strategy: StrategyName;
  trades: number;
  winRate: number;
  netProfit: number;
  avgProfit: number;
  confidence: number; // 0-10
}

// ============================================================================
// EXPORTS
// ============================================================================

export type StrategyEvaluationResult = StrategySignal & {
  volumeAnalysis: VolumeConfirmation;
  volatilityAnalysis: VolatilityFilterResult;
  scoreComponents: SignalScoreComponents;
};
