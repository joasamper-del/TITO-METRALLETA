/**
 * Audit Trail Service (S58)
 * Queries decision audit trail with READ-ONLY guarantees
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DecisionAuditTrail } from '../database/entities/decision-audit-trail.entity';

export interface AuditTrailQuery {
  startDate: Date;
  endDate: Date;
  tickers?: string[];
  types?: string[];
}

export interface DecisionSummary {
  date: string;
  counts: Record<string, number>;
  results: {
    profitable: number;
    loss: number;
    pending: number;
  };
}

export interface DecisionRecord {
  id: string;
  timestamp: Date;
  symbol: string;
  decision: string;
  confidence: number;
  mliScore: number;
  mliBreakdown: Record<string, any>;
  riskGatesApplied: string[];
  marketData: {
    price: number;
    vix: number;
    volume: number;
  };
  executionId?: string;
  outcome?: string;
  profitLoss?: number;
  profitLossPercent?: number;
  lessons?: Record<string, any>;
  questionsForJay?: Array<{
    timestamp: Date;
    situation: string;
    missingInfo: string;
    question: string;
  }>;
}

@Injectable()
export class AuditTrailService {
  constructor(
    @InjectRepository(DecisionAuditTrail)
    private auditRepository: Repository<DecisionAuditTrail>,
  ) {}

  /**
   * Query decisions with filters
   * GUARANTEED READ-ONLY: no mutations possible
   */
  async getDecisions(query: AuditTrailQuery): Promise<DecisionRecord[]> {
    const qb = this.auditRepository.createQueryBuilder('audit');

    // Date range
    qb.where('audit.timestamp BETWEEN :start AND :end', {
      start: query.startDate,
      end: query.endDate,
    });

    // Ticker filter
    if (query.tickers?.length) {
      qb.andWhere('audit.symbol IN (:...tickers)', {
        tickers: query.tickers,
      });
    }

    // Decision type filter
    if (query.types?.length) {
      qb.andWhere('audit.decision IN (:...types)', {
        types: query.types,
      });
    }

    // Order by timestamp (newest first)
    qb.orderBy('audit.timestamp', 'DESC');

    const records = await qb.getMany();

    // Map to response format
    return records.map((record) => ({
      id: record.id,
      timestamp: record.timestamp,
      symbol: record.symbol,
      decision: record.decision,
      confidence: record.confidence,
      mliScore: record.mliScore,
      mliBreakdown: record.mliBreakdown || {},
      riskGatesApplied: this.normalizeRiskGates(record.riskGatesApplied),
      marketData: {
        price: record.marketData?.price || 0,
        vix: record.marketData?.vix || 0,
        volume: record.marketData?.volume || 0,
      },
      executionId: record.executionId,
      outcome: record.outcome,
      profitLoss: record.profitLoss,
      profitLossPercent: record.profitLossPercent,
      lessons: record.lessons,
      questionsForJay: this.extractQuestionsForJay(record),
    }));
  }

  /**
   * Get summary for a date range
   */
  async getSummary(
    query: AuditTrailQuery,
  ): Promise<Record<string, DecisionSummary>> {
    const decisions = await this.getDecisions(query);

    const summaryByDate: Record<string, DecisionSummary> = {};

    decisions.forEach((decision) => {
      const dateKey = decision.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!summaryByDate[dateKey]) {
        summaryByDate[dateKey] = {
          date: dateKey,
          counts: {
            ENTRAR: 0,
            ESPERAR: 0,
            NO_ENTRAR: 0,
            SALIR: 0,
            ERROR: 0,
          },
          results: {
            profitable: 0,
            loss: 0,
            pending: 0,
          },
        };
      }

      // Count by decision type
      summaryByDate[dateKey].counts[decision.decision] =
        (summaryByDate[dateKey].counts[decision.decision] || 0) + 1;

      // Count by outcome
      if (decision.outcome === 'PROFITABLE') {
        summaryByDate[dateKey].results.profitable++;
      } else if (decision.outcome === 'LOSS') {
        summaryByDate[dateKey].results.loss++;
      } else if (!decision.outcome) {
        summaryByDate[dateKey].results.pending++;
      }
    });

    return summaryByDate;
  }

  /**
   * Normalize risk gates to string array format
   * Handles both Record<string, any> and string[] formats
   */
  private normalizeRiskGates(
    riskGates: Record<string, any> | string[] | null,
  ): string[] {
    if (!riskGates) return [];
    if (Array.isArray(riskGates)) return riskGates;
    // If Record, extract keys as gate names
    return Object.keys(riskGates);
  }

  /**
   * Extract questions where Tito lacks evidence
   * Private: called automatically during mapping
   */
  private extractQuestionsForJay(record: DecisionAuditTrail): Array<{
    timestamp: Date;
    situation: string;
    missingInfo: string;
    question: string;
  }> {
    const questions: Array<{
      timestamp: Date;
      situation: string;
      missingInfo: string;
      question: string;
    }> = [];

    // If confidence is low + no execution, flag as question
    if (
      record.confidence < 60 &&
      !record.executionId &&
      record.decision === 'ESPERAR'
    ) {
      questions.push({
        timestamp: record.timestamp,
        situation: `${record.symbol} MLI=${record.mliScore}, confidence low (${record.confidence}%)`,
        missingInfo: 'Confirmation threshold for ESPERAR → ENTRAR',
        question:
          '¿Cuál es el umbral óptimo de confidence para pasar de ESPERAR a ENTRAR?',
      });
    }

    // If multiple risk gates failed, ask for refinement
    if (
      record.riskGatesApplied &&
      record.riskGatesApplied.some((g) => g.includes('FAIL'))
    ) {
      const failedGates = record.riskGatesApplied.filter((g) =>
        g.includes('FAIL'),
      );
      if (failedGates.length >= 2) {
        questions.push({
          timestamp: record.timestamp,
          situation: `Multiple risk gates failed: ${failedGates.join(', ')}`,
          missingInfo: 'Context-dependent thresholds',
          question:
            '¿Las reglas de Risk Gate deben ser adaptativas según el régimen de mercado?',
        });
      }
    }

    return questions;
  }

  /**
   * Validate query parameters (no side effects)
   */
  validateQuery(query: AuditTrailQuery): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (query.startDate > query.endDate) {
      errors.push('startDate must be before endDate');
    }

    const maxRangeDays = 90;
    const rangeDays = Math.floor(
      (query.endDate.getTime() - query.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (rangeDays > maxRangeDays) {
      errors.push(`Date range cannot exceed ${maxRangeDays} days`);
    }

    const validDecisions = ['ENTRAR', 'ESPERAR', 'NO_ENTRAR', 'SALIR', 'ERROR'];
    if (query.types) {
      const invalid = query.types.filter((t) => !validDecisions.includes(t));
      if (invalid.length > 0) {
        errors.push(`Invalid decision types: ${invalid.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
