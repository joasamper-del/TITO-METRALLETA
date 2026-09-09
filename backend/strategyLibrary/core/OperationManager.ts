/**
 * OperationManager - Director de Estrategias
 *
 * Responsabilidades:
 * 1. DETECTAR régimen de mercado
 * 2. SELECCIONAR estrategia óptima
 * 3. VALIDAR + EJECUTAR + APRENDER
 */

import { MarketData, StrategyConfig, MarketRegime, StrategyName } from "../types/Strategy";

export interface OperationDecision {
  regime: MarketRegime;
  selectedStrategy: StrategyName;
  confidence: number;
  recommendation: string;
  timestamp: Date;
  explanation: string;
}

export class OperationManager {
  private operationLog: OperationDecision[] = [];
  private readonly strategyConfidence: Record<StrategyName, number> = {
    [StrategyName.TRAILING_EXIT]: 9.0,
    [StrategyName.TREND_CONTINUATION]: 8.5,
    [StrategyName.MEAN_REVERSION]: 7.5,
    [StrategyName.BREAKOUT]: 8.0,
    [StrategyName.BULL_CALL_SPREAD]: 7.0,
    [StrategyName.BEAR_PUT_SPREAD]: 7.0,
    [StrategyName.LONG_STRADDLE]: 6.5,
    [StrategyName.LONG_STRANGLE]: 6.5,
    [StrategyName.WHEEL]: 7.5,
    [StrategyName.PULLBACK_VWAP]: 7.0,
    [StrategyName.VOLATILITY_EXPANSION]: 7.5,
  };

  /**
   * Detecta el régimen de mercado
   */
  private detectRegime(marketData: MarketData): MarketRegime {
    const ma50_above_ma200 = marketData.ma50 > marketData.ma200;
    const atrPct = (marketData.atr / marketData.close) * 100;
    const rsi = marketData.rsi;

    if (marketData.vix > 30 || atrPct > 2.5) {
      return MarketRegime.HIGH_VOLATILITY;
    }

    if (marketData.hasEarningsToday) {
      return MarketRegime.EARNINGS_EVENT;
    }

    const priceDev = Math.abs(marketData.close - marketData.ma20) / marketData.ma20 * 100;
    if (priceDev < 0.8 && atrPct < 1.2) {
      return MarketRegime.LATERAL;
    }

    if (ma50_above_ma200) {
      return rsi > 60 ? MarketRegime.BULLISH_STRONG : MarketRegime.BULLISH_WEAK;
    } else {
      return rsi < 40 ? MarketRegime.BEARISH_STRONG : MarketRegime.BEARISH_WEAK;
    }
  }

  /**
   * Selecciona estrategia según régimen
   */
  private selectStrategy(regime: MarketRegime): StrategyName {
    // Mapeo simple: régimen → mejor estrategia
    const regimeMap: Record<MarketRegime, StrategyName> = {
      [MarketRegime.BULLISH_STRONG]: StrategyName.TRAILING_EXIT,
      [MarketRegime.BULLISH_WEAK]: StrategyName.MEAN_REVERSION,
      [MarketRegime.BEARISH_STRONG]: StrategyName.BREAKOUT,
      [MarketRegime.BEARISH_WEAK]: StrategyName.BEAR_PUT_SPREAD,
      [MarketRegime.LATERAL]: StrategyName.WHEEL,
      [MarketRegime.HIGH_VOLATILITY]: StrategyName.LONG_STRADDLE,
      [MarketRegime.EARNINGS_EVENT]: StrategyName.LONG_STRANGLE,
    };

    return regimeMap[regime];
  }

  /**
   * Toma decisión de operación
   */
  async makeDecision(
    marketData: MarketData,
    config: StrategyConfig
  ): Promise<OperationDecision> {
    const regime = this.detectRegime(marketData);
    const selectedStrategy = this.selectStrategy(regime);

    const decision: OperationDecision = {
      regime,
      selectedStrategy,
      confidence: this.strategyConfidence[selectedStrategy],
      recommendation: "ENTER",
      timestamp: new Date(),
      explanation: `Régimen: ${regime}. Estrategia: ${selectedStrategy}`,
    };

    this.operationLog.push(decision);
    return decision;
  }

  /**
   * Historial de operaciones
   */
  getOperationLog(): OperationDecision[] {
    return this.operationLog;
  }

  /**
   * Estadísticas
   */
  getStats(): {
    totalOperations: number;
    by_regime: Record<string, number>;
    by_strategy: Record<string, number>;
  } {
    const stats = {
      totalOperations: this.operationLog.length,
      by_regime: {} as Record<string, number>,
      by_strategy: {} as Record<string, number>,
    };

    this.operationLog.forEach((op) => {
      stats.by_regime[op.regime] = (stats.by_regime[op.regime] || 0) + 1;
      stats.by_strategy[op.selectedStrategy] = (stats.by_strategy[op.selectedStrategy] || 0) + 1;
    });

    return stats;
  }
}
