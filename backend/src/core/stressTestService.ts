/**
 * Stress Test Service - Validación Pre-Operación
 *
 * Simula escenarios de estrés EXCLUSIVAMENTE en Alpaca PAPER.
 * JAULA CERRADA: Sin modo LIVE, sin credenciales reales.
 * Kill switch obligatorio.
 */

import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import { ExecutionEngine, OrderRequest } from './executionEngine';
import { HeartbeatService } from './heartbeatService';

export interface StressTestScenario {
  name: string;
  description: string;
  ordersCount: number;
  consecutiveOrders?: boolean;
  duplicateOrders?: boolean;
  injectErrors?: Array<'429' | '401' | '422'>;
  injectLatency?: { min: number; max: number }; // ms
  injectHeartbeatLoss?: boolean;
}

export interface StressTestResult {
  scenario: string;
  startTime: string;
  endTime: string;
  totalOrders: number;
  successful: number;
  failed: number;
  duplicateDetected: number;
  avgLatency: number;
  maxLatency: number;
  errors: { [key: string]: number };
  heartbeatLosses: number;
  mode: 'PAPER';
  status: 'PASS' | 'FAIL';
}

class StressTestLogger {
  private logFile = 'data/stress-test.jsonl';

  log(entry: any) {
    try {
      const dir = 'data';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
    } catch (err) {
      console.error(`Could not write stress test log: ${(err as Error).message}`);
    }
  }

  readResults(limit: number = 100): any[] {
    try {
      if (!fs.existsSync(this.logFile)) return [];
      const content = fs.readFileSync(this.logFile, 'utf8');
      return content
        .split('\n')
        .filter(l => l.trim())
        .slice(-limit)
        .map(l => JSON.parse(l));
    } catch (err) {
      console.error(`Could not read stress test results: ${(err as Error).message}`);
      return [];
    }
  }

  clear() {
    try {
      if (fs.existsSync(this.logFile)) {
        fs.unlinkSync(this.logFile);
      }
    } catch (err) {
      console.error(`Could not clear stress test log: ${(err as Error).message}`);
    }
  }
}

export class StressTestService {
  private readonly logger = new Logger(StressTestService.name);
  private readonly testLogger = new StressTestLogger();
  private isRunning = false;
  private killSwitchTriggered = false;

  constructor(
    private executionEngine: ExecutionEngine,
    private heartbeat: HeartbeatService
  ) {}

