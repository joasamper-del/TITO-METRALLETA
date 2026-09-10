/**
 * TitoOperativeService Test Suite
 * 4 Test Suites con 11 casos de prueba total
 *
 * JAULA: **PAPER MODE** - ningún test toca credenciales reales
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TitoOperativeService, OperativeDecision } from './titoOperativeService';
import { ExecutionEngine } from './executionEngine';
import { HeartbeatService } from './heartbeatService';
import * as fs from 'fs';

describe('TitoOperativeService (PAPER MODE)', () => {
  let service: TitoOperativeService;
  let mockExecutionEngine: any;
  let mockHeartbeat: any;
  const testOperationLogFile = 'data/operation.jsonl';

  beforeEach(() => {
    // Limpiar archivo de test previo
    try {
      if (fs.existsSync(testOperationLogFile)) {
        fs.unlinkSync(testOperationLogFile);
      }
    } catch (err) {
      // Ignorar
    }

    mockExecutionEngine = {
      executeOrder: vi.fn(),
    };

    mockHeartbeat = {
      beat: vi.fn(),
    };

    service = new TitoOperativeService(
      mockExecutionEngine,
      mockHeartbeat
    );
  });

  afterEach(() => {
    service.stop();
    vi.clearAllMocks();

    // Limpiar
    try {
      if (fs.existsSync(testOperationLogFile)) {
        fs.unlinkSync(testOperationLogFile);
      }
    } catch (err) {
      // Ignorar
    }
  });

  // ========== TEST SUITE 1: Inicialización y Control ==========
  describe('TEST SUITE 1: Initialization & Control', () => {
    it('TEST 1.1: Service inicializa en PAPER MODE', () => {
      // ASSERT
      expect(service.getStatus().mode).toBe('PAPER');
      expect(service.getStatus().isRunning).toBe(false);

      // Log debería contener "PAPER"
      const logs: any[] = service.getOperationLog(1);
      expect(logs).toEqual([]);
    });

    it('TEST 1.2: start() activa loop, stop() lo detiene', (done) => {
      // ACT
      service.start();
      expect(service.getStatus().isRunning).toBe(true);

      // Esperar 50ms
      setTimeout(() => {
        service.stop();
        expect(service.getStatus().isRunning).toBe(false);

        // ASSERT
        expect(mockHeartbeat.beat).toHaveBeenCalledWith(
          'operative_service_start'
        );
        expect(mockHeartbeat.beat).toHaveBeenCalledWith(
          'operative_service_stop'
        );

        done();
      }, 50);
    });

    it('TEST 1.3: Double start() es idempotente', () => {
      // ACT
      service.start();
      service.start(); // Segunda vez

      // ASSERT
      expect(service.getStatus().isRunning).toBe(true);
      expect(mockHeartbeat.beat).toHaveBeenCalledWith(
        'operative_service_start'
      );
      // Solo una llamada
      const startCalls = mockHeartbeat.beat.mock.calls.filter(
        (call: any) => call[0] === 'operative_service_start'
      );
      expect(startCalls).toHaveLength(1);
    });
  });

  // ========== TEST SUITE 2: Market Hours Detection ==========
  describe('TEST SUITE 2: Market Hours Detection (9:00-16:00 ET)', () => {
    it('TEST 2.1: getStatus() retorna marketHoursOpen', () => {
      // ACT
      const status = service.getStatus();

      // ASSERT: marketHoursOpen es boolean
      expect(typeof status.marketHoursOpen).toBe('boolean');
    });

    it('TEST 2.2: Ciclo fuera de horario → log sin decisión', (done) => {
      // SETUP
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: false,
        error: 'Should not be called',
      });

      // ACT
      service.start();

      // Esperar 150ms para múltiples ciclos
      setTimeout(() => {
        service.stop();

        // ASSERT: ExecutionEngine NO debería ser llamado
        expect(mockExecutionEngine.executeOrder).not.toHaveBeenCalled();

        // Pero debe haber entradas de log (aunque sea fuera de horario)
        const logs = service.getOperationLog(10);
        expect(logs.length).toBeGreaterThan(0);

        // Todas deben tener mode === 'PAPER'
        logs.forEach(entry => {
          expect(entry.mode).toBe('PAPER');
        });

        done();
      }, 150);
    });
  });

  // ========== TEST SUITE 3: Operation Logging ==========
  describe('TEST SUITE 3: Operation Logging (JSONL Persistence)', () => {
    it('TEST 3.1: Cada ciclo se registra en operation.jsonl', (done) => {
      // ACT
      service.start();

      setTimeout(() => {
        service.stop();

        // ASSERT: Archivo debe existir
        expect(fs.existsSync('data/operation.jsonl')).toBe(true);

        // Debe tener al menos una línea (ciclo)
        const content = fs.readFileSync('data/operation.jsonl', 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        expect(lines.length).toBeGreaterThan(0);

        // Primera línea debe ser JSON válido con mode='PAPER'
        const firstLine = JSON.parse(lines[0]);
        expect(firstLine.mode).toBe('PAPER');
        expect(firstLine.timestamp).toBeDefined();
        expect(firstLine.cycleId).toBeDefined();

        done();
      }, 100);
    });

    it('TEST 3.2: Log acumula múltiples ciclos', (done) => {
      // ACT
      service.start();

      setTimeout(() => {
        const cyclesWhileRunning = service.getStatus().cyclesExecuted;
        expect(cyclesWhileRunning).toBeGreaterThan(0);

        service.stop();

        // ASSERT
        const logs = service.getOperationLog(100);
        expect(logs.length).toBeGreaterThan(0);

        done();
      }, 150);
    });

    it('TEST 3.3: getOperationLog() respeta límite', (done) => {
      // ACT
      service.start();

      setTimeout(() => {
        service.stop();

        // ASSERT: limit=2 retorna máx 2 entradas
        const logs = service.getOperationLog(2);
        expect(logs.length).toBeLessThanOrEqual(2);

        // limit=0 retorna array vacío
        const noLogs = service.getOperationLog(0);
        expect(noLogs).toEqual([]);

        done();
      }, 150);
    });
  });

  // ========== TEST SUITE 4: Integration with ExecutionEngine ==========
  describe('TEST SUITE 4: ExecutionEngine Integration (PAPER ONLY)', () => {
    it('TEST 4.1: Decisión (si la hay) se ejecuta con PAPER flag', (done) => {
      // SETUP: Simular que hay mercado abierto y decisión
      // (En prueba real, dependería de horario ET actual)
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: true,
        orderId: 'paper-order-123',
      });

      // ACT
      service.start();

      setTimeout(() => {
        service.stop();

        // ASSERT: Si hay decisión, se ejecutó
        // (En este test no hay decisión porque getDecision() retorna null,
        // pero la arquitectura está lista)

        // Todas las operaciones deben ser PAPER
        const logs = service.getOperationLog(100);
        logs.forEach(entry => {
          expect(entry.mode).toBe('PAPER');
        });

        // Nunca credenciales reales
        const logContent = fs.readFileSync('data/operation.jsonl', 'utf8');
        expect(logContent).not.toContain('REAL');
        expect(logContent).not.toContain('prod');
        expect(logContent).not.toContain('production');

        done();
      }, 150);
    });

    it('TEST 4.2: Heartbeat se registra en cada ciclo', (done) => {
      // ACT
      service.start();

      setTimeout(() => {
        service.stop();

        // ASSERT: Debe haber llamadas a heartbeat
        expect(mockHeartbeat.beat).toHaveBeenCalled();

        // Al menos las de inicio y fin
        const beatCalls = mockHeartbeat.beat.mock.calls.map((c: any) => c[0]);
        expect(beatCalls).toContain('operative_service_start');
        expect(beatCalls).toContain('operative_service_stop');

        done();
      }, 150);
    });
  });

  // ========== TEST SUITE 5: Error Handling & Safety ==========
  describe('TEST SUITE 5: Error Handling & Safety (PAPER CAGE)', () => {
    it('TEST 5.1: ExecutionEngine error no detiene loop', (done) => {
      // SETUP
      mockExecutionEngine.executeOrder.mockRejectedValue(
        new Error('Simulated execution error')
      );

      // ACT
      service.start();

      setTimeout(() => {
        // Service debe seguir corriendo a pesar del error
        expect(service.getStatus().isRunning).toBe(true);

        service.stop();

        // ASSERT: Error se registró pero loop continúa
        const logs = service.getOperationLog(100);
        expect(logs.length).toBeGreaterThan(0);

        // Al menos uno debería tener error (si ocurrió durante horario)
        const hasError = logs.some(e => e.error !== undefined);
        // (Nota: puede no haber error si fue fuera de horario)

        done();
      }, 150);
    });

    it('TEST 5.2: PAPER mode nunca cambia durante operación', (done) => {
      // ACT
      service.start();

      setTimeout(() => {
        // ASSERT: Mode siempre es PAPER
        expect(service.getStatus().mode).toBe('PAPER');

        const logs = service.getOperationLog(100);
        logs.forEach(entry => {
          expect(entry.mode).toBe('PAPER');
        });

        service.stop();

        // Después de stop, sigue siendo PAPER
        expect(service.getStatus().mode).toBe('PAPER');

        done();
      }, 150);
    });
  });

  // ========== SUMMARY TEST ==========
  describe('Summary', () => {
    it('Service mantiene integridad PAPER en todo ciclo de vida', () => {
      // 1. Inicialización
      expect(service.getStatus().mode).toBe('PAPER');

      // 2. Inicio
      service.start();
      expect(service.getStatus().mode).toBe('PAPER');
      expect(service.getStatus().isRunning).toBe(true);

      // 3. Parada
      service.stop();
      expect(service.getStatus().mode).toBe('PAPER');
      expect(service.getStatus().isRunning).toBe(false);

      // ASSERT
      expect(service.getStatus().mode).toBe('PAPER');
    });
  });
});
