import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity } from '../../database/entities';
import { TitoMetralletaAnalyzer } from '../../../../src/core/analyzer';

export interface AnalyzeRequestDto {
  symbol: string;
  strategy: string;
  plan: {
    entry: number;
    target: number;
    stop: number;
    notes?: string;
  };
}

export interface AnalyzeResponseDto {
  id: string;
  symbol: string;
  strategy: string;
  decision: string;
  confidence: number;
  risk: string;
  mainReasons: string[];
  invalidationConditions: string[];
  plan: {
    entry: number;
    target: number;
    stop: number;
  };
  createdAt: Date;
}

@Injectable()
export class AnalyzeService {
  constructor(
    @Inject('ANALYZER')
    private analyzer: TitoMetralletaAnalyzer,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
  ) {}

  async analyze(request: AnalyzeRequestDto): Promise<AnalyzeResponseDto> {
    const report = await this.analyzer.analyzeOpportunity(
      request.symbol,
      request.strategy,
      {
        entry: request.plan.entry,
        target: request.plan.target,
        stop: request.plan.stop,
        notes: request.plan.notes || '',
      },
    );

    if (!report) {
      throw new Error(`Failed to analyze ${request.symbol}`);
    }

    const opportunity = this.opportunityRepository.create({
      symbol: request.symbol,
      strategy: request.strategy,
      analysis: report.analysis,
      decision: report.decision,
      confidence: report.confidence,
      risk: report.riskLevel,
      entry: request.plan.entry,
      target: request.plan.target,
      stop: request.plan.stop,
      notes: request.plan.notes || '',
    });

    const saved = await this.opportunityRepository.save(opportunity);

    return {
      id: saved.id,
      symbol: saved.symbol,
      strategy: saved.strategy,
      decision: saved.decision,
      confidence: saved.confidence,
      risk: saved.risk,
      mainReasons: report.mainReasons || [],
      invalidationConditions: report.invalidationConditions || [],
      plan: {
        entry: saved.entry,
        target: saved.target,
        stop: saved.stop,
      },
      createdAt: saved.createdAt,
    };
  }
}