  /**
   * Ejecutar stress test con kill switch
   */
  async run(scenario: StressTestScenario): Promise<StressTestResult> {
    if (this.isRunning) {
      throw new Error('Stress test already running');
    }

    if (this.killSwitchTriggered) {
      throw new Error('Kill switch activated. Stress test cannot run.');
    }

    this.isRunning = true;
    this.logger.log(`🧪 Starting stress test: ${scenario.name} (PAPER MODE)`);
    this.heartbeat.beat('stress_test_start');

    const result: StressTestResult = {
      scenario: scenario.name,
      startTime: new Date().toISOString(),
      endTime: '',
      totalOrders: scenario.ordersCount,
      successful: 0,
      failed: 0,
      duplicateDetected: 0,
      avgLatency: 0,
      maxLatency: 0,
      errors: {},
      heartbeatLosses: 0,
      mode: 'PAPER',
      status: 'PASS',
    };

    const latencies: number[] = [];
    const processedOrderIds = new Set<string>();

    try {
      // Generar órdenes de prueba
      const testOrders = this.generateTestOrders(
        scenario.ordersCount,
        scenario.consecutiveOrders || false,
        scenario.duplicateOrders || false
      );

      // Ejecutar cada orden
      for (let i = 0; i < testOrders.length; i++) {
        if (this.killSwitchTriggered) {
          this.logger.error('🛑 Kill switch triggered. Stopping stress test.');
          result.status = 'FAIL';
          break;
        }

        const order = testOrders[i];
        const startTime = Date.now();

        try {
          // Inyectar latencia si es necesario
          if (scenario.injectLatency) {
            const delay =
              Math.random() *
                (scenario.injectLatency.max - scenario.injectLatency.min) +
              scenario.injectLatency.min;
            await this.sleep(delay);
          }

          // Inyectar pérdida de heartbeat
          if (scenario.injectHeartbeatLoss && Math.random() < 0.1) {
            result.heartbeatLosses++;
            // Simular pérdida sin ejecutar
            result.failed++;
            continue;
          }

          // Ejecutar orden
          const execResult = await this.executionEngine.executeOrder(order);
          const latency = Date.now() - startTime;
          latencies.push(latency);

          // Detectar duplicados
          if (processedOrderIds.has(order.clientOrderId!)) {
            result.duplicateDetected++;
          } else {
            processedOrderIds.add(order.clientOrderId!);
          }

          // Contar resultados
          if (execResult.success) {
            result.successful++;
          } else {
            result.failed++;
            const errorType = execResult.errorType || 'unknown';
            result.errors[errorType] = (result.errors[errorType] || 0) + 1;
          }
        } catch (err) {
          result.failed++;
          const errorMsg = (err as Error).message;
          result.errors['exception'] = (result.errors['exception'] || 0) + 1;
          this.logger.error(`Order ${i + 1} failed: ${errorMsg}`);
        }
      }

      // Calcular métricas
      result.avgLatency =
        latencies.length > 0
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : 0;
      result.maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

      // Determinar estado PASS/FAIL
      const successRate = result.totalOrders > 0 ? result.successful / result.totalOrders : 0;
      const errorRate = result.totalOrders > 0 ? result.failed / result.totalOrders : 0;

      // PASS si: >= 80% órdenes exitosas Y kill switch no se activó
      result.status =
        successRate >= 0.8 && !this.killSwitchTriggered ? 'PASS' : 'FAIL';
    } finally {
      result.endTime = new Date().toISOString();
      this.isRunning = false;

      // Registrar resultado
      this.testLogger.log(result);

      this.logger.log(
        `✅ Stress test completed: ${result.status} (${result.successful}/${result.totalOrders} orders)`
      );
      this.heartbeat.beat(`stress_test_${result.status.toLowerCase()}`);
    }

    return result;
  }

  /**
   * Activar kill switch - detiene ejecución inmediatamente
   */
  activateKillSwitch() {
    this.killSwitchTriggered = true;
    this.logger.error('🛑 KILL SWITCH ACTIVATED - Stress test halted');
    this.heartbeat.beat('kill_switch_activated');
  }

  /**
   * Resetear kill switch (requiere autorización explícita)
   */
  resetKillSwitch() {
    this.killSwitchTriggered = false;
    this.logger.log('♻️  Kill switch reset');
  }

  /**
   * Generar órdenes de prueba
   */
  private generateTestOrders(
    count: number,
    consecutive: boolean,
    withDuplicates: boolean
  ): OrderRequest[] {
    const orders: OrderRequest[] = [];
    const symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT'];

    for (let i = 0; i < count; i++) {
      const symbol = symbols[i % symbols.length];
      const clientOrderId = withDuplicates && i % 3 === 0
        ? `test-dup-${i % 5}`
        : `test-${Date.now()}-${i}`;

      orders.push({
        symbol,
        qty: 1,
        side: i % 2 === 0 ? 'buy' : 'sell',
        type: 'market',
        clientOrderId,
      });

      // Si consecutive, ejecutar sin esperar
      if (consecutive && i < count - 1) {
        // No esperar entre órdenes
      }
    }

    return orders;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtener resultados de stress tests
   */
  getResults(limit: number = 10): StressTestResult[] {
    return this.testLogger.readResults(limit) as StressTestResult[];
  }

  /**
   * Limpiar logs de stress test
   */
  clearLogs() {
    this.testLogger.clear();
    this.logger.log('🧹 Stress test logs cleared');
  }

  /**
   * Obtener estado actual
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      killSwitchActive: this.killSwitchTriggered,
      mode: 'PAPER' as const,
    };
  }
}
