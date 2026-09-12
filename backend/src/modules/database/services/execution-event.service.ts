import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ExecutionEvent } from '../entities/execution-event.entity';

export type ExecutionEventType = 'ORDER_PLACED' | 'FILL' | 'RETRY' | 'SL_HIT' | 'TP_HIT' | 'CLOSED' | 'ERROR';

@Injectable()
export class ExecutionEventService {
  constructor(
    @InjectRepository(ExecutionEvent)
    private readonly eventRepo: Repository<ExecutionEvent>,
  ) {}

  /**
   * 1. recordEvent() — Registrar evento genérico
   * - Create ExecutionEvent con eventType
   * - Guardar filledQty, filledPrice si aplica
   * - Usar broker timestamp si disponible
   */
  async recordEvent(
    tradeExecutionId: string,
    eventType: ExecutionEventType,
    data?: {
      filledQty?: number;
      filledPrice?: number;
      brokerTimestamp?: Date;
      brokerData?: any;
      reason?: string;
    },
  ): Promise<ExecutionEvent> {
    if (!tradeExecutionId) {
      throw new BadRequestException('tradeExecutionId es requerido');
    }

    if (!eventType || !this.isValidEventType(eventType)) {
      throw new BadRequestException('eventType inválido');
    }

    const validEventTypes: ExecutionEventType[] = [
      'ORDER_PLACED',
      'FILL',
      'RETRY',
      'SL_HIT',
      'TP_HIT',
      'CLOSED',
      'ERROR',
    ];

    if (!validEventTypes.includes(eventType)) {
      throw new BadRequestException(
        `eventType debe ser uno de: ${validEventTypes.join(', ')}`,
      );
    }

    const event = this.eventRepo.create({
      tradeExecution: { id: tradeExecutionId },
      eventType,
      filledQty: data?.filledQty || null,
      filledPrice: data?.filledPrice || null,
      brokerTimestamp: data?.brokerTimestamp || new Date(),
      brokerData: data?.brokerData || null,
      message: data?.reason || null,
    });

    return await this.eventRepo.save(event);
  }

  /**
   * 2. recordOrderPlaced() — Registrar orden colocada
   * - Create eventType=ORDER_PLACED
   */
  async recordOrderPlaced(
    tradeExecutionId: string,
    brokerOrderId: string,
  ): Promise<ExecutionEvent> {
    if (!tradeExecutionId || !brokerOrderId) {
      throw new BadRequestException('tradeExecutionId y brokerOrderId son requeridos');
    }

    return this.recordEvent(tradeExecutionId, 'ORDER_PLACED', {
      brokerData: { brokerOrderId },
    });
  }

  /**
   * 3. recordFill() — Registrar relleno
   * - Create eventType=FILL
   */
  async recordFill(
    tradeExecutionId: string,
    filledQty: number,
    filledPrice: number,
    brokerTimestamp?: Date,
  ): Promise<ExecutionEvent> {
    if (!tradeExecutionId) {
      throw new BadRequestException('tradeExecutionId es requerido');
    }

    if (!filledQty || filledQty <= 0) {
      throw new BadRequestException('filledQty debe ser > 0');
    }

    if (filledPrice === null || filledPrice === undefined || filledPrice <= 0) {
      throw new BadRequestException('filledPrice es requerido y > 0');
    }

    return this.recordEvent(tradeExecutionId, 'FILL', {
      filledQty,
      filledPrice,
      brokerTimestamp,
    });
  }

  /**
   * 4. recordRetry() — Registrar reintento
   * - Create eventType=RETRY con reason
   */
  async recordRetry(
    tradeExecutionId: string,
    reason: string,
    attemptNumber: number,
  ): Promise<ExecutionEvent> {
    if (!tradeExecutionId || !reason) {
      throw new BadRequestException('tradeExecutionId y reason son requeridos');
    }

    if (attemptNumber < 1) {
      throw new BadRequestException('attemptNumber debe ser >= 1');
    }

    return this.recordEvent(tradeExecutionId, 'RETRY', {
      reason: `${reason} (attempt #${attemptNumber})`,
    });
  }

  /**
   * 5. recordStopLoss() — Registrar SL activado
   * - Create eventType=SL_HIT
   */
  async recordStopLoss(
    tradeExecutionId: string,
    exitPrice: number,
  ): Promise<ExecutionEvent> {
    if (!tradeExecutionId) {
      throw new BadRequestException('tradeExecutionId es requerido');
    }

    if (exitPrice === null || exitPrice === undefined || exitPrice <= 0) {
      throw new BadRequestException('exitPrice es requerido y > 0');
    }

    return this.recordEvent(tradeExecutionId, 'SL_HIT', {
      filledPrice: exitPrice,
    });
  }

  /**
   * 6. getTradeHistory() — Obtener historial de eventos
   * - Return cronológicamente ordenados
   * - Include broker timestamps
   */
  async getTradeHistory(
    tradeExecutionId: string,
  ): Promise<ExecutionEvent[]> {
    if (!tradeExecutionId) {
      throw new BadRequestException('tradeExecutionId es requerido');
    }

    return this.eventRepo.find({
      where: { tradeExecution: { id: tradeExecutionId } },
      order: { recordedAt: 'ASC' },
    });
  }

  /**
   * Helper: validar eventType
   */
  private isValidEventType(eventType: any): eventType is ExecutionEventType {
    const validTypes: ExecutionEventType[] = [
      'ORDER_PLACED',
      'FILL',
      'RETRY',
      'SL_HIT',
      'TP_HIT',
      'CLOSED',
      'ERROR',
    ];
    return validTypes.includes(eventType);
  }
}
