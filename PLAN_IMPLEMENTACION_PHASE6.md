# 📋 PLAN DE IMPLEMENTACIÓN: 5 Correcciones para Phase 6

**Fecha:** 2026-09-10  
**Estado:** Listo para revisión  
**Criterio:** Cada corrección especifica archivo, comportamiento, cambio, test, y rollback

---

## REGLA NUEVA PARA TITO (crítica)

> **Un 401, 429 o 422 puede detener UNA ORDEN, pero JAMÁS puede hacer que Tito desaparezca silenciosamente sin decir qué pasó.**

Todos los fallos deben generar:
- ✅ Log persistido (archivo, no solo console)
- ✅ Alerta observable (Slack/Email/Dashboard)
- ✅ Heartbeat (prueba de vida cada N segundos)
- ✅ Rollback capability (volver a estado anterior si es necesario)

---

## CORRECCIÓN 1: Reintento Inteligente para 429/401

### Ubicación
**Archivo:** `backend/src/core/executionEngine.ts` (NUEVO)

### Comportamiento Actual
- No existe aún (Phase 6 no tiene ejecución de órdenes)

### Cambio Propuesto

Crear nuevo archivo `backend/src/core/executionEngine.ts`:

```typescript
/**
 * Execution Engine with Intelligent Retry Logic
 * - 429 (Rate Limit): Retry con backoff exponencial
 * - 401 (Unauthorized): Bloquea nuevas órdenes, genera alerta
 * - 422 (Validation): Falla sin reintentar, log detallado
 */

import axios, { AxiosError } from 'axios';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface OrderRequest {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  limit_price?: number;
  clientOrderId?: string;
}

export interface ExecutionResult {
  success: boolean;
  orderId?: string;
  error?: string;
  errorCode?: number;
  errorType?: 'rate_limit' | 'auth' | 'validation' | 'unknown';
  retriesUsed?: number;
  timestamp: string;
}

export class ExecutionEngine {
  private readonly logger = new Logger(ExecutionEngine.name);
  private readonly maxRetries = 5;
  private readonly initialBackoffMs = 1000;
  private readonly maxBackoffMs = 32000;
  private executedOrdersFile = 'data/executed-orders.json';
  private executedOrders: Set<string> = new Set();

  constructor(private alpacaClient: any) {
    this.loadExecutedOrders();
  }

  /**
   * Ejecutar orden con reintento inteligente
   */
  async executeOrder(request: OrderRequest): Promise<ExecutionResult> {
    const orderKey = `${request.symbol}-${request.side}-${Date.now()}`;

    // Verificar deduplicación
    if (request.clientOrderId && this.executedOrders.has(request.clientOrderId)) {
      this.logger.warn(`⏭️  Order already executed: ${request.clientOrderId}`);
      return {
        success: false,
        error: 'Order already executed',
        errorType: 'unknown',
        timestamp: new Date().toISOString(),
      };
    }

    let lastError: AxiosError | null = null;
    let retriesUsed = 0;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        this.logger.log(`🎯 Attempt ${attempt + 1}/${this.maxRetries}: ${request.symbol}`);

        const response = await this.alpacaClient.post('/v2/orders', request);
        const orderId = response.data?.id;

        // Persistir ejecución
        if (request.clientOrderId) {
          this.executedOrders.add(request.clientOrderId);
          this.saveExecutedOrders();
        }

        this.logger.log(`✅ Order executed: ${orderId}`);
        
        return {
          success: true,
          orderId,
          timestamp: new Date().toISOString(),
          retriesUsed: attempt,
        };
      } catch (error: any) {
        lastError = error as AxiosError;
        const statusCode = error.response?.status;
        const errorMsg = error.response?.data?.message || error.message;

        // Discriminar por tipo de error
        if (statusCode === 429) {
          // Rate limit: reintentar con backoff
          retriesUsed = attempt + 1;
          const delayMs = Math.min(
            this.initialBackoffMs * Math.pow(2, attempt),
            this.maxBackoffMs
          );

          this.logger.warn(
            `⏳ Rate limited (429). Retry in ${delayMs}ms (attempt ${attempt + 1}/${this.maxRetries})`
          );

          // Log a archivo para auditoría
          this.logError('rate_limit', statusCode, errorMsg, attempt);

          // Esperar antes de reintentar
          await this.sleep(delayMs);
          continue;
        } else if (statusCode === 401) {
          // Auth fail: no reintentar, bloquear y alertar
          this.logger.error(`🔐 Authorization failed (401): ${errorMsg}`);
          
          // Persistir fallo
          this.logError('auth_failed', statusCode, errorMsg, attempt);

          // TODO: Enviar Slack alert
          // TODO: Bloquear nuevas órdenes hasta validación manual

          return {
            success: false,
            error: 'Authorization failed. Manual intervention required.',
            errorCode: 401,
            errorType: 'auth',
            timestamp: new Date().toISOString(),
            retriesUsed: attempt,
          };
        } else if (statusCode === 422) {
          // Validation error: no reintentar, es bug lógica
          this.logger.error(`❌ Validation error (422): ${errorMsg}`);

          // Log completo: payload + respuesta
          this.logValidationError(request, errorMsg);

          return {
            success: false,
            error: `Validation error: ${errorMsg}`,
            errorCode: 422,
            errorType: 'validation',
            timestamp: new Date().toISOString(),
            retriesUsed: attempt,
          };
        } else {
          // Otros errores: no reintentar
          this.logger.error(`❌ Order failed (${statusCode}): ${errorMsg}`);
          this.logError('unknown', statusCode, errorMsg, attempt);

          return {
            success: false,
            error: errorMsg,
            errorCode: statusCode,
            errorType: 'unknown',
            timestamp: new Date().toISOString(),
            retriesUsed: attempt,
          };
        }
      }
    }

    // Agotados reintentos
    this.logger.error(`❌ Retries exhausted after ${this.maxRetries} attempts`);

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      errorCode: lastError?.response?.status,
      errorType: 'rate_limit',  // Asumiendo que fue rate limit el que agotó reintentos
      timestamp: new Date().toISOString(),
      retriesUsed: this.maxRetries,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private loadExecutedOrders() {
    try {
      if (fs.existsSync(this.executedOrdersFile)) {
        const data = JSON.parse(fs.readFileSync(this.executedOrdersFile, 'utf8'));
        this.executedOrders = new Set(data.executedOrders || []);
        this.logger.log(`📂 Loaded ${this.executedOrders.size} executed orders from disk`);
      }
    } catch (err) {
      this.logger.warn(`⚠️  Could not load executed orders: ${err.message}`);
    }
  }

  private saveExecutedOrders() {
    try {
      fs.writeFileSync(
        this.executedOrdersFile,
        JSON.stringify(
          {
            executedOrders: Array.from(this.executedOrders),
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );
    } catch (err) {
      this.logger.error(`❌ Failed to save executed orders: ${err.message}`);
    }
  }

  private logError(
    errorType: string,
    statusCode: number | undefined,
    message: string,
    attempt: number
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      errorType,
      statusCode,
      message,
      attempt,
    };

    try {
      const logFile = `data/execution-errors.jsonl`;
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      this.logger.error(`Could not write error log: ${err.message}`);
    }
  }

  private logValidationError(request: OrderRequest, errorMsg: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      errorType: 'validation_422',
      request,
      error: errorMsg,
    };

    try {
      const logFile = `data/validation-errors.jsonl`;
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      this.logger.error(`Could not write validation log: ${err.message}`);
    }
  }

  /**
   * Obtener resumen de ejecuciones
   */
  getSummary() {
    return {
      executedCount: this.executedOrders.size,
      executedOrders: Array.from(this.executedOrders),
    };
  }
}
```

