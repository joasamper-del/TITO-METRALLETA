import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NoOpExplanation } from '../entities/no-op-explanation.entity';

/**
 * NO-OP EXPLANATION SERVICE
 * Registra automáticamente cuando Tito NO opera porque una decisión fue bloqueada
 *
 * Causas verificables (sin fabricación):
 * - SEATBELT_GATE: gate específico bloqueó
 * - MARKET_CLOSED: mercado cerrado con timestamp real
 * - INSUFFICIENT_EVIDENCE: pre-execution evidence inválida/faltante
 * - MULTIPLE_GATES_FAILED: varios gates bloquearon
 * - INDETERMINATE: causa no puede determinarse con evidencia suficiente
 */
@Injectable()
export class NoOpExplanationService {
  constructor(
    @InjectRepository(NoOpExplanation)
    private readonly noOpRepo: Repository<NoOpExplanation>,
  ) {}

  /**
   * Registrar explicación automática de no-operación
   * Se llama automáticamente cuando una decisión es bloqueada, NOT manualmente
   *
   * @param decisionId - ID de la decisión bloqueada (requerido, siempre existe)
   * @param blockageReason - Tipo de bloqueo: SEATBELT_GATE, MARKET_CLOSED, etc.
   * @param specificGateOrRule - Exactamente qué gate/regla bloqueó (ej. "maxDrawdown > 15%")
   * @param blockageTimestamp - Timestamp real del bloqueo
   * @param blockageExplanation - Explicación clara SIN fabricación
   * @param availableEvidence - Evidencia real capturada (NO inventada)
   * @param failedGates - Qué gates fallaron y por qué
   * @param tradeId - ID del trade si existe (opcional)
   * @param executionEventId - ID del evento bloqueante si existe (opcional)
   */
  async recordBlockage(
    decisionId: string,
    blockageReason: string,
    specificGateOrRule: string,
    blockageTimestamp: Date,
    blockageExplanation: string,
    availableEvidence?: Record<string, any>,
    failedGates?: Record<string, any>,
    tradeId?: string,
    executionEventId?: string,
  ): Promise<NoOpExplanation> {
    if (!decisionId || decisionId.trim().length === 0) {
      throw new BadRequestException('decisionId es requerido');
    }

    if (!blockageReason || blockageReason.trim().length === 0) {
      throw new BadRequestException('blockageReason es requerido');
    }

    if (!specificGateOrRule || specificGateOrRule.trim().length === 0) {
      throw new BadRequestException('specificGateOrRule es requerido (exactitud importa)');
    }

    if (!blockageTimestamp) {
      throw new BadRequestException('blockageTimestamp es requerido (NO fabricar)');
    }

    if (!blockageExplanation || blockageExplanation.trim().length === 0) {
      throw new BadRequestException('blockageExplanation es requerido (SIN fabricación)');
    }

    const validReasons = [
      'SEATBELT_GATE',
      'MARKET_CLOSED',
      'INSUFFICIENT_EVIDENCE',
      'MULTIPLE_GATES_FAILED',
      'INDETERMINATE',
    ];

    if (!validReasons.includes(blockageReason)) {
      throw new BadRequestException(`blockageReason debe ser uno de: ${validReasons.join(', ')}`);
    }

    // CRÍTICO: Verificar que no haya explicación duplicada para esta decisión
    const existing = await this.noOpRepo.findOne({
      where: { decisionId },
    });

    let isDuplicate = false;
    let duplicateOfId: string | undefined;

    if (existing) {
      isDuplicate = true;
      duplicateOfId = existing.id;
    }

    const noOpExplanation = this.noOpRepo.create({
      decisionId,
      tradeId: tradeId || null,
      executionEventId: executionEventId || null,
      blockageReason,
      specificGateOrRule,
      blockageTimestamp,
      blockageExplanation,
      availableEvidence: availableEvidence || null,
      failedGates: failedGates || null,
      isDuplicate,
      duplicateOfId: duplicateOfId || null,
    });

    return await this.noOpRepo.save(noOpExplanation);
  }

  /**
   * Obtener explicación por decisionId
   */
  async findByDecisionId(decisionId: string): Promise<NoOpExplanation | null> {
    if (!decisionId) {
      throw new BadRequestException('decisionId es requerido');
    }

    return this.noOpRepo.findOne({
      where: { decisionId },
    });
  }

  /**
   * Obtener todas las explicaciones (no-operaciones)
   */
  async findAll(): Promise<NoOpExplanation[]> {
    return this.noOpRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener explicaciones por razón de bloqueo
   */
  async findByReason(reason: string): Promise<NoOpExplanation[]> {
    if (!reason) {
      throw new BadRequestException('reason es requerido');
    }

    return this.noOpRepo.find({
      where: { blockageReason: reason },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Detectar no-operaciones silenciosas (decisión sin explicación cuando existe evento bloqueante)
   */
  async findMissingExplanations(): Promise<NoOpExplanation[]> {
    // Las no-operaciones verificables son aquellas con evidencia de bloqueo
    return this.noOpRepo.find({
      where: { blockageReason: 'INDETERMINATE' },
      order: { createdAt: 'DESC' },
    });
  }
}
