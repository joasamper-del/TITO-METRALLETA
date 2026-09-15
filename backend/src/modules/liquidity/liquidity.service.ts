import { Injectable } from '@nestjs/common';

export interface LiquidityInput {
  symbol: string;
  actualPremium: number;
  premiumAvg5d: number;
  sector5dAvgOI?: number;
}

export interface LiquidityGate {
  pass: boolean;
  reason: string;
  disparityPct: number | null;
  liquidityPct: number | null;
}

@Injectable()
export class LiquidityService {
  private readonly DISPARITY_HOLD_THRESHOLD = 20;
  private readonly DISPARITY_FAIL_THRESHOLD = 40;
  private readonly LIQUIDITY_MIN_THRESHOLD = 60;

  evaluateLiquidity(input: LiquidityInput): LiquidityGate {
    // FAIL-CLOSED: Validar inputs requeridos
    if (!input || input.symbol == null || input.symbol === '') {
      return {
        pass: false,
        reason: 'Input falta: symbol',
        disparityPct: null,
        liquidityPct: null,
      };
    }

    if (input.actualPremium == null || input.actualPremium <= 0) {
      return {
        pass: false,
        reason: 'Input falta: actualPremium',
        disparityPct: null,
        liquidityPct: null,
      };
    }

    if (input.premiumAvg5d == null || input.premiumAvg5d <= 0) {
      return {
        pass: false,
        reason: 'Input falta: premiumAvg5d',
        disparityPct: null,
        liquidityPct: null,
      };
    }

    if (input.sector5dAvgOI != null && input.sector5dAvgOI <= 0) {
      return {
        pass: false,
        reason: 'Input falta: sector5dAvgOI',
        disparityPct: null,
        liquidityPct: null,
      };
    }

    // CÁLCULOS: Disparidad y Liquidez
    const disparityPct =
      Math.abs(input.actualPremium - input.premiumAvg5d) /
      input.premiumAvg5d *
      100;
    const liquidityPct = (input.actualPremium / input.premiumAvg5d) * 100;

    // LÓGICA DE DECISIÓN: Aplicar umbrales en orden
    // 1. Disparidad CRÍTICA: > 40% → FAIL
    if (disparityPct > this.DISPARITY_FAIL_THRESHOLD) {
      return {
        pass: false,
        reason: `Liquidez insuficiente (disparidad ${disparityPct.toFixed(2)}%)`,
        disparityPct,
        liquidityPct,
      };
    }

    // 2. Volumen BAJO: < 60% → FAIL (independiente de disparidad)
    if (liquidityPct < this.LIQUIDITY_MIN_THRESHOLD) {
      return {
        pass: false,
        reason: `Liquidez baja (${liquidityPct.toFixed(1)}% del histórico)`,
        disparityPct,
        liquidityPct,
      };
    }

    // 3. Disparidad MARGINAL: 20% < disparidad ≤ 40% → HOLD
    if (disparityPct > this.DISPARITY_HOLD_THRESHOLD) {
      return {
        pass: false,
        reason: `Liquidez marginal (disparidad ${disparityPct.toFixed(2)}%)`,
        disparityPct,
        liquidityPct,
      };
    }

    // 4. TODO OK: disparidad ≤ 20% Y liquidez ≥ 60% → PASS
    return {
      pass: true,
      reason: 'Liquidez normal',
      disparityPct,
      liquidityPct,
    };
  }
}