### Test que Demuestra que Funciona

**Archivo:** `backend/src/core/executionEngine.spec.ts`

```typescript
import { Test } from '@nestjs/testing';
import { ExecutionEngine } from './executionEngine';

describe('ExecutionEngine', () => {
  let engine: ExecutionEngine;
  let mockAlpacaClient: any;

  beforeEach(() => {
    mockAlpacaClient = {
      post: jest.fn(),
    };
    engine = new ExecutionEngine(mockAlpacaClient);
  });

  describe('Rate Limit Handling (429)', () => {
    it('should retry with exponential backoff on 429', async () => {
      // Primer intento: 429
      // Segundo intento: 429
      // Tercer intento: éxito
      mockAlpacaClient.post
        .mockRejectedValueOnce({
          response: { status: 429, data: { message: 'too many requests' } },
        })
        .mockRejectedValueOnce({
          response: { status: 429, data: { message: 'too many requests' } },
        })
        .mockResolvedValueOnce({
          data: { id: 'order-123' },
        });

      const result = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
        clientOrderId: 'test-429',
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-123');
      expect(result.retriesUsed).toBe(2);
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(3);
    });

    it('should fail after maxRetries exhausted', async () => {
      mockAlpacaClient.post.mockRejectedValue({
        response: { status: 429, data: { message: 'too many requests' } },
      });

      const result = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
      });

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('rate_limit');
      expect(result.retriesUsed).toBe(5);
    });
  });

  describe('Auth Failure Handling (401)', () => {
    it('should NOT retry on 401, should fail immediately', async () => {
      mockAlpacaClient.post.mockRejectedValue({
        response: { status: 401, data: { message: 'unauthorized' } },
      });

      const result = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
      });

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('auth');
      expect(result.retriesUsed).toBe(0);
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(1); // No reintentos
    });
  });

  describe('Validation Failure Handling (422)', () => {
    it('should NOT retry on 422, log and fail', async () => {
      mockAlpacaClient.post.mockRejectedValue({
        response: {
          status: 422,
          data: { message: 'oco orders must be limit orders' },
        },
      });

      const result = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
      });

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.retriesUsed).toBe(0);
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('Deduplication', () => {
    it('should not execute same clientOrderId twice', async () => {
      mockAlpacaClient.post.mockResolvedValue({ data: { id: 'order-1' } });

      // Primera ejecución
      const result1 = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
        clientOrderId: 'unique-id',
      });

      expect(result1.success).toBe(true);

      // Segunda ejecución con mismo ID
      const result2 = await engine.executeOrder({
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
        clientOrderId: 'unique-id',
      });

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already executed');
      expect(mockAlpacaClient.post).toHaveBeenCalledTimes(1); // Solo 1 llamada
    });
  });
});
```

