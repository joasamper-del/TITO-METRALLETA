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
      find: vi.fn(),
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

  describe('Task 2: Registración vinculada a DecisionAuditTrail', () => {
    it('ENTRADA: snapshot + decisionId + reason → ESPERADO: decisionAuditTrailId y reasoning poblados → OBTENIDO: snapshot con vinculación', async () => {
      const snapshot = new PositionSnapshot();
      snapshot.symbol = 'BTC';
      snapshot.qty = 0.5;
      snapshot.currentPrice = 42000;
      snapshot.entryPrice = 40000;
      snapshot.pnl = 500;
      snapshot.pnlPercent = 2.5;

      const decisionId = '550e8400-e29b-41d4-a716-446655440000';
      const reason = 'Long entry: Trend reversal at support with high RSI oversold condition';

      const esperado = {
        decisionAuditTrailId: decisionId,
        reasoning: reason,
      };

      const obtenido = await service.registerDecisionReasoning(
        snapshot,
        decisionId,
        reason,
      );

      expect(obtenido.decisionAuditTrailId).toBe(esperado.decisionAuditTrailId);
      expect(obtenido.reasoning).toBe(esperado.reasoning);

      console.log(`
        ENTRADA: snapshot BTC + decisionId
        ESPERADO: decisionAuditTrailId y reasoning poblados
        OBTENIDO:
          - decisionAuditTrailId: ${obtenido.decisionAuditTrailId}
          - reasoning: ${obtenido.reasoning}
      `);
    });

    it('ENTRADA: decisionId vacío → ESPERADO: error → OBTENIDO: lanza error', async () => {
      const snapshot = new PositionSnapshot();
      snapshot.symbol = 'BTC';

      try {
        await service.registerDecisionReasoning(snapshot, '', 'some reason');
        fail('debería haber lanzado error');
      } catch (error: any) {
        expect(error.message).toContain('decisionAuditTrailId no puede estar vacío');
      }
    });

    it('ENTRADA: reasoning vacío → ESPERADO: error → OBTENIDO: lanza error', async () => {
      const snapshot = new PositionSnapshot();
      snapshot.symbol = 'BTC';
      const decisionId = '550e8400-e29b-41d4-a716-446655440000';

      try {
        await service.registerDecisionReasoning(snapshot, decisionId, '');
        fail('debería haber lanzado error');
      } catch (error: any) {
        expect(error.message).toContain('reasoning no puede estar vacío');
      }
    });

    it('ENTRADA: snapshot sin symbol → ESPERADO: error → OBTENIDO: lanza error', async () => {
      const snapshot: any = { qty: 0.5 };
      const decisionId = '550e8400-e29b-41d4-a716-446655440000';

      try {
        await service.registerDecisionReasoning(
          snapshot,
          decisionId,
          'some reason',
        );
        fail('debería haber lanzado error');
      } catch (error: any) {
        expect(error.message).toContain('snapshot debe tener symbol');
      }
    });

    it('ENTRADA: snapshot guardado → ESPERADO: recuperable por snapshotId con vinculación → OBTENIDO: datos correctos', async () => {
      const snapshot = new PositionSnapshot();
      snapshot.id = '123e4567-e89b-12d3-a456-426614174000';
      snapshot.symbol = 'ETH';
      snapshot.qty = 1;
      snapshot.currentPrice = 2300;
      snapshot.entryPrice = 2250;
      snapshot.pnl = 50;
      snapshot.pnlPercent = 2.22;

      const decisionId = '550e8400-e29b-41d4-a716-446655440000';
      const reason = 'Short entry: Resistance break with volume spike';

      await service.registerDecisionReasoning(snapshot, decisionId, reason);

      // Simular recuperación (mockRepository.findOne retorna el snapshot)
      mockRepository.findOne.mockResolvedValue(snapshot);

      const obtenido = await service.getWithDecision(snapshot.id!);

      expect(obtenido).not.toBeNull();
      expect(obtenido?.decisionAuditTrailId).toBe(decisionId);
      expect(obtenido?.reasoning).toBe(reason);

      console.log(`
        ENTRADA: snapshot ETH guardado con vinculación
        ESPERADO: recuperable con decisionAuditTrailId correcto
        OBTENIDO:
          - id: ${obtenido?.id}
          - symbol: ${obtenido?.symbol}
          - decisionAuditTrailId: ${obtenido?.decisionAuditTrailId}
          - reasoning: ${obtenido?.reasoning}
      `);
    });

    it('ENTRADA: múltiples snapshots vinculados a misma decisión → ESPERADO: recuperables todos → OBTENIDO: lista correcta', async () => {
      const decisionId = '550e8400-e29b-41d4-a716-446655440000';

      const snapshots = [
        {
          id: '1',
          symbol: 'BTC',
          decisionAuditTrailId: decisionId,
          reasoning: 'Entry reason',
        },
        {
          id: '2',
          symbol: 'BTC',
          decisionAuditTrailId: decisionId,
          reasoning: 'Update reason',
        },
      ];

      mockRepository.find.mockResolvedValue(snapshots);

      const obtenido = await service.getByDecision(decisionId);

      expect(obtenido.length).toBe(2);
      expect(obtenido.every((s) => s.decisionAuditTrailId === decisionId)).toBe(true);

      console.log(`
        ENTRADA: decisionId con 2 snapshots vinculados
        ESPERADO: recuperar lista de snapshots
        OBTENIDO: ${obtenido.length} snapshots con vinculación correcta
      `);
    });
  });

  describe('Task 3: Prueba funcional completa - Pipeline ETH', () => {
    it('ENTRADA: DecisionAuditTrail ENTER ETH + indicadores + razonamiento → ESPERADO: snapshot guardado con vinculación → OBTENIDO: recuperable con datos correctos', async () => {
      // Fase 1: ENTRADA - Crear decisión simulada
      const decisionId = '550e8400-e29b-41d4-a716-446655440001';
      const decision = {
        id: decisionId,
        symbol: 'ETH',
        decision: 'ENTER',
        timestamp: new Date(),
        confidence: 0.75,
        proposedEntry: 2300,
        proposedTarget: 2450,
        proposedStop: 2150,
      };

      // Fase 2: Crear PositionSnapshot con indicadores
      const snapshot = new PositionSnapshot();
      snapshot.id = '123e4567-e89b-12d3-a456-426614174001';
      snapshot.symbol = 'ETH';
      snapshot.timestamp = new Date();
      snapshot.qty = 1;
      snapshot.entryPrice = 2300;
      snapshot.currentPrice = 2300;
      snapshot.pnl = 0;
      snapshot.pnlPercent = 0;

      // Fase 3: Poblar indicadores técnicos
      const marketData = {
        volume: 850000,
        trend: 'UP' as const,
        rsi: 58.5,
        atr: 45.25,
        vix: 18.2,
      };

      const snapshotWithIndicators = await service.fillIndicators(
        snapshot,
        marketData,
      );

      // Verificar indicadores
      expect(snapshotWithIndicators.volume).toBe(850000);
      expect(snapshotWithIndicators.trend).toBe('UP');
      expect(snapshotWithIndicators.rsi).toBe(58.5);
      expect(snapshotWithIndicators.atr).toBe(45.25);
      expect(snapshotWithIndicators.vix).toBe(18.2);

      // Fase 4: Registrar razonamiento vinculado
      const reason =
        'ETH breakout at key support with volume spike. RSI not overbought, trend UP, VIX calm. Risk-reward favorable at 2300/2150.';

      const snapshotWithReasoning = await service.registerDecisionReasoning(
        snapshotWithIndicators,
        decisionId,
        reason,
      );

      // Verificar vinculación y razonamiento
      expect(snapshotWithReasoning.decisionAuditTrailId).toBe(decisionId);
      expect(snapshotWithReasoning.reasoning).toBe(reason);

      // Fase 5: Guardar en BD (mock)
      mockRepository.save.mockResolvedValue(snapshotWithReasoning);
      const savedSnapshot = await service.save(snapshotWithReasoning);

      expect(savedSnapshot.id).toBe(snapshot.id);
      expect(savedSnapshot.symbol).toBe('ETH');

      // Fase 6: Recuperar desde BD
      mockRepository.findOne.mockResolvedValue(savedSnapshot);
      const retrievedSnapshot = await service.getWithDecision(snapshot.id!);

      // VERIFICACIÓN COMPLETA: Todos los datos pertenecen a la misma decisión y posición
      expect(retrievedSnapshot).not.toBeNull();
      expect(retrievedSnapshot?.symbol).toBe('ETH');
      expect(retrievedSnapshot?.decisionAuditTrailId).toBe(decisionId);

      // Indicadores intactos
      expect(retrievedSnapshot?.volume).toBe(850000);
      expect(retrievedSnapshot?.trend).toBe('UP');
      expect(retrievedSnapshot?.rsi).toBe(58.5);
      expect(retrievedSnapshot?.atr).toBe(45.25);
      expect(retrievedSnapshot?.vix).toBe(18.2);

      // Razonamiento intacto
      expect(retrievedSnapshot?.reasoning).toBe(reason);

      console.log(`
        ✅ PIPELINE COMPLETO ETH:

        ENTRADA:
        - DecisionId: ${decisionId}
        - Symbol: ETH
        - Decision: ENTER @ 2300
        - Indicadores: Vol=${marketData.volume}, Trend=${marketData.trend}, RSI=${marketData.rsi}

        ESPERADO:
        - Snapshot guardado con vinculación a decisión
        - Indicadores preservados
        - Razonamiento preservado
        - Recuperable después

        OBTENIDO:
        - Symbol: ${retrievedSnapshot?.symbol} ✓
        - DecisionAuditTrailId: ${retrievedSnapshot?.decisionAuditTrailId} ✓
        - Volume: ${retrievedSnapshot?.volume} ✓
        - Trend: ${retrievedSnapshot?.trend} ✓
        - RSI: ${retrievedSnapshot?.rsi} ✓
        - ATR: ${retrievedSnapshot?.atr} ✓
        - VIX: ${retrievedSnapshot?.vix} ✓
        - Reasoning: "${retrievedSnapshot?.reasoning?.substring(0, 50)}..." ✓

        RESULTADO: PASS ✅
      `);
    });

    it('ENTRADA: Múltiples snapshots en ciclo de monitoreo → ESPERADO: todos vinculados a decisión, razonamiento progresivo → OBTENIDO: historia completa recuperable', async () => {
      const decisionId = '550e8400-e29b-41d4-a716-446655440002';

      // Ciclo 1: Entrada
      const snap1 = new PositionSnapshot();
      snap1.id = 'snap-1';
      snap1.symbol = 'ETH';
      snap1.currentPrice = 2300;
      snap1.entryPrice = 2300;
      snap1.qty = 1;
      snap1.pnl = 0;
      snap1.pnlPercent = 0;
      snap1.timestamp = new Date();

      const snap1WithReasoning = await service.registerDecisionReasoning(
        snap1,
        decisionId,
        'Entry: Breakout confirmed',
      );

      // Ciclo 2: Monitoreo - Precio sube
      const snap2 = new PositionSnapshot();
      snap2.id = 'snap-2';
      snap2.symbol = 'ETH';
      snap2.currentPrice = 2350;
      snap2.entryPrice = 2300;
      snap2.qty = 1;
      snap2.pnl = 50;
      snap2.pnlPercent = 2.17;
      snap2.timestamp = new Date(Date.now() + 300000);

      const snap2WithReasoning = await service.registerDecisionReasoning(
        snap2,
        decisionId,
        'Monitor: Trend strong, RSI 65, holding',
      );

      // Ciclo 3: Monitoreo - Precio cae ligeramente
      const snap3 = new PositionSnapshot();
      snap3.id = 'snap-3';
      snap3.symbol = 'ETH';
      snap3.currentPrice = 2330;
      snap3.entryPrice = 2300;
      snap3.qty = 1;
      snap3.pnl = 30;
      snap3.pnlPercent = 1.3;
      snap3.timestamp = new Date(Date.now() + 600000);

      const snap3WithReasoning = await service.registerDecisionReasoning(
        snap3,
        decisionId,
        'Pullback: Support holding, RSI 52, still UP trend',
      );

      // Todos guardados (mock)
      const allSnapshots = [
        snap1WithReasoning,
        snap2WithReasoning,
        snap3WithReasoning,
      ];

      mockRepository.find.mockResolvedValue(allSnapshots);

      // Recuperar historia
      const history = await service.getByDecision(decisionId);

      // VERIFICACIÓN: Todos pertenecen a la misma decisión
      expect(history.length).toBe(3);
      expect(
        history.every((s) => s.decisionAuditTrailId === decisionId),
      ).toBe(true);

      // VERIFICACIÓN: Razonamiento progresivo
      expect(history[0].reasoning).toContain('Entry');
      expect(history[1].reasoning).toContain('Monitor');
      expect(history[2].reasoning).toContain('Pullback');

      // VERIFICACIÓN: P&L progresivo
      expect(history[0].pnl).toBe(0);
      expect(history[1].pnl).toBe(50);
      expect(history[2].pnl).toBe(30);

      console.log(`
        ✅ CICLO COMPLETO MONITOREO ETH:

        ENTRADA:
        - 3 snapshots en ciclo de trading (entrada → subida → corrección)
        - Todos vinculados a decisionId: ${decisionId}

        ESPERADO:
        - Recuperar historia completa de decisión
        - Razonamiento progresivo (Entry → Monitor → Pullback)
        - P&L actualizado (0 → +50 → +30)

        OBTENIDO:
        - Snapshots recuperados: ${history.length}
        - Vinculación correcta: ${history.every((s) => s.decisionAuditTrailId === decisionId)}
        - Razonamientos presentes: ${history.map((s) => s.reasoning?.substring(0, 10)).join(', ')}
        - P&L progresivo: ${history.map((s) => s.pnl).join(' → ')}

        RESULTADO: PASS ✅
      `);
    });
  });
});
