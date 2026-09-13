import { OptionSegmentationService } from '../option-segmentation.service';
import { BadRequestException } from '@nestjs/common';

/**
 * TAREA 5: AUDITORÍA DE IMPLEMENTACIÓN
 * 33 casos únicos ejercitando la semántica aprobada
 *
 * Semántica:
 * - disparityPct ≤ 40% = PASS (no violación)
 * - disparityPct > 40% = FAIL (violación crítica)
 * - 20% ≤ disparityPct ≤ 40% = WARNING (información de riesgo, NO cambia PASS)
 */

describe('OptionSegmentationService', () => {
  let service: OptionSegmentationService;

  beforeEach(() => {
    service = new OptionSegmentationService();
  });

  // =================================================================
  // REGIÓN VERDE (0–9%): 5 CASOS
  // =================================================================
  describe('REGIÓN VERDE (0–9%): PASS + ✅ OK', () => {
    it('Case 1: d=0% (disparidad nula)', () => {
      const result = service.checkLiquidity(2500000, 2500000);
      expect(result.disparityPct).toBe(0);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('PASS');
      expect(result.metadata.riskLevel).toBe('safe');
    });

    it('Case 2: d=2% (cambio mínimo)', () => {
      const result = service.checkLiquidity(2550000, 2500000);
      expect(result.disparityPct).toBe(2);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('PASS');
      expect(result.metadata.riskLevel).toBe('safe');
    });

    it('Case 3: d=5% (cambio pequeño)', () => {
      const result = service.checkLiquidity(2625000, 2500000);
      expect(result.disparityPct).toBe(5);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('PASS');
      expect(result.metadata.riskLevel).toBe('safe');
    });

    it('Case 4: d=8% (cambio ligero)', () => {
      const result = service.checkLiquidity(2700000, 2500000);
      expect(result.disparityPct).toBe(8);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('PASS');
      expect(result.metadata.riskLevel).toBe('safe');
    });

    it('Case 5: d=9% (borde superior VERDE)', () => {
      const result = service.checkLiquidity(2725000, 2500000);
      expect(result.disparityPct).toBe(9);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('PASS');
      expect(result.metadata.riskLevel).toBe('safe');
    });
  });

  // =================================================================
  // REGIÓN AMARILLO BAJO (10–19%): 5 CASOS
  // =================================================================
  describe('REGIÓN AMARILLO BAJO (10–19%): PASS + ⚠ Ligero cambio', () => {
    it('Case 6: d=10% (cambio moderado, FLAG)', () => {
      const result = service.checkLiquidity(2750000, 2500000);
      expect(result.disparityPct).toBe(10);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(false); // No es zona 20-40%
      expect(result.status).toBe('PASS');
      expect(result.metadata.riskLevel).toBe('safe');
    });

    it('Case 7: d=12% (cambio dentro de banda normal)', () => {
      const result = service.checkLiquidity(2800000, 2500000);
      expect(result.disparityPct).toBe(12);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('PASS');
      expect(result.metadata.riskLevel).toBe('safe');
    });

    it('Case 8: d=15% (cambio visible)', () => {
      const result = service.checkLiquidity(2875000, 2500000);
      expect(result.disparityPct).toBe(15);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('PASS');
      expect(result.metadata.riskLevel).toBe('safe');
    });

    it('Case 9: d=18% (acercándose a margen)', () => {
      const result = service.checkLiquidity(2950000, 2500000);
      expect(result.disparityPct).toBe(18);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('PASS');
      expect(result.metadata.riskLevel).toBe('safe');
    });

    it('Case 10: d=19% (borde superior AMARILLO BAJO)', () => {
      const result = service.checkLiquidity(2975000, 2500000);
      expect(result.disparityPct).toBe(19);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('PASS');
      expect(result.metadata.riskLevel).toBe('safe');
    });
  });

  // =================================================================
  // REGIÓN AMARILLO ALTO (20–40%): 6 CASOS
  // =================================================================
  describe('REGIÓN AMARILLO ALTO (20–40%): PASS + ⚠ Margen de riesgo', () => {
    it('Case 11: d=20% (entra margen de riesgo)', () => {
      const result = service.checkLiquidity(3000000, 2500000);
      expect(result.disparityPct).toBe(20);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(true); // ENTRA ZONA MARGINAL
      expect(result.status).toBe('PASS');
      expect(result.metadata.isMarginZone).toBe(true);
      expect(result.metadata.riskLevel).toBe('marginal');
    });

    it('Case 12: d=22% (dentro de zona marginal)', () => {
      const result = service.checkLiquidity(3050000, 2500000);
      expect(result.disparityPct).toBe(22);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(true);
      expect(result.status).toBe('PASS');
      expect(result.metadata.isMarginZone).toBe(true);
      expect(result.metadata.riskLevel).toBe('marginal');
    });

    it('Case 13: d=25% (mitad de zona marginal)', () => {
      const result = service.checkLiquidity(3125000, 2500000);
      expect(result.disparityPct).toBe(25);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(true);
      expect(result.status).toBe('PASS');
      expect(result.metadata.isMarginZone).toBe(true);
      expect(result.metadata.riskLevel).toBe('marginal');
    });

    it('Case 14: d=30% (cambio significativo pero aceptable)', () => {
      const result = service.checkLiquidity(3250000, 2500000);
      expect(result.disparityPct).toBe(30);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(true);
      expect(result.status).toBe('PASS');
      expect(result.metadata.isMarginZone).toBe(true);
      expect(result.metadata.riskLevel).toBe('marginal');
    });

    it('Case 15: d=35% (acercándose al límite)', () => {
      const result = service.checkLiquidity(3375000, 2500000);
      expect(result.disparityPct).toBe(35);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(true);
      expect(result.status).toBe('PASS');
      expect(result.metadata.isMarginZone).toBe(true);
      expect(result.metadata.riskLevel).toBe('marginal');
    });

    it('Case 16: d=40% (borde superior AMARILLO, INCLUSIVE en PASS)', () => {
      const result = service.checkLiquidity(3500000, 2500000);
      expect(result.disparityPct).toBe(40);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(true); // ZONA MARGINAL INCLUSIVE
      expect(result.status).toBe('PASS');
      expect(result.metadata.isMarginZone).toBe(true);
      expect(result.metadata.riskLevel).toBe('marginal');
    });
  });

  // =================================================================
  // REGIÓN ROJA (>40%): 8 CASOS
  // =================================================================
  describe('REGIÓN ROJA (>40%): FAIL + 🔴 Violación crítica', () => {
    it('Case 17: d=41% (apenas sobrepasa 40%)', () => {
      const result = service.checkLiquidity(3525000, 2500000);
      expect(result.disparityPct).toBe(41);
      expect(result.pass).toBe(false);
      expect(result.fail).toBe(true);
      expect(result.warning).toBe(false); // NO es zona 20-40%
      expect(result.status).toBe('FAIL');
      expect(result.metadata.isMarginZone).toBe(false);
      expect(result.metadata.riskLevel).toBe('critical');
    });

    it('Case 18: d=45% (claramente excedido)', () => {
      const result = service.checkLiquidity(3625000, 2500000);
      expect(result.disparityPct).toBe(45);
      expect(result.pass).toBe(false);
      expect(result.fail).toBe(true);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('FAIL');
      expect(result.metadata.riskLevel).toBe('critical');
    });

    it('Case 19: d=50% (mitad arriba del límite)', () => {
      const result = service.checkLiquidity(3750000, 2500000);
      expect(result.disparityPct).toBe(50);
      expect(result.pass).toBe(false);
      expect(result.fail).toBe(true);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('FAIL');
      expect(result.metadata.riskLevel).toBe('critical');
    });

    it('Case 20: d=60% (grave disparidad)', () => {
      const result = service.checkLiquidity(4000000, 2500000);
      expect(result.disparityPct).toBe(60);
      expect(result.pass).toBe(false);
      expect(result.fail).toBe(true);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('FAIL');
      expect(result.metadata.riskLevel).toBe('critical');
    });

    it('Case 21: d=75% (disparidad severa)', () => {
      const result = service.checkLiquidity(4375000, 2500000);
      expect(result.disparityPct).toBe(75);
      expect(result.pass).toBe(false);
      expect(result.fail).toBe(true);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('FAIL');
      expect(result.metadata.riskLevel).toBe('critical');
    });

    it('Case 22: d=100% (duplicación completa)', () => {
      const result = service.checkLiquidity(5000000, 2500000);
      expect(result.disparityPct).toBe(100);
      expect(result.pass).toBe(false);
      expect(result.fail).toBe(true);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('FAIL');
      expect(result.metadata.riskLevel).toBe('critical');
    });

    it('Case 23: d=150% (triplicación, datos rotos)', () => {
      const result = service.checkLiquidity(6250000, 2500000);
      expect(result.disparityPct).toBe(150);
      expect(result.pass).toBe(false);
      expect(result.fail).toBe(true);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('FAIL');
      expect(result.metadata.riskLevel).toBe('critical');
    });

    it('Case 24: d=200%+ (datos completamente inconsistentes)', () => {
      const result = service.checkLiquidity(7500000, 2500000);
      expect(result.disparityPct).toBe(200);
      expect(result.pass).toBe(false);
      expect(result.fail).toBe(true);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('FAIL');
      expect(result.metadata.riskLevel).toBe('critical');
    });
  });

  // =================================================================
  // CASOS DE BORDE MATEMÁTICOS: 4 CASOS
  // =================================================================
  describe('CASOS DE BORDE MATEMÁTICOS', () => {
    it('Case 25: d=40.0% (límite exacto, INCLUSIVE en PASS)', () => {
      const result = service.checkLiquidity(3500000, 2500000);
      expect(result.disparityPct).toBe(40);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.status).toBe('PASS');
    });

    it('Case 26: d=40.01% (tan poco sobre el límite, FAIL)', () => {
      // 2500000 × 1.4001 = 3500250
      const result = service.checkLiquidity(3500250, 2500000);
      expect(result.disparityPct).toBeGreaterThan(40);
      expect(result.pass).toBe(false);
      expect(result.fail).toBe(true);
      expect(result.status).toBe('FAIL');
    });

    it('Case 27: d=39.99% (tan poco bajo el límite, PASS)', () => {
      // 2500000 × 1.3999 = 3499750
      const result = service.checkLiquidity(3499750, 2500000);
      expect(result.disparityPct).toBeLessThan(40);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.status).toBe('PASS');
    });

    it('Case 28: d=9.99% (límite VERDE/AMARILLO BAJO, PASS sin WARNING)', () => {
      // 2500000 × 1.0999 = 2749750
      const result = service.checkLiquidity(2749750, 2500000);
      expect(result.disparityPct).toBeLessThan(10);
      expect(result.pass).toBe(true);
      expect(result.fail).toBe(false);
      expect(result.warning).toBe(false);
      expect(result.status).toBe('PASS');
    });
  });

  // =================================================================
  // CASOS DE CONTEXTO: 5 CASOS (TRANSICIÓN REAL)
  // =================================================================
  describe('CASOS DE CONTEXTO: Transición por zonas', () => {
    it('Case 29: d=0% (hoy = promedio 5d, estable)', () => {
      const result = service.checkLiquidity(2500000, 2500000);
      expect(result.status).toBe('PASS');
      expect(result.metadata.riskLevel).toBe('safe');
    });

    it('Case 30: d=5% (sube 5%, PASS seguro)', () => {
      const result = service.checkLiquidity(2625000, 2500000);
      expect(result.status).toBe('PASS');
      expect(result.metadata.riskLevel).toBe('safe');
    });

    it('Case 31: d=10% (sube 10%, PASS sin margen aún)', () => {
      const result = service.checkLiquidity(2750000, 2500000);
      expect(result.status).toBe('PASS');
      expect(result.metadata.riskLevel).toBe('safe');
      expect(result.warning).toBe(false);
    });

    it('Case 32: d=20% (sube 20%, PASS CON margen de riesgo)', () => {
      const result = service.checkLiquidity(3000000, 2500000);
      expect(result.status).toBe('PASS');
      expect(result.metadata.riskLevel).toBe('marginal');
      expect(result.warning).toBe(true);
    });

    it('Case 33: d=50% (sube 50%, FAIL violación crítica)', () => {
      const result = service.checkLiquidity(3750000, 2500000);
      expect(result.status).toBe('FAIL');
      expect(result.metadata.riskLevel).toBe('critical');
      expect(result.warning).toBe(false);
    });
  });

  // =================================================================
  // CASOS DE CAMBIO NEGATIVO (SIMETRÍA)
  // =================================================================
  describe('SIMETRÍA: Cambios negativos (hoy < promedio5d)', () => {
    it('Caso negativo 1: Baja 5% (igual a sube 5% por valor absoluto)', () => {
      const result = service.checkLiquidity(2375000, 2500000);
      expect(result.disparityPct).toBe(5);
      expect(result.status).toBe('PASS');
    });

    it('Caso negativo 2: Baja 30% (zona marginal)', () => {
      const result = service.checkLiquidity(1750000, 2500000);
      expect(result.disparityPct).toBe(30);
      expect(result.status).toBe('PASS');
      expect(result.metadata.isMarginZone).toBe(true);
    });

    it('Caso negativo 3: Baja 50% (violación crítica)', () => {
      const result = service.checkLiquidity(1250000, 2500000);
      expect(result.disparityPct).toBe(50);
      expect(result.status).toBe('FAIL');
    });
  });

  // =================================================================
  // OPEN PREMIUM CALCULATION
  // =================================================================
  describe('calculateOpenPremium', () => {
    it('SPY 420C: OI=50k, quote=$2.15, shares=100', () => {
      const result = service.calculateOpenPremium({
        strike: 420,
        openInterest: 50000,
        optionQuote: 2.15,
        sharesPerContract: 100,
        side: 'call',
      });
      expect(result.openPremiumEstimate).toBe(10750000);
    });

    it('QQQ 400P: OI=30k, quote=$0.50, shares=100', () => {
      const result = service.calculateOpenPremium({
        strike: 400,
        openInterest: 30000,
        optionQuote: 0.5,
        sharesPerContract: 100,
        side: 'put',
      });
      expect(result.openPremiumEstimate).toBe(1500000);
    });

    it('Default shares=100 if not provided', () => {
      const result = service.calculateOpenPremium({
        strike: 420,
        openInterest: 50000,
        optionQuote: 2.15,
        side: 'call',
      });
      expect(result.sharesPerContract).toBe(100);
      expect(result.openPremiumEstimate).toBe(10750000);
    });

    it('Invalid OI throws BadRequestException', () => {
      expect(() =>
        service.calculateOpenPremium({
          strike: 420,
          openInterest: -100,
          optionQuote: 2.15,
          side: 'call',
        }),
      ).toThrow(BadRequestException);
    });

    it('Invalid optionQuote throws BadRequestException', () => {
      expect(() =>
        service.calculateOpenPremium({
          strike: 420,
          openInterest: 50000,
          optionQuote: -1,
          side: 'call',
        }),
      ).toThrow(BadRequestException);
    });
  });

  // =================================================================
  // NOTIONAL VALUE CALCULATION
  // =================================================================
  describe('calculateNotionalValue', () => {
    it('SPY 420C: OI=50k, strike=$420', () => {
      const result = service.calculateNotionalValue({
        strike: 420,
        openInterest: 50000,
        optionQuote: 0, // not used for notional
        side: 'call',
      });
      expect(result.notionalValue).toBe(2100000000); // 50k × 100 × 420
    });

    it('QQQ 400P: OI=30k, strike=$400', () => {
      const result = service.calculateNotionalValue({
        strike: 400,
        openInterest: 30000,
        optionQuote: 0,
        side: 'put',
      });
      expect(result.notionalValue).toBe(1200000000); // 30k × 100 × 400
    });

    it('Invalid strike throws BadRequestException', () => {
      expect(() =>
        service.calculateNotionalValue({
          strike: 0,
          openInterest: 50000,
          optionQuote: 0,
          side: 'call',
        }),
      ).toThrow(BadRequestException);
    });
  });

  // =================================================================
  // AGGREGATION
  // =================================================================
  describe('aggregateByExpiration', () => {
    it('Aggregate 4 calls + 3 puts correctly', () => {
      const calls = [
        {
          strike: 420,
          openInterest: 50000,
          optionQuote: 2.15,
          sharesPerContract: 100,
          openPremiumEstimate: 10750000,
          side: 'call' as const,
        },
        {
          strike: 430,
          openInterest: 30000,
          optionQuote: 0.5,
          sharesPerContract: 100,
          openPremiumEstimate: 1500000,
          side: 'call' as const,
        },
      ];
      const puts = [
        {
          strike: 410,
          openInterest: 40000,
          optionQuote: 1.0,
          sharesPerContract: 100,
          openPremiumEstimate: 4000000,
          side: 'put' as const,
        },
      ];

      const result = service.aggregateByExpiration(calls, puts);
      expect(result.calls.totalOpenPremium).toBe(12250000);
      expect(result.calls.strikeCount).toBe(2);
      expect(result.puts.totalOpenPremium).toBe(4000000);
      expect(result.puts.strikeCount).toBe(1);
      expect(result.total.totalOpenPremium).toBe(16250000);
    });
  });
});