### Mecanismo de Rollback
```bash
# Si algo falla, restaurar a versión anterior:
git revert HEAD  # Vuelve atrás el commit

# O eliminar el archivo:
rm backend/src/core/executionEngine.ts
rm backend/src/core/executionEngine.spec.ts
```

---

## CORRECCIÓN 2: Persistencia de Deduplicación

### Ubicación
**Archivo:** `backend/src/core/executionEngine.ts` (ya incluido en Corrección 1)

### Archivos de Soporte
- `data/executed-orders.json` (persistencia de órdenes)
- `data/execution-errors.jsonl` (log de errores)
- `data/validation-errors.jsonl` (log de errores de validación)

### Cambio: Ya está incluido en Corrección 1
- Métodos `loadExecutedOrders()` y `saveExecutedOrders()`
- Persistencia a disco tras cada ejecución exitosa

### Test
Ver `Deduplication` en tests de Corrección 1

---

## CORRECCIÓN 3: Validar OCO Antes de Enviar

### Ubicación
**Archivo:** `backend/src/core/orderValidator.ts` (NUEVO)

### Comportamiento Actual
- No existe

### Cambio Propuesto

```typescript
/**
 * Order Validator - Valida payload antes de enviar a Alpaca
 * Previene 422 errors detectando bugs en construcción de órdenes
 */

import { Logger } from '@nestjs/common';

export interface OrderPayload {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  limit_price?: number;
  stop_price?: number;
  take_profit?: any;
  stop_loss?: any;
  time_in_force?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class OrderValidator {
  private readonly logger = new Logger(OrderValidator.name);

  /**
   * Validar orden antes de enviar
   */
  validate(order: OrderPayload): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validaciones básicas
    if (!order.symbol || order.symbol.length === 0) {
      errors.push('symbol is required');
    }
    if (order.qty <= 0) {
      errors.push('qty must be > 0');
    }
    if (!['buy', 'sell'].includes(order.side)) {
      errors.push('side must be buy or sell');
    }
    if (!['market', 'limit'].includes(order.type)) {
      errors.push('type must be market or limit');
    }

    // Validaciones OCO
    if (order.take_profit || order.stop_loss) {
      // OCO requiere limit order
      if (order.type !== 'limit') {
        errors.push('OCO orders must use type=limit (not market)');
      }

      // Validar relación SL/TP
      if (order.stop_loss && order.take_profit) {
        const slPrice = order.stop_loss.stop_price;
        const tpPrice = order.take_profit.limit_price;
        const entryPrice = order.limit_price || 0;

        // Para BUY: SL < entry < TP
        if (order.side === 'buy') {
          if (slPrice >= entryPrice) {
            errors.push(
              `For BUY orders: stop_loss (${slPrice}) must be < limit_price (${entryPrice})`
            );
          }
          if (tpPrice <= entryPrice) {
            errors.push(
              `For BUY orders: take_profit (${tpPrice}) must be > limit_price (${entryPrice})`
            );
          }
          if (slPrice >= tpPrice) {
            errors.push(
              `For BUY orders: stop_loss (${slPrice}) must be < take_profit (${tpPrice})`
            );
          }
        }

        // Para SELL: TP < entry < SL
        if (order.side === 'sell') {
          if (tpPrice >= entryPrice) {
            errors.push(
              `For SELL orders: take_profit (${tpPrice}) must be < limit_price (${entryPrice})`
            );
          }
          if (slPrice <= entryPrice) {
            errors.push(
              `For SELL orders: stop_loss (${slPrice}) must be > limit_price (${entryPrice})`
            );
          }
          if (tpPrice >= slPrice) {
            errors.push(
              `For SELL orders: take_profit (${tpPrice}) must be < stop_loss (${slPrice})`
            );
          }
        }
      }
    }

    // Warnings
    if (order.type === 'limit' && !order.limit_price) {
      warnings.push('limit order without limit_price will be rejected');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
```

