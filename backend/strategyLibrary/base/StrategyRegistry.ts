/**
 * StrategyRegistry - Catálogo y selector automático de estrategias
 *
 * Responsabilidades:
 * 1. Registrar todas las estrategias (10 en total)
 * 2. Organizar por categoría: CORE, OPTIONS, SPECIAL
 * 3. Seleccionar automáticamente según régimen de mercado
 * 4. Retornar estrategias relevantes para el contexto actual
 */

import { StrategyName, MarketRegime } from "../types/Strategy";
import { BaseStrategy } from "./BaseStrategy";

// ============================================================================
// TIPOS
// ============================================================================

interface StrategyMetadata {
  name: StrategyName;
  category: "CORE" | "OPTIONS" | "SPECIAL";
  confidence: number; // 6.5 - 9/10
  description: string;
  betterIn: MarketRegime[];
  avoidIn: MarketRegime[];
  requiresCapital: number; // Porcentaje del capital total
}

// ============================================================================
// STRATEGY REGISTRY
// ============================================================================

export class StrategyRegistry {
  private strategies: Map<StrategyName, BaseStrategy> = new Map();
  private metadata: Map<StrategyName, StrategyMetadata> = new Map();

  constructor() {
    this.initializeMetadata();
  }

  /**
   * Registra una estrategia en el catálogo
   */
  public registerStrategy(
    strategy: BaseStrategy,
    metadata: StrategyMetadata
  ): void {
    this.strategies.set(strategy.name, strategy);
    this.metadata.set(strategy.name, metadata);
  }

  /**
   * Obtiene una estrategia por nombre
   */
  public getStrategy(name: StrategyName): BaseStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * Retorna todas las estrategias
   */
  public getAllStrategies(): BaseStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * SELECCIÓN INTELIGENTE: Retorna estrategias recomendadas para un régimen
   */
  public selectForRegime(regime: MarketRegime): BaseStrategy[] {
    const selected: BaseStrategy[] = [];

    for (const [name, meta] of this.metadata.entries()) {
      // ✅ Incluir si régimen está en "betterIn"
      if (meta.betterIn.includes(regime)) {
        selected.push(this.strategies.get(name)!);
      }
      // ❌ Excluir si régimen está en "avoidIn"
      else if (meta.avoidIn.includes(regime)) {
        // No incluir
        continue;
      }
      // ⚠️ Incluir si NO tiene restricciones específicas (flexible)
      else if (meta.betterIn.length === 0 && meta.avoidIn.length === 0) {
        selected.push(this.strategies.get(name)!);
      }
    }

    return selected;
  }

  /**
   * Retorna todas las estrategias de una categoría
   */
  public getByCategory(
    category: "CORE" | "OPTIONS" | "SPECIAL"
  ): BaseStrategy[] {
    const result: BaseStrategy[] = [];

    for (const [name, meta] of this.metadata.entries()) {
      if (meta.category === category) {
        result.push(this.strategies.get(name)!);
      }
    }

    return result;
  }

  /**
   * Retorna el metadata de una estrategia
   */
  public getMetadata(name: StrategyName): StrategyMetadata | undefined {
    return this.metadata.get(name);
  }

  /**
   * Retorna todas las estrategias ordenadas por confianza (descendente)
   */
  public getByConfidence(): BaseStrategy[] {
    const sorted = Array.from(this.strategies.values())
      .map((strategy) => ({
        strategy,
        metadata: this.metadata.get(strategy.name)!,
      }))
      .sort((a, b) => b.metadata.confidence - a.metadata.confidence);

    return sorted.map((item) => item.strategy);
  }

  /**
   * Retorna descripción completa del catálogo (para logging)
   */
  public getCatalogSummary(): string {
    const core = this.getByCategory("CORE");
    const options = this.getByCategory("OPTIONS");
    const special = this.getByCategory("SPECIAL");

    return `
Strategy Catalog:
  CORE (${core.length}): ${core.map((s) => s.name).join(", ")}
  OPTIONS (${options.length}): ${options.map((s) => s.name).join(", ")}
  SPECIAL (${special.length}): ${special.map((s) => s.name).join(", ")}

Total: ${this.strategies.size} estrategias registradas
    `.trim();
  }

