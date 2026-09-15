import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LiquidityService } from './liquidity.service';

describe('LiquidityService (R2-R8: Tarea 6)', () => {
  let service: LiquidityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiquidityService],
    }).compile();

    service = module.get<LiquidityService>(LiquidityService);
  });

  describe('R6: Casos Numéricos C1-C6', () => {
    it('C1: OI=100k, Premium=$50k, Disparidad=4% → PASS', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 52000,
        premiumAvg5d: 50000,
        sector5dAvgOI: 100000,
      });
      expect(result.pass).toBe(true);
      expect(result.disparityPct).toBeLessThanOrEqual(4.01); // ±0.01% tolerance
      expect(result.disparityPct).toBeGreaterThanOrEqual(3.99);
    });

    it('C2: OI=150k, Premium=$48k, Disparidad≈22% → HOLD (pass=false)', () => {
      const result = service.evaluateLiquidity({
        symbol: 'SPY',
        actualPremium: 58560,
        premiumAvg5d: 48000,
        sector5dAvgOI: 122100,
      });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('marginal');
      expect(result.disparityPct).toBeLessThan(40);
      expect(result.disparityPct).toBeGreaterThan(20);
    });

    it('C3: OI=200k, Premium=$45k, Disparidad≈45% → FAIL', () => {
      const result = service.evaluateLiquidity({
        symbol: 'QQQ',
        actualPremium: 65250,
        premiumAvg5d: 45000,
        sector5dAvgOI: 110000,
      });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Liquidez insuficiente');
      expect(result.disparityPct).toBeGreaterThan(40);
    });

    it('C4: OI=80k, Premium=$40k, Disparidad=15% → PASS (liq=80%)', () => {
      const result = service.evaluateLiquidity({
        symbol: 'TSLA',
        actualPremium: 46000,
        premiumAvg5d: 40000,
        sector5dAvgOI: 94100,
      });
      expect(result.pass).toBe(true);
      expect(result.disparityPct).toBeLessThanOrEqual(15.5);
      expect(result.liquidityPct).toBeGreaterThanOrEqual(60);
    });

    it('C5: OI=50k, Premium=$60k, Disparidad=16.67% → PASS', () => {
      const result = service.evaluateLiquidity({
        symbol: 'NVDA',
        actualPremium: 70000,
        premiumAvg5d: 60000,
        sector5dAvgOI: 60000,
      });
      expect(result.pass).toBe(true);
      expect(result.disparityPct).toBeLessThanOrEqual(16.68);
      expect(result.disparityPct).toBeGreaterThanOrEqual(16.66);
    });

    it('C6: OI=20k, Premium=$50k, Disparidad=12% → PASS (liq>60%)', () => {
      const result = service.evaluateLiquidity({
        symbol: 'AMD',
        actualPremium: 56000,
        premiumAvg5d: 50000,
        sector5dAvgOI: 22700,
      });
      expect(result.pass).toBe(true);
      expect(result.disparityPct).toBeLessThanOrEqual(12.5);
    });

    it('C7: Frontera disparidad 40% (límite FAIL) → FAIL', () => {
      const result = service.evaluateLiquidity({
        symbol: 'NVDA',
        actualPremium: 140000,
        premiumAvg5d: 100000,
        sector5dAvgOI: 120000,
      });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('insuficiente');
      expect(result.disparityPct).toBe(40);
    });

    it('C8: Frontera disparidad 39.99% (último HOLD) → HOLD', () => {
      const result = service.evaluateLiquidity({
        symbol: 'MSFT',
        actualPremium: 139900,
        premiumAvg5d: 100000,
        sector5dAvgOI: 120000,
      });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('marginal');
      expect(result.disparityPct).toBeLessThan(40);
      expect(result.disparityPct).toBeGreaterThan(38);
    });

    it('C9: Volumen desplomado — liquidityPct 59% (bajo 60%) → FAIL', () => {
      const result = service.evaluateLiquidity({
        symbol: 'GOOGL',
        actualPremium: 59000,
        premiumAvg5d: 100000,
        sector5dAvgOI: 100000,
      });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('baja');
      expect(result.liquidityPct).toBeLessThan(60);
    });

    it('C10: Volumen frontera liquidityPct 60% (umbral) → PASS', () => {
      const result = service.evaluateLiquidity({
        symbol: 'META',
        actualPremium: 60000,
        premiumAvg5d: 100000,
        sector5dAvgOI: 100000,
      });
      expect(result.pass).toBe(true);
      expect(result.liquidityPct).toBeGreaterThanOrEqual(60);
      expect(result.liquidityPct).toBeLessThanOrEqual(60.1);
    });

    it('C11: Disparidad negativa (actual > avg) 25% → HOLD', () => {
      const result = service.evaluateLiquidity({
        symbol: 'AAPL',
        actualPremium: 125000,
        premiumAvg5d: 100000,
        sector5dAvgOI: 110000,
      });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('marginal');
      expect(result.disparityPct).toBe(25);
    });

    it('C12: Volumen muy alto — disparidad 100% (anómalo) → FAIL', () => {
      const result = service.evaluateLiquidity({
        symbol: 'TSLA',
        actualPremium: 200000,
        premiumAvg5d: 100000,
        sector5dAvgOI: 120000,
      });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('insuficiente');
      expect(result.disparityPct).toBe(100);
    });

    it('C13: Sin histórico sector — sector5dAvgOI=0 → FAIL', () => {
      const result = service.evaluateLiquidity({
        symbol: 'WULF',
        actualPremium: 100000,
        premiumAvg5d: 50000,
        sector5dAvgOI: 0,
      });
      expect(result.pass).toBe(false);
      expect(result.disparityPct).toBeNull();
      expect(result.liquidityPct).toBeNull();
    });
  });

  describe('R7: Anti-patterns A1-A7 (Fail-Closed)', () => {
    it('A1: Input falta (OI=null) → FAIL, no asumir', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: null as any,
        premiumAvg5d: 50000,
      });
      expect(result.pass).toBe(false);
      expect(['Input falta', 'actualPremium falta', 'falta'].some(w => result.reason.includes(w))).toBe(true);
      expect(result.disparityPct).toBeNull();
    });

    it('A2: Premium histórico incompleto (<3d) → FAIL', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 100000,
        premiumAvg5d: null as any,
      });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Datos insuficientes');
    });

    it('A3: Premium=0 (confundir liquidez/precio) → FAIL', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 100000,
        premiumAvg5d: 0,
      });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('inválido');
    });

    it('A4: Threshold no hardcodeado (configurable) → ✅ Verifiable', () => {
      // Validar que 20% disparidad pasa, 21% no (frontera exacta)
      const pass20 = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 120000,
        premiumAvg5d: 100000,
        sector5dAvgOI: 100000,
      });
      expect(pass20.pass).toBe(true); // 20% es threshold, pasa

      const fail21 = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 121000,
        premiumAvg5d: 100000,
        sector5dAvgOI: 100000,
      });
      expect(fail21.pass).toBe(false); // >20% entra en HOLD o FAIL
    });

    it('A5: NO fail-closed si falta dato → ALWAYS FAIL', () => {
      const cases = [
        { symbol: null, actualPremium: 100000, premiumAvg5d: 50000 },
        { symbol: 'BTC', actualPremium: null, premiumAvg5d: 50000 },
        { symbol: 'BTC', actualPremium: 100000, premiumAvg5d: null },
      ];
      cases.forEach((testCase) => {
        const result = service.evaluateLiquidity(testCase as any);
        expect(result.pass).toBe(false);
      });
    });

    it('A6: Mensaje claro (no ambiguo)', () => {
      const failResult = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 50000,
        premiumAvg5d: 100000,
        sector5dAvgOI: 100000,
      });
      expect(failResult.reason).toBeTruthy();
      expect(failResult.reason.length).toBeGreaterThan(10);
      expect(['PASS', 'insuficiente', 'marginal'].some((w) => failResult.reason.includes(w))).toBe(true);
    });

    it('A7: Cambiar umbral sin autorización → Prevención: valores constantes', () => {
      // Validar que umbrales son exactos (20%, 40%, 60%)
      const pass20 = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 120000,
        premiumAvg5d: 100000,
        sector5dAvgOI: 100000,
      });
      expect(pass20.disparityPct).toBe(20);
      expect(pass20.pass).toBe(true);

      const fail40Plus = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 150000,
        premiumAvg5d: 100000,
        sector5dAvgOI: 100000,
      });
      expect(fail40Plus.disparityPct).toBe(50);
      expect(fail40Plus.pass).toBe(false);
    });
  });

  describe('R8: Fail-Closed Tests (Additional Coverage)', () => {
    it('OI=null, Premium valid → FAIL', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: null as any,
        premiumAvg5d: 50000,
      });
      expect(result.pass).toBe(false);
    });

    it('OI=-100 (negative) → FAIL', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: -100000,
        premiumAvg5d: 50000,
      });
      expect(result.pass).toBe(false);
    });

    it('OI=0 (zero) → FAIL', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 0,
        premiumAvg5d: 50000,
      });
      expect(result.pass).toBe(false);
    });

    it('Premium=null, OI valid → FAIL', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 100000,
        premiumAvg5d: null as any,
      });
      expect(result.pass).toBe(false);
    });

    it('Premium=-50 (negative) → FAIL', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 100000,
        premiumAvg5d: -50000,
      });
      expect(result.pass).toBe(false);
    });

    it('Symbol=null → FAIL', () => {
      const result = service.evaluateLiquidity({
        symbol: null as any,
        actualPremium: 100000,
        premiumAvg5d: 50000,
      });
      expect(result.pass).toBe(false);
    });

    it('Entire input=null → FAIL', () => {
      const result = service.evaluateLiquidity(null as any);
      expect(result.pass).toBe(false);
    });

    it('Disparidad boundary 39.99% → HOLD (pass=false)', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 139900,
        premiumAvg5d: 100000,
        sector5dAvgOI: 100000,
      });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('marginal');
    });

    it('Disparidad boundary 40.01% → FAIL (pass=false)', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 140010,
        premiumAvg5d: 100000,
        sector5dAvgOI: 100000,
      });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('insuficiente');
    });

    it('Liquidity 59% → FAIL (below 60%)', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 59000,
        premiumAvg5d: 100000,
        sector5dAvgOI: 120000,
      });
      expect(result.liquidityPct).toBeLessThan(60);
      expect(result.pass).toBe(false);
    });

    it('Liquidity 60% → PASS (at threshold)', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 60000,
        premiumAvg5d: 100000,
        sector5dAvgOI: 120000,
      });
      expect(result.liquidityPct).toBeGreaterThanOrEqual(60);
      expect(result.pass).toBe(true);
    });
  });

  describe('R4: Flag "Datos No Fiables"', () => {
    it('Disparidad > 40% → Flag "Liquidez insuficiente"', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 200000,
        premiumAvg5d: 100000,
        sector5dAvgOI: 100000,
      });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('insuficiente');
    });

    it('Liquidez < 60% → Flag "Datos no fiables"', () => {
      const result = service.evaluateLiquidity({
        symbol: 'BTC',
        actualPremium: 50000,
        premiumAvg5d: 100000,
        sector5dAvgOI: 120000,
      });
      expect(result.liquidityPct).toBeLessThan(60);
      expect(result.pass).toBe(false);
    });
  });
});