### Test

```typescript
describe('OrderValidator', () => {
  let validator: OrderValidator;

  beforeEach(() => {
    validator = new OrderValidator();
  });

  describe('OCO Validation', () => {
    it('should reject OCO with market order', () => {
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',  // ← BUG
        stop_loss: { stop_price: 100 },
        take_profit: { limit_price: 110 },
      };

      const result = validator.validate(order);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OCO orders must use type=limit (not market)');
    });

    it('should reject OCO with SL >= TP for BUY', () => {
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'limit',
        limit_price: 105,
        stop_loss: { stop_price: 110 },  // ← Invertido
        take_profit: { limit_price: 100 },  // ← Invertido
      };

      const result = validator.validate(order);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept valid OCO for BUY', () => {
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'limit',
        limit_price: 105,
        stop_loss: { stop_price: 100 },  // ✓ < entry
        take_profit: { limit_price: 110 },  // ✓ > entry
      };

      const result = validator.validate(order);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
```

### Integración en ExecutionEngine

En `executeOrder()`, agregar antes del POST:

```typescript
const validation = new OrderValidator().validate(request);
if (!validation.valid) {
  this.logger.error(`🚫 Order validation failed: ${validation.errors.join(', ')}`);
  this.logValidationError(request, validation.errors.join('; '));

  return {
    success: false,
    error: `Validation failed: ${validation.errors[0]}`,
    errorCode: 422,
    errorType: 'validation',
    timestamp: new Date().toISOString(),
  };
}
```

