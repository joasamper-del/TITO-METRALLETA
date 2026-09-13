import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Tarea 5: Segmentación de Opciones
 * - Open Premium = OI × option_quote × shares_per_contract
 * - Notional Value = OI × 100 × strike
 * - Liquidez: disparityPct ≤ 40% = PASS; > 40% = FAIL; 20-40% = WARNING
 */

export interface OptionChainStrike {
  strike: number;
  openInterest: number;
  optionQuote: number; // $/acción (bid)
  sharesPerContract?: number; // default 100
  side: 'call' | 'put';
}

export interface OpenPremiumResult {
  strike: number;
  openInterest: number;
  optionQuote: number;
  sharesPerContract: number;
  openPremiumEstimate: number; // in dollars
  side: 'call' | 'put';
}

export interface NotionalValueResult {
  strike: number;
  openInterest: number;
  notionalValue: number; // in dollars
  side: 'call' | 'put';
}

export interface LiquidityCheckResult {
  disparityPct: number;
  pass: boolean;
  fail: boolean;
  warning: boolean;
  status: 'PASS' | 'FAIL';
  metadata: {
    isMarginZone: boolean; // 20% <= d <= 40%
    riskLevel: 'safe' | 'marginal' | 'critical';
  };
}

@Injectable()
export class OptionSegmentationService {
  /**
   * Calculate Open Premium for a single strike
   * Formula: OI × option_quote × shares_per_contract
   */
  calculateOpenPremium(strike: OptionChainStrike): OpenPremiumResult {
    if (!strike.openInterest || strike.openInterest < 0) {
      throw new BadRequestException('Invalid openInterest');
    }
    if (strike.optionQuote === undefined || strike.optionQuote < 0) {
      throw new BadRequestException('Invalid optionQuote');
    }

    const shares = strike.sharesPerContract ?? 100;
    if (shares <= 0) {
      throw new BadRequestException('Invalid sharesPerContract');
    }

    return {
      strike: strike.strike,
      openInterest: strike.openInterest,
      optionQuote: strike.optionQuote,
      sharesPerContract: shares,
      openPremiumEstimate: strike.openInterest * strike.optionQuote * shares,
      side: strike.side,
    };
  }

  /**
   * Calculate Notional Value for a single strike
   * Formula: OI × 100 × strike
   */
  calculateNotionalValue(strike: OptionChainStrike): NotionalValueResult {
    if (!strike.openInterest || strike.openInterest < 0) {
      throw new BadRequestException('Invalid openInterest');
    }
    if (!strike.strike || strike.strike <= 0) {
      throw new BadRequestException('Invalid strike');
    }

    return {
      strike: strike.strike,
      openInterest: strike.openInterest,
      notionalValue: strike.openInterest * 100 * strike.strike,
      side: strike.side,
    };
  }

  /**
   * Check liquidity based on Open Premium disparity
   * disparityPct = |today - avg5d| / avg5d × 100
   *
   * Semantics:
   * - disparityPct ≤ 40% = PASS (no violación)
   * - disparityPct > 40% = FAIL (violación crítica)
   * - 20% ≤ disparityPct ≤ 40% = WARNING (información de riesgo, NO cambia PASS)
   */
  checkLiquidity(
    todayOpenPremium: number,
    avg5dOpenPremium: number,
  ): LiquidityCheckResult {
    if (avg5dOpenPremium <= 0) {
      throw new BadRequestException('Invalid avg5dOpenPremium');
    }
    if (todayOpenPremium < 0) {
      throw new BadRequestException('Invalid todayOpenPremium');
    }

    const disparityPct =
      (Math.abs(todayOpenPremium - avg5dOpenPremium) / avg5dOpenPremium) * 100;

    const isMarginZone = disparityPct >= 20 && disparityPct <= 40;
    const pass = disparityPct <= 40;
    const fail = !pass;
    const warning = isMarginZone;

    let riskLevel: 'safe' | 'marginal' | 'critical' = 'safe';
    if (isMarginZone) {
      riskLevel = 'marginal';
    } else if (fail) {
      riskLevel = 'critical';
    }

    return {
      disparityPct: Math.round(disparityPct * 100) / 100, // round to 2 decimals
      pass,
      fail,
      warning,
      status: pass ? 'PASS' : 'FAIL',
      metadata: {
        isMarginZone,
        riskLevel,
      },
    };
  }

  /**
   * Aggregate Open Premium and Notional by side (calls vs puts)
   */
  aggregateByExpiration(
    callPremiums: OpenPremiumResult[],
    putPremiums: OpenPremiumResult[],
  ): {
    calls: {
      totalOpenPremium: number;
      avgOpenPremium: number;
      strikeCount: number;
    };
    puts: {
      totalOpenPremium: number;
      avgOpenPremium: number;
      strikeCount: number;
    };
    total: {
      totalOpenPremium: number;
      avgOpenPremium: number;
      strikeCount: number;
    };
  } {
    const callTotal = callPremiums.reduce(
      (sum, p) => sum + p.openPremiumEstimate,
      0,
    );
    const putTotal = putPremiums.reduce(
      (sum, p) => sum + p.openPremiumEstimate,
      0,
    );
    const callCount = callPremiums.length;
    const putCount = putPremiums.length;
    const totalCount = callCount + putCount;

    return {
      calls: {
        totalOpenPremium: callTotal,
        avgOpenPremium: callCount > 0 ? callTotal / callCount : 0,
        strikeCount: callCount,
      },
      puts: {
        totalOpenPremium: putTotal,
        avgOpenPremium: putCount > 0 ? putTotal / putCount : 0,
        strikeCount: putCount,
      },
      total: {
        totalOpenPremium: callTotal + putTotal,
        avgOpenPremium:
          totalCount > 0 ? (callTotal + putTotal) / totalCount : 0,
        strikeCount: totalCount,
      },
    };
  }
}
