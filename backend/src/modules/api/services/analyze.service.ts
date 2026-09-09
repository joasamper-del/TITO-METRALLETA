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
    entry: number | null;
    target: number | null;
    stop: number | null;
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
      analysis: report.analysis || {
        symbol: request.symbol,
        strategy: request.strategy,
        decision: 'esperar',
        confidence: 0,
        riskLevel: 'alto',
        manualReviewNeeded: true,
        manualReviewReasons: ['Información insuficiente de mercado'],
        mainReasons: ['Revisión manual requerida'],
        invalidationConditions: ['Datos incompletos'],
        totalScore: 0,
        maxScore: 100,
        percentageScore: 0,
        ruleEvaluations: [],
        timestamp: new Date(),
        marketData: {
          symbol: request.symbol,
          price: 0,
          volume: 0,
          liquidity: 0,
          trend: 'desconocido',
          rsi: null,
          gex: null,
          premiumDiscount: 'desconocido',
          support: null,
          resistance: null,
          timestamp: new Date(),
        },
        marketContext: {
          spy: {
            symbol: 'SPY',
            price: 0,
            volume: 0,
            liquidity: 0,
            trend: 'desconocido',
            rsi: null,
            gex: null,
            premiumDiscount: 'desconocido',
            support: null,
            resistance: null,
            timestamp: new Date(),
          },
          qqq: {
            symbol: 'QQQ',
            price: 0,
            volume: 0,
            liquidity: 0,
            trend: 'desconocido',
            rsi: null,
            gex: null,
            premiumDiscount: 'desconocido',
            support: null,
            resistance: null,
            timestamp: new Date(),
          },
          vix: {
            symbol: 'VIX',
            price: 0,
            volume: 0,
            liquidity: 0,
            trend: 'desconocido',
            rsi: null,
            gex: null,
            premiumDiscount: 'desconocido',
            support: null,
            resistance: null,
            timestamp: new Date(),
          },
          marketIsOpen: false,
          timeUntilClose: null,
        },
      },
      decision: report.state,
      confidence: report.confidence,
      risk: report.risk,
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