---

## CORRECCIÓN 4: Heartbeat y Watchdog

### Ubicación
**Archivo:** `backend/src/core/heartbeatService.ts` (NUEVO)

### Cambio Propuesto

```typescript
/**
 * Heartbeat Service - Detecta si el sistema está vivo
 * Genera alertas si desaparece silenciosamente
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class HeartbeatService {
  private readonly logger = new Logger(HeartbeatService.name);
  private heartbeatFile = 'data/heartbeat.jsonl';
  private lastHeartbeat: Date = new Date();

  constructor() {
    this.initHeartbeat();
  }

  private initHeartbeat() {
    try {
      fs.writeFileSync(
        this.heartbeatFile,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'heartbeat_start',
          pid: process.pid,
        }) + '\n'
      );
    } catch (err) {
      this.logger.warn(`Could not write heartbeat file: ${err.message}`);
    }
  }

  /**
   * Registrar latido
   */
  beat(context: string) {
    const now = new Date();
    this.lastHeartbeat = now;

    try {
      fs.appendFileSync(
        this.heartbeatFile,
        JSON.stringify({
          timestamp: now.toISOString(),
          event: 'beat',
          context,
          pid: process.pid,
        }) + '\n'
      );
    } catch (err) {
      this.logger.warn(`Could not write heartbeat: ${err.message}`);
    }
  }

  /**
   * Registrar error crítico
   */
  criticalError(error: Error | string) {
    const message = typeof error === 'string' ? error : error.message;

    try {
      fs.appendFileSync(
        this.heartbeatFile,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'critical_error',
          error: message,
          pid: process.pid,
        }) + '\n'
      );
    } catch (err) {
      this.logger.error(`Could not write error to heartbeat: ${err.message}`);
    }

    // TODO: Slack alert
    this.logger.error(`🚨 CRITICAL: ${message}`);
  }

  /**
   * Registrar detenimiento
   */
  shutdown(reason: string) {
    try {
      fs.appendFileSync(
        this.heartbeatFile,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'shutdown',
          reason,
          pid: process.pid,
          uptime: process.uptime(),
        }) + '\n'
      );
    } catch (err) {
      this.logger.warn(`Could not write shutdown to heartbeat: ${err.message}`);
    }

    this.logger.log(`👋 Shutting down: ${reason}`);
  }

  /**
   * Verificar si está vivo (para externa monitoring)
   */
  isAlive(): boolean {
    const timeSinceLastBeat = Date.now() - this.lastHeartbeat.getTime();
    const maxAllowedMs = 60000; // 1 minuto

    return timeSinceLastBeat < maxAllowedMs;
  }

  /**
   * Obtener resumen
   */
  getStatus() {
    return {
      alive: this.isAlive(),
      lastBeat: this.lastHeartbeat,
      uptime: process.uptime(),
      pid: process.pid,
    };
  }
}
```

### Integración en titoOperativeLoop (cuando se recree)

```typescript
@Injectable()
export class TitoOperativeLoop {
  constructor(private heartbeat: HeartbeatService) {}

  async runCycle() {
    try {
      this.heartbeat.beat('cycle_start');

      // ... lógica del ciclo ...

      this.heartbeat.beat('cycle_end');
    } catch (err) {
      this.heartbeat.criticalError(err);
      throw err;
    }
  }

  async shutdown(reason: string) {
    this.heartbeat.shutdown(reason);
    process.exit(0);
  }
}
```

### Test

```typescript
describe('HeartbeatService', () => {
  let service: HeartbeatService;

  beforeEach(() => {
    service = new HeartbeatService();
  });

  it('should record heartbeats to file', () => {
    service.beat('test_context');

    const content = fs.readFileSync('data/heartbeat.jsonl', 'utf8');
    expect(content).toContain('test_context');
  });

  it('should detect if alive', () => {
    service.beat('test');
    expect(service.isAlive()).toBe(true);
  });

  it('should detect if dead (timeout)', (done) => {
    jest.useFakeTimers();
    service.beat('test');

    // Avanzar tiempo más allá de max
    jest.advanceTimersByTime(61000);

    expect(service.isAlive()).toBe(false);
    jest.useRealTimers();
    done();
  });
});
```

