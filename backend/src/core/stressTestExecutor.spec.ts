/**
 * StressTestExecutor Test Suite
 * Validación de que el executor genera reportes correctos
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StressTestExecutor } from './stressTestExecutor';
import * as fs from 'fs';

describe('StressTestExecutor (Real Alpaca PAPER Validation)', () => {
  let executor: StressTestExecutor;
  let mockExecutionEngine: any;
  let mockHeartbeat: any;
  const reportFile = 'data/stress-test-report.json';

  beforeEach(() => {
    try {
      if (fs.existsSync(reportFile)) {
        fs.unlinkSync(reportFile);
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

    executor = new StressTestExecutor(mockExecutionEngine, mockHeartbeat);
  });

  afterEach(() => {
    vi.clearAllMocks();
    try {
      if (fs.existsSync(reportFile)) {
        fs.unlinkSync(reportFile);
      }
    } catch (err) {
      // Ignorar
    }
  });

  describe('Stress Test Executor', () => {
    it('TEST 1: executeValidationSuite() genera reporte con 3 escenarios', async () => {
      // SETUP: Todos los órdenes exitosos
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      // ACT
      const report = await executor.executeValidationSuite();

      // ASSERT
      expect(report).toBeDefined();
      expect(report.scenarios.length).toBe(3);
      expect(report.summary.totalScenarios).toBe(3);
      expect(report.summary.mode).toBe('PAPER');
      expect(report.summary.status).toBe('READY_FOR_OPERATION');

      // Verificar que todos los escenarios pasaron
      report.scenarios.forEach(scenario => {
        expect(scenario.verdict).toBe('PASS');
      });
    });

    it('TEST 2: Reporte persiste en stress-test-report.json', async () => {
      // SETUP
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      // ACT
      const report = await executor.executeValidationSuite();

      // ASSERT: Archivo debe existir
      expect(fs.existsSync(reportFile)).toBe(true);

      const savedReport = executor.getReport();
      expect(savedReport).toBeDefined();
      expect(savedReport?.summary.mode).toBe('PAPER');
      expect(savedReport?.scenarios.length).toBe(3);
    });

    it('TEST 3: Reporte calcula latencia, órdenes, errores correctamente', async () => {
      // SETUP
      let callCount = 0;
      mockExecutionEngine.executeOrder.mockImplementation(() => {
        callCount++;
        // Simular latencias variables
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              success: callCount % 2 === 0, // 50% éxito
              orderId: callCount % 2 === 0 ? `order-${callCount}` : undefined,
              errorType: callCount % 2 === 0 ? undefined : 'unknown',
            });
          }, Math.random() * 100); // 0-100ms de latencia simulada
        });
      });

      // ACT
      const report = await executor.executeValidationSuite();

      // ASSERT
      expect(report.summary.totalOrders).toBeGreaterThan(0);
      expect(report.summary.successfulOrders).toBeGreaterThan(0);
      expect(report.summary.failedOrders).toBeGreaterThan(0);
      expect(report.summary.avgLatency).toBeGreaterThan(0);
      expect(report.summary.maxLatency).toBeGreaterThanOrEqual(report.summary.avgLatency);
    });

    it('TEST 4: Status = NEEDS_INVESTIGATION si algún escenario falla', async () => {
      // SETUP
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: false,
        error: 'Simulated failure',
        errorType: 'unknown',
      });

      // ACT
      const report = await executor.executeValidationSuite();

      // ASSERT
      expect(report.summary.status).toBe('NEEDS_INVESTIGATION');
      expect(report.summary.successfulOrders).toBe(0);
    });

    it('TEST 5: getReport() recupera reporte guardado', async () => {
      // SETUP
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      // ACT: Ejecutar validación
      await executor.executeValidationSuite();

      // ACT: Recuperar reporte
      const savedReport = executor.getReport();

      // ASSERT
      expect(savedReport).toBeDefined();
      expect(savedReport?.summary.mode).toBe('PAPER');
      expect(savedReport?.executedAt).toBeDefined();
    });

    it('TEST 6: Reporte incluye notas descriptivas por escenario', async () => {
      // SETUP
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      // ACT
      const report = await executor.executeValidationSuite();

      // ASSERT
      report.scenarios.forEach(scenario => {
        expect(scenario.notes).toBeDefined();
        expect(scenario.notes.length).toBeGreaterThan(0);
        expect(scenario.notes).toContain('Success rate');
        expect(scenario.notes).toContain('Latency');
      });
    });

    it('TEST 7: PAPER mode nunca cambia en todo el reporte', async () => {
      // SETUP
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      // ACT
      const report = await executor.executeValidationSuite();

      // ASSERT
      expect(report.summary.mode).toBe('PAPER');
      report.scenarios.forEach(scenario => {
        expect(scenario.result.mode).toBe('PAPER');
      });

      // Verificar archivo también
      const jsonContent = fs.readFileSync(reportFile, 'utf8');
      expect(jsonContent).not.toContain('LIVE');
      expect(jsonContent).not.toContain('production');
      expect(jsonContent).toContain('"mode": "PAPER"');
    });
  });
});
