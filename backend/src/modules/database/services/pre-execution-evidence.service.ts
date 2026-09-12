import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PreExecutionEvidence } from '../entities/pre-execution-evidence.entity';

@Injectable()
export class PreExecutionEvidenceService {
  private readonly logger = new Logger(PreExecutionEvidenceService.name);
  private repository: Repository<PreExecutionEvidence>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(PreExecutionEvidence);
  }

  /**
   * Registra foto de SEATBELT antes de ejecución
   */
  async recordEvidence(evidence: PreExecutionEvidence): Promise<void> {
    if (!evidence.trade_id) {
      throw new Error('trade_id requerido para recordar evidencia');
    }
    await this.repository.save(evidence);
    this.logger.debug(`Evidence recorded: ${evidence.trade_id}`);
  }

  /**
   * Busca evidencia por trade_id
   */
  async findByTradeId(tradeId: string): Promise<PreExecutionEvidence | null> {
    return this.repository.findOne({ where: { trade_id: tradeId } });
  }

  /**
   * Verifica si evidencia ya fue consumida (anti-replay)
   */
  async isConsumed(id: string): Promise<boolean> {
    const evidence = await this.repository.findOne({ where: { id } });
    return evidence?.consumed ?? false;
  }

  /**
   * Valida integridad de evidencia antes de usar
   */
  validateIntegrityBeforeUse(evidence: PreExecutionEvidence): boolean {
    if (!evidence) return false;
    if (evidence.consumed) return false;
    if (evidence.isExpired()) return false;
    if (!evidence.all_gates_pass) return false;
    return true;
  }

  /**
   * Marca evidencia como consumida (anti-replay, idempotente)
   */
  async markAsConsumed(id: string): Promise<void> {
    const evidence = await this.repository.findOne({ where: { id } });
    if (evidence && !evidence.consumed) {
      evidence.markConsumed();
      await this.repository.save(evidence);
      this.logger.debug(`Evidence marked consumed: ${id}`);
    }
  }
}
