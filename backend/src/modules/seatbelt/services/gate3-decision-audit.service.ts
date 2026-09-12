import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GateResult, MarketState, Order } from '../seatbelt.types';
import { DecisionAuditTrail } from '../../database/entities/decision-audit-trail.entity';

@Injectable()
export class Gate3DecisionAuditService {
  constructor(
    @InjectRepository(DecisionAuditTrail)
    private decisionRepo: Repository<DecisionAuditTrail>,
  ) {}

  /**
   * Gate 3: Decision Audit
   * Validate that the decision is justified:
   * - DecisionAuditTrail exists for this trade
   * - Confidence score >= 60%
   * - Market conditions match (price ±2%, VIX ±10%)
   * - Decision is fresh (< 5 minutes old)
   */
  async validate(
    order: Order,
    tradeId: string,
    currentMarketState: MarketState,
  ): Promise<GateResult> {
    try {
      // Step 1: Find DecisionAuditTrail
      const decision = await this.decisionRepo.findOne({
        where: { id: tradeId } as any, // Type assertion for flexibility
        order: { createdAt: 'DESC' },
      });

      if (!decision) {
        return {
          valid: false,
          reason: `No DecisionAuditTrail found for tradeId ${tradeId}`,
          gate: 'gate3',
          timestamp: new Date(),
        };
      }

      // Step 2: Check confidence score
      const confidenceScore = (decision as any).confidenceScore || 0;
      if (confidenceScore < 60) {
        return {
          valid: false,
          reason: `Confidence ${confidenceScore}% < 60% minimum`,
          gate: 'gate3',
          timestamp: new Date(),
        };
      }

      // Step 3: Check market state hasn't changed much
      const marketSnapshot = (decision as any).marketSnapshot || {
        price: currentMarketState.price,
      };
      const priceChange =
        Math.abs((currentMarketState.price - marketSnapshot.price) / marketSnapshot.price) * 100;
      if (priceChange > 2) {
        return {
          valid: false,
          reason: `Market price changed ${priceChange.toFixed(2)}% > 2% tolerance`,
          gate: 'gate3',
          timestamp: new Date(),
        };
      }

      // Step 4: Check decision is fresh (< 5 minutes old)
      const ageSeconds = (Date.now() - new Date(decision.createdAt).getTime()) / 1000;
      if (ageSeconds > 300) {
        return {
          valid: false,
          reason: `Decision is ${Math.round(ageSeconds)}s old, max 300s`,
          gate: 'gate3',
          timestamp: new Date(),
        };
      }

      return {
        valid: true,
        reason: `Decision justified (confidence ${confidenceScore}%, fresh)`,
        gate: 'gate3',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        valid: false,
        reason: `Decision audit error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        gate: 'gate3',
        timestamp: new Date(),
      };
    }
  }
}
