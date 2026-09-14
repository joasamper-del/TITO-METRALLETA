import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Repository, Between } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DailySummary } from '../entities/daily-summary.entity';
import { DecisionAuditTrail } from '../entities/decision-audit-trail.entity';
import { TradeExecution } from '../entities/trade-execution.entity';
import { ExecutionReport } from '../entities/execution-report.entity';
import { TraceabilityAnomaly } from '../entities/traceability-anomaly.entity';
import { NoOpExplanation } from '../entities/no-op-explanation.entity';

export interface DailySummaryData {
  dateET: Date;
  generatedMode: 'AUTOMATIC' | 'MANUAL';
  isManualOverride: boolean;
  totalDecisions: number;
  decidedEnter: number;
  decidedWait: number;
  decidedSkip: number;
  decidedExit: number;
  decidedError: number;
  tradesExecuted: number;
  tradesClosed: number;
  outcomeProfitable: number;
  outcomeLoss: number;
  outcomeBreakeven: number;
  totalProfitLoss?: number;
  totalProfitLossPercent?: number;
  pnlCalculationStatus?: number;
  operationsFailed: number;
  noOperations: number;
  noOpReasons?: Record<string, number>;
  traceabilityAnomalies: number;
  traceabilityTypes?: Record<string, number>;
  hasClosed: boolean;
  hasFailed: boolean;
  hasTraceabilityLoss: boolean;
  hasNoOperations: boolean;
  integrityStatus: 'PASS' | 'FAIL' | 'HOLD';
  integrityNotes?: string;
  evidenceLog?: Record<string, any>;
  generationNotes?: string;
}

@Injectable()
export class DailySummaryService {
  private readonly logger = new Logger(DailySummaryService.name);

  constructor(
    @InjectRepository(DailySummary)
    private summaryRepo: Repository<DailySummary>,
    @InjectRepository(DecisionAuditTrail)
    private decisionRepo: Repository<DecisionAuditTrail>,
    @InjectRepository(TradeExecution)
    private tradeRepo: Repository<TradeExecution>,
    @InjectRepository(ExecutionReport)
    private reportRepo: Repository<ExecutionReport>,
    @InjectRepository(TraceabilityAnomaly)
    private traceabilityRepo: Repository<TraceabilityAnomaly>,
    @InjectRepository(NoOpExplanation)
    private noOpRepo: Repository<NoOpExplanation>,
  ) {}

  /**
   * PURE: Consolidar conteos de decisiones
   */
  private consolidateDecisionCounts(decisions: DecisionAuditTrail[]): {
    total: number;
    enter: number;
    wait: number;
    skip: number;
    exit: number;
    error: number;
  } {
    const result = {
      total: decisions.length,
      enter: 0,
      wait: 0,
      skip: 0,
      exit: 0,
      error: 0,
    };

    decisions.forEach((d) => {
      switch (d.decision) {
        case 'ENTRAR':
          result.enter++;
          break;
        case 'ESPERAR':
          result.wait++;
          break;
        case 'NO_ENTRAR':
          result.skip++;
          break;
        case 'SALIR':
          result.exit++;
          break;
        case 'ERROR':
          result.error++;
          break;
      }
    });

    return result;
  }

  /**
   * PURE: Consolidar resultados de trades cerrados
   */
  private consolidateTradeResults(reports: ExecutionReport[]): {
    executed: number;
    profitable: number;
    loss: number;
    breakeven: number;
    totalPnL?: number;
    avgPnLPercent?: number;
    pnlStatus: number; // 1=completo, 0=parcial, null faltante
  } {
    const result = {
      executed: reports.length,
      profitable: 0,
      loss: 0,
      breakeven: 0,
      totalPnL: 0,
      avgPnLPercent: 0,
      pnlStatus: reports.length > 0 ? 1 : null,
    };

    let validPnL = 0;
    let pnlSum = 0;
    let percentSum = 0;

    reports.forEach((r) => {
      switch (r.outcome) {
        case 'PROFITABLE':
          result.profitable++;
          break;
        case 'LOSS':
          result.loss++;
          break;
        case 'BREAKEVEN':
          result.breakeven++;
          break;
      }

      if (r.profitLoss !== null && r.profitLoss !== undefined) {
        pnlSum += Number(r.profitLoss);
        validPnL++;
      }

      if (r.profitLossPercent !== null && r.profitLossPercent !== undefined) {
        percentSum += Number(r.profitLossPercent);
      }
    });

    if (validPnL > 0) {
      result.totalPnL = pnlSum;
      result.avgPnLPercent = percentSum / reports.length;
      result.pnlStatus = validPnL === reports.length ? 1 : 0;
    } else {
      result.totalPnL = null;
      result.avgPnLPercent = null;
      result.pnlStatus = reports.length > 0 ? 0 : null;
    }

    return result;
  }

