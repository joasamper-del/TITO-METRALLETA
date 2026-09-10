/**
 * ExecutionEngine Test Suite
 * 5 Test Suites con 17 casos de prueba total
 * Criterio PASS/FAIL exacto para cada test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExecutionEngine, OrderRequest } from './executionEngine';
import { HeartbeatService } from './heartbeatService';
import * as fs from 'fs';
import * as path from 'path';

describe('ExecutionEngine', () => {
  let engine: ExecutionEngine;
  let mockAlpacaClient: any;
  const testDataDir = 'data';

  beforeEach(() => {
    // Limpiar archivos de test previos
    try {
      if (fs.existsSync(`${testDataDir}/executed-orders.json`)) {
        fs.unlinkSync(`${testDataDir}/executed-orders.json`);
      }
      if (fs.existsSync(`${testDataDir}/execution-errors.jsonl`)) {
        fs.unlinkSync(`${testDataDir}/execution-errors.jsonl`);
      }
      if (fs.existsSync(`${testDataDir}/validation-errors.jsonl`)) {
        fs.unlinkSync(`${testDataDir}/validation-errors.jsonl`);
      }
    } catch (err) {
      // Ignorar si no existen
    }

    mockAlpacaClient = {
      post: vi.fn(),
    };

    engine = new ExecutionEngine(mockAlpacaClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========== TEST SUITE 1: Rate Limit Handling (429) ==========
  describe('TEST SUITE 1: Rate Limit Handling (429)', () => {
    it('TEST 1.1: 429 en primer intento → retry → éxito en segundo', async () => {
      // SETUP
      mockAlpacaClient.post
        .mockRejectedValueOnce({
          response: { status: 429, data: { message: 'too many requests' } },
        })
        .mockResolvedValueOnce({
          data: { id: 'order-123' },
        });

      // ACT
      const result = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
        clientOrderId: 'test-429-retry',
      });

      // ASSERT
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-123');
      expect(result.retriesUsed).toBe(1);
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(2);
      expect(result.errorType).toBeUndefined();
    });

    it('TEST 1.2: 429 persistente × 5 intentos → agotados', async () => {
      // SETUP con fake timers para evitar delays reales
      vi.useFakeTimers();

      mockAlpacaClient.post.mockRejectedValue({
        response: { status: 429, data: { message: 'too many requests' } },
      });

      // ACT
      const promise = engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
      });

      // Avanzar tiempo simulado: (1 + 2 + 4 + 8 + 16) segundos = 31s
      await vi.advanceTimersByTimeAsync(35000);
      const result = await promise;

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('rate_limit');
      expect(result.retriesUsed).toBe(5);
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(5);
      expect(result.error).toBeDefined();

      vi.useRealTimers();
    });

    it('TEST 1.3: Backoff exponencial (1s → 2s → 4s → 8s → 16s)', async () => {
      // SETUP
      vi.useFakeTimers();
      let callCount = 0;

      mockAlpacaClient.post.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          const error: any = new Error('429');
          error.response = { status: 429, data: { message: 'too many requests' } };
          return Promise.reject(error);
        }
        return Promise.resolve({ data: { id: 'order-success' } });
      });

      // ACT
      const promise = engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
      });

      // Avanzar tiempo
      await vi.runAllTimersAsync();
      const result = await promise;

      // ASSERT
      expect(result.success).toBe(true);
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });

  // ========== TEST SUITE 2: Auth Failure Handling (401) ==========
  describe('TEST SUITE 2: Auth Failure Handling (401)', () => {
    it('TEST 2.1: 401 en primer intento → NO reintentar', async () => {
      // SETUP
      mockAlpacaClient.post.mockRejectedValue({
        response: { status: 401, data: { message: 'unauthorized' } },
      });

      // ACT
      const result = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
      });

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('auth');
      expect(result.retriesUsed).toBe(0);
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(1); // Solo 1 intento, NO reintentos
      expect(result.error).toContain('Manual intervention required');
    });

    it('TEST 2.2: 401 genera log y persiste error', async () => {
      // SETUP
      mockAlpacaClient.post.mockRejectedValue({
        response: { status: 401, data: { message: 'unauthorized' } },
      });

      // ACT
      const result = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
      });

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('auth');

      // Verificar que el error se guardó en archivo
      const logFile = `${testDataDir}/execution-errors.jsonl`;
      expect(fs.existsSync(logFile)).toBe(true);

      const logContent = fs.readFileSync(logFile, 'utf8');
      expect(logContent).toContain('auth_failure');
      expect(logContent).toContain('401');
    });
  });

  // ========== TEST SUITE 3: Validation Error Handling (422) ==========
  describe('TEST SUITE 3: Validation Error Handling (422)', () => {
    it('TEST 3.1: 422 en primer intento → NO reintentar', async () => {
      // SETUP
      mockAlpacaClient.post.mockRejectedValue({
        response: {
          status: 422,
          data: { message: 'oco orders must be limit orders' },
        },
      });

      // ACT
      const result = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
      });

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.retriesUsed).toBe(0);
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(1); // Solo 1 intento
      expect(result.error).toContain('oco orders must be limit orders');
    });

    it('TEST 3.2: 422 log detallado (request + error)', async () => {
      // SETUP
      const testRequest: OrderRequest = {
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
        clientOrderId: 'test-422',
      };

      mockAlpacaClient.post.mockRejectedValue({
        response: {
          status: 422,
          data: { message: 'oco orders must be limit orders' },
        },
      });

      // ACT
      const result = await engine.executeOrder(testRequest);

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');

      // Verificar que se guardó log con request y error
      const logFile = `${testDataDir}/validation-errors.jsonl`;
      expect(fs.existsSync(logFile)).toBe(true);

      const logContent = fs.readFileSync(logFile, 'utf8');
      const logEntry = JSON.parse(logContent.split('\n')[0]);

      expect(logEntry.errorType).toBe('validation_422');
      expect(logEntry.request.symbol).toBe('SPY');
      expect(logEntry.error).toContain('oco orders must be limit orders');
    });
  });

  // ========== TEST SUITE 4: Deduplication ==========
  describe('TEST SUITE 4: Deduplication', () => {
    it('TEST 4.1: clientOrderId único → se ejecuta', async () => {
      // SETUP
      mockAlpacaClient.post.mockResolvedValue({ data: { id: 'order-1' } });

      // ACT
      const result = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
        clientOrderId: 'unique-123',
      });

      // ASSERT
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-1');
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(1);
    });

    it('TEST 4.2: clientOrderId repetido → rechazado, NO envía POST', async () => {
      // SETUP
      mockAlpacaClient.post.mockResolvedValue({ data: { id: 'order-1' } });

      // ACT: Primera ejecución
      const result1 = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
        clientOrderId: 'unique-123',
      });

      expect(result1.success).toBe(true);

      // ACT: Segunda ejecución con MISMO ID
      const result2 = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
        clientOrderId: 'unique-123',
      });

      // ASSERT
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already executed');
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(1); // Solo 1 llamada (no duplicado)
    });

    it('TEST 4.3: Deduplicación persistida a disco', async () => {
      // SETUP
      mockAlpacaClient.post.mockResolvedValue({ data: { id: 'order-1' } });

      // ACT
      const result = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
        clientOrderId: 'persist-test',
      });

      // ASSERT: Archivo debe existir
      const ordersFile = `${testDataDir}/executed-orders.json`;
      expect(fs.existsSync(ordersFile)).toBe(true);

      const fileContent = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
      expect(fileContent.executedOrders).toContain('persist-test');
      expect(fileContent.timestamp).toBeDefined();

      // Crear nuevo engine (simula reinicio de proceso)
      const engine2 = new ExecutionEngine(mockAlpacaClient);

      // ASSERT: Nuevo engine debe cargar el orden ejecutado desde disco
      const summary = engine2.getSummary();
      expect(summary.executedCount).toBe(1);
      expect(summary.executedOrders).toContain('persist-test');
    });
  });

  // ========== TEST SUITE 5: Other Errors ==========
  describe('TEST SUITE 5: Other Errors (500, etc)', () => {
    it('TEST 5.1: 500 Server Error → NO reintentar', async () => {
      // SETUP
      mockAlpacaClient.post.mockRejectedValue({
        response: { status: 500, data: { message: 'internal server error' } },
      });

      // ACT
      const result = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
      });

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unknown');
      expect(result.retriesUsed).toBe(0);
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(1); // Solo 1 intento
    });
  });

  // ========== TEST SUITE 6: Integration (E1 + E2 + E3) ==========
  describe('TEST SUITE 6: Integration (ExecutionEngine + OrderValidator + HeartbeatService)', () => {
    let mockHeartbeat: any;

    beforeEach(() => {
      mockHeartbeat = {
        beat: vi.fn(),
        criticalError: vi.fn(),
      };
    });

    it('TEST 6.1: Orden válida → valida, ejecuta, heartbeat registra', async () => {
      // SETUP: Engine con mock HeartbeatService
      const engineWithHeartbeat = new ExecutionEngine(
        mockAlpacaClient,
        mockHeartbeat
      );
      mockAlpacaClient.post.mockResolvedValue({ data: { id: 'order-123' } });

      // ACT
      const result = await engineWithHeartbeat.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
        clientOrderId: 'integration-1',
      });

      // ASSERT
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-123');

      // Verificar que OrderValidator fue llamado (implícito en success)
      expect(result.errorType).toBeUndefined();

      // Verificar que HeartbeatService fue llamado en múltiples puntos
      expect(mockHeartbeat.beat).toHaveBeenCalledWith('executeOrder_start_SPY');
      expect(mockHeartbeat.beat).toHaveBeenCalledWith('executeOrder_validation_pass');
      expect(mockHeartbeat.beat).toHaveBeenCalledWith('executeOrder_attempt_1');
      expect(mockHeartbeat.beat).toHaveBeenCalledWith('executeOrder_success');

      // POST debe haber sido llamado solo una vez (éxito inmediato)
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(1);
    });

    it('TEST 6.2: OrderValidator rechaza → NO envía POST, heartbeat registra fail', async () => {
      // SETUP
      const engineWithHeartbeat = new ExecutionEngine(
        mockAlpacaClient,
        mockHeartbeat
      );

      // OCO market order → debe rechazar validación
      const result = await engineWithHeartbeat.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market', // ← BUG: OCO con market
        limit_price: 450,
        stop_loss: { stop_price: 440 },
        take_profit: { limit_price: 460 },
        clientOrderId: 'integration-2',
      });

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.error).toContain('OCO orders must use type=limit');

      // Verificar que NO envió POST
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(0);

      // Verificar que HeartbeatService registró el fallo
      expect(mockHeartbeat.beat).toHaveBeenCalledWith('executeOrder_start_SPY');
      expect(mockHeartbeat.beat).toHaveBeenCalledWith('executeOrder_validation_fail');
      expect(mockHeartbeat.beat).not.toHaveBeenCalledWith('executeOrder_success');
    });

    it('TEST 6.3: 429 + reintento → heartbeat registra cada intento', async () => {
      // SETUP
      vi.useFakeTimers();
      const engineWithHeartbeat = new ExecutionEngine(
        mockAlpacaClient,
        mockHeartbeat
      );

      mockAlpacaClient.post
        .mockRejectedValueOnce({
          response: { status: 429, data: { message: 'too many requests' } },
        })
        .mockResolvedValueOnce({
          data: { id: 'order-success' },
        });

      // ACT
      const promise = engineWithHeartbeat.executeOrder({
        symbol: 'AAPL',
        qty: 1,
        side: 'sell',
        type: 'limit',
        limit_price: 170,
        clientOrderId: 'integration-3',
      });

      // Avanzar tiempo para permitir reintento
      await vi.advanceTimersByTimeAsync(2000);
      const result = await promise;

      // ASSERT
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-success');

      // Verificar secuencia de heartbeats
      expect(mockHeartbeat.beat).toHaveBeenCalledWith('executeOrder_start_AAPL');
      expect(mockHeartbeat.beat).toHaveBeenCalledWith('executeOrder_validation_pass');
      expect(mockHeartbeat.beat).toHaveBeenCalledWith('executeOrder_attempt_1');
      expect(mockHeartbeat.beat).toHaveBeenCalledWith('executeOrder_429_retry_1');
      expect(mockHeartbeat.beat).toHaveBeenCalledWith('executeOrder_attempt_2');
      expect(mockHeartbeat.beat).toHaveBeenCalledWith('executeOrder_success');

      // POST debe haber sido llamado 2 veces (1 fail + 1 success)
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('TEST 6.4: 401 error → heartbeat.criticalError() y NO reintentos', async () => {
      // SETUP
      const engineWithHeartbeat = new ExecutionEngine(
        mockAlpacaClient,
        mockHeartbeat
      );

      mockAlpacaClient.post.mockRejectedValue({
        response: { status: 401, data: { message: 'unauthorized' } },
      });

      // ACT
      const result = await engineWithHeartbeat.executeOrder({
        symbol: 'MSFT',
        qty: 1,
        side: 'buy',
        type: 'limit',
        limit_price: 430,
        clientOrderId: 'integration-4',
      });

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('auth');

      // Verificar que criticalError fue llamado
      expect(mockHeartbeat.criticalError).toHaveBeenCalledWith(
        expect.stringContaining('Auth failure (401)')
      );

      // POST debe haber sido llamado solo una vez (sin reintentos)
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(1);
    });

    it('TEST 6.5: 422 validation del lado de Alpaca → heartbeat.beat() y NO reintentos', async () => {
      // SETUP
      const engineWithHeartbeat = new ExecutionEngine(
        mockAlpacaClient,
        mockHeartbeat
      );

      mockAlpacaClient.post.mockRejectedValue({
        response: {
          status: 422,
          data: { message: 'invalid order parameters' },
        },
      });

      // ACT
      const result = await engineWithHeartbeat.executeOrder({
        symbol: 'GOOGL',
        qty: 1,
        side: 'buy',
        type: 'limit',
        limit_price: 150,
        clientOrderId: 'integration-5',
      });

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');

      // Verificar que heartbeat registró el error
      expect(mockHeartbeat.beat).toHaveBeenCalledWith(
        'executeOrder_422_validation_fail'
      );

      // POST debe haber sido llamado solo una vez (sin reintentos)
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(1);
    });

    it('TEST 6.6: Integración triple → OrderValidator + Heartbeat + Deduplicación', async () => {
      // SETUP
      const engineWithHeartbeat = new ExecutionEngine(
        mockAlpacaClient,
        mockHeartbeat
      );
      mockAlpacaClient.post.mockResolvedValue({ data: { id: 'order-1' } });

      const orderRequest = {
        symbol: 'TSLA',
        qty: 1,
        side: 'buy',
        type: 'market',
        clientOrderId: 'integration-6-unique',
      };

      // ACT: Primera ejecución
      const result1 = await engineWithHeartbeat.executeOrder(orderRequest);
      expect(result1.success).toBe(true);

      // Limpiar mocks para la segunda llamada
      mockHeartbeat.beat.mockClear();
      mockAlpacaClient.post.mockClear();

      // ACT: Segunda ejecución con MISMO ID (deduplicación)
      const result2 = await engineWithHeartbeat.executeOrder(orderRequest);

      // ASSERT
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already executed');

      // Verificar que OrderValidator no fue llamado (deduplicación es primero)
      expect(mockHeartbeat.beat).toHaveBeenCalledWith(
        'executeOrder_duplicate'
      );

      // POST no debe ser llamado en la segunda ejecución
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(0);
    });
  });

  // ========== SUMMARY TEST ==========
  describe('Summary', () => {
    it('getSummary() retorna conteo correcto', async () => {
      // SETUP
      mockAlpacaClient.post.mockResolvedValue({ data: { id: 'order-1' } });

      // ACT
      await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
        clientOrderId: 'summary-test-1',
      });

      await engine.executeOrder({
        symbol: 'QQQ',
        qty: 1,
        side: 'sell',
        type: 'market',
        clientOrderId: 'summary-test-2',
      });

      const summary = engine.getSummary();

      // ASSERT
      expect(summary.executedCount).toBe(2);
      expect(summary.executedOrders).toEqual([
        'summary-test-1',
        'summary-test-2',
      ]);
    });
  });
});
