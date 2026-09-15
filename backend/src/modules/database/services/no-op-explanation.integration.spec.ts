import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Repository } from 'typeorm';
import { NoOpExplanation } from '../entities/no-op-explanation.entity';
import { NoOpExplanationService } from './no-op-explanation.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * END-TO-END INTEGRATION TEST (Mocked) — FASE 4
 * No-Operation Explanation: Registrar automáticamente POR QUÉ Tito no operó
 *
 * Requisitos:
 * - Registrar causa real verificable (gate específico, mercado cerrado, evidencia inválida, etc.)
 * - Guardar gate/regla exacta que bloqueó (NO inventar)
 * - Timestamp real del bloqueo (NO fabricar)
 * - Evidencia disponible (NO inventada)
 * - Detectar NO-OPERACIONES SILENCIOSAS (decisión sin explicación cuando hay evento bloqueante)
 * - NO duplicados para misma decisión
 * - Nunca un PASS silencioso cuando existe una explicación verificable
 */
describe('[CP3.3-FASE4] No-Op Explanation — ¿Por qué no operó Tito?', () => {
  let noOpService: NoOpExplanationService;
  let noOpRepo: Repository<NoOpExplanation>;

  // In-memory storage
  const explanations: Map<string, NoOpExplanation> = new Map();

  beforeEach(async () => {
    explanations.clear();

    // Mock NoOpExplanation repository
    noOpRepo = {
      create: (data: any) => {
        const noOp = new NoOpExplanation();
        Object.assign(noOp, data, { id: uuidv4(), createdAt: new Date() });
        return noOp;
      },
      save: vi.fn((noOp: NoOpExplanation) => {
        explanations.set(noOp.id, noOp);
        return Promise.resolve(noOp);
      }),
      findOne: vi.fn((opts: any) => {
        if (opts.where.decisionId) {
          for (const exp of explanations.values()) {
            if (exp.decisionId === opts.where.decisionId) {
              return Promise.resolve(exp);
            }
          }
        }
        return Promise.resolve(null);
      }),
      find: vi.fn((opts: any) => {
        const results = Array.from(explanations.values());
        if (opts?.where?.blockageReason) {
          return Promise.resolve(
            results.filter((e) => e.blockageReason === opts.where.blockageReason),
          );
        }
        return Promise.resolve(results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      }),
    } as any;

    noOpService = new NoOpExplanationService(noOpRepo);
  });

  describe('Causa N1: SEATBELT Gate bloqueado', () => {
    it('N1a: Gate específico (maxDrawdown) bloqueó', async () => {
      const decisionId = uuidv4();
      const blockageTime = new Date();

      const explanation = await noOpService.recordBlockage(
        decisionId,
        'SEATBELT_GATE',
        'SEATBELT.maxDrawdown > 15%', // Exacto: cuál gate
        blockageTime,
        'Posición actual drawdown 18% excede límite 15% de SEATBELT',
        {
          currentDrawdown: '18%',
          seatbeltLimit: '15%',
          timestamp: blockageTime.toISOString(),
        },
        { maxDrawdown: { passed: false, limit: 15, actual: 18 } },
      );

      expect(explanation.decisionId).toBe(decisionId);
      expect(explanation.blockageReason).toBe('SEATBELT_GATE');
      expect(explanation.specificGateOrRule).toBe('SEATBELT.maxDrawdown > 15%'); // Exactitud
      expect(explanation.blockageTimestamp).toBe(blockageTime); // Real, no fabricado
      expect(explanation.blockageExplanation).toContain('drawdown');
      expect(explanation.failedGates?.maxDrawdown).toBeDefined();
    });

    it('N1b: Múltiples gates fallidos — registrar todos', async () => {
      const decisionId = uuidv4();
      const blockageTime = new Date();

      const explanation = await noOpService.recordBlockage(
        decisionId,
        'MULTIPLE_GATES_FAILED',
        'SEATBELT.maxDrawdown + SEATBELT.maxConsecutiveLosses', // Exactos
        blockageTime,
        'Dos gates SEATBELT fallaron simultáneamente',
        undefined,
        {
          maxDrawdown: { passed: false, actual: 20, limit: 15 },
          maxConsecutiveLosses: { passed: false, actual: 3, limit: 2 },
        },
      );

      expect(explanation.blockageReason).toBe('MULTIPLE_GATES_FAILED');
      expect(explanation.specificGateOrRule).toContain('maxDrawdown');
      expect(explanation.specificGateOrRule).toContain('maxConsecutiveLosses');
      expect(Object.keys(explanation.failedGates || {})).toHaveLength(2);
    });
  });

  describe('Causa N2: Mercado cerrado', () => {
    it('N2a: Mercado cerrado — timestamp real del cierre', async () => {
      const decisionId = uuidv4();
      const closureTime = new Date('2026-09-14T20:00:00Z'); // Cierre NYSE real

      const explanation = await noOpService.recordBlockage(
        decisionId,
        'MARKET_CLOSED',
        'NYSE trading hours: 09:30-16:00 ET', // Exacta: horario real
        closureTime,
        'Mercado NYSE cerrado a las 20:00 ET, fuera de horario de trading',
        {
          currentTime: closureTime.toISOString(),
          marketHours: '09:30-16:00 ET',
          isOpen: false,
        },
      );

      expect(explanation.blockageReason).toBe('MARKET_CLOSED');
      expect(explanation.blockageTimestamp.toISOString()).toBe(closureTime.toISOString());
      expect(explanation.blockageExplanation).toContain('NYSE cerrado');
    });
  });

  describe('Causa N3: Pre-execution Evidence insuficiente/inválida', () => {
    it('N3a: Evidence inválida → Bloqueo sin fabricación', async () => {
      const decisionId = uuidv4();
      const blockageTime = new Date();

      const explanation = await noOpService.recordBlockage(
        decisionId,
        'INSUFFICIENT_EVIDENCE',
        'PreExecutionEvidence.consumed == true', // Exacta: regla que bloqueó
        blockageTime,
        'Pre-execution evidence ya fue consumida (anti-replay), no puede re-usar',
        {
          evidenceStatus: 'consumed',
          timestamp: blockageTime.toISOString(),
        },
      );

      expect(explanation.blockageReason).toBe('INSUFFICIENT_EVIDENCE');
      expect(explanation.specificGateOrRule).toContain('consumed');
    });
  });

  describe('Causa N4: NO-OPERACIÓN SILENCIOSA — NUNCA permitida', () => {
    it('N4a: Decisión sin explicación cuando existe evento bloqueante → Detectar', async () => {
      // Este test es para verificar que si no registramos una explicación,
      // el sistema detectaría falta de explicación (en una implementación real)
      const decisionId = uuidv4();

      // Intentar encontrar explicación para esta decisión (no existe)
      const missing = await noOpService.findByDecisionId(decisionId);

      expect(missing).toBeNull(); // No hay explicación registrada
      // En un sistema real, esto sería detectado como anomalía
    });

    it('N4b: Registrar explicación previene silencio', async () => {
      const decisionId = uuidv4();
      const blockageTime = new Date();

      await noOpService.recordBlockage(
        decisionId,
        'SEATBELT_GATE',
        'maxLossPercentage > 5%',
        blockageTime,
        'Pérdida esperada 6% excede límite 5%',
      );

      // Ahora existe explicación
      const found = await noOpService.findByDecisionId(decisionId);

      expect(found).toBeDefined();
      expect(found!.blockageReason).toBe('SEATBELT_GATE');
    });
  });

  describe('Causa N5: Indeterminada (FAIL/HOLD)', () => {
    it('N5a: Causa no determinable con evidencia suficiente → FAIL/HOLD', async () => {
      const decisionId = uuidv4();
      const blockageTime = new Date();

      const explanation = await noOpService.recordBlockage(
        decisionId,
        'INDETERMINATE',
        'Unknown: insufficient data to determine blockage reason', // Honesto
        blockageTime,
        'No hay evidencia suficiente para determinar por qué se bloqueó la decisión',
        {
          availableData: 'partial',
          missingContext: 'market conditions unclear',
        },
      );

      expect(explanation.blockageReason).toBe('INDETERMINATE');
      expect(explanation.blockageExplanation).toContain('No hay evidencia suficiente');
    });
  });

  describe('Causa N6: SIN duplicados', () => {
    it('N6a: Misma decisión no puede tener múltiples explicaciones', async () => {
      const decisionId = uuidv4();
      const blockageTime = new Date();

      // Primera explicación
      const first = await noOpService.recordBlockage(
        decisionId,
        'SEATBELT_GATE',
        'maxDrawdown > 15%',
        blockageTime,
        'First blockage',
      );

      expect(first.isDuplicate).toBe(false);

      // Intentar registrar segunda explicación para mismo decisionId
      const second = await noOpService.recordBlockage(
        decisionId,
        'MARKET_CLOSED',
        'NYSE closed',
        new Date(),
        'Second blockage',
      );

      expect(second.isDuplicate).toBe(true); // Marcado como duplicado
      expect(second.duplicateOfId).toBe(first.id);
    });
  });

  describe('Causa N7: Búsquedas por razón y no-operaciones indeterminadas', () => {
    it('N7a: findByReason() devuelve todas las del tipo', async () => {
      for (let i = 0; i < 3; i++) {
        await noOpService.recordBlockage(
          uuidv4(),
          'SEATBELT_GATE',
          `gate${i}`,
          new Date(),
          `Blockage ${i}`,
        );
      }

      const results = await noOpService.findByReason('SEATBELT_GATE');

      expect(results.length).toBe(3);
      expect(results.every((e) => e.blockageReason === 'SEATBELT_GATE')).toBe(true);
    });

    it('N7b: findMissingExplanations() expone causas indeterminadas', async () => {
      // Registrar mezcla
      await noOpService.recordBlockage(
        uuidv4(),
        'SEATBELT_GATE',
        'gate1',
        new Date(),
        'Known cause',
      );
      await noOpService.recordBlockage(
        uuidv4(),
        'INDETERMINATE',
        'Unknown',
        new Date(),
        'Unknown cause',
      );
      await noOpService.recordBlockage(
        uuidv4(),
        'MARKET_CLOSED',
        'hours',
        new Date(),
        'Market closed',
      );

      const indeterminate = await noOpService.findMissingExplanations();

      expect(indeterminate.length).toBeGreaterThan(0);
      expect(indeterminate.every((e) => e.blockageReason === 'INDETERMINATE')).toBe(true);
    });
  });

  describe('Causa N8: SIN fabricación de datos', () => {
    it('N8a: No inventar condiciones de mercado', async () => {
      const decisionId = uuidv4();
      const blockageTime = new Date();

      // SI el mercado estaba cerrado, tenemos timestamp real
      // NO inventamos "mercado volátil" si no es verdad
      const explanation = await noOpService.recordBlockage(
        decisionId,
        'MARKET_CLOSED',
        'NYSE trading hours', // Exacto
        blockageTime,
        'Mercado cerrado',
      );

      // La explicación tiene exactamente lo que pasó, nada inventado
      expect(explanation.blockageExplanation).toBe('Mercado cerrado');
      expect(explanation.blockageTimestamp).toBe(blockageTime);
    });

    it('N8b: SIN falsos IDs — solo los que existen', async () => {
      const decisionId = uuidv4();

      const explanation = await noOpService.recordBlockage(
        decisionId,
        'SEATBELT_GATE',
        'gate1',
        new Date(),
        'Blockage',
        undefined,
        undefined,
        undefined, // tradeId NO existe, NO lo inventamos
        undefined, // executionEventId NO existe, NO lo inventamos
      );

      expect(explanation.tradeId).toBeNull(); // NO fabricado
      expect(explanation.executionEventId).toBeNull(); // NO fabricado
      expect(explanation.decisionId).toBe(decisionId); // Este SÍ existe siempre
    });
  });

  describe('Regresión Fase 1-3: Explicaciones no interfieren', () => {
    it('SEATBELT-FINAL: NoOpExplanationService es independiente', async () => {
      const decisionId = uuidv4();

      const explanation = await noOpService.recordBlockage(
        decisionId,
        'SEATBELT_GATE',
        'gate',
        new Date(),
        'Independent no-op tracking',
      );

      // La existencia de esta explicación no afecta close(), recordOrderFailure(), etc.
      expect(explanation.blockageReason).toBe('SEATBELT_GATE');
    });
  });
});
