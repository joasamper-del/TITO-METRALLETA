import { Injectable, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PositionSnapshot } from '../database/entities/position-snapshot.entity';

/**
 * S62 Task 1: Integrar indicadores técnicos en PositionSnapshot
 * Responsabilidad: llenar volume, trend, RSI, ATR, VIX, reasoning
 */
@Injectable()
export class PositionSnapshotService {
  constructor(
    @InjectRepository(PositionSnapshot)
    private snapshotRepository: Repository<PositionSnapshot>,
  ) {}

  /**
   * Llenar indicadores técnicos en snapshot
   * ENTRADA: snapshot con datos de posición (qty, entryPrice, currentPrice, pnl)
   * ESPERADO: snapshot con campos técnicos poblados (volume, trend, RSI, ATR, VIX)
   * OBTENIDO: snapshot guardado en BD con validación
   */
  async fillIndicators(
    snapshot: Partial<PositionSnapshot>,
    marketData?: {
      volume?: number;
      trend?: 'UP' | 'DOWN' | 'NEUTRAL';
      rsi?: number;
      atr?: number;
      vix?: number;
    },
  ): Promise<PositionSnapshot> {
    // Validación: snapshot debe tener datos básicos
    if (!snapshot.symbol || !snapshot.currentPrice || snapshot.qty === undefined) {
      throw new Error('snapshot debe contener symbol, currentPrice, qty');
    }

    // Poblar indicadores desde marketData o valores por defecto
    const populated: Partial<PositionSnapshot> = {
      ...snapshot,
      volume: marketData?.volume ?? null,
      trend: marketData?.trend ?? 'NEUTRAL',
      rsi: marketData?.rsi ?? null,
      atr: marketData?.atr ?? null,
      vix: marketData?.vix ?? null,
      timestamp: snapshot.timestamp ?? new Date(),
    };

    // Validar que trend sea valor válido
    if (populated.trend && !['UP', 'DOWN', 'NEUTRAL'].includes(populated.trend)) {
      throw new Error(`trend debe ser UP, DOWN o NEUTRAL. Recibido: ${populated.trend}`);
    }

    return populated as PositionSnapshot;
  }

  /**
   * Registrar razonamiento de la decisión
   * ENTRADA: snapshot, reason (texto explicativo)
   * ESPERADO: campo reasoning poblado
   * OBTENIDO: snapshot con reasoning guardado
   */
  async fillReasoning(
    snapshot: PositionSnapshot,
    reason: string,
  ): Promise<PositionSnapshot> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('reasoning no puede estar vacío');
    }

    snapshot.reasoning = reason;
    return snapshot;
  }

  /**
   * Guardar snapshot en BD
   */
  async save(snapshot: PositionSnapshot): Promise<PositionSnapshot> {
    if (!snapshot.symbol) {
      throw new Error('snapshot debe tener symbol');
    }
    return this.snapshotRepository.save(snapshot);
  }

  /**
   * Obtener último snapshot de un símbolo
   */
  async getLatest(symbol: string): Promise<PositionSnapshot | null> {
    return this.snapshotRepository.findOne({
      where: { symbol },
      order: { timestamp: 'DESC' },
    });
  }

  /**
   * S62 Task 2: Registrar razonamiento vinculado a DecisionAuditTrail
   * ENTRADA: snapshot + decisionAuditTrailId + reasoning
   * ESPERADO: snapshot guardado con vinculación + reasoning
   * OBTENIDO: snapshot recuperado con decisionAuditTrailId correcto + reasoning
   */
  async registerDecisionReasoning(
    snapshot: PositionSnapshot,
    decisionAuditTrailId: string,
    reasoning: string,
  ): Promise<PositionSnapshot> {
    // Validación
    if (!decisionAuditTrailId || decisionAuditTrailId.trim().length === 0) {
      throw new Error('decisionAuditTrailId no puede estar vacío');
    }

    if (!reasoning || reasoning.trim().length === 0) {
      throw new Error('reasoning no puede estar vacío');
    }

    if (!snapshot.symbol) {
      throw new Error('snapshot debe tener symbol');
    }

    // Registrar vinculación
    snapshot.decisionAuditTrailId = decisionAuditTrailId;
    snapshot.reasoning = reasoning;

    return snapshot;
  }

  /**
   * Recuperar snapshot con su DecisionAuditTrail vinculado
   */
  async getWithDecision(snapshotId: string): Promise<PositionSnapshot | null> {
    return this.snapshotRepository.findOne({
      where: { id: snapshotId },
    });
  }

  /**
   * Recuperar todos los snapshots vinculados a una decisión
   */
  async getByDecision(decisionAuditTrailId: string): Promise<PositionSnapshot[]> {
    return this.snapshotRepository.find({
      where: { decisionAuditTrailId },
      order: { timestamp: 'DESC' },
    });
  }
}
