/**
 * WheelStrategy - The Wheel (7.5/10 confidence)
 *
 * Ciclo de ingreso repetido:
 * 1. Vender put OTM
 * 2. Si asignado, poseer acción
 * 3. Vender call cubierta ATM/OTM
 * 4. Si asignado, cerrar posición con ganancia
 * 5. Repetir desde paso 1
 *
 * Objetivo: Generar ingreso repetido (4-6 ciclos/año)
 */

import {
  MarketData,
  StrategyName,
  SignalScoreComponents,
  StrategyConfig,
  SignalRecommendation,
} from "../types/Strategy";
import { BaseStrategy } from "../base/BaseStrategy";

interface ScoreFactorInput {
  marketData: MarketData;
  config: StrategyConfig;
}

interface ScoreFactor {
  name: string;
  value: number;
  weight: number;
  explanation: string;
}

interface RiskParameters {
  stopLossPct: number;
  takeProfitPcts: number[];
  positionSizePct: number;
  riskPercentage: number;
  trailingEnabled: boolean;
  trailingDistancePct: number;
  maxReentries: number;
}

export class WheelStrategy extends BaseStrategy {
  name: StrategyName = StrategyName.WHEEL;
  minSignalScore: number = 60;
  maxSimultaneousTrades: number = 1; // Una acción a la vez
  defaultPositionSizePct: number = 100;
  defaultRiskPct: number = 2.0;

  protected calculateScoreFactors(
    input: ScoreFactorInput
  ): ScoreFactor[] {
    const { marketData } = input;
    const factors: ScoreFactor[] = [];

    // 1. TENDENCIA (30%)
    const trendValue = marketData.ma50 > marketData.ma200 ? 100 : 30;
    factors.push({
      name: "Tendencia",
      value: trendValue,
      weight: 0.3,
      explanation: marketData.ma50 > marketData.ma200
        ? "✅ Alcista"
        : "⚠️ Neutral/Bajista",
    });

    // 2. IV RANK (25%) - Vender puts con buen crédito
    let ivValue = 0;
    if (marketData.vix > 20) {
      ivValue = 100;
    } else if (marketData.vix > 15) {
      ivValue = 80;
    } else {
      ivValue = 60;
    }
    factors.push({
      name: "IV Rank",
      value: ivValue,
      weight: 0.25,
      explanation: `VIX ${marketData.vix.toFixed(1)}`,
    });

    // 3. DIVIDENDO EQUIVALENTE (20%)
    // Estimado como IV anualizado vs histórico
    const creditScore =
      marketData.vix > 18
        ? 100
        : marketData.vix > 12
          ? 80
          : 60;
    factors.push({
      name: "Crédito",
      value: creditScore,
      weight: 0.2,
      explanation: `Crédito estimado bueno`,
    });

    // 4. SOPORTE (15%)
    const supportGap = Math.abs(
      marketData.close - marketData.bollingerLower
    );
    const supportPct = (supportGap / marketData.close) * 100;
    let supportValue = supportPct > 2.0 ? 100 : 60;
    factors.push({
      name: "Soporte",
      value: supportValue,
      weight: 0.15,
      explanation: `Soporte gap ${supportPct.toFixed(2)}%`,
    });

    // 5. LIQUIDEZ (10%)
    const spread = marketData.askPrice - marketData.bidPrice;
    let liquidityValue = spread < 0.02 * marketData.close ? 100 : 60;
    factors.push({
      name: "Liquidez",
      value: liquidityValue,
      weight: 0.1,
      explanation: `Spread ${((spread / marketData.close) * 100).toFixed(3)}%`,
    });

    return factors;
  }

  protected validateRules(marketData: MarketData): {
    isValid: boolean;
    reason?: string;
  } {
    if (marketData.vix > 40) {
      return { isValid: false, reason: "VIX demasiado alto" };
    }

    if (marketData.hasEarningsToday) {
      return { isValid: false, reason: "Earnings hoy" };
    }

    return { isValid: true };
  }

  protected getRiskParameters(): RiskParameters {
    return {
      stopLossPct: 3.0, // Stop amplio (rueda requiere paciencia)
      takeProfitPcts: [4.0, 6.0], // 4-6% ganancia por ciclo
      positionSizePct: 100,
      riskPercentage: 2.0,
      trailingEnabled: false,
      trailingDistancePct: 0,
      maxReentries: 0,
    };
  }

  protected buildNaturalLanguageExplanation(
    marketData: MarketData,
    scoreComponents: SignalScoreComponents,
    volumeAnalysis: any,
    volatilityAnalysis: any,
    recommendation: SignalRecommendation
  ): string {
    if (recommendation === SignalRecommendation.BLOCKED) {
      return "Wheel BLOQUEADA.";
    }

    if (recommendation === SignalRecommendation.ENTER) {
      return `Wheel: Vender put OTM para ingreso. VIX ${marketData.vix.toFixed(1)}. Ciclo ~6% anualizado.`;
    }

    return "";
  }
}
