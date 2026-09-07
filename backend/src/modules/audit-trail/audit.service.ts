import { Injectable, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DecisionChangeLog } from '../database/entities/decision-change-log.entity';
import { PositionSnapshot } from '../database/entities/position-snapshot.entity';
import { DecisionAuditTrail } from '../database/entities/decision-audit-trail.entity';

/**
 * S63 Auditoría de Decisiones
 * Validar integridad referencial entre PositionSnapshot ↔ DecisionAuditTrail
 * Rastrear cambios en decisiones con DecisionChangeLog
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(DecisionChangeLog)
    private changeLogRepository: Repository<DecisionChangeLog>,
    @InjectRepository(PositionSnapshot)
    private snapshotRepository: Repository<PositionSnapshot>,
    @InjectRepository(DecisionAuditTrail)
    private decisionRepository: Repository<DecisionAuditTrail>,
  ) {}

  /**
   * Validar que un snapshot está vinculado correctamente
   * ENTRADA: snapshotId
   * ESPERADO: TRUE si FK válido, FALSE si huérfano o corrupto
   * OBTENIDO: boolean
   */
  async validateSnapshotIntegrity(snapshotId: string): Promise<boolean> {
    if (!snapshotId || snapshotId.trim().length === 0) {
      return false;
    }

    const snapshot = await this.snapshotRepository.findOne({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      return false; // Snapshot doesn't exist
    }

    if (!snapshot.symbol) {
      return false; // Corrupted (missing required field)
    }

    // If decision_audit_trail_id is null, snapshot is "orphan" but valid (S62 allowed this)
    if (snapshot.decisionAuditTrailId === null || snapshot.decisionAuditTrailId === undefined) {
      return true; // Nullable FK is OK
    }

    // Verify the linked decision actually exists
    const decision = await this.decisionRepository.findOne({
      where: { id: snapshot.decisionAuditTrailId },
    });

    return decision !== null;
  }

  /**
   * Crear log entry para un cambio de decisión
   * ENTRADA: decisionId, action, snapshotCount
   * ESPERADO: ChangeLog guardado
   * OBTENIDO: ChangeLog entity
   */
  async logDecisionChange(
    decisionAuditTrailId: string,
    action: string,
    snapshotCount?: number,
  ): Promise<DecisionChangeLog> {
    if (!decisionAuditTrailId || decisionAuditTrailId.trim().length === 0) {
      throw new Error('decisionAuditTrailId no puede estar vacío');
    }

    if (!action || action.trim().length === 0) {
      throw new Error('action no puede estar vacía');
    }

    const log = new DecisionChangeLog();
    log.decisionAuditTrailId = decisionAuditTrailId;
    log.action = action;
    log.snapshotCount = snapshotCount ?? undefined;

    return this.changeLogRepository.save(log);
  }

  /**
   * Recuperar historial de cambios para una decisión
   * ENTRADA: decisionId
   * ESPERADO: Array ordenado DESC por timestamp
   * OBTENIDO: DecisionChangeLog[]
   */
  async getDecisionHistory(decisionAuditTrailId: string): Promise<DecisionChangeLog[]> {
    if (!decisionAuditTrailId || decisionAuditTrailId.trim().length === 0) {
      return [];
    }

    return this.changeLogRepository.find({
      where: { decisionAuditTrailId },
      order: { changedAt: 'DESC' },
    });
  }

  /**
   * Auditoría completa: validar integridad de TODOS los snapshots
   * S63 criterio crítico: integrityScore === 1.0 → 0 huérfanos, todos vinculados correctamente
   * ENTRADA: ninguna (audita BD completa)
   * ESPERADO: {integrityScore, orphanCount, dangling[], decisionsMissing[]}
   * OBTENIDO: audit result
   */
  async auditFullHistory(): Promise<{
    integrityScore: number;
    orphanCount: number;
    dangling: string[];
    decisionsMissing: string[];
  }> {
    // Obtener todos los snapshots
    const allSnapshots = await this.snapshotRepository.find();

    if (allSnapshots.length === 0) {
      return {
        integrityScore: undefined, // N/A
        orphanCount: 0,
        dangling: [],
        decisionsMissing: [],
      };
    }

    const dangling: string[] = [];
    const decisionsMissing: string[] = [];

    // Validar cada snapshot
    for (const snapshot of allSnapshots) {
      // Snapshot sin FK es "nullable" — no es huérfano
      if (!snapshot.decisionAuditTrailId) {
        continue;
      }

      // Snapshot con FK que no existe es dangling
      const decision = await this.decisionRepository.findOne({
        where: { id: snapshot.decisionAuditTrailId },
      });

      if (!decision) {
        dangling.push(snapshot.id);
        decisionsMissing.push(snapshot.decisionAuditTrailId);
      }
    }

    const orphanCount = dangling.length;
    const integrityScore = orphanCount === 0 ? 1.0 : (allSnapshots.length - orphanCount) / allSnapshots.length;

    return {
      integrityScore,
      orphanCount,
      dangling,
      decisionsMissing: [...new Set(decisionsMissing)], // Unique
    };
  }
}
