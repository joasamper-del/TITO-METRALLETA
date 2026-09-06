import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DecisionAuditTrail } from '../../../modules/database/entities';

export interface DecisionAuditInput {
  timestamp?: Date;
  symbol?: string;
  strategy?: string;
  decision: string; // ENTER, ESPERAR, NO_ENTRAR, SALIR, ERROR
  confidence?: number;
  riskLevel?: string;
  riskGatesApplied?: Record<string, any>;
  mliScore?: number;
  mliBreakdown?: Record<string, any>;
  marketData?: Record<string, any>;
  dataAvailability?: Record<string, any>;
  filtersApplied?: Record<string, any>;
  blockedReason?: string;
  proposedEntry?: number;
  proposedTarget?: number;
  proposedStop?: number;
  notes?: string;
}

export interface DecisionAuditUpdate {
  executionStatus?: string; // PENDING, EXECUTED, FAILED, SKIPPED
  executionId?: string;
  outcome?: string; // PROFITABLE, LOSS, PARTIAL, PENDING, ERROR
  profitLoss?: number;
  profitLossPercent?: number;
  lessons?: Record<string, any>;
  notes?: string;
}

@Injectable()
export class DecisionAuditService {
  constructor(
    @InjectRepository(DecisionAuditTrail)
    private auditRepository: Repository<DecisionAuditTrail>,
  ) {}

  /**
   * Registra una decisión en el audit trail
   */
  async recordDecision(input: DecisionAuditInput): Promise<DecisionAuditTrail> {
    const audit = this.auditRepository.create({
      timestamp: input.timestamp || new Date(),
      symbol: input.symbol,
      strategy: input.strategy,
      decision: input.decision,
      confidence: input.confidence,
      riskLevel: input.riskLevel,
      riskGatesApplied: input.riskGatesApplied,
      mliScore: input.mliScore,
      mliBreakdown: input.mliBreakdown,
      marketData: input.marketData,
      dataAvailability: input.dataAvailability,
      filtersApplied: input.filtersApplied,
      blockedReason: input.blockedReason,
      proposedEntry: input.proposedEntry,
      proposedTarget: input.proposedTarget,
      proposedStop: input.proposedStop,
      notes: input.notes,
      executionStatus: 'PENDING',
    });

    return this.auditRepository.save(audit);
  }

  /**
   * Actualiza una decisión con resultado posterior (después del trade)
   */
  async updateDecisionOutcome(
    decisionId: string,
    update: DecisionAuditUpdate,
  ): Promise<DecisionAuditTrail> {
    await this.auditRepository.update(decisionId, update);
    return this.auditRepository.findOneOrFail({ where: { id: decisionId } });
  }

  /**
   * Obtiene decisiones por rango de fechas
   */
  async getDecisionsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<DecisionAuditTrail[]> {
    return this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.timestamp >= :start', { start: startDate })
      .andWhere('audit.timestamp <= :end', { end: endDate })
      .orderBy('audit.timestamp', 'ASC')
      .getMany();
  }

  /**
   * Obtiene decisiones por símbolo y rango de fechas
   */
  async getDecisionsBySymbol(
    symbol: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<DecisionAuditTrail[]> {
    let query = this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.symbol = :symbol', { symbol });

    if (startDate && endDate) {
      query = query
        .andWhere('audit.timestamp >= :start', { start: startDate })
        .andWhere('audit.timestamp <= :end', { end: endDate });
    }

    return query.orderBy('audit.timestamp', 'DESC').getMany();
  }

  /**
   * Obtiene estadísticas de decisiones
   */
  async getDecisionStats(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, any>> {
    const decisions = await this.getDecisionsByDateRange(startDate, endDate);

    const stats = {
      totalDecisions: decisions.length,
      byDecision: {} as Record<string, number>,
      byOutcome: {} as Record<string, number>,
      averageConfidence: 0,
      executedCount: 0,
      profitableCount: 0,
      lossCount: 0,
      averagePnL: 0,
      averagePnLPercent: 0,
    };

    let totalConfidence = 0;
    let totalPnL = 0;
    let totalPnLPercent = 0;
    let outcomeCount = 0;

    decisions.forEach((d) => {
      // Count by decision type
      stats.byDecision[d.decision] = (stats.byDecision[d.decision] || 0) + 1;

      // Count by outcome
      if (d.outcome) {
        stats.byOutcome[d.outcome] = (stats.byOutcome[d.outcome] || 0) + 1;
      }

      // Calculate averages
      if (d.confidence) {
        totalConfidence += d.confidence;
      }

      if (d.executionStatus === 'EXECUTED') {
        stats.executedCount++;
      }

      if (d.outcome === 'PROFITABLE') {
        stats.profitableCount++;
      }

      if (d.outcome === 'LOSS') {
        stats.lossCount++;
      }

      if (d.profitLoss !== null && d.profitLoss !== undefined) {
        totalPnL += d.profitLoss;
        totalPnLPercent += d.profitLossPercent || 0;
        outcomeCount++;
      }
    });

    stats.averageConfidence =
      decisions.length > 0 ? totalConfidence / decisions.length : 0;
    stats.averagePnL = outcomeCount > 0 ? totalPnL / outcomeCount : 0;
    stats.averagePnLPercent =
      outcomeCount > 0 ? totalPnLPercent / outcomeCount : 0;

    return stats;
  }

  /**
   * Obtiene tasa de precisión de MLI (si disponible)
   */
  async getMliAccuracy(startDate: Date, endDate: Date): Promise<number> {
    const decisions = await this.getDecisionsByDateRange(startDate, endDate);

    const mliDecisions = decisions.filter((d) => d.mliScore !== null);
    if (mliDecisions.length === 0) return 0;

    // Simple accuracy: decisions that had MLI and were executed
    const executed = mliDecisions.filter(
      (d) => d.executionStatus === 'EXECUTED',
    ).length;

    return executed > 0 ? (executed / mliDecisions.length) * 100 : 0;
  }

  /**
   * Limpia registros antiguos (para mantenimiento)
   * @param daysToKeep Número de días de datos a mantener
   */
  async cleanupOldRecords(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditRepository
      .createQueryBuilder()
      .delete()
      .where('timestamp < :cutoff', { cutoff: cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
