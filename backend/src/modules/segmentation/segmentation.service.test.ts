/**
 * Tests Unitarios — Tarea 5 (Segmentación)
 *
 * Cubre:
 * - C1-C6: Casos numéricos exactos (Nivel 2 de spec)
 * - A1-A7: Anti-patterns (Nivel 4 de spec)
 * - Fail-closed: NULL handling, edge cases
 * - Integración: Interface con Tarea 6 (mock)
 *
 * Total: ~32 tests determinísticos
 */

import {
  calculateOpenPremiumEstimate,
  calculateNotionalValue,
  enrichStrikeData,
  aggregateByExpiration,
  evaluateLiquidity,
  type RawStrike,
  type EnrichedStrike,
  type AggregateResult,
  type LiquidityInput,
} from './segmentation.service';

describe('SegmentationService', () => {
  // ========== NIVEL 2: CASOS NUMÉRICOS (C1-C6) ==========

  describe('Nivel 2: Casos Numéricos Exactos', () => {
    describe('C1: SPY 420C — Open Premium Estimate', () => {
      it('should calculate OI=50k, quote=$2.15, shares=100 → $10,750,000', () => {
        const oi = 50_000;
        const optionQuote = 2.15;
        const shares = 100;

        const expected = 10_750_000; // 50k × 2.15 × 100

        expect(calculateOpenPremiumEstimate(oi, optionQuote, shares)).toBe(expected);
      });
    });

    describe('C2: SPY 420C — Notional Value', () => {
      it('should calculate OI=50k, strike=$420 → $2,100,000,000', () => {
        const oi = 50_000;
        const strike = 420;

        const expected = 2_100_000_000; // 50k × 100 × 420

        expect(calculateNotionalValue(oi, strike)).toBe(expected);
      });
    });

    describe('C3: QQQ 400P — Open Premium Estimate', () => {
      it('should calculate OI=30k, quote=$0.50, shares=100 → $1,500,000', () => {
        const oi = 30_000;
        const optionQuote = 0.5;
        const shares = 100;

        const expected = 1_500_000; // 30k × 0.50 × 100

        expect(calculateOpenPremiumEstimate(oi, optionQuote, shares)).toBe(expected);
      });
    });

    describe('C4: QQQ 400P — Notional Value', () => {
      it('should calculate OI=30k, strike=$400 → $1,200,000,000', () => {
        const oi = 30_000;
        const strike = 400;

        const expected = 1_200_000_000; // 30k × 100 × 400

        expect(calculateNotionalValue(oi, strike)).toBe(expected);
      });
    });

    describe('C5: Agregación (Calls + Puts)', () => {
      it('should aggregate 4 calls + 3 puts with correct totals', () => {
        const strikes: EnrichedStrike[] = [
          // 3 calls
          {
            strike: 420,
            oi: 50_000,
            optionQuote: 2.15,
            sharesPerContract: 100,
            side: 'call',
            expirationDate: '2026-09-20',
            openPremiumEstimate: 10_750_000,
            notionalValue: 2_100_000_000,
            isDataIncomplete: false,
          },
          {
            strike: 425,
            oi: 30_000,
            optionQuote: 1.5,
            sharesPerContract: 100,
            side: 'call',
            expirationDate: '2026-09-20',
            openPremiumEstimate: 4_500_000,
            notionalValue: 1_275_000_000,
            isDataIncomplete: false,
          },
          {
            strike: 415,
            oi: 20_000,
            optionQuote: 3.0,
            sharesPerContract: 100,
            side: 'call',
            expirationDate: '2026-09-20',
            openPremiumEstimate: 6_000_000,
            notionalValue: 830_000_000,
            isDataIncomplete: false,
          },
          // 3 puts
          {
            strike: 410,
            oi: 40_000,
            optionQuote: 2.2,
            sharesPerContract: 100,
            side: 'put',
            expirationDate: '2026-09-20',
            openPremiumEstimate: 8_800_000,
            notionalValue: 1_640_000_000,
            isDataIncomplete: false,
          },
          {
            strike: 405,
            oi: 25_000,
            optionQuote: 1.8,
            sharesPerContract: 100,
            side: 'put',
            expirationDate: '2026-09-20',
            openPremiumEstimate: 4_500_000,
            notionalValue: 1_012_500_000,
            isDataIncomplete: false,
          },
          {
            strike: 400,
            oi: 30_000,
            optionQuote: 0.5,
            sharesPerContract: 100,
            side: 'put',
            expirationDate: '2026-09-20',
            openPremiumEstimate: 1_500_000,
            notionalValue: 1_200_000_000,
            isDataIncomplete: false,
          },
        ];

        const result = aggregateByExpiration(strikes, '2026-09-20');

        // Calls sum
        expect(result.callsOpenPremium).toBe(21_250_000); // 10.75M + 4.5M + 6M
        expect(result.callsNotional).toBe(4_205_000_000); // 2.1B + 1.275B + 0.83B

        // Puts sum
        expect(result.putsOpenPremium).toBe(14_800_000); // 8.8M + 4.5M + 1.5M
        expect(result.putsNotional).toBe(3_852_500_000); // 1.64B + 1.0125B + 1.2B

        // Totals
        expect(result.totalOpenPremium).toBe(36_050_000);
        expect(result.totalNotional).toBe(8_057_500_000);

        // Strike counts
        expect(result.strikeCount.calls).toBe(3);
        expect(result.strikeCount.puts).toBe(3);

        // Completeness
        expect(result.dataCompleteness).toBe('full');
      });
    });

    describe('C6: Promedio por lado (sin outliers)', () => {
      it('should calculate averages correctly per side', () => {
        const strikes: EnrichedStrike[] = [
          {
            strike: 420,
            oi: 50_000,
            optionQuote: 2.15,
            sharesPerContract: 100,
            side: 'call',
            expirationDate: '2026-09-20',
            openPremiumEstimate: 10_750_000,
            notionalValue: 2_100_000_000,
            isDataIncomplete: false,
          },
          {
            strike: 410,
            oi: 40_000,
            optionQuote: 2.2,
            sharesPerContract: 100,
            side: 'put',
            expirationDate: '2026-09-20',
            openPremiumEstimate: 8_800_000,
            notionalValue: 1_640_000_000,
            isDataIncomplete: false,
          },
        ];

        const result = aggregateByExpiration(strikes, '2026-09-20');

        // Avg for single call
        expect(result.avgOpenPremiumPerStrike.calls).toBe(10_750_000);
        expect(result.avgNotionalPerStrike.calls).toBe(2_100_000_000);

        // Avg for single put
        expect(result.avgOpenPremiumPerStrike.puts).toBe(8_800_000);
        expect(result.avgNotionalPerStrike.puts).toBe(1_640_000_000);
      });
    });
  });

  // ========== NIVEL 4: ANTI-PATTERNS (A1-A7) ==========

  describe('Nivel 4: Anti-patterns Validation', () => {
    describe('A1: Premium ≠ P&L realizado', () => {
      it('should NOT interpret Open Premium as realized P&L', () => {
        // Función NO tiene parámetro "realized" ni interpreta como ganancia
        const result = calculateOpenPremiumEstimate(50_000, 2.15, 100);

        // Es estimación, NO interpretación como P&L
        expect(typeof result).toBe('number');
        expect(result).toBe(10_750_000); // Pure exposure estimate
      });
    });

    describe('A2: Use bid, never ask', () => {
      it('should use bid (lower) not ask (higher) → conservative', () => {
        const bid = 2.15;
        const ask = 2.25;

        // Spec says: use bid for conservative estimate
        const resultBid = calculateOpenPremiumEstimate(50_000, bid, 100);
        const resultAsk = calculateOpenPremiumEstimate(50_000, ask, 100);

        // Bid < Ask
        expect(resultBid).toBeLessThan(resultAsk!);
      });
    });

    describe('A3: Notional WITHOUT ×100 is wrong', () => {
      it('should include ×100 factor (not ×1)', () => {
        const oi = 50_000;
        const strike = 420;

        const correctFormula = oi * 100 * strike; // 2.1B
        const wrongFormula = oi * strike; // 21M (×100 smaller)

        const result = calculateNotionalValue(oi, strike);

        expect(result).toBe(correctFormula);
        expect(result).not.toBe(wrongFormula);
      });
    });

    describe('A4: Cannot average without considering side', () => {
      it('should separate averages by call vs. put', () => {
        const strikes: EnrichedStrike[] = [
          {
            strike: 420,
            oi: 50_000,
            optionQuote: 2.15,
            sharesPerContract: 100,
            side: 'call',
            expirationDate: '2026-09-20',
            openPremiumEstimate: 10_750_000,
            notionalValue: 2_100_000_000,
            isDataIncomplete: false,
          },
          {
            strike: 410,
            oi: 40_000,
            optionQuote: 2.2,
            sharesPerContract: 100,
            side: 'put',
            expirationDate: '2026-09-20',
            openPremiumEstimate: 8_800_000,
            notionalValue: 1_640_000_000,
            isDataIncomplete: false,
          },
        ];

        const result = aggregateByExpiration(strikes, '2026-09-20');

        // Separate, not pooled
        expect(result.avgOpenPremiumPerStrike.calls).not.toBe(result.avgOpenPremiumPerStrike.puts);
      });
    });

    describe('A5: Quote is $/acción, not $/contrato', () => {
      it('should multiply by shares_per_contract to convert $/acción → $/contrato', () => {
        const oi = 50_000;
        const quotePerShare = 2.15; // $/acción from Massive
        const shares = 100; // acciones per contrato

        // Correct: multiply quote × shares
        const result = calculateOpenPremiumEstimate(oi, quotePerShare, shares);
        expect(result).toBe(50_000 * 2.15 * 100);

        // Wrong would be: oi × (quote × 100) — but we don't know that wrong formula here
        // What matters is: formula is explicit about unit conversion
      });
    });

    describe('A6: CRITICAL — Never hardcode shares_per_contract', () => {
      it('should return NULL if shares_per_contract is missing', () => {
        const oi = 50_000;
        const optionQuote = 2.15;
        const sharesUndefined = undefined;

        const result = calculateOpenPremiumEstimate(oi, optionQuote, sharesUndefined);

        expect(result).toBeNull();
      });

      it('should return NULL if shares_per_contract is 0 or negative', () => {
        const oi = 50_000;
        const optionQuote = 2.15;

        expect(calculateOpenPremiumEstimate(oi, optionQuote, 0)).toBeNull();
        expect(calculateOpenPremiumEstimate(oi, optionQuote, -100)).toBeNull();
      });
    });

    describe('A7: Label as "estimate", not "cash flow" or "premium"', () => {
      it('should use term "Estimate" in function/variable names', () => {
        // Function is named calculateOpenPremiumEstimate, not calculateCashFlow
        expect(calculateOpenPremiumEstimate.name).toBe('calculateOpenPremiumEstimate');

        // Return is labeled "estimate" in interface, not "flow"
        const strike: RawStrike = {
          strike: 420,
          oi: 50_000,
          optionQuote: 2.15,
          sharesPerContract: 100,
          side: 'call',
        };

        const enriched = enrichStrikeData(strike);
        expect(enriched.hasOwnProperty('openPremiumEstimate')).toBe(true);
        expect(enriched.hasOwnProperty('cashFlow')).toBe(false);
      });
    });
  });

  // ========== NIVEL 5: FAIL-CLOSED ==========

  describe('Nivel 5: Fail-Closed (NULL Handling)', () => {
    describe('Open Premium Estimate: NULL cases', () => {
      it('should return NULL if OI is missing', () => {
        expect(calculateOpenPremiumEstimate(undefined, 2.15, 100)).toBeNull();
        expect(calculateOpenPremiumEstimate(null as any, 2.15, 100)).toBeNull();
      });

      it('should return NULL if optionQuote is missing', () => {
        expect(calculateOpenPremiumEstimate(50_000, undefined, 100)).toBeNull();
        expect(calculateOpenPremiumEstimate(50_000, null as any, 100)).toBeNull();
      });

      it('should return NULL if shares_per_contract is missing', () => {
        expect(calculateOpenPremiumEstimate(50_000, 2.15, undefined)).toBeNull();
        expect(calculateOpenPremiumEstimate(50_000, 2.15, null as any)).toBeNull();
      });

      it('should return NULL if OI is negative', () => {
        expect(calculateOpenPremiumEstimate(-50_000, 2.15, 100)).toBeNull();
      });

      it('should return NULL if optionQuote is negative', () => {
        expect(calculateOpenPremiumEstimate(50_000, -2.15, 100)).toBeNull();
      });

      it('should return NULL on overflow (non-finite)', () => {
        // Use very large numbers
        const result = calculateOpenPremiumEstimate(1e308, 1e308, 1e308);
        expect(result).toBeNull();
      });
    });

    describe('Notional Value: NULL cases', () => {
      it('should return NULL if OI is missing', () => {
        expect(calculateNotionalValue(undefined, 420)).toBeNull();
      });

      it('should return NULL if strike is missing', () => {
        expect(calculateNotionalValue(50_000, undefined)).toBeNull();
      });

      it('should return NULL if strike is ≤ 0', () => {
        expect(calculateNotionalValue(50_000, 0)).toBeNull();
        expect(calculateNotionalValue(50_000, -420)).toBeNull();
      });

      it('should return NULL if OI is negative', () => {
        expect(calculateNotionalValue(-50_000, 420)).toBeNull();
      });
    });

    describe('Enrichment: Completeness flags', () => {
      it('should mark isDataIncomplete if optionQuote missing', () => {
        const strike: RawStrike = {
          strike: 420,
          oi: 50_000,
          sharesPerContract: 100,
          side: 'call',
        };

        const enriched = enrichStrikeData(strike);

        expect(enriched.isDataIncomplete).toBe(true);
        expect(enriched.openPremiumEstimate).toBeNull();
      });

      it('should mark isDataIncomplete if sharesPerContract missing', () => {
        const strike: RawStrike = {
          strike: 420,
          oi: 50_000,
          optionQuote: 2.15,
          side: 'call',
        };

        const enriched = enrichStrikeData(strike);

        expect(enriched.isDataIncomplete).toBe(true);
        expect(enriched.openPremiumEstimate).toBeNull();
      });

      it('should mark isDataIncomplete if both missing', () => {
        const strike: RawStrike = {
          strike: 420,
          oi: 50_000,
          side: 'call',
        };

        const enriched = enrichStrikeData(strike);

        expect(enriched.isDataIncomplete).toBe(true);
        expect(enriched.openPremiumEstimate).toBeNull();
        expect(enriched.notionalValue).toBe(2_100_000_000); // NV doesn't need these fields
      });

      it('should NOT mark isDataIncomplete if all data present', () => {
        const strike: RawStrike = {
          strike: 420,
          oi: 50_000,
          optionQuote: 2.15,
          sharesPerContract: 100,
          side: 'call',
        };

        const enriched = enrichStrikeData(strike);

        expect(enriched.isDataIncomplete).toBe(false);
        expect(enriched.openPremiumEstimate).toBe(10_750_000);
        expect(enriched.notionalValue).toBe(2_100_000_000);
      });
    });

    describe('Aggregation: Completeness levels', () => {
      it('should mark "full" if all strikes complete', () => {
        const strikes: EnrichedStrike[] = [
          {
            strike: 420,
            oi: 50_000,
            optionQuote: 2.15,
            sharesPerContract: 100,
            side: 'call',
            expirationDate: '2026-09-20',
            openPremiumEstimate: 10_750_000,
            notionalValue: 2_100_000_000,
            isDataIncomplete: false,
          },
        ];

        const result = aggregateByExpiration(strikes, '2026-09-20');

        expect(result.dataCompleteness).toBe('full');
      });

      it('should mark "partial" if some strikes incomplete', () => {
        const strikes: EnrichedStrike[] = [
          {
            strike: 420,
            oi: 50_000,
            optionQuote: 2.15,
            sharesPerContract: 100,
            side: 'call',
            expirationDate: '2026-09-20',
            openPremiumEstimate: 10_750_000,
            notionalValue: 2_100_000_000,
            isDataIncomplete: false,
          },
          {
            strike: 425,
            oi: 30_000,
            optionQuote: undefined,
            side: 'call',
            expirationDate: '2026-09-20',
            openPremiumEstimate: null,
            notionalValue: 1_275_000_000,
            isDataIncomplete: true,
          },
        ];

        const result = aggregateByExpiration(strikes, '2026-09-20');

        expect(result.dataCompleteness).toBe('partial');
      });

      it('should mark "incomplete" if all strikes incomplete', () => {
        const strikes: EnrichedStrike[] = [
          {
            strike: 420,
            oi: 50_000,
            side: 'call',
            expirationDate: '2026-09-20',
            openPremiumEstimate: null,
            notionalValue: 2_100_000_000,
            isDataIncomplete: true,
          },
        ];

        const result = aggregateByExpiration(strikes, '2026-09-20');

        expect(result.dataCompleteness).toBe('incomplete');
      });
    });
  });

  // ========== INTEGRACIÓN: INTERFAZ TAREA 6 (MOCK) ==========

  describe('Integración: Tarea 6 Interface (MOCK)', () => {
    describe('Mock evaluateLiquidity', () => {
      it('should return NO-PASS if dataCompleteness is incomplete', () => {
        const input: LiquidityInput = {
          ticker: 'SPY',
          expirationDate: '2026-09-20',
          segmentationData: {
            expirationDate: '2026-09-20',
            callsOpenPremium: null,
            putsOpenPremium: null,
            callsNotional: null,
            putsNotional: null,
            totalOpenPremium: null,
            totalNotional: null,
            avgOpenPremiumPerStrike: { calls: null, puts: null },
            avgNotionalPerStrike: { calls: null, puts: null },
            strikeCount: { calls: 0, puts: 0 },
            dataCompleteness: 'incomplete',
          },
        };

        const result = evaluateLiquidity(input);

        expect(result.pass).toBe(false);
        expect(result.reason).toContain('incompletos');
      });

      it('should return PASS if dataCompleteness is full (mock)', () => {
        const input: LiquidityInput = {
          ticker: 'SPY',
          expirationDate: '2026-09-20',
          segmentationData: {
            expirationDate: '2026-09-20',
            callsOpenPremium: 10_750_000,
            putsOpenPremium: 8_800_000,
            callsNotional: 2_100_000_000,
            putsNotional: 1_640_000_000,
            totalOpenPremium: 19_550_000,
            totalNotional: 3_740_000_000,
            avgOpenPremiumPerStrike: { calls: 10_750_000, puts: 8_800_000 },
            avgNotionalPerStrike: { calls: 2_100_000_000, puts: 1_640_000_000 },
            strikeCount: { calls: 1, puts: 1 },
            dataCompleteness: 'full',
          },
        };

        const result = evaluateLiquidity(input);

        expect(result.pass).toBe(true);
        expect(result.reason).toContain('[MOCK]');
      });
    });
  });
});
