/**
 * StressTestService Test Suite
 * 3 Test Suites con 12 casos de prueba total
 *
 * JAULA: **PAPER MODE** - validación pre-operación
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StressTestService, StressTestScenario } from './stressTestService';
import { ExecutionEngine } from './executionEngine';
import { HeartbeatService } from './heartbeatService';
import * as fs from 'fs';

describe('StressTestService (PRE-OPERATION VALIDATION)', () => {
  let service: StressTestService;
  let mockExecutionEngine: any;
  let mockHeartbeat: any;
  const testLogFile = 'data/stress-test.jsonl';

  beforeEach(() => {
    try {
      if (fs.existsSync(testLogFile)) {
        fs.unlinkSync(testLogFile);
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

    service = new StressTestService(mockExecutionEngine, mockHeartbeat);
  });

  afterEach(() => {
    vi.clearAllMocks();
    try {
      if (fs.existsSync(testLogFile)) {
        fs.unlinkSync(testLogFile);
      }
    } catch (err) {
      // Ignorar
    }
  });

  // ========== TEST SUITE 1: Basic Scenarios ==========
  describe('TEST SUITE 1: Basic Stress Scenarios', () => {
    it('TEST 1.1: 10 órdenes exitosas → PASS', async () => {
      // SETUP
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      const scenario: StressTestScenario = {
        name: 'light_load',
        description: 'Light load: 10 successful orders',
        ordersCount: 10,
      };

      // ACT
      const result = await service.run(scenario);

      // ASSERT
      expect(result.status).toBe('PASS');
      expect(result.successful).toBe(10);
      expect(result.failed).toBe(0);
      expect(result.mode).toBe('PAPER');
      expect(result.totalOrders).toBe(10);
    });

    it('TEST 1.2: 10 órdenes, 20% falla → PASS (≥80% éxito)', async () => {
      // SETUP
      let callCount = 0;
      mockExecutionEngine.executeOrder.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          success: callCount % 5 !== 0, // 4 éxito, 1 fallo = 80% éxito
          orderId: callCount % 5 !== 0 ? 'order-ok' : undefined,
          errorType: callCount % 5 !== 0 ? undefined : 'unknown',
        });
      });

      const scenario: StressTestScenario = {
        name: 'normal_load',
        description: 'Normal load with 20% failure rate',
        ordersCount: 10,
      };

      // ACT
      const result = await service.run(scenario);

      // ASSERT
      expect(result.status).toBe('PASS'); // 8 éxitos / 10 = 80%
      expect(result.successful).toBeGreaterThanOrEqual(8);
      expect(result.mode).toBe('PAPER');
    });

    it('TEST 1.3: 10 órdenes, todas fallan → FAIL (<80% éxito)', async () => {
      // SETUP
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: false,
        error: 'Simulated failure',
        errorType: 'unknown',
      });

      const scenario: StressTestScenario = {
        name: 'heavy_load',
        description: 'Heavy load: all failures',
        ordersCount: 10,
      };

      // ACT
      const result = await service.run(scenario);

      // ASSERT
      expect(result.status).toBe('FAIL');
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(10);
      expect(result.mode).toBe('PAPER');
    });
  });

  // ========== TEST SUITE 2: Kill Switch ==========
  describe('TEST SUITE 2: Kill Switch (Safety Gate)', () => {
    it('TEST 2.1: Kill switch detiene ejecución inmediatamente', async () => {
      // SETUP
      let callCount = 0;
      mockExecutionEngine.executeOrder.mockImplementation(() => {
        callCount++;
        // Activar kill switch en orden 3
        if (callCount === 3) {
          service.activateKillSwitch();
        }
        return Promise.resolve({ success: true, orderId: `order-${callCount}` });
      });

      const scenario: StressTestScenario = {
        name: 'kill_switch_test',
        description: 'Test kill switch activation',
        ordersCount: 10,
      };

      // ACT
      const result = await service.run(scenario);

      // ASSERT
      expect(result.status).toBe('FAIL'); // Kill switch activa = FAIL
      expect(service.getStatus().killSwitchActive).toBe(true);
      expect(mockHeartbeat.beat).toHaveBeenCalledWith('kill_switch_activated');

      // Ejecutar nuevamente NO debe permitirse sin reset
      await expect(service.run(scenario)).rejects.toThrow(
        'Kill switch activated'
      );
    });

    it('TEST 2.2: Reset kill switch permite nueva ejecución', async () => {
      // SETUP
      service.activateKillSwitch();
      expect(service.getStatus().killSwitchActive).toBe(true);

      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      // ACT: Reset
      service.resetKillSwitch();
      expect(service.getStatus().killSwitchActive).toBe(false);

      // ACT: Ejecutar nuevo test
      const scenario: StressTestScenario = {
        name: 'after_reset',
        description: 'Test after reset',
        ordersCount: 5,
      };

      const result = await service.run(scenario);

      // ASSERT
      expect(result.successful).toBe(5);
      expect(result.status).toBe('PASS');
    });

    it('TEST 2.3: No se puede correr nueva prueba si kill switch activo', async () => {
      // SETUP
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      const scenario: StressTestScenario = {
        name: 'test1',
        description: 'Test',
        ordersCount: 2,
      };

      // ACT: Ejecutar normal
      const result1 = await service.run(scenario);
      expect(result1.status).toBe('PASS');

      // ACT: Activar kill switch
      service.activateKillSwitch();

      // ACT: Intentar segunda (debería fallar)
      await expect(service.run(scenario)).rejects.toThrow(
        'Kill switch activated'
      );
    });
  });

  // ========== TEST SUITE 3: Logging & Metrics ==========
  describe('TEST SUITE 3: Logging & Metrics', () => {
    it('TEST 3.1: Resultados se registran en JSONL persistente', async () => {
      // SETUP
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      const scenario: StressTestScenario = {
        name: 'logging_test',
        description: 'Test logging',
        ordersCount: 5,
      };

      // ACT
      const result = await service.run(scenario);

      // ASSERT: Archivo debe existir
      expect(fs.existsSync(testLogFile)).toBe(true);

      // Contenido debe ser JSON válido
      const content = fs.readFileSync(testLogFile, 'utf8');
      const parsed = JSON.parse(content.split('\n')[0]);

      expect(parsed.scenario).toBe('logging_test');
      expect(parsed.status).toBe('PASS');
      expect(parsed.mode).toBe('PAPER');
      expect(parsed.totalOrders).toBe(5);
    });

    it('TEST 3.2: getResults() recupera resultados históricos', async () => {
      // SETUP
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      const scenario: StressTestScenario = {
        name: 'test1',
        description: 'Test 1',
        ordersCount: 3,
      };

      // ACT
      await service.run(scenario);

      // ACT: Recuperar
      const results = service.getResults(10);

      // ASSERT
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].scenario).toBe('test1');
      expect(results[0].mode).toBe('PAPER');
    });

    it('TEST 3.3: Métricas de latencia se calculan correctamente', async () => {
      // SETUP
      let callNumber = 0;
      mockExecutionEngine.executeOrder.mockImplementation(() => {
        callNumber++;
        // Simular latencias variables
        const delay = callNumber * 5; // 5ms, 10ms, 15ms, 20ms, 25ms
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ success: true, orderId: `order-${callNumber}` });
          }, delay);
        });
      });

      const scenario: StressTestScenario = {
        name: 'latency_test',
        description: 'Test latency metrics',
        ordersCount: 5,
      };

      // ACT
      const result = await service.run(scenario);

      // ASSERT
      expect(result.maxLatency).toBeGreaterThan(0);
      expect(result.avgLatency).toBeGreaterThan(0);
      expect(result.maxLatency).toBeGreaterThanOrEqual(result.avgLatency);
    });

    it('TEST 3.4: Lógica de duplicados está lista', async () => {
      // SETUP
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      const scenario: StressTestScenario = {
        name: 'duplicate_test',
        description: 'Test duplicate detection setup',
        ordersCount: 10,
        duplicateOrders: true,
      };

      // ACT
      const result = await service.run(scenario);

      // ASSERT: El campo duplicateDetected debe existir
      // (la detección actual ocurre cuando ExecutionEngine rechaza duplicados)
      expect(typeof result.duplicateDetected).toBe('number');
      expect(result.mode).toBe('PAPER');
    });

    it('TEST 3.5: Errores se categorizan por tipo', async () => {
      // SETUP
      let callCount = 0;
      mockExecutionEngine.executeOrder.mockImplementation(() => {
        callCount++;
        const types = ['429', '401', '422'];
        const errorType = types[callCount % types.length];

        return Promise.resolve({
          success: false,
          error: `Error: ${errorType}`,
          errorType,
        });
      });

      const scenario: StressTestScenario = {
        name: 'error_test',
        description: 'Test error categorization',
        ordersCount: 6,
      };

      // ACT
      const result = await service.run(scenario);

      // ASSERT
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
      expect(result.mode).toBe('PAPER');
    });
  });

  // ========== SUMMARY TEST ==========
  describe('Summary', () => {
    it('StressTestService mantiene PAPER mode en todos los escenarios', async () => {
      // SETUP
      mockExecutionEngine.executeOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      const scenarios: StressTestScenario[] = [
        {
          name: 'scenario1',
          description: 'Scenario 1',
          ordersCount: 5,
        },
        {
          name: 'scenario2',
          description: 'Scenario 2',
          ordersCount: 3,
          consecutiveOrders: true,
        },
      ];

      // ACT
      for (const scenario of scenarios) {
        const result = await service.run(scenario);

        // ASSERT: Cada resultado es PAPER
        expect(result.mode).toBe('PAPER');
        expect(result.status).toBe('PASS');
      }

      // Verificar logs
      const logs = fs.readFileSync(testLogFile, 'utf8');
      expect(logs).not.toContain('LIVE');
      expect(logs).not.toContain('prod');
      expect(logs).not.toContain('production');
    });
  });
});
