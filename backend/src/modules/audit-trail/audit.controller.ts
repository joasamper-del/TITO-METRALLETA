import { Controller, Get, Param } from '@nestjs/common';
import { AuditService } from './audit.service';
import { DecisionChangeLog } from '../database/entities/decision-change-log.entity';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /audit/history/:decisionId
   * Recuperar historial de cambios para una decisión
   */
  @Get('history/:decisionId')
  async getDecisionHistory(@Param('decisionId') decisionId: string): Promise<DecisionChangeLog[]> {
    return this.auditService.getDecisionHistory(decisionId);
  }

  /**
   * GET /audit/integrity
   * Auditoría completa: validar integridad de TODOS los snapshots
   * CRÍTICO: integrityScore === 1.0 significa 0 dangling references
   */
  @Get('integrity')
  async auditFullHistory(): Promise<{
    integrityScore: number;
    orphanCount: number;
    dangling: string[];
    decisionsMissing: string[];
  }> {
    return this.auditService.auditFullHistory();
  }
}
