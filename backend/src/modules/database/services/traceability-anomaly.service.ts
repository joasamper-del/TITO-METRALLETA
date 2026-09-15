import { Injectable, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TraceabilityAnomaly } from '../entities/traceability-anomaly.entity';

/**
 * TRACEABILITY ANOMALY SERVICE
 * Detecta y registra cuando la cadena decision → execution → event → report
 * tiene ruptura de identificadores o falta de relaciones obligatorias
 *
 * CRÍTICO: Nunca fabricar IDs, timestamps, razones, relaciones.
 * Solo persistir exactamente lo que existe del estado anómalo.
 */
@Injectable()
export class TraceabilityAnomalyService {
  constructor(
    @InjectRepository(TraceabilityAnomaly)
    private readonly anomalyRepo: Repository<TraceabilityAnomaly>,
  ) {}

  /**
   * Registrar anomalía: IDs faltantes o relaciones inconsistentes
   *
   * @param anomalyType - Tipo: MISSING_TRADE_ID, MISSING_EXECUTION, ORPHAN_EVENT, ORPHAN_REPORT, PERSISTENCE_FAILURE
   * @param anomalyDescription - Descripción EXACTA de qué enlace falta/es inconsistente
   * @param availableIds - IDs que SÍ existen (los que se pudieron recuperar)
   * @param operationContext - Qué se intentaba hacer cuando pasó (close, recordOrderFailure, etc.)
   * @param availableData - Información real que existe, sin fabricación
   */
  async recordAnomaly(
    anomalyType: string,
    anomalyDescription: string,
    availableIds?: {
      tradeId?: string;
      decisionId?: string;
      executionId?: string;
      eventId?: string;
      reportId?: string;
    },
    operationContext?: string,
    availableData?: Record<string, any>,
  ): Promise<TraceabilityAnomaly> {
    if (!anomalyType || anomalyType.trim().length === 0) {
      throw new BadRequestException('anomalyType es requerido');
    }

    if (!anomalyDescription || anomalyDescription.trim().length === 0) {
      throw new BadRequestException('anomalyDescription es requerido');
    }

    const validTypes = [
      'MISSING_TRADE_ID',
      'MISSING_EXECUTION',
      'ORPHAN_EVENT',
      'ORPHAN_REPORT',
      'PERSISTENCE_FAILURE',
      'INCONSISTENT_STATE',
    ];

    if (!validTypes.includes(anomalyType)) {
      throw new BadRequestException(`anomalyType debe ser uno de: ${validTypes.join(', ')}`);
    }

    // CRÍTICO: Solo guardar IDs que REALMENTE existen, no fabricar
    const anomaly = this.anomalyRepo.create({
      anomalyType,
      anomalyDescription,
      tradeId: availableIds?.tradeId,
      decisionId: availableIds?.decisionId,
      executionId: availableIds?.executionId,
      eventId: availableIds?.eventId,
      reportId: availableIds?.reportId,
      operationContext: operationContext,
      availableData: availableData, // Información real solamente
    });

    return await this.anomalyRepo.save(anomaly);
  }

  /**
   * Buscar anomalías por tipo
   */
  async findByType(anomalyType: string): Promise<TraceabilityAnomaly[]> {
    if (!anomalyType) {
      throw new BadRequestException('anomalyType es requerido');
    }

    return this.anomalyRepo.find({
      where: { anomalyType },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Buscar todas las anomalías
   */
  async findAll(): Promise<TraceabilityAnomaly[]> {
    return this.anomalyRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener resumen de anomalías no resueltas
   */
  async getUnresolvedAnomalies(): Promise<TraceabilityAnomaly[]> {
    return this.anomalyRepo.find({
      where: { anomalyType: 'PERSISTENCE_FAILURE' }, // Las críticas: fallos de persistencia
      order: { createdAt: 'DESC' },
    });
  }
}
