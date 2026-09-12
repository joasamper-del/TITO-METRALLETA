import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TradeExecution } from '../entities/trade-execution.entity';
import { v4 as uuidv4 } from 'uuid';

export type ExecutionMode = 'PAPER' | 'LIVE';
export type TradeStatus = 'PENDING' | 'PENDING_FILL' | 'FILLED' | 'CLOSED';
export type CloseReason = 'SL_HIT' | 'TP_HIT' | 'MANUAL' | 'EXPIRED';

@Injectable()
export class TradeExecutionService {
  constructor(
    @InjectRepository(TradeExecution)
    private readonly tradeExecRepo: Repository<TradeExecution>,
  ) {}

  /**
   * 1. create() — Crear TradeExecution cuando se inicia ejecución
   * - Validar decisionId existe + status=ENTER
   * - Asignar uuid como clientOrderId
   * - Crear registro con status=PENDING
   */
  async create(
    decisionId: string,
    tradeId: string,
    executionMode: ExecutionMode,
  ): Promise<TradeExecution> {
    if (!decisionId || !tradeId) {
      throw new BadRequestException('decisionId y tradeId son requeridos');
    }

    if (!['PAPER', 'LIVE'].includes(executionMode)) {
      throw new BadRequestException('executionMode debe ser PAPER o LIVE');
    }

    const clientOrderId = uuidv4();

    const tradeExec = this.tradeExecRepo.create({
      decisionAuditTrail: { id: decisionId },
      tradeId,
      clientOrderId,
      executionMode,
      status: 'PENDING',
      attemptCount: 1,
    });

    return await this.tradeExecRepo.save(tradeExec);
  }

  /**
   * 2. linkBrokerOrder() — Vincular con orden del broker
   * - Update status=PENDING_FILL
   * - Guardar brokerResponse (JSONB)
   */
  async linkBrokerOrder(
    tradeExecutionId: string,
    brokerOrderId: string,
    brokerResponse: any,
  ): Promise<TradeExecution> {
    const tradeExec = await this.tradeExecRepo.findOne({
      where: { id: tradeExecutionId },
    });

    if (!tradeExec) {
      throw new NotFoundException(
        `TradeExecution ${tradeExecutionId} no encontrada`,
      );
    }

    if (!['PENDING'].includes(tradeExec.status)) {
      throw new BadRequestException(
        `No se puede vincular broker order en estado ${tradeExec.status}`,
      );
    }

    tradeExec.brokerOrderId = brokerOrderId;
    tradeExec.brokerResponse = brokerResponse;
    tradeExec.status = 'PENDING_FILL';

    return this.tradeExecRepo.save(tradeExec);
  }

  /**
   * 3. recordFill() — Registrar ejecución completa
   * - Update filledQty, filledPrice
   * - Update status=FILLED
   */
  async recordFill(
    tradeExecutionId: string,
    filledQty: number,
    filledPrice: number,
    brokerTimestamp?: Date,
  ): Promise<TradeExecution> {
    const tradeExec = await this.tradeExecRepo.findOne({
      where: { id: tradeExecutionId },
    });

    if (!tradeExec) {
      throw new NotFoundException(
        `TradeExecution ${tradeExecutionId} no encontrada`,
      );
    }

    if (!['PENDING_FILL'].includes(tradeExec.status)) {
      throw new BadRequestException(
        `No se puede registrar fill en estado ${tradeExec.status}`,
      );
    }

    if (!filledQty || filledQty <= 0) {
      throw new BadRequestException('filledQty debe ser > 0');
    }

    if (filledPrice === null || filledPrice === undefined || filledPrice <= 0) {
      throw new BadRequestException('filledPrice es requerido y > 0');
    }

    tradeExec.filledQty = filledQty;
    tradeExec.filledPrice = filledPrice;
    tradeExec.filledAt = brokerTimestamp || new Date();
    tradeExec.status = 'FILLED';

    return this.tradeExecRepo.save(tradeExec);
  }

