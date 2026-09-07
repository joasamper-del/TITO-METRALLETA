import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PositionSnapshotService } from './position-snapshot.service';
import { PositionSnapshot } from '../database/entities/position-snapshot.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

/**
 * S62 Task 1: Integrar indicadores técnicos en PositionSnapshot
 * Patrón: ENTRADA → ESPERADO → OBTENIDO
 */
describe('PositionSnapshotService - Task 1 Indicadores Técnicos', () => {
  let service: PositionSnapshotService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      save: vi.fn((snapshot) => Promise.resolve(snapshot)),
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PositionSnapshotService,
        {
          provide: getRepositoryToken(PositionSnapshot),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PositionSnapshotService>(PositionSnapshotService);
  });

  describe('fillIndicators - Volume', () => {
    it('ENTRADA: snapshot sin volume, marketData.volume=1500 → ESPERADO: volume=1500 → OBTENIDO: volume es 1500', async () => {
      const entrada = {
        symbol: 'BTC',
        currentPrice: 42000,
        qty: 0.5,
        entryPrice: 40000,
        pnl: 500,
        pnlPercent: 2.5,
      };

      const marketData = {
        volume: 1500,
      };

      const esperado = { volume: 1500 };
      const obtenido = await service.fillIndicators(entrada, marketData);

      expect(obtenido.volume).toBe(esperado.volume);
      console.log(`
        ENTRADA: snapshot sin volume
        MARKET DATA: ${JSON.stringify(marketData)}
        ESPERADO: volume = ${esperado.volume}
        OBTENIDO: volume = ${obtenido.volume}
      `);
    });

    it('ENTRADA: no hay marketData.volume → ESPERADO: volume=null → OBTENIDO: volume es null', async () => {
      const entrada = {
        symbol: 'BTC',
        currentPrice: 42000,
        qty: 0.5,
        entryPrice: 40000,
        pnl: 500,
        pnlPercent: 2.5,
      };

      const obtenido = await service.fillIndicators(entrada, {});

      expect(obtenido.volume).toBeNull();
    });
  });

  describe('fillIndicators - Trend', () => {
    it('ENTRADA: trend=UP → ESPERADO: trend="UP" → OBTENIDO: trend es "UP"', async () => {
      const entrada = {
        symbol: 'SPY',
        currentPrice: 450,
        qty: 1,
        entryPrice: 440,
        pnl: 10,
        pnlPercent: 2.27,
      };

      const marketData = { trend: 'UP' as const };

      const obtenido = await service.fillIndicators(entrada, marketData);

      expect(obtenido.trend).toBe('UP');
      console.log(`
        ENTRADA: symbol="SPY", marketData.trend="UP"
        ESPERADO: trend = "UP"
        OBTENIDO: trend = "${obtenido.trend}"
      `);
    });

    it('ENTRADA: trend=DOWN → ESPERADO: trend="DOWN" → OBTENIDO: trend es "DOWN"', async () => {
      const entrada = {
        symbol: 'QQQ',
        currentPrice: 350,
        qty: 1,
        entryPrice: 360,
        pnl: -10,
        pnlPercent: -2.78,
      };

      const marketData = { trend: 'DOWN' as const };

      const obtenido = await service.fillIndicators(entrada, marketData);

      expect(obtenido.trend).toBe('DOWN');
    });

    it('ENTRADA: no hay trend → ESPERADO: trend="NEUTRAL" → OBTENIDO: trend es "NEUTRAL"', async () => {
      const entrada = {
        symbol: 'ETH',
        currentPrice: 2300,
        qty: 1,
        entryPrice: 2300,
        pnl: 0,
        pnlPercent: 0,
      };

      const obtenido = await service.fillIndicators(entrada, {});

      expect(obtenido.trend).toBe('NEUTRAL');
    });

    it('ENTRADA: trend=INVALID → ESPERADO: error → OBTENIDO: lanza error', async () => {
      const entrada = {
        symbol: 'BTC',
        currentPrice: 42000,
        qty: 0.5,
        entryPrice: 40000,
        pnl: 500,
        pnlPercent: 2.5,
      };

      const marketData = { trend: 'INVALID' as any };

      try {
        await service.fillIndicators(entrada, marketData);
        fail('debería haber lanzado error');
      } catch (error: any) {
        expect(error.message).toContain('trend debe ser UP, DOWN o NEUTRAL');
      }
    });
  });

  describe('fillIndicators - RSI', () => {
    it('ENTRADA: rsi=65.5 → ESPERADO: rsi=65.5 → OBTENIDO: rsi es 65.5', async () => {
      const entrada = {
        symbol: 'BTC',
        currentPrice: 42000,
        qty: 0.5,
        entryPrice: 40000,
        pnl: 500,
        pnlPercent: 2.5,
      };

      const marketData = { rsi: 65.5 };

      const obtenido = await service.fillIndicators(entrada, marketData);

      expect(obtenido.rsi).toBe(65.5);
      console.log(`
        ENTRADA: symbol="BTC", marketData.rsi=65.5
        ESPERADO: rsi = 65.5
        OBTENIDO: rsi = ${obtenido.rsi}
      `);
    });

    it('ENTRADA: no hay rsi → ESPERADO: rsi=null → OBTENIDO: rsi es null', async () => {
      const entrada = {
        symbol: 'SPY',
        currentPrice: 450,
        qty: 1,
        entryPrice: 440,
        pnl: 10,
        pnlPercent: 2.27,
      };

      const obtenido = await service.fillIndicators(entrada, {});

      expect(obtenido.rsi).toBeNull();
    });
  });

  describe('fillIndicators - ATR', () => {
    it('ENTRADA: atr=125.75 → ESPERADO: atr=125.75 → OBTENIDO: atr es 125.75', async () => {
      const entrada = {
        symbol: 'BTC',
        currentPrice: 42000,
        qty: 0.5,
        entryPrice: 40000,
        pnl: 500,
        pnlPercent: 2.5,
      };

      const marketData = { atr: 125.75 };

      const obtenido = await service.fillIndicators(entrada, marketData);

      expect(obtenido.atr).toBe(125.75);
    });
  });

  describe('fillIndicators - VIX', () => {
    it('ENTRADA: vix=18.5 → ESPERADO: vix=18.5 → OBTENIDO: vix es 18.5', async () => {
      const entrada = {
        symbol: 'SPY',
        currentPrice: 450,
        qty: 1,
        entryPrice: 440,
        pnl: 10,
        pnlPercent: 2.27,
      };

      const marketData = { vix: 18.5 };

      const obtenido = await service.fillIndicators(entrada, marketData);

      expect(obtenido.vix).toBe(18.5);
      console.log(`
        ENTRADA: symbol="SPY", marketData.vix=18.5
        ESPERADO: vix = 18.5
        OBTENIDO: vix = ${obtenido.vix}
      `);
    });
  });

  describe('fillReasoning', () => {
    it('ENTRADA: snapshot + reason="Long trend reversal at support" → ESPERADO: reasoning poblado → OBTENIDO: reasoning es correcto', async () => {
      const snapshot = new PositionSnapshot();
      snapshot.symbol = 'BTC';
      snapshot.qty = 0.5;

      const reason = 'Long trend reversal at support';

      const esperado = reason;
      const obtenido = await service.fillReasoning(snapshot, reason);

      expect(obtenido.reasoning).toBe(esperado);
      console.log(`
        ENTRADA: reason="${reason}"
        ESPERADO: reasoning = "${esperado}"
        OBTENIDO: reasoning = "${obtenido.reasoning}"
      `);
    });

    it('ENTRADA: reason vacío → ESPERADO: error → OBTENIDO: lanza error', async () => {
      const snapshot = new PositionSnapshot();
      snapshot.symbol = 'BTC';

      try {
        await service.fillReasoning(snapshot, '');
        fail('debería haber lanzado error');
      } catch (error: any) {
        expect(error.message).toContain('reasoning no puede estar vacío');
      }
    });
  });

  describe('Validación de entrada', () => {
    it('ENTRADA: snapshot sin symbol → ESPERADO: error → OBTENIDO: lanza error', async () => {
      const entrada: any = {
        currentPrice: 42000,
        qty: 0.5,
      };

      try {
        await service.fillIndicators(entrada, {});
        fail('debería haber lanzado error');
      } catch (error: any) {
        expect(error.message).toContain('snapshot debe contener symbol');
      }
    });

    it('ENTRADA: snapshot sin currentPrice → ESPERADO: error → OBTENIDO: lanza error', async () => {
      const entrada: any = {
        symbol: 'BTC',
        qty: 0.5,
      };

      try {
        await service.fillIndicators(entrada, {});
        fail('debería haber lanzado error');
      } catch (error: any) {
        expect(error.message).toContain('snapshot debe contener symbol');
      }
    });

    it('ENTRADA: snapshot sin qty → ESPERADO: error → OBTENIDO: lanza error', async () => {
      const entrada: any = {
        symbol: 'BTC',
        currentPrice: 42000,
      };

      try {
        await service.fillIndicators(entrada, {});
        fail('debería haber lanzado error');
      } catch (error: any) {
        expect(error.message).toContain('snapshot debe contener symbol');
      }
    });
  });

  describe('Integración completa - Todos los indicadores', () => {
    it('ENTRADA: snapshot + datos técnicos completos → ESPERADO: todos los campos poblados → OBTENIDO: snapshot con todos los datos', async () => {
      const entrada = {
        symbol: 'BTC',
        currentPrice: 42000,
        qty: 0.5,
        entryPrice: 40000,
        pnl: 500,
        pnlPercent: 2.5,
      };

      const marketData = {
        volume: 2500,
        trend: 'UP' as const,
        rsi: 72.5,
        atr: 150.25,
        vix: 16.5,
      };

      const obtenido = await service.fillIndicators(entrada, marketData);

      expect(obtenido.symbol).toBe('BTC');
      expect(obtenido.volume).toBe(2500);
      expect(obtenido.trend).toBe('UP');
      expect(obtenido.rsi).toBe(72.5);
      expect(obtenido.atr).toBe(150.25);
      expect(obtenido.vix).toBe(16.5);

      console.log(`
        ENTRADA: BTC con datos de posición
        MARKET DATA: ${JSON.stringify(marketData)}
        ESPERADO: todos los indicadores poblados
        OBTENIDO:
          - symbol: ${obtenido.symbol}
          - volume: ${obtenido.volume}
          - trend: ${obtenido.trend}
          - rsi: ${obtenido.rsi}
          - atr: ${obtenido.atr}
          - vix: ${obtenido.vix}
      `);
    });
  });
});