---

## CORRECCIÓN 5: Migrar titoOperativeLoop a Phase 6

### Ubicación
**Archivo:** `backend/src/tito/operative.service.ts` (NUEVO)

### Cambio Propuesto

Crear `backend/src/tito/operative.service.ts` que integre:
- `ExecutionEngine` (Corrección 1)
- `OrderValidator` (Corrección 3)
- `HeartbeatService` (Corrección 4)

**Nota:** titoOperativeLoop.ts en carpeta duplicada queda intacta como referencia.

```typescript
/**
 * Tito Operative Service - 24/7 monitoring loop
 * Integra ejecución, validación y heartbeat
 * 
 * Diferencia key de S64:
 * - Usa ExecutionEngine (con reintento inteligente)
 * - Usa OrderValidator (previene 422 errors)
 * - Usa HeartbeatService (detección de silencio)
 * - Nunca desaparece sin decir qué pasó
 */

import { Injectable, Logger } from '@nestjs/common';
import { ExecutionEngine } from '../core/executionEngine';
import { OrderValidator } from '../core/orderValidator';
import { HeartbeatService } from '../core/heartbeatService';

@Injectable()
export class TitoOperativeService {
  private readonly logger = new Logger(TitoOperativeService.name);
  private cycleCount = 0;
  private isRunning = false;

  constructor(
    private executionEngine: ExecutionEngine,
    private orderValidator: OrderValidator,
    private heartbeat: HeartbeatService
  ) {}

  /**
   * Iniciar loop operativo
   */
  async start() {
    this.logger.log('🚀 Starting Tito Operative Loop');
    this.heartbeat.beat('operative_start');

    this.isRunning = true;
    const interval = setInterval(
      () => this.cycle().catch(err => this.handleCycleError(err)),
      5000  // 5 segundos por ciclo
    );

    // Graceful shutdown
    process.on('SIGTERM', () => {
      this.logger.log('🛑 Received SIGTERM');
      this.heartbeat.shutdown('SIGTERM received');
      clearInterval(interval);
      this.isRunning = false;
    });

    process.on('SIGINT', () => {
      this.logger.log('🛑 Received SIGINT');
      this.heartbeat.shutdown('SIGINT received');
      clearInterval(interval);
      this.isRunning = false;
    });
  }

  /**
   * Ciclo principal
   */
  private async cycle() {
    if (!this.isRunning) return;

    this.cycleCount++;
    this.heartbeat.beat(`cycle_${this.cycleCount}`);

    try {
      // Cada 12 ciclos (~60s) generar y ejecutar señales
      if (this.cycleCount % 12 === 0) {
        await this.executeTradeSignals();
      }

      // Reportar cada 60 ciclos (~5 min)
      if (this.cycleCount % 60 === 0) {
        this.printReport();
      }
    } catch (err) {
      this.handleCycleError(err);
    }
  }

  /**
   * Ejecutar señales de trading
   */
  private async executeTradeSignals() {
    this.logger.log(`🎯 [CYCLE ${this.cycleCount}] Generating trade signals...`);
    this.heartbeat.beat('trade_signals_start');

    // TODO: Integrar con prediction engine para generar signals
    const signals = this.generateDemoSignals();

    for (const signal of signals) {
      try {
        // Validar antes de ejecutar
        const validation = this.orderValidator.validate({
          symbol: signal.symbol,
          qty: signal.quantity || 1,
          side: signal.side,
          type: 'limit',
          limit_price: signal.targetPrice,
          stop_loss: signal.stopLoss,
          take_profit: signal.takeProfit,
        });

        if (!validation.valid) {
          this.logger.warn(
            `⚠️  Signal validation failed for ${signal.symbol}: ${validation.errors.join(', ')}`
          );
          continue;
        }

        // Ejecutar con reintento
        const result = await this.executionEngine.executeOrder({
          symbol: signal.symbol,
          qty: signal.quantity || 1,
          side: signal.side,
          type: 'limit',
          limit_price: signal.targetPrice,
          clientOrderId: `${signal.symbol}-${Date.now()}`,
        });

        if (result.success) {
          this.logger.log(`✅ Order executed: ${result.orderId}`);
        } else {
          this.logger.warn(
            `⚠️  Order failed (${result.errorType}): ${result.error}`
          );
        }
      } catch (err) {
        this.heartbeat.criticalError(err);
      }
    }

    this.heartbeat.beat('trade_signals_end');
  }

  /**
   * Manejo de errores en ciclo
   */
  private handleCycleError(err: any) {
    const errorMsg = err.stack || err.message;
    this.logger.error(`❌ Cycle error: ${errorMsg}`);
    this.heartbeat.criticalError(errorMsg);

    // NO detener el loop, solo registrar
    // Tito continúa vivo aunque haya un error
  }

  /**
   * Reporte de estado
   */
  private printReport() {
    const summary = this.executionEngine.getSummary();
    const heartbeatStatus = this.heartbeat.getStatus();

    this.logger.log(`
