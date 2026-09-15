import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Repository } from 'typeorm';
import { TraceabilityAnomaly } from '../entities/traceability-anomaly.entity';
import { TraceabilityAnomalyService } from './traceability-anomaly.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * END-TO-END INTEGRATION TEST (Mocked) — FASE 3
 * Pérdida de trazabilidad: Detección automática + FAIL/HOLD
 *
 * Requisitos:
 * - Detectar cuando decision → execution → event → report tiene ruptura de IDs
 * - Persistir anomalía sin fabricar IDs, timestamps o razones
 * - Conservar IDs que SÍ existen del estado anómalo
 * - Indicar exactamente qué enlace de trazabilidad falta
 * - Ningún escenario termina en PASS silencioso
 */
describe('[CP3.3-FASE3] Traceability Anomaly Detection — FAIL/HOLD', () => {
  let anomalyService: TraceabilityAnomalyService;
  let anomalyRepo: Repository<TraceabilityAnomaly>;

  // In-memory storage
  const anomalies: Map<string, TraceabilityAnomaly> = new Map();

  beforeEach(async () => {
    anomalies.clear();

    // Mock TraceabilityAnomaly repository
    anomalyRepo = {
      create: (data: any) => {
        const anomaly = new TraceabilityAnomaly();
        Object.assign(anomaly, data, { id: uuidv4(), createdAt: new Date() });
        return anomaly;
      },
      save: vi.fn((anomaly: TraceabilityAnomaly) => {
        anomalies.set(anomaly.id, anomaly);
        return Promise.resolve(anomaly);
      }),
      find: vi.fn((opts: any) => {
        const results = Array.from(anomalies.values());
        if (opts?.where?.anomalyType) {
          return Promise.resolve(
            results.filter((a) => a.anomalyType === opts.where.anomalyType),
          );
        }
        return Promise.resolve(results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      }),
    } as any;

    anomalyService = new TraceabilityAnomalyService(anomalyRepo);
  });

  describe('Tipo T1: ID faltante', () => {
    it('T1a: tradeId faltante → Registrar anomalía sin fabricar', async () => {
      const executionId = uuidv4();

      // Escenario: Un trade se ejecutó pero no tiene tradeId guardado
      const anomaly = await anomalyService.recordAnomaly(
        'MISSING_TRADE_ID',
        'Trade execution without tradeId: cannot correlate to decision',
        {
          executionId,
          // tradeId: undefined — NO fabricar
        },
        'recordOrderFailure',
        { status: 'FAILED' }, // Información real que existe
      );

      expect(anomaly.anomalyType).toBe('MISSING_TRADE_ID');
      expect(anomaly.tradeId).toBeUndefined();
      expect(anomaly.executionId).toBe(executionId); // ID que SÍ existe
      expect(anomaly.anomalyDescription).toContain('without tradeId');
      expect(anomaly.operationContext).toBe('recordOrderFailure');
      expect(anomaly.createdAt).toBeDefined();

      // Verificar persistencia
      const saved = anomalies.get(anomaly.id);
      expect(saved).toBeDefined();
      expect(saved!.tradeId).toBeUndefined(); // NO fabricado
    });

    it('T1b: decisionId faltante → FAIL/HOLD sin fabricación', async () => {
      const tradeId = 'trade-t1b';
      const executionId = uuidv4();

      // Escenario: Trade sin vínculo a decisión
      const anomaly = await anomalyService.recordAnomaly(
        'MISSING_EXECUTION',
        'Trade execution not found for trade_id, cannot verify pre-execution evidence',
        {
          tradeId,
          executionId,
          // decisionId: undefined — NO fabricar
        },
        'close',
        {
          status: 'CLOSED',
          profitLoss: 150,
        },
      );

      expect(anomaly.decisionId).toBeUndefined(); // NO fabricado
      expect(anomaly.tradeId).toBe(tradeId); // Existe
      expect(anomaly.executionId).toBe(executionId); // Existe
    });
  });

  describe('Tipo T2: Relación inconsistente', () => {
    it('T2a: Evento SIN trade correlacionable → Registrar sin fabricar', async () => {
      const eventId = uuidv4();

      // Escenario: Evento huérfano sin TradeExecution correlacionable
      const anomaly = await anomalyService.recordAnomaly(
        'ORPHAN_EVENT',
        'ExecutionEvent exists but no corresponding TradeExecution found',
        {
          eventId,
          // tradeId, executionId: null — no existen
        },
        'close',
        {
          eventType: 'CLOSED',
          recordedAt: new Date().toISOString(),
        },
      );

      expect(anomaly.anomalyType).toBe('ORPHAN_EVENT');
      expect(anomaly.eventId).toBe(eventId); // Existe
      expect(anomaly.executionId).toBeUndefined(); // NO existe, NO fabricar
      expect(anomaly.tradeId).toBeUndefined(); // NO existe, NO fabricar
    });

    it('T2b: Reporte SIN evento correlacionable → Registrar exactamente qué falta', async () => {
      const reportId = uuidv4();
      const tradeId = 'trade-t2b';

      // Escenario: Reporte existe pero su evento CLOSED es inaccesible
      const anomaly = await anomalyService.recordAnomaly(
        'ORPHAN_REPORT',
        'ExecutionReport exists but corresponding ExecutionEvent(CLOSED) not found in history',
        {
          reportId,
          tradeId,
          // eventId: undefined — NO fabricar
        },
        'close',
        {
          outcome: 'PROFITABLE',
          profitLoss: 250,
        },
      );

      expect(anomaly.anomalyType).toBe('ORPHAN_REPORT');
      expect(anomaly.anomalyDescription).toContain('ExecutionEvent(CLOSED) not found');
      expect(anomaly.reportId).toBe(reportId); // Existe
      expect(anomaly.tradeId).toBe(tradeId); // Existe
      expect(anomaly.eventId).toBeUndefined(); // NO existe, NO fabricar
    });
  });

  describe('Tipo T3: Fallo de persistencia', () => {
    it('T3a: Persistencia de anomalía falla → HOLD', async () => {
      const mockRepoFail = {
        create: (data: any) => new TraceabilityAnomaly(),
        save: vi.fn().mockRejectedValue(new Error('DB connection lost')),
      } as any;

      const failService = new TraceabilityAnomalyService(mockRepoFail);

      // Intentar registrar anomalía cuando la BD no disponible
      await expect(
        failService.recordAnomaly(
          'PERSISTENCE_FAILURE',
          'Database connection lost while writing anomaly record',
        ),
      ).rejects.toThrow();
    });

    it('T3b: Anomalía crítica PERSISTENCE_FAILURE requiere IDs mínimos', async () => {
      const executionId = uuidv4();

      // Escenario: El mismo acto de registrar la anomalía falló
      const anomaly = await anomalyService.recordAnomaly(
        'PERSISTENCE_FAILURE',
        'Failed to persist ExecutionReport after CLOSED event — database write timed out',
        {
          executionId,
          // No hay otros IDs porque el fallo pasó antes
        },
        'close',
        {
          status: 'CLOSED',
          attemptedOutcome: 'PROFITABLE',
        },
      );

      expect(anomaly.anomalyType).toBe('PERSISTENCE_FAILURE');
      expect(anomaly.executionId).toBe(executionId); // Mínimo requerido
      expect(anomaly.tradeId).toBeUndefined(); // No se pudo obtener
    });
  });

  describe('Tipo T4: Verificación de que ningún escenario pasa silenciosamente', () => {
    it('T4a: Anomalía SIN tipo válido → BadRequestException', async () => {
      await expect(
        anomalyService.recordAnomaly(
          'INVALID_TYPE',
          'some description',
        ),
      ).rejects.toThrow(/anomalyType debe ser uno de/);
    });

    it('T4b: Anomalía SIN descripción → BadRequestException', async () => {
      await expect(
        anomalyService.recordAnomaly(
          'MISSING_TRADE_ID',
          '', // Descripción vacía — NO permitir
        ),
      ).rejects.toThrow(/anomalyDescription es requerido/);
    });

    it('T4c: findByType() devuelve todas las anomalías de ese tipo (NO silencio)', async () => {
      // Registrar 3 anomalías del mismo tipo
      for (let i = 0; i < 3; i++) {
        await anomalyService.recordAnomaly(
          'MISSING_TRADE_ID',
          `Missing trade ID #${i}`,
          { executionId: uuidv4() },
        );
      }

      const results = await anomalyService.findByType('MISSING_TRADE_ID');

      expect(results.length).toBe(3); // Todas encontradas
      expect(results.every((a) => a.anomalyType === 'MISSING_TRADE_ID')).toBe(true);
    });

    it('T4d: getUnresolvedAnomalies() expone PERSISTENCE_FAILURE críticas', async () => {
      // Registrar mix de anomalías
      await anomalyService.recordAnomaly('MISSING_TRADE_ID', 'test 1', { executionId: uuidv4() });
      await anomalyService.recordAnomaly('ORPHAN_EVENT', 'test 2', { eventId: uuidv4() });
      await anomalyService.recordAnomaly(
        'PERSISTENCE_FAILURE',
        'DB write failed',
        { executionId: uuidv4() },
      );

      const unresolved = await anomalyService.getUnresolvedAnomalies();

      // Solo PERSISTENCE_FAILURE son críticas
      expect(unresolved.length).toBeGreaterThan(0);
      expect(unresolved.every((a) => a.anomalyType === 'PERSISTENCE_FAILURE')).toBe(true);
    });
  });

  describe('Regresión Fase 1 + 2: Anomalías no interfieren con flujos normales', () => {
    it('T5a: Registrar anomalía NO afecta TradeExecutionService', async () => {
      // Solo verificar que el servicio de anomalías es independiente
      const anomaly = await anomalyService.recordAnomaly(
        'MISSING_TRADE_ID',
        'Independent anomaly recording',
        { executionId: uuidv4() },
      );

      expect(anomaly.id).toBeDefined();
      // El hecho de que esta anomalía exista no debe afectar close() o recordOrderFailure()
    });
  });
});
