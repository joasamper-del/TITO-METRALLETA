/**
 * Prediction Module 5min — Predicción de corto plazo con registro y validación
 *
 * Cada 5 minutos:
 *   1. Predice rango (low/high) y confianza
 *   2. Registra predicción con timestamp
 *   3. En 5 minutos, compara con real
 *   4. Guarda resultado (acierto/error)
 *
 * Objetivo: validar en backtesting antes de usar en tiempo real.
 * Historial en `data/predictions/5min/{SYMBOL}.jsonl`
 */

export interface Prediction5min {
  timestamp: number; // fecha/hora de predicción (ms)
  symbol: string;
  currentPrice: number; // spot en el momento de predicción
  predictedLow: number; // rango esperado bajo
  predictedHigh: number; // rango esperado alto
  predictedMid: number; // punto medio
  confidence: number; // 0-100
  horizon: number; // siempre 5 min
  reasoning: string[]; // por qué este rango
}

export interface Prediction5minResult extends Prediction5min {
  actualLow: number; // bajo real durante los 5 min
  actualHigh: number; // alto real durante los 5 min
  actualClose: number; // cierre después de 5 min
  resultTimestamp: number; // cuándo se registró el resultado

  // Validación
  hitLow: boolean; // ¿tocó bajo predicho?
  hitHigh: boolean; // ¿tocó alto predicho?
  rangeError: number; // % error: (actualRange - predictedRange) / predictedRange
  directionCorrect: boolean; // ¿predicción de dirección acertó?
  accuracyScore: number; // 0-100, métrica compuesta
}

/**
 * Genera predicción a 5 minutos basada en volatilidad y tendencia
 */
export function generatePrediction5min(
  symbol: string,
  currentPrice: number,
  volatilityDaily: number, // IV o realized vol (0.15 = 15%)
  trendMomentum: number, // -100 a +100 (negativo = bajista, positivo = alcista)
  recentSwings?: { high: number; low: number }, // últimas velas
): Prediction5min {
  const now = Date.now();

  // Estimador de rango a 5 minutos
  // σ_5min = S × IV × √(5min / 365 days) = S × IV × √(0.00347) ≈ 0.059 × S × IV
  const volatility5min = currentPrice * volatilityDaily * Math.sqrt(5 / (365 * 24 * 60));

  // Rango base (±1σ)
  let lowPrediction = currentPrice - volatility5min;
  let highPrediction = currentPrice + volatility5min;

  // Ajuste por momentum
  if (Math.abs(trendMomentum) > 50) {
    const momentumBias = (trendMomentum / 100) * volatility5min * 0.5;
    if (trendMomentum > 0) {
      // alcista: expande alto, contrae bajo
      highPrediction += momentumBias;
      lowPrediction -= momentumBias * 0.3;
    } else {
      // bajista: expande bajo, contrae alto
      lowPrediction -= Math.abs(momentumBias);
      highPrediction -= Math.abs(momentumBias) * 0.3;
    }
  }

  // Ajuste por swings recientes (confluencia)
  if (recentSwings) {
    const recentRange = recentSwings.high - recentSwings.low;
    const midRange = (lowPrediction + highPrediction) / 2;

    // Si está cerca de un swing reciente, atrae el rango
    if (Math.abs(recentSwings.high - currentPrice) < recentRange * 0.2) {
      highPrediction = Math.max(highPrediction, recentSwings.high);
    }
    if (Math.abs(recentSwings.low - currentPrice) < recentRange * 0.2) {
      lowPrediction = Math.min(lowPrediction, recentSwings.low);
    }
  }

  // Confianza basada en volatilidad y momentum
  let confidence = 50;
  const reasoning: string[] = [];

  if (volatilityDaily > 0.25) {
    confidence -= 15;
    reasoning.push("Volatilidad alta → rango impredecible");
  } else if (volatilityDaily < 0.10) {
    confidence += 10;
    reasoning.push("Volatilidad baja → rango predecible");
  }

  if (Math.abs(trendMomentum) > 70) {
    confidence += 15;
    reasoning.push(`Momentum fuerte: ${trendMomentum > 0 ? "alcista" : "bajista"}`);
  } else if (Math.abs(trendMomentum) < 20) {
    confidence -= 10;
    reasoning.push("Momentum débil → más ruido");
  }

  confidence = Math.max(20, Math.min(85, confidence));

  return {
    timestamp: now,
    symbol,
    currentPrice,
    predictedLow: Math.round(lowPrediction * 100) / 100,
    predictedHigh: Math.round(highPrediction * 100) / 100,
    predictedMid: Math.round(((lowPrediction + highPrediction) / 2) * 100) / 100,
    confidence,
    horizon: 5, // minutos
    reasoning,
  };
}

