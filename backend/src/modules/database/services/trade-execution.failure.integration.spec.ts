import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Repository } from 'typeorm';
import { TradeExecution } from '../entities/trade-execution.entity';
import { ExecutionEvent } from '../entities/execution-event.entity';
import { ExecutionReport } from '../entities/execution-report.entity';
import { TradeExecutionService } from './trade-execution.service';
import { ExecutionEventService } from './execution-event.service';
import { ExecutionReportService } from './execution-report.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * END-TO-END INTEGRATION TEST (Mocked) — FASE 2
 * Flujo: Order Failure → ExecutionEvent(FAILED) → ExecutionReport
 *
 * Requisitos:
 * - Conservar motivo real del rechazo (NO fabricar)
 * - Conservar IDs/tradeId para trazabilidad
 * - Ante pérdida de trazabilidad/persistencia, FAIL/HOLD + conservar evidencia
 * - Escenarios de fallo NO producen evidencia falsa
 */
describe('[CP3.3-FASE2] TradeExecution.recordOrderFailure() → ExecutionEvent(FAILED) → ExecutionReport', () => {
  let tradeExecService: TradeExecutionService;
  let executionEventService: ExecutionEventService;
  let executionReportService: ExecutionReportService;
  let tradeExecRepo: Repository<TradeExecution>;
  let executionEventRepo: Repository<ExecutionEvent>;
  let executionReportRepo: Repository<ExecutionReport>;

  // In-memory storage
  const trades: Map<string, TradeExecution> = new Map();
  const events: Map<string, ExecutionEvent[]> = new Map();
  const reports: Map<string, ExecutionReport> = new Map();

  beforeEach(async () => {
    trades.clear();
    events.clear();
    reports.clear();

    // Mock TradeExecution repository
    tradeExecRepo = {
      create: (data: any) => {
        const trade = new TradeExecution();
        Object.assign(trade, data, { id: uuidv4(), createdAt: new Date(), updatedAt: new Date() });
        return trade;
      },
      save: vi.fn((trade: TradeExecution) => {
        trades.set(trade.id, trade);
        return Promise.resolve(trade);
      }),
      findOne: vi.fn((opts: any) => {
        if (opts.where.id) {
          return Promise.resolve(trades.get(opts.where.id) || null);
        }
        return Promise.resolve(null);
      }),
    } as any;

    // Mock ExecutionEvent repository
    executionEventRepo = {
      create: (data: any) => {
        const event = new ExecutionEvent();
        Object.assign(event, data, { id: uuidv4(), recordedAt: new Date() });
        return event;
      },
      save: vi.fn((event: ExecutionEvent) => {
        const tradeId = event.tradeExecution.id;
        if (!events.has(tradeId)) {
          events.set(tradeId, []);
        }
        events.get(tradeId)!.push(event);
        return Promise.resolve(event);
      }),
      find: vi.fn((opts: any) => {
        if (opts.where?.tradeExecution?.id) {
          const tradeId = opts.where.tradeExecution.id;
          const tradeEvents = events.get(tradeId) || [];
          return Promise.resolve(tradeEvents.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime()));
        }
        return Promise.resolve([]);
      }),
    } as any;

    // Mock ExecutionReport repository
    executionReportRepo = {
      create: (data: any) => {
        const report = new ExecutionReport();
        Object.assign(report, data, { id: uuidv4(), createdAt: new Date() });
        return report;
      },
      save: vi.fn((report: ExecutionReport) => {
        reports.set(report.id, report);
        return Promise.resolve(report);
      }),
      findOne: vi.fn((opts: any) => {
        if (opts.where?.tradeExecution?.id) {
          for (const report of reports.values()) {
            if (report.tradeExecution?.id === opts.where.tradeExecution.id) {
              return Promise.resolve(report);
            }
          }
        }
        return Promise.resolve(null);
      }),
    } as any;

    // Crear servicios
    executionEventService = new ExecutionEventService(executionEventRepo);
    executionReportService = new ExecutionReportService(executionReportRepo);
    tradeExecService = new TradeExecutionService(tradeExecRepo, executionEventService, executionReportService);
  });

  describe('Flujo completo: Crear → Enviar → Fallar → Evento → Reporte', () => {
    it('F1: Crear TradeExecution en PENDING', async () => {
      const trade = await tradeExecService.create('decision-f1', 'trade-f1', 'PAPER');

      expect(trade.id).toBeDefined();
      expect(trade.tradeId).toBe('trade-f1');
      expect(trade.status).toBe('PENDING');

      (this as any).tradeId = trade.id;
    });

    it('F2: linkBrokerOrder → PENDING_FILL', async () => {
      const tradeExecRepoMock = tradeExecRepo as any;
      const baseTrade = tradeExecRepo.create({
        tradeId: 'trade-f2',
        status: 'PENDING',
        attemptCount: 1,
      });
      const savedTrade = await (tradeExecRepo.save as any)(baseTrade);

      tradeExecRepoMock.findOne = vi.fn().mockResolvedValue(savedTrade);

      const updated = await tradeExecService.linkBrokerOrder(savedTrade.id, 'broker-fail-1', {});

      expect(updated.status).toBe('PENDING_FILL');

      (this as any).tradeId = savedTrade.id;
    });

    it('F3: recordOrderFailure() → Evento(FAILED) + Reporte + Trazabilidad', async () => {
      const tradeExecRepoMock = tradeExecRepo as any;
      const baseTrade = tradeExecRepo.create({
        tradeId: 'trade-f3',
        status: 'PENDING_FILL',
        attemptCount: 2,
        brokerOrderId: 'broker-fail-1',
      });
      const savedTrade = await (tradeExecRepo.save as any)(baseTrade);

      tradeExecRepoMock.findOne = vi.fn().mockResolvedValue(savedTrade);

      const realFailureReason = 'Insufficient buying power on broker account';

      // Ejecutar fallo (dispara evento + reporte automáticos)
      const failed = await tradeExecService.recordOrderFailure(savedTrade.id, realFailureReason);

      expect(failed.status).toBe('FAILED');
      expect(failed.lastError).toBe(realFailureReason); // Motivo real conservado
      expect(failed.lastAttemptAt).toBeDefined();

      // VERIFICAR: ExecutionEvent(FAILED/ERROR) fue creado con motivo real
      const tradeEvents = events.get(savedTrade.id) || [];
      const failedEvent = tradeEvents.find((e) => e.eventType === 'ERROR');

      expect(failedEvent).toBeDefined();
      expect(failedEvent!.eventType).toBe('ERROR');
      expect(failedEvent!.message).toBe(realFailureReason); // Motivo real en evento
      expect(failedEvent!.recordedAt).toBeDefined();

      // VERIFICAR: ExecutionReport fue generado automáticamente con outcome=FAILED
      const report = reports.get(Array.from(reports.keys())[0]);

      expect(report).toBeDefined();
      expect(report!.tradeId).toBe('trade-f3'); // Trazabilidad: IDs conservados
      expect(report!.outcome).toBe('FAILED');
      expect(report!.failureReason).toBe(realFailureReason); // Motivo real en reporte
      expect(report!.retryAttempts).toBe(2); // Contador de reintentos
      expect(report!.exitPrice).toBeNull(); // Sin salida en fallos
      expect(report!.profitLoss).toBeNull(); // Sin P&L en fallos
      expect(report!.createdAt).toBeDefined();
    });

    it('F4: Verificar persistencia — re-lectura de datos de fallo', async () => {
      const tradeExecRepoMock = tradeExecRepo as any;
      const baseTrade = tradeExecRepo.create({
        tradeId: 'trade-f4',
        status: 'PENDING_FILL',
        attemptCount: 1,
        brokerOrderId: 'broker-fail-2',
      });
      const savedTrade = await (tradeExecRepo.save as any)(baseTrade);

      tradeExecRepoMock.findOne = vi.fn().mockResolvedValue(savedTrade);

      const failureReason = 'Order rejected: price out of range';

      await tradeExecService.recordOrderFailure(savedTrade.id, failureReason);

      // Re-leer desde "BD"
      const reloadedTrade = trades.get(savedTrade.id);
      const reloadedReport = reports.get(Array.from(reports.keys())[0]);
      const reloadedEvents = events.get(savedTrade.id) || [];

      expect(reloadedTrade!.status).toBe('FAILED');
      expect(reloadedTrade!.lastError).toBe(failureReason);
      expect(reloadedReport!.outcome).toBe('FAILED');
      expect(reloadedEvents.length).toBeGreaterThanOrEqual(1);
      expect(reloadedEvents.some((e) => e.eventType === 'ERROR')).toBe(true);
    });
  });

  describe('Casos de fallo: Conservar evidencia sin fabricación (FAIL/HOLD)', () => {
    it('F5: recordOrderFailure() en estado incorrecto → BadRequestException (NO evento falso)', async () => {
      const tradeExecRepoMock = tradeExecRepo as any;
      const baseTrade = tradeExecRepo.create({
        tradeId: 'trade-f5',
        status: 'FILLED', // Estado incorrecto para fallo
        attemptCount: 1,
      });
      const savedTrade = await (tradeExecRepo.save as any)(baseTrade);

      tradeExecRepoMock.findOne = vi.fn().mockResolvedValue(savedTrade);

      // Intentar fallar en estado incorrecto = falla ANTES de crear evento
      await expect(
        tradeExecService.recordOrderFailure(savedTrade.id, 'some reason'),
      ).rejects.toThrow(/No se puede registrar fallo/);

      // Verificar que NO se creó evento ERROR (no hay evidencia falsa)
      const tradeEvents = events.get(savedTrade.id) || [];
      expect(tradeEvents.some((e) => e.eventType === 'ERROR')).toBe(false);
    });

    it('F6: recordOrderFailure() sin motivo → BadRequestException (no vacío permitido)', async () => {
      const tradeExecRepoMock = tradeExecRepo as any;
      const baseTrade = tradeExecRepo.create({
        tradeId: 'trade-f6',
        status: 'PENDING_FILL',
        attemptCount: 1,
      });
      const savedTrade = await (tradeExecRepo.save as any)(baseTrade);

      tradeExecRepoMock.findOne = vi.fn().mockResolvedValue(savedTrade);

      // Intentar fallar sin motivo real
      await expect(tradeExecService.recordOrderFailure(savedTrade.id, '')).rejects.toThrow(
        /failureReason es requerido/,
      );

      // Verificar que NO se creó evento (conservar evidencia del fallo anterior)
      const tradeEvents = events.get(savedTrade.id) || [];
      expect(tradeEvents.length).toBe(0);
    });

    it('F7: Motivo real conservado, NO fabricado', async () => {
      const tradeExecRepoMock = tradeExecRepo as any;
      const baseTrade = tradeExecRepo.create({
        tradeId: 'trade-f7',
        status: 'PENDING',
        attemptCount: 3,
      });
      const savedTrade = await (tradeExecRepo.save as any)(baseTrade);

      tradeExecRepoMock.findOne = vi.fn().mockResolvedValue(savedTrade);

      // Usar motivo exacto del broker (NO fabricar, NO genérico)
      const exactBrokerReason = 'Alpaca: insufficient shares available in short inventory';

      await tradeExecService.recordOrderFailure(savedTrade.id, exactBrokerReason);

      const reloadedTrade = trades.get(savedTrade.id);
      const report = reports.get(Array.from(reports.keys())[0]);

      // Verificar que el motivo EXACTO se conservó (sin truncar, sin modificar)
      expect(reloadedTrade!.lastError).toBe(exactBrokerReason);
      expect(report!.failureReason).toBe(exactBrokerReason);
    });
  });

  describe('Regresión Fase 1 + SEATBELT: Métodos de Fase 1 intactos', () => {
    it('SEATBELT-PASS: close() sigue funcionando sin cambios', async () => {
      const tradeExecRepoMock = tradeExecRepo as any;
      const baseTrade = tradeExecRepo.create({
        tradeId: 'trade-sb-close',
        status: 'FILLED',
        attemptCount: 1,
        filledQty: 5,
        filledPrice: 100.0,
        filledAt: new Date(),
      });
      const savedTrade = await (tradeExecRepo.save as any)(baseTrade);

      tradeExecRepoMock.findOne = vi.fn().mockResolvedValue(savedTrade);

      const closed = await tradeExecService.close(savedTrade.id, 105.0, 'MANUAL');

      expect(closed.status).toBe('CLOSED');
      expect(closed.outcome).toBe('PROFITABLE');
    });
  });
});
