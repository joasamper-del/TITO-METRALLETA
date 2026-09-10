/**
 * Tito Operative Service - Loop 24/7 Controlado
 *
 * Ejecuta el loop operativo de Tito respetando horario y modo PAPER.
 * REGLA CRÍTICA: Jamás ejecutar órdenes fuera de horario de mercado (9:00-16:00 ET).
 * JAULA: **PAPER** - sin órdenes reales.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ExecutionEngine, ExecutionResult, OrderRequest } from './executionEngine';
import { HeartbeatService } from './heartbeatService';

export interface OperativeDecision {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  qty: number;
  type: 'market' | 'limit';
  limit_price?: number;
  confidence: number;
  reason: string;
}

export interface OperativeLogEntry {
  timestamp: string;
  cycleId: string;
  decision?: OperativeDecision;
  result?: ExecutionResult;
  error?: string;
  marketHours: boolean;
  mode: 'PAPER';
}

@Injectable()
export class TitoOperativeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TitoOperativeService.name);
  private operationLogFile = 'data/operation.jsonl';
  private isRunning = false;
  private loopInterval: NodeJS.Timeout | null = null;
  private readonly marketOpen = 9; // 9:00 ET
  private readonly marketClose = 16; // 16:00 ET
  private readonly loopIntervalMs = 10000; // 10 segundos
  private cycleCounter = 0;

  constructor(
    private executionEngine: ExecutionEngine,
    private heartbeat: HeartbeatService
  ) {
    this.logger.log('🔧 TitoOperativeService initialized (PAPER MODE)');
  }

  async onModuleInit() {
    this.logger.log('📡 Tito operative loop starting (PAPER ONLY)');
    this.start();
  }

  async onModuleDestroy() {
    this.logger.log('👋 Shutting down Tito operative loop');
    this.stop();
  }

  /**
   * Iniciar loop operativo
   */
  start() {
    if (this.isRunning) {
      this.logger.warn('⚠️  Operative loop already running');
      return;
    }

    this.isRunning = true;
    this.logger.log('🚀 Tito operative loop started (PAPER MODE)');
    this.heartbeat.beat('operative_service_start');

    // Loop principal cada 10 segundos
    this.loopInterval = setInterval(() => {
      this.cycle();
    }, this.loopIntervalMs);
  }

  /**
   * Detener loop operativo
   */
  stop() {
    if (!this.isRunning) {
      this.logger.warn('⚠️  Operative loop not running');
      return;
    }

    this.isRunning = false;

    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }

    this.logger.log('🛑 Tito operative loop stopped');
    this.heartbeat.beat('operative_service_stop');
  }

  /**
   * Ciclo operativo: verificar mercado, tomar decisión, ejecutar
   */
  private async cycle() {
    const cycleId = `cycle-${Date.now()}-${++this.cycleCounter}`;

    try {
      // 1. Verificar horario de mercado
      const isMarketHours = this.isMarketOpen();
      const logEntry: OperativeLogEntry = {
        timestamp: new Date().toISOString(),
        cycleId,
        marketHours: isMarketHours,
        mode: 'PAPER',
      };

      // 2. Si fuera de horario, solo log sin decisión
      if (!isMarketHours) {
        this.logOperation(logEntry);
        return;
      }

      // 3. Obtener decisión (simulado: en futuro vendrá de OperationManager)
      const decision = this.getDecision();

      if (!decision) {
        logEntry.decision = undefined;
        this.logOperation(logEntry);
        return;
      }

      // 4. Registrar decisión
      logEntry.decision = decision;

      // 5. Ejecutar a través de ExecutionEngine
      const result = await this.executionEngine.executeOrder({
        symbol: decision.symbol,
        qty: decision.qty,
        side: decision.action === 'buy' ? 'buy' : 'sell',
        type: decision.type,
        limit_price: decision.limit_price,
        clientOrderId: `${decision.symbol}-${cycleId}`,
      } as OrderRequest);

      logEntry.result = result;

      // 6. Registrar resultado
      this.logOperation(logEntry);

      // 7. Heartbeat
      this.heartbeat.beat(
        `operative_cycle_${result.success ? 'success' : 'fail'}`
      );

      this.logger.log(
        `✅ Cycle ${cycleId}: ${decision.symbol} ${decision.action} (${result.success ? 'EXECUTED' : 'FAILED'})`
      );
    } catch (err) {
      const errorMsg = (err as Error).message;

      const logEntry: OperativeLogEntry = {
        timestamp: new Date().toISOString(),
        cycleId,
        error: errorMsg,
        marketHours: this.isMarketOpen(),
        mode: 'PAPER',
      };

      this.logOperation(logEntry);
      this.heartbeat.beat('operative_cycle_error');

      this.logger.error(`❌ Cycle ${cycleId} error: ${errorMsg}`);
    }
  }

  /**
   * Verificar si mercado está abierto (9:00-16:00 ET)
   */
  private isMarketOpen(): boolean {
    const now = new Date();
    // Convertir a ET (UTC-4 en horario de verano)
    const etOffset = -4 * 60; // minutos
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const etMinutes = utcMinutes + etOffset;
    const etHours = Math.floor(etMinutes / 60);

    // Verificar día laboral (0-6, 0=domingo)
    const dayOfWeek = now.getUTCDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    return isWeekday && etHours >= this.marketOpen && etHours < this.marketClose;
  }

  /**
   * Obtener decisión de operación (simulado)
   * En futuro: vendrá de OperationManager
   */
  private getDecision(): OperativeDecision | null {
    // Por ahora retorna null (loop solo registra que pasó)
    // TODO: Integrar con OperationManager
    return null;
  }

  /**
   * Registrar ciclo operativo a JSONL
   */
  private logOperation(entry: OperativeLogEntry) {
    try {
      const logDir = 'data';
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      fs.appendFileSync(
        this.operationLogFile,
        JSON.stringify(entry) + '\n'
      );
    } catch (err) {
      this.logger.error(
        `Could not write operation log: ${(err as Error).message}`
      );
    }
  }

  /**
   * Obtener resumen del log operativo
   */
  getOperationLog(limit: number = 10): OperativeLogEntry[] {
    try {
      if (!fs.existsSync(this.operationLogFile)) {
        return [];
      }

      const content = fs.readFileSync(this.operationLogFile, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());

      return lines
        .slice(-limit)
        .map(l => JSON.parse(l))
        .reverse();
    } catch (err) {
      this.logger.warn(`Could not read operation log: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * Obtener estado del servicio
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      marketHoursOpen: this.isMarketOpen(),
      mode: 'PAPER' as const,
      cyclesExecuted: this.cycleCounter,
    };
  }
}