  /**
   * PURE: Consolidar razones de no-operación
   */
  private consolidateNoOpReasons(noOps: NoOpExplanation[]): Record<string, number> {
    const reasons: Record<string, number> = {};

    noOps.forEach((noop) => {
      reasons[noop.blockageReason] = (reasons[noop.blockageReason] || 0) + 1;
    });

    return reasons;
  }

  /**
   * PURE: Consolidar tipos de anomalías
   */
  private consolidateAnomalyTypes(anomalies: TraceabilityAnomaly[]): Record<string, number> {
    const types: Record<string, number> = {};

    anomalies.forEach((a) => {
      types[a.anomalyType] = (types[a.anomalyType] || 0) + 1;
    });

    return types;
  }

  /**
   * PURE: Verificar integridad y asignar estado
   */
  private verifyIntegrity(data: Partial<DailySummaryData>): {
    status: 'PASS' | 'FAIL' | 'HOLD';
    notes?: string;
  } {
    const issues: string[] = [];

    // Check: P&L calculado vs reports CLOSED
    if (data.tradesExecuted > 0 && data.pnlCalculationStatus === 0) {
      issues.push('P&L parcial: no todos los trades CLOSED tienen profitLoss registrado');
    }

    // Check: Anomalías de trazabilidad
    if (data.hasTraceabilityLoss && data.traceabilityAnomalies === 0) {
      issues.push('Flag traceabilityLoss marcado pero sin anomalías registradas');
    }

    // Check: No-operaciones
    if (data.hasNoOperations && data.noOperations === 0) {
      issues.push('Flag noOperations marcado pero sin NoOpExplanation registradas');
    }

    // Check: Operaciones fallidas vs reportes
    if (data.operationsFailed > 0 && data.hasFailed === false) {
      issues.push('Operaciones fallidas detectadas pero flag hasFailed=false');
    }

    if (issues.length > 0) {
      return {
        status: issues.some((i) => i.includes('crítico')) ? 'FAIL' : 'HOLD',
        notes: issues.join('; '),
      };
    }

    return { status: 'PASS' };
  }

  /**
   * PURE: Generar DailySummaryData a partir de datos consultados
   */
  private generateSummaryData(
    dateET: Date,
    generatedMode: 'AUTOMATIC' | 'MANUAL',
    decisions: DecisionAuditTrail[],
    trades: TradeExecution[],
    reports: ExecutionReport[],
    noOps: NoOpExplanation[],
    anomalies: TraceabilityAnomaly[],
  ): DailySummaryData {
    const decisionCounts = this.consolidateDecisionCounts(decisions);
    const tradeResults = this.consolidateTradeResults(reports);
    const noOpReasons = this.consolidateNoOpReasons(noOps);
    const anomalyTypes = this.consolidateAnomalyTypes(anomalies);

    const closedTrades = trades.filter((t) => t.status === 'CLOSED');
    const failedTrades = trades.filter((t) => t.status === 'FAILED');

    const data: DailySummaryData = {
      dateET,
      generatedMode,
      isManualOverride: generatedMode === 'MANUAL',
      totalDecisions: decisionCounts.total,
      decidedEnter: decisionCounts.enter,
      decidedWait: decisionCounts.wait,
      decidedSkip: decisionCounts.skip,
      decidedExit: decisionCounts.exit,
      decidedError: decisionCounts.error,
      tradesExecuted: closedTrades.length,
      tradesClosed: closedTrades.length,
      outcomeProfitable: tradeResults.profitable,
      outcomeLoss: tradeResults.loss,
      outcomeBreakeven: tradeResults.breakeven,
      totalProfitLoss: tradeResults.totalPnL !== null ? tradeResults.totalPnL : undefined,
      totalProfitLossPercent: tradeResults.avgPnLPercent !== null ? tradeResults.avgPnLPercent : undefined,
      pnlCalculationStatus: tradeResults.pnlStatus !== null ? tradeResults.pnlStatus : undefined,
      operationsFailed: failedTrades.length,
      noOperations: noOps.length,
      noOpReasons: Object.keys(noOpReasons).length > 0 ? noOpReasons : undefined,
      traceabilityAnomalies: anomalies.length,
      traceabilityTypes: Object.keys(anomalyTypes).length > 0 ? anomalyTypes : undefined,
      hasClosed: closedTrades.length > 0,
      hasFailed: failedTrades.length > 0,
      hasTraceabilityLoss: anomalies.length > 0,
      hasNoOperations: noOps.length > 0,
      integrityStatus: 'PASS',
      generationNotes: `Generated ${generatedMode} for ${dateET.toISOString().split('T')[0]}`,
    };

    const integrity = this.verifyIntegrity(data);
    data.integrityStatus = integrity.status;
    data.integrityNotes = integrity.notes;

    return data;
  }