  /**
   * INICIALIZACIÓN: Define metadata para cada estrategia
   * Esto se ejecuta en el constructor
   */
  private initializeMetadata(): void {
    // ========== CORE STRATEGIES ==========

    this.metadata.set(StrategyName.TRAILING_EXIT, {
      name: StrategyName.TRAILING_EXIT,
      category: "CORE",
      confidence: 9.0,
      description:
        "Trailing Exit + Reentrada Confirmada - Sigue tendencias fuertes",
      betterIn: [
        MarketRegime.BULLISH_STRONG,
        MarketRegime.BEARISH_STRONG,
      ],
      avoidIn: [MarketRegime.LATERAL],
      requiresCapital: 1.0,
    });

    this.metadata.set(StrategyName.TREND_CONTINUATION, {
      name: StrategyName.TREND_CONTINUATION,
      category: "CORE",
      confidence: 8.5,
      description: "Continuación de tendencia - Entra en retrasos",
      betterIn: [
        MarketRegime.BULLISH_STRONG,
        MarketRegime.BULLISH_WEAK,
      ],
      avoidIn: [MarketRegime.BEARISH_STRONG, MarketRegime.LATERAL],
      requiresCapital: 0.8,
    });

    this.metadata.set(StrategyName.MEAN_REVERSION, {
      name: StrategyName.MEAN_REVERSION,
      category: "CORE",
      confidence: 7.5,
      description: "Media Reversion - Compra dips en tendencia",
      betterIn: [
        MarketRegime.BULLISH_WEAK,
        MarketRegime.LATERAL,
      ],
      avoidIn: [
        MarketRegime.BEARISH_STRONG,
        MarketRegime.HIGH_VOLATILITY,
      ],
      requiresCapital: 0.75,
    });

    this.metadata.set(StrategyName.BREAKOUT, {
      name: StrategyName.BREAKOUT,
      category: "CORE",
      confidence: 8.0,
      description: "Breakout Momentum - Sigue rupturas de nivel",
      betterIn: [
        MarketRegime.BULLISH_STRONG,
        MarketRegime.BULLISH_WEAK,
      ],
      avoidIn: [MarketRegime.LATERAL, MarketRegime.BEARISH_STRONG],
      requiresCapital: 0.8,
    });

    // ========== OPTION STRATEGIES ==========

    this.metadata.set(StrategyName.BULL_CALL_SPREAD, {
      name: StrategyName.BULL_CALL_SPREAD,
      category: "OPTIONS",
      confidence: 7.5,
      description: "Bull Call Spread - Moderadamente alcista, riesgo limitado",
      betterIn: [MarketRegime.BULLISH_WEAK, MarketRegime.BULLISH_STRONG],
      avoidIn: [MarketRegime.BEARISH_STRONG, MarketRegime.BEARISH_WEAK],
      requiresCapital: 2.0, // Más capital requerido
    });

    this.metadata.set(StrategyName.BEAR_PUT_SPREAD, {
      name: StrategyName.BEAR_PUT_SPREAD,
      category: "OPTIONS",
      confidence: 7.5,
      description: "Bear Put Spread - Neutral/bajista, genera crédito",
      betterIn: [
        MarketRegime.BEARISH_WEAK,
        MarketRegime.LATERAL,
      ],
      avoidIn: [MarketRegime.BULLISH_STRONG],
      requiresCapital: 2.0,
    });

    this.metadata.set(StrategyName.LONG_STRADDLE, {
      name: StrategyName.LONG_STRADDLE,
      category: "OPTIONS",
      confidence: 7.0,
      description: "Long Straddle - Apuesta a volatilidad en eventos",
      betterIn: [MarketRegime.EARNINGS_EVENT, MarketRegime.HIGH_VOLATILITY],
      avoidIn: [MarketRegime.LATERAL],
      requiresCapital: 1.5,
    });

    this.metadata.set(StrategyName.LONG_STRANGLE, {
      name: StrategyName.LONG_STRANGLE,
      category: "OPTIONS",
      confidence: 6.5,
      description: "Long Strangle - Volatilidad extrema, más barato que straddle",
      betterIn: [MarketRegime.EARNINGS_EVENT, MarketRegime.HIGH_VOLATILITY],
      avoidIn: [],
      requiresCapital: 1.2,
    });

    // ========== SPECIAL STRATEGIES ==========

    this.metadata.set(StrategyName.WHEEL, {
      name: StrategyName.WHEEL,
      category: "SPECIAL",
      confidence: 8.0,
      description: "Wheel Strategy - Ingresos pasivos, largo plazo",
      betterIn: [
        MarketRegime.BULLISH_WEAK,
        MarketRegime.LATERAL,
      ],
      avoidIn: [MarketRegime.HIGH_VOLATILITY],
      requiresCapital: 5.0, // Requiere capital significativo
    });

    this.metadata.set(StrategyName.PULLBACK_VWAP, {
      name: StrategyName.PULLBACK_VWAP,
      category: "SPECIAL",
      confidence: 7.0,
      description: "Pullback a VWAP - Intraday, retest de volumen ponderado",
      betterIn: [
        MarketRegime.BULLISH_STRONG,
        MarketRegime.BULLISH_WEAK,
      ],
      avoidIn: [MarketRegime.LATERAL, MarketRegime.BEARISH_STRONG],
      requiresCapital: 0.5,
    });

    this.metadata.set(StrategyName.VOLATILITY_EXPANSION, {
      name: StrategyName.VOLATILITY_EXPANSION,
      category: "SPECIAL",
      confidence: 7.0,
      description: "Volatility Expansion - Cambio de régimen, aprovechar expansión",
      betterIn: [MarketRegime.HIGH_VOLATILITY],
      avoidIn: [],
      requiresCapital: 0.7,
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let registryInstance: StrategyRegistry | null = null;

export function getStrategyRegistry(): StrategyRegistry {
  if (!registryInstance) {
    registryInstance = new StrategyRegistry();
  }
  return registryInstance;
}

/**
 * MATRIZ DE SELECCIÓN - Mapa visible de qué estrategias usar por régimen
 *
 * BULLISH_STRONG:
 *   ✅ USAR: Trailing Exit, Trend Continuation, Breakout, Bull Call Spread, Pullback VWAP
 *   ❌ EVITAR: Mean Reversion, Bear Put Spread
 *
 * BULLISH_WEAK:
 *   ✅ USAR: Mean Reversion, Breakout, Trend Continuation, Bull Call Spread, Wheel
 *   ❌ EVITAR: Trailing Exit (poco movimiento)
 *
 * BEARISH_STRONG:
 *   ✅ USAR: Trailing Exit (SHORT), Bear Put Spread
 *   ❌ EVITAR: Bull Call Spread, Mean Reversion
 *
 * BEARISH_WEAK:
 *   ✅ USAR: Bear Put Spread, Mean Reversion (SHORT)
 *   ❌ EVITAR: Bull Call Spread, Trailing Exit
 *
 * LATERAL:
 *   ✅ USAR: Mean Reversion, Pullback VWAP, Bull Call Spread, Bear Put Spread, Wheel
 *   ❌ EVITAR: Trailing Exit, Breakout (sin dirección)
 *
 * HIGH_VOLATILITY:
 *   ✅ USAR: Volatility Expansion, Long Straddle, Long Strangle
 *   ❌ EVITAR: Mean Reversion, Wheel (riesgo alto)
 *
 * EARNINGS_EVENT:
 *   ✅ USAR: Long Straddle, Long Strangle
 *   ❌ EVITAR: Todas las otras (riesgo overnight)
 */
