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
 * END-TO-END INTEGRATION TEST (Mocked)
 * Flujo: TradeExecution.close() → ExecutionEvent(CLOSED) → ExecutionReport
 *
 * Requisitos:
 * - NO fabricar evidencia
 * - Conservar IDs/tradeId para trazabilidad
 * - Ante pérdida de trazabilidad/persistencia, FAIL/HOLD + conservar evidencia
 */
describe('[CP3.3-FASE1] TradeExecution.close() → ExecutionEvent(CLOSED) → ExecutionReport', () => {
  let tradeExecService: TradeExecutionService;
  let executionEventService: ExecutionEventService;
  let executionReportService: ExecutionReportService;
  let tradeExecRepo: Repository<TradeExecution>;
  let executionEventRepo: Repository<ExecutionEvent>;
  let executionReportRepo: Repository<ExecutionReport>;

  // In-memory storage para simular BD
  const trades: Map<string, TradeExecution> = new Map();
  const events: Map<string, ExecutionEvent[]> = new Map();
  const reports: Map<string, ExecutionReport> = new Map();

  beforeEach(async () => {
    // Limpiar almacenamiento
    trades.clear();
    events.clear();
    reports.clear();

    // Mock TradeExecution repository
    tradeExecRepo = {
      create: (data: any) => {
        const trade = new TradeExecution();
        Object.assign(trade, data, { id: uuidv4(), createdAt: new Date() });
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
      find: vi.fn(() => Promise.resolve(Array.from(trades.values()))),
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
        if (opts.where?.tradeId) {
          for (const report of reports.values()) {
            if (report.tradeId === opts.where.tradeId) {
              return Promise.resolve(report);
            }
          }
        }
        return Promise.resolve(null);
      }),
      find: vi.fn(() => Promise.resolve(Array.from(reports.values()))),
    } as any;

    // Crear servicios con repositorios mockeados
    executionEventService = new ExecutionEventService(executionEventRepo);
    executionReportService = new ExecutionReportService(executionReportRepo);
    tradeExecService = new TradeExecutionService(tradeExecRepo, executionEventService, executionReportService);
  });

  describe('Flujo completo: Crear → Llenar → Cerrar → Evento → Reporte', () => {
    it('E1: Crear TradeExecution dummy', async () => {
      // Mock el decision para crear trade
      const tradeExecRepoMock = tradeExecRepo as any;
      tradeExecRepoMock.findOne = vi.fn().mockResolvedValue(null); // No existe aún

      const trade = await tradeExecService.create('decision-e1', 'trade-e1', 'PAPER');

      expect(trade.id).toBeDefined();
      expect(trade.tradeId).toBe('trade-e1');
      expect(trade.status).toBe('PENDING');
      expect(trade.attemptCount).toBe(1);

      // Guardar para flujo siguiente
      (this as any).tradeId = trade.id;
    });

    it('E2: linkBrokerOrder', async () => {
      // Crear trade primero
      const tradeExecRepoMock = tradeExecRepo as any;
      const baseTrade = tradeExecRepo.create({
        tradeId: 'trade-e2',
        status: 'PENDING',
        attemptCount: 1,
      });
      const savedTrade = await (tradeExecRepo.save as any)(baseTrade);

      tradeExecRepoMock.findOne = vi.fn().mockResolvedValue(savedTrade);

      const updated = await tradeExecService.linkBrokerOrder(savedTrade.id, 'broker-123', { status: 'ok' });

      expect(updated.status).toBe('PENDING_FILL');
      expect(updated.brokerOrderId).toBe('broker-123');

      (this as any).tradeId = savedTrade.id;
    });

    it('E3: recordFill', async () => {
      const tradeExecRepoMock = tradeExecRepo as any;
      const baseTrade = tradeExecRepo.create({
        tradeId: 'trade-e3',
        status: 'PENDING_FILL',
        attemptCount: 1,
        brokerOrderId: 'broker-123',
      });
      const savedTrade = await (tradeExecRepo.save as any)(baseTrade);

      tradeExecRepoMock.findOne = vi.fn().mockResolvedValue(savedTrade);

      const filled = await tradeExecService.recordFill(savedTrade.id, 10, 100.5);

      expect(filled.status).toBe('FILLED');
      expect(filled.filledQty).toBe(10);
      expect(filled.filledPrice).toBe(100.5);
      expect(filled.filledAt).toBeDefined();

      (this as any).tradeId = savedTrade.id;
    });

    it('E4: close() → ExecutionEvent(CLOSED) + ExecutionReport', async () => {
      const tradeExecRepoMock = tradeExecRepo as any;
      const baseTrade = tradeExecRepo.create({
        tradeId: 'trade-e4',
        status: 'FILLED',
        attemptCount: 1,
        filledQty: 10,
        filledPrice: 100.5,
        filledAt: new Date(),
      });
      const savedTrade = await (tradeExecRepo.save as any)(baseTrade);

      tradeExecRepoMock.findOne = vi.fn().mockResolvedValue(savedTrade);

      // Ejecutar cierre (dispara evento + reporte automáticos)
      const closed = await tradeExecService.close(savedTrade.id, 102.0, 'MANUAL');

      expect(closed.status).toBe('CLOSED');
      expect(closed.exitPrice).toBe(102.0);
      expect(closed.profitLoss).toBe((102.0 - 100.5) * 10); // 15
      expect(closed.outcome).toBe('PROFITABLE');
      expect(closed.closedAt).toBeDefined();

      // VERIFICAR: ExecutionEvent(CLOSED) fue creado
      const tradeEvents = events.get(savedTrade.id) || [];
      const closedEvent = tradeEvents.find((e) => e.eventType === 'CLOSED');

      expect(closedEvent).toBeDefined();
      expect(closedEvent!.eventType).toBe('CLOSED');
      expect(closedEvent!.filledPrice).toBe(102.0);
      expect(closedEvent!.message).toBe('MANUAL');
      expect(closedEvent!.recordedAt).toBeDefined();

      // VERIFICAR: ExecutionReport fue generado automáticamente
      const report = reports.get(Array.from(reports.keys())[0]);

      expect(report).toBeDefined();
      expect(report!.tradeId).toBe('trade-e4'); // Trazabilidad: IDs conservados
      expect(report!.entryQty).toBe(10);
      expect(report!.entryPrice).toBe(100.5);
      expect(report!.exitQty).toBe(10);
      expect(report!.exitPrice).toBe(102.0);
      expect(report!.profitLoss).toBe(15);
      expect(report!.outcome).toBe('PROFITABLE');
      expect(report!.durationSeconds).toBeGreaterThanOrEqual(0);
      expect(report!.createdAt).toBeDefined();
    });
  });

  describe('Casos de fallo: Conservar evidencia (FAIL/HOLD)', () => {
    it('F1: close() sin filledPrice → BadRequestException', async () => {
      const tradeExecRepoMock = tradeExecRepo as any;
      const baseTrade = tradeExecRepo.create({
        tradeId: 'trade-f1',
        status: 'PENDING_FILL',
        attemptCount: 1,
      });
      const savedTrade = await (tradeExecRepo.save as any)(baseTrade);

      tradeExecRepoMock.findOne = vi.fn().mockResolvedValue(savedTrade);

      // Intentar cerrar sin llenar = falla ANTES de CLOSED event
      await expect(tradeExecService.close(savedTrade.id, 105.0, 'MANUAL')).rejects.toThrow();

      // Verificar que NO se creó evento CLOSED (no hay evidencia falsa)
      const tradeEvents = events.get(savedTrade.id) || [];
      expect(tradeEvents.some((e) => e.eventType === 'CLOSED')).toBe(false);
    });
  });

  describe('Regresión SEATBELT: Métodos existentes siguen funcionando', () => {
    it('SEATBELT-PASS: recordRetry funciona sin cambios', async () => {
      const tradeExecRepoMock = tradeExecRepo as any;
      const baseTrade = tradeExecRepo.create({
        tradeId: 'trade-sb',
        status: 'PENDING_FILL',
        attemptCount: 1,
      });
      const savedTrade = await (tradeExecRepo.save as any)(baseTrade);

      tradeExecRepoMock.findOne = vi.fn().mockResolvedValue(savedTrade);

      const retried = await tradeExecService.recordRetry(savedTrade.id);

      expect(retried.status).toBe('PENDING');
      expect(retried.attemptCount).toBe(2);
    });
  });
});
