import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradeResult, Opportunity } from '../../database/entities';

export interface RecordResultDto {
  opportunityId: string;
  result: string;
  points: number;
  successReasons?: string[];
  failureReasons?: string[];
  lessons?: string[];
}

export interface ResultResponseDto {
  id: string;
  opportunityId: string;
  result: string;
  points: number;
  recordedAt: Date;
}

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(TradeResult)
    private tradeResultRepository: Repository<TradeResult>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
  ) {}

  async recordResult(request: RecordResultDto): Promise<ResultResponseDto> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: request.opportunityId },
    });

    if (!opportunity) {
      throw new Error(`Opportunity ${request.opportunityId} not found`);
    }

    const tradeResult = this.tradeResultRepository.create({
      opportunity,
      result: request.result,
      points: request.points,
      successReasons: request.successReasons || [],
      failureReasons: request.failureReasons || [],
      lessons: request.lessons || [],
    });

    const saved = await this.tradeResultRepository.save(tradeResult);

    return {
      id: saved.id,
      opportunityId: saved.opportunity.id,
      result: saved.result,
      points: saved.points,
      recordedAt: saved.recordedAt,
    };
  }

  async getResults(opportunityId?: string): Promise<TradeResult[]> {
    if (opportunityId) {
      return this.tradeResultRepository.find({
        where: { opportunity: { id: opportunityId } },
      });
    }
    return this.tradeResultRepository.find();
  }
}