  /**
   * Generar resumen diario (sin persistir — solo lógica pura)
   * Consult real data from all sources for a given date
   */
  async generateDailySummary(
    dateET: Date,
    generatedMode: 'AUTOMATIC' | 'MANUAL' = 'AUTOMATIC',
  ): Promise<DailySummaryData> {
    const dateStart = new Date(dateET);
    dateStart.setUTCHours(0, 0, 0, 0);

    const dateEnd = new Date(dateStart);
    dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);

    this.logger.debug(`Generating summary for ${dateET.toISOString().split('T')[0]}`);

    // Query all real data sources
    const decisions = await this.decisionRepo.find({
      where: {
        timestamp: Between(dateStart, dateEnd),
      },
    });

    const trades = await this.tradeRepo.find({
      where: {
        createdAt: Between(dateStart, dateEnd),
      },
    });

    const reports = await this.reportRepo.find({
      where: {
        createdAt: Between(dateStart, dateEnd),
      },
    });

    const noOps = await this.noOpRepo.find({
      where: {
        createdAt: Between(dateStart, dateEnd),
      },
    });

    const anomalies = await this.traceabilityRepo.find({
      where: {
        createdAt: Between(dateStart, dateEnd),
      },
    });

    this.logger.debug(`Data sources: ${decisions.length} decisions, ${trades.length} trades, ${reports.length} reports, ${noOps.length} noOps, ${anomalies.length} anomalies`);

    return this.generateSummaryData(dateET, generatedMode, decisions, trades, reports, noOps, anomalies);
  }

  /**
   * Persistir resumen con idempotencia
   * Si ya existe para la fecha, actualiza; de lo contrario, crea nuevo
   */
  async saveDailySummary(data: DailySummaryData): Promise<DailySummary> {
    if (!data.dateET) {
      throw new BadRequestException('dateET es requerido');
    }

    const dateOnly = new Date(data.dateET);
    dateOnly.setUTCHours(0, 0, 0, 0);
    dateOnly.setUTCMinutes(0);
    dateOnly.setUTCSeconds(0);
    dateOnly.setUTCMilliseconds(0);

    let existing = await this.summaryRepo.findOne({
      where: { dateET: dateOnly },
    });

    if (existing) {
      this.logger.debug(`Updating existing summary for ${dateOnly.toISOString().split('T')[0]}`);
      // Actualizar campos (idempotencia)
      Object.assign(existing, data);
      existing.updatedAt = new Date();
      return this.summaryRepo.save(existing);
    } else {
      this.logger.debug(`Creating new summary for ${dateOnly.toISOString().split('T')[0]}`);
      // Crear nuevo
      const summary = this.summaryRepo.create({
        ...data,
        dateET: dateOnly,
      });
      return this.summaryRepo.save(summary);
    }
  }

  /**
   * Flujo completo: generar + persistir (con opción manual)
   */
  async generateAndSave(
    dateET: Date,
    generatedMode: 'AUTOMATIC' | 'MANUAL' = 'AUTOMATIC',
  ): Promise<DailySummary> {
    const data = await this.generateDailySummary(dateET, generatedMode);
    return this.saveDailySummary(data);
  }

  /**
   * Obtener resumen existente
   */
  async getDailySummary(dateET: Date): Promise<DailySummary | null> {
    const dateOnly = new Date(dateET);
    dateOnly.setUTCHours(0, 0, 0, 0);
    dateOnly.setUTCMinutes(0);
    dateOnly.setUTCSeconds(0);
    dateOnly.setUTCMilliseconds(0);

    return this.summaryRepo.findOne({
      where: { dateET: dateOnly },
    });
  }

  /**
   * Listar resúmenes por rango
   */
  async listByDateRange(startDate: Date, endDate: Date): Promise<DailySummary[]> {
    return this.summaryRepo.find({
      where: {
        dateET: Between(startDate, endDate),
      },
      order: { dateET: 'ASC' },
    });
  }

  /**
   * Validar que no hay duplicados para la fecha
   */
  async checkForDuplicates(dateET: Date): Promise<boolean> {
    const dateOnly = new Date(dateET);
    dateOnly.setUTCHours(0, 0, 0, 0);
    dateOnly.setUTCMinutes(0);
    dateOnly.setUTCSeconds(0);
    dateOnly.setUTCMilliseconds(0);

    const count = await this.summaryRepo.count({
      where: { dateET: dateOnly },
    });

    return count > 1;
  }
}