/**
 * Compara predicción con resultado real (llamar DESPUÉS de 5 minutos)
 */
export function validatePrediction5min(
  prediction: Prediction5min,
  actualLow: number,
  actualHigh: number,
  actualClose: number,
): Prediction5minResult {
  const now = Date.now();

  // ¿Tocó los niveles predichos?
  const hitLow = actualLow <= prediction.predictedLow;
  const hitHigh = actualHigh >= prediction.predictedHigh;

  // Error de rango predicho vs. real
  const predictedRange = prediction.predictedHigh - prediction.predictedLow;
  const actualRange = actualHigh - actualLow;
  const rangeError = actualRange > 0 ? (actualRange - predictedRange) / actualRange : 0;

  // ¿Dirección correcta?
  const predictedDirection = prediction.predictedMid > prediction.currentPrice ? "up" : "down";
  const actualDirection = actualClose > prediction.currentPrice ? "up" : "down";
  const directionCorrect = predictedDirection === actualDirection;

  // Score compuesto (0-100)
  let accuracyScore = 50; // base

  // Si acertó rango: +30
  if (actualRange <= predictedRange) {
    accuracyScore += 30;
  } else if (actualRange < predictedRange * 1.25) {
    accuracyScore += 15;
  } else {
    accuracyScore -= 20;
  }

  // Si acertó dirección: +20
  if (directionCorrect) {
    accuracyScore += 20;
  } else {
    accuracyScore -= 15;
  }

  // Si tocó ambos extremos: +20 (volatilidad bien capturada)
  if (hitLow && hitHigh) {
    accuracyScore += 20;
  } else if (hitLow || hitHigh) {
    accuracyScore += 5;
  }

  accuracyScore = Math.max(0, Math.min(100, accuracyScore));

  return {
    ...prediction,
    actualLow,
    actualHigh,
    actualClose,
    resultTimestamp: now,
    hitLow,
    hitHigh,
    rangeError,
    directionCorrect,
    accuracyScore,
  };
}

/**
 * Estadísticas de predicción (para backtesting)
 */
export interface Prediction5minStats {
  totalPredictions: number;
  accuratePredictions: number; // accuracyScore > 60
  avgAccuracy: number; // promedio de todos los scores
  directionHitRate: number; // % de direcciones correctas
  rangeErrorAvg: number; // error promedio de rango
  winRate: number; // % de predicciones ganadoras
  confidenceCalibration: number; // correlación entre confianza reportada vs. acierto real
}

/**
 * Calcula estadísticas a partir de un array de resultados
 */
export function calculatePredictionStats(results: Prediction5minResult[]): Prediction5minStats {
  if (results.length === 0) {
    return {
      totalPredictions: 0,
      accuratePredictions: 0,
      avgAccuracy: 0,
      directionHitRate: 0,
      rangeErrorAvg: 0,
      winRate: 0,
      confidenceCalibration: 0,
    };
  }

  const accuratePredictions = results.filter((r) => r.accuracyScore > 60).length;
  const avgAccuracy = results.reduce((sum, r) => sum + r.accuracyScore, 0) / results.length;
  const directionHitRate = (results.filter((r) => r.directionCorrect).length / results.length) * 100;
  const rangeErrorAvg = results.reduce((sum, r) => sum + Math.abs(r.rangeError), 0) / results.length;

  // Win rate: predicción profitable (cerró en dirección correcta en rango)
  const winners = results.filter((r) => r.directionCorrect && Math.abs(r.accuracyScore - 50) > 10);
  const winRate = (winners.length / results.length) * 100;

  // Calibración: correlación entre confianza reportada vs. acierto real
  // Simple: comparar promedio de confianza de winning vs. losing predictions
  const avgConfidenceWinners =
    winners.length > 0 ? winners.reduce((sum, r) => sum + r.confidence, 0) / winners.length : 0;
  const avgConfidenceLosers =
    results.length - winners.length > 0
      ? results
          .filter((r) => !winners.includes(r))
          .reduce((sum, r) => sum + r.confidence, 0) /
        (results.length - winners.length)
      : 0;

  const confidenceCalibration =
    avgConfidenceWinners > 0 ? avgConfidenceWinners - avgConfidenceLosers : 0;

  return {
    totalPredictions: results.length,
    accuratePredictions,
    avgAccuracy: Math.round(avgAccuracy * 100) / 100,
    directionHitRate: Math.round(directionHitRate * 100) / 100,
    rangeErrorAvg: Math.round(rangeErrorAvg * 100) / 100,
    winRate: Math.round(winRate * 100) / 100,
    confidenceCalibration: Math.round(confidenceCalibration * 100) / 100,
  };
}
