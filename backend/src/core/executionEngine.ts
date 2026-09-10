/**
 * Execution Engine with Intelligent Retry Logic
 *
 * Maneja errores transitorios vs. permanentes:
 * - 429 (Rate Limit): Retry con backoff exponencial (máx 5 intentos)
 * - 401 (Unauthorized): NO reintentar, BLOQUEAR, generar alerta
 * - 422 (Validation): NO reintentar, registrar error específico
 *
 * Regla critica: Jamás desaparecer sin decir qué pasó
 */

import axios, { AxiosError } from 'axios';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { OrderValidator } from './orderValidator';
import { HeartbeatService } from './heartbeatService';

export interface OrderRequest {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  limit_price?: number;
  clientOrderId?: string;
  stop_loss?: { stop_price: number };
  take_profit?: { limit_price: number };
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
  private orderValidator: OrderValidator;
  private heartbeat: HeartbeatService;

  constructor(private alpacaClient: any, heartbeat?: HeartbeatService) {
    this.loadExecutedOrders();
    this.orderValidator = new OrderValidator();
    this.heartbeat = heartbeat || new HeartbeatService();
  }

  /**
   * Ejecutar orden con reintento inteligente + validación + heartbeat
   */
  async executeOrder(request: OrderRequest): Promise<ExecutionResult> {
    this.heartbeat.beat(`executeOrder_start_${request.symbol}`);

    try {
      // Verificar deduplicación
      if (request.clientOrderId && this.executedOrders.has(request.clientOrderId)) {
        this.logger.warn(`⏭️  Order already executed: ${request.clientOrderId}`);
        this.heartbeat.beat('executeOrder_duplicate');
        return {
          success: false,
          error: 'Order already executed',
          errorType: 'unknown',
          timestamp: new Date().toISOString(),
        };
      }

      // INTEGRACIÓN: Validar orden ANTES de enviar a Alpaca
      const validation = this.orderValidator.validate({
        symbol: request.symbol,
        qty: request.qty,
        side: request.side,
        type: request.type,
        limit_price: request.limit_price,
        stop_loss: request.stop_loss,
        take_profit: request.take_profit,
      });

      if (!validation.valid) {
        this.logger.error(
          `🚫 Order validation failed for ${request.symbol}: ${validation.errors[0]}`
        );
        this.heartbeat.beat('executeOrder_validation_fail');
        this.logValidationError(request, validation.errors.join('; '));

        return {
          success: false,
          error: `Validation failed: ${validation.errors[0]}`,
          errorCode: 422,
          errorType: 'validation',
          timestamp: new Date().toISOString(),
        };
      }

      // Validación pasó, continuar con ejecución
      this.heartbeat.beat('executeOrder_validation_pass');

      let lastError: AxiosError | null = null;
      let retriesUsed = 0;

      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          this.logger.log(`🎯 Attempt ${attempt + 1}/${this.maxRetries}: ${request.symbol}`);
          this.heartbeat.beat(`executeOrder_attempt_${attempt + 1}`);

          const response = await this.alpacaClient.post('/v2/orders', request);
          const orderId = response.data?.id;

          // Persistir ejecución
          if (request.clientOrderId) {
            this.executedOrders.add(request.clientOrderId);
            this.saveExecutedOrders();
          }

          this.logger.log(`✅ Order executed: ${orderId}`);
          this.heartbeat.beat('executeOrder_success');

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

          // DISCRIMINAR POR TIPO DE ERROR

          // 429: Rate Limit → REINTENTAR CON BACKOFF
          if (statusCode === 429) {
            retriesUsed = attempt + 1;
            const delayMs = Math.min(
              this.initialBackoffMs * Math.pow(2, attempt),
              this.maxBackoffMs
            );

            this.logger.warn(
              `⏳ Rate limited (429). Retry in ${delayMs}ms (attempt ${attempt + 1}/${this.maxRetries})`
            );
            this.heartbeat.beat(`executeOrder_429_retry_${attempt + 1}`);

            // Log a archivo para auditoría
            this.logError('rate_limit', statusCode, errorMsg, attempt);

            // Esperar antes de reintentar
            await this.sleep(delayMs);
            continue;
          }
          // 401: Auth Fail → NO REINTENTAR, BLOQUEAR, ALERTAR
          else if (statusCode === 401) {
            this.logger.error(`🔐 Authorization failed (401): ${errorMsg}`);
            this.heartbeat.criticalError(`Auth failure (401): ${errorMsg}`);

            // Persistir fallo crítico
            this.logError('auth_failure', statusCode, errorMsg, attempt);

            this.logger.error('🚨 CRITICAL: Manual intervention required for authentication');

            return {
              success: false,
              error: 'Authorization failed. Manual intervention required.',
              errorCode: 401,
              errorType: 'auth',
              timestamp: new Date().toISOString(),
              retriesUsed: attempt,
            };
          }
          // 422: Validation Error → NO REINTENTAR, REGISTRAR
          else if (statusCode === 422) {
            this.logger.error(`❌ Validation error (422): ${errorMsg}`);
            this.heartbeat.beat('executeOrder_422_validation_fail');

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
          }
          // OTROS ERRORES → NO REINTENTAR
          else {
            this.logger.error(`❌ Order failed (${statusCode}): ${errorMsg}`);
            this.heartbeat.beat(`executeOrder_error_${statusCode}`);
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

      // Agotados reintentos (solo si fue 429)
      this.logger.error(`❌ Retries exhausted after ${this.maxRetries} attempts`);
      this.heartbeat.beat('executeOrder_retries_exhausted');

      return {
        success: false,
        error: lastError?.message || 'Unknown error',
        errorCode: lastError?.response?.status,
        errorType: 'rate_limit',
        timestamp: new Date().toISOString(),
        retriesUsed: this.maxRetries,
      };
    } catch (err) {
      const errorMsg = (err as Error).message;
      this.heartbeat.criticalError(`Unexpected error: ${errorMsg}`);
      throw err;
    }
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
      this.logger.warn(`⚠️  Could not load executed orders: ${(err as Error).message}`);
    }
  }

  private saveExecutedOrders() {
    try {
      // Crear directorio si no existe
      const dir = path.dirname(this.executedOrdersFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

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
      this.logger.error(`❌ Failed to save executed orders: ${(err as Error).message}`);
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
      const logDir = 'data';
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFile = `${logDir}/execution-errors.jsonl`;
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      this.logger.error(`Could not write error log: ${(err as Error).message}`);
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
      const logDir = 'data';
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFile = `${logDir}/validation-errors.jsonl`;
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      this.logger.error(`Could not write validation log: ${(err as Error).message}`);
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
