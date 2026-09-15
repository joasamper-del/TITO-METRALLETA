import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ExecutionReport } from '../entities/execution-report.entity';
import { TradeExecution } from '../entities/trade-execution.entity';
import { ExecutionEventService } from './execution-event.service';

@Injectable()
export class ExecutionReportService {
  constructor(
    @InjectRepository(ExecutionReport)
    private readonly reportRepo: Repository<ExecutionReport>,
  ) {}

  /**
   * Generar reporte automáticamente cuando un trade se cierra
   * Disparo: TradeExecution.close() → ExecutionEvent(CLOSED) → ExecutionReport
   */
  async generateReportOnClose(tradeExecution: TradeExecution): Promise<ExecutionReport> {
    if (tradeExecution.status !== 'CLOSED') {
      throw new BadRequestException(`TradeExecution must be CLOSED, got: ${tradeExecution.status}`);
    }

    if (!tradeExecution.filledPrice || !tradeExecution.filledQty || !tradeExecution.filledAt) {
      throw new BadRequestException('TradeExecution missing entry: filledPrice, filledQty, or filledAt');
    }

    if (tradeExecution.exitPrice === null || tradeExecution.exitPrice === undefined || tradeExecution.closedAt === null || tradeExecution.closedAt === undefined) {
      throw new BadRequestException('TradeExecution missing exit: exitPrice or closedAt');
    }

    if (tradeExecution.profitLoss === null || tradeExecution.profitLoss === undefined) {
      throw new BadRequestException('TradeExecution missing P&L calculation');
    }

    // Calcular duración
    const durationMs = tradeExecution.closedAt.getTime() - tradeExecution.filledAt.getTime();
    const durationSeconds = Math.floor(durationMs / 1000);

    // Crear reporte
    const report = this.reportRepo.create({
      tradeExecution: { id: tradeExecution.id },
      tradeId: tradeExecution.tradeId,
      symbol: tradeExecution.symbol,
      side: tradeExecution.side,
      orderType: tradeExecution.orderType,
      entryQty: tradeExecution.filledQty,
      entryPrice: tradeExecution.filledPrice,
      entryAt: tradeExecution.filledAt,
      exitQty: tradeExecution.filledQty,
      exitPrice: tradeExecution.exitPrice,
      exitAt: tradeExecution.closedAt,
      profitLoss: tradeExecution.profitLoss,
      profitLossPercent: (tradeExecution.profitLoss / (tradeExecution.filledPrice * tradeExecution.filledQty)) * 100,
      outcome: tradeExecution.outcome,
      durationSeconds,
      notes: `Trade closed on ${tradeExecution.closedAt.toISOString()}`,
    });

    return await this.reportRepo.save(report);
  }

  /**
   * Obtener reporte por trade ID
   */
  async findByTradeId(tradeId: string): Promise<ExecutionReport | null> {
    return this.reportRepo.findOne({ where: { tradeId } });
  }

  /**
   * Obtener reporte por trade execution ID
   */
  async findByExecutionId(executionId: string): Promise<ExecutionReport | null> {
    return this.reportRepo.findOne({
      where: { tradeExecution: { id: executionId } },
    });
  }

  /**
   * Generar reporte automáticamente cuando una orden falla
   * Disparo: TradeExecution.recordOrderFailure() → ExecutionEvent(FAILED) → ExecutionReport
   */
  async generateReportOnFailure(
    tradeExecution: TradeExecution,
    failureReason: string,
    retryAttempts?: number,
  ): Promise<ExecutionReport> {
    if (tradeExecution.status !== 'FAILED') {
      throw new BadRequestException(`TradeExecution must be FAILED, got: ${tradeExecution.status}`);
    }

    if (!failureReason) {
      throw new BadRequestException('failureReason es requerido para reportes de fallo');
    }

    // Crear reporte de fallo (sin entrada/salida/P&L — son null)
    const report = this.reportRepo.create({
      tradeExecution: { id: tradeExecution.id },
      tradeId: tradeExecution.tradeId,
      symbol: tradeExecution.symbol,
      side: tradeExecution.side,
      orderType: tradeExecution.orderType,
      entryQty: tradeExecution.filledQty || 0, // 0 si no se llenó
      entryPrice: tradeExecution.filledPrice || 0, // 0 si no se llenó
      entryAt: tradeExecution.filledAt || new Date(),
      // Salida/P&L: null para fallos
      exitQty: null,
      exitPrice: null,
      exitAt: null,
      profitLoss: null,
      profitLossPercent: null,
      outcome: 'FAILED', // Outcome = FAILED
      durationSeconds: null,
      failureReason, // Motivo real del rechazo
      retryAttempts: retryAttempts || 0,
      notes: `Order failed at ${tradeExecution.lastAttemptAt?.toISOString() || new Date().toISOString()}`,
    });

    return await this.reportRepo.save(report);
  }
}