╔══════════════════════════════════════════╗
║   TITO OPERATIVE - STATUS REPORT         ║
╚══════════════════════════════════════════╝

⏱️  Cycles: ${this.cycleCount}
📊 Orders Executed: ${summary.executedCount}
💚 Heartbeat: ${heartbeatStatus.alive ? 'ALIVE' : 'DEAD'}
⏰ Last Beat: ${heartbeatStatus.lastBeat}
🕐 Uptime: ${Math.floor(heartbeatStatus.uptime / 60)}m

🟢 STATUS: RUNNING
    `);
  }

  /**
   * Demo signals para testing
   */
  private generateDemoSignals() {
    // TODO: Reemplazar con verdadera prediction engine
    return [];
  }
}
```

### Mecanismo de Rollback

```bash
# Si es necesario volver a S64 como referencia:
git checkout Agente\ Tito\ Metralleta/web/lib/titoOperativeLoop.ts

# O simplemente no deployar el nuevo servicio:
rm backend/src/tito/operative.service.ts
```

---

## RESUMEN: CHECKLIST ANTES DE IMPLEMENTAR

- [ ] **Carpeta S64/duplicada:** INTACTA, solo lectura, protegida como guardaespaldas
- [ ] **Phase 6 ACTIVA:** Todos los cambios aquí
- [ ] **Archivos NUEVOS:**
  - [ ] `backend/src/core/executionEngine.ts`
  - [ ] `backend/src/core/executionEngine.spec.ts`
  - [ ] `backend/src/core/orderValidator.ts`
  - [ ] `backend/src/core/orderValidator.spec.ts`
  - [ ] `backend/src/core/heartbeatService.ts`
  - [ ] `backend/src/core/heartbeatService.spec.ts`
  - [ ] `backend/src/tito/operative.service.ts`
- [ ] **Directorios NUEVOS:**
  - [ ] `data/` (para ejecutados-orders.json, heartbeat.jsonl, etc)
- [ ] **Tests:** Todos verdes antes de mergear
- [ ] **Rollback:** Procedimiento documentado
- [ ] **REGLA NUEVA:** Registrada en memoria para Tito

---

## PRÓXIMOS PASOS (cuando autorices)

1. ✅ **Leer y revisar este plan**
2. ✅ **Confirmar: ¿Procedo con implementación?**
3. ⏳ **Crear archivos NUEVOS** (no tocar existentes)
4. ⏳ **Tests (todos PASS)**
5. ⏳ **Git commit + push**
6. ⏳ **Integrar en NestJS module**
7. ⏳ **E2E validation** (simular 429/401/422)

**¿Autorización para implementar?**

