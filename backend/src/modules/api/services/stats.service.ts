import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradeResult, Opportunity } from '../../database/entities';

export interface StatsResponseDto {
  totalAnalyzed: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPointsPerWin: number;
  avgPointsPerLoss: number;
  ruleEffectiveness: Record<string, any>;
  lastUpdated: Date;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(TradeResult)
    private tradeResultRepository: Repository<TradeResult>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
  ) {}

  async calculateStats(): Promise<StatsResponseDto> {
    const allOpportunities = await this.opportunityRepository.find();
    const allResults = await this.tradeResultRepository.find({
      relations: ['opportunity'],
    });

    const totalAnalyzed = allOpportunities.length;
    const wins = allResults.filter((r) => r.result === 'ganancia').length;
    const losses = allResults.filter((r) => r.result === 'pérdida').length;

    const winRate =
      allResults.length > 0 ? (wins / allResults.length) * 100 : 0;

    const winPoints = allResults
      .filter((r) => r.result === 'ganancia')
      .reduce((acc, r) => acc + r.points, 0);
    const lossPoints = allResults
      .filter((r) => r.result === 'pérdida')
      .reduce((acc, r) => acc + r.points, 0);

    const avgPointsPerWin = wins > 0 ? winPoints / wins : 0;
    const avgPointsPerLoss = losses > 0 ? lossPoints / losses : 0;

    const ruleEffectiveness = this.calculateRuleEffectiveness(allOpportunities);

    return {
      totalAnalyzed,
      wins,
      losses,
      winRate: parseFloat(winRate.toFixed(1)),
      avgPointsPerWin: parseFloat(avgPointsPerWin.toFixed(2)),
      avgPointsPerLoss: parseFloat(avgPointsPerLoss.toFixed(2)),
      ruleEffectiveness,
      lastUpdated: new Date(),
    };
  }

  private calculateRuleEffectiveness(
    opportunities: Opportunity[],
  ): Record<string, any> {
    const ruleStats: Record<string, any> = {};

    opportunities.forEach((opp) => {
      const analysis = opp.analysis || {};
      const rules = analysis.rules || [];

      rules.forEach((rule: any) => {
        if (!ruleStats[rule.id]) {
          ruleStats[rule.id] = {
            name: rule.name,
            occurrences: 0,
            successes: 0,
            effectiveness: 0,
          };
        }
        ruleStats[rule.id].occurrences++;

        if (opp.decision === 'operar') {
          ruleStats[rule.id].successes++;
        }
      });
    });

    Object.keys(ruleStats).forEach((ruleId) => {
      const stat = ruleStats[ruleId];
      stat.effectiveness =
        stat.occurrences > 0
          ? parseFloat(
              ((stat.successes / stat.occurrences) * 100).toFixed(1),
            )
          : 0;
    });

    return ruleStats;
  }
}