  /**
   * 4. recordPartialFill() — Registrar relleno parcial
   * - Increment existente filledQty
   */
  async recordPartialFill(
    tradeExecutionId: string,
    additionalQty: number,
    filledPrice: number,
  ): Promise<TradeExecution> {
    const tradeExec = await this.tradeExecRepo.findOne({
      where: { id: tradeExecutionId },
    });

    if (!tradeExec) {
      throw new NotFoundException(
        `TradeExecution ${tradeExecutionId} no encontrada`,
      );
    }

    if (!['PENDING_FILL', 'FILLED'].includes(tradeExec.status)) {
      throw new BadRequestException(
        `No se puede registrar partial fill en estado ${tradeExec.status}`,
      );
    }

    if (!additionalQty || additionalQty <= 0) {
      throw new BadRequestException('additionalQty debe ser > 0');
    }

    if (filledPrice === null || filledPrice === undefined || filledPrice <= 0) {
      throw new BadRequestException('filledPrice es requerido y > 0');
    }

    const currentFilledQty = tradeExec.filledQty || 0;
    tradeExec.filledQty = currentFilledQty + additionalQty;
    tradeExec.filledPrice = filledPrice;
    tradeExec.status = 'FILLED';

    return this.tradeExecRepo.save(tradeExec);
  }

  /**
   * 5. close() — Cerrar trade y calcular P&L
   * - Calculate profitLoss = (exitPrice - entryPrice) * filledQty
   * - Update status=CLOSED, outcome
   */
  async close(
    tradeExecutionId: string,
    exitPrice: number,
    closeReason: CloseReason,
  ): Promise<TradeExecution> {
    const tradeExec = await this.tradeExecRepo.findOne({
      where: { id: tradeExecutionId },
    });

    if (!tradeExec) {
      throw new NotFoundException(
        `TradeExecution ${tradeExecutionId} no encontrada`,
      );
    }

    if (!['FILLED'].includes(tradeExec.status)) {
      throw new BadRequestException(
        `No se puede cerrar trade en estado ${tradeExec.status}`,
      );
    }

    if (!tradeExec.filledPrice || tradeExec.filledPrice <= 0) {
      throw new BadRequestException(
        'filledPrice no establecido — no se puede calcular P&L',
      );
    }

    if (!tradeExec.filledQty || tradeExec.filledQty <= 0) {
      throw new BadRequestException(
        'filledQty no establecida — no se puede calcular P&L',
      );
    }

    if (exitPrice === null || exitPrice === undefined || exitPrice <= 0) {
      throw new BadRequestException('exitPrice es requerido y > 0');
    }

    const profitLoss = (exitPrice - tradeExec.filledPrice) * tradeExec.filledQty;
    const outcome =
      profitLoss > 0.01 ? 'PROFITABLE' : profitLoss < -0.01 ? 'LOSS' : 'BREAKEVEN';

    tradeExec.exitPrice = exitPrice;
    tradeExec.profitLoss = profitLoss;
    tradeExec.outcome = outcome;
    tradeExec.closedAt = new Date();
    tradeExec.status = 'CLOSED';

    return await this.tradeExecRepo.save(tradeExec);
  }

  /**
   * 6. recordRetry() — Registrar reintento
   * - Increment attemptCount
   * - Keep status=PENDING (reutilizar clientOrderId)
   */
  async recordRetry(tradeExecutionId: string): Promise<TradeExecution> {
    const tradeExec = await this.tradeExecRepo.findOne({
      where: { id: tradeExecutionId },
    });

    if (!tradeExec) {
      throw new NotFoundException(
        `TradeExecution ${tradeExecutionId} no encontrada`,
      );
    }

    if (!['PENDING', 'PENDING_FILL'].includes(tradeExec.status)) {
      throw new BadRequestException(
        `No se puede reintentar en estado ${tradeExec.status}`,
      );
    }

    tradeExec.attemptCount = (tradeExec.attemptCount || 1) + 1;
    tradeExec.status = 'PENDING';

    return this.tradeExecRepo.save(tradeExec);
  }

  /**
   * 7. getByDecisionId() — Obtener todos los trades de una decisión
   * - Query por FK + return todos (reintentos = 1 trade)
   */
  async getByDecisionId(decisionId: string): Promise<TradeExecution[]> {
    if (!decisionId) {
      throw new BadRequestException('decisionId es requerido');
    }

    return this.tradeExecRepo.find({
      where: { decisionAuditTrail: { id: decisionId } },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 8. getByClientOrderId() — Dedup check
   * - Devuelve existente si ya hay
   */
  async getByClientOrderId(clientOrderId: string): Promise<TradeExecution | null> {
    if (!clientOrderId) {
      throw new BadRequestException('clientOrderId es requerido');
    }

    return this.tradeExecRepo.findOne({
      where: { clientOrderId },
    });
  }

  /**
   * Helper: obtener por broker order ID
   */
  async getByBrokerOrderId(brokerOrderId: string): Promise<TradeExecution | null> {
    if (!brokerOrderId) {
      throw new BadRequestException('brokerOrderId es requerido');
    }

    return this.tradeExecRepo.findOne({
      where: { brokerOrderId },
    });
  }
}
