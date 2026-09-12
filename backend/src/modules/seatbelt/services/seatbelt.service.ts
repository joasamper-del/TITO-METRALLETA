import { Injectable } from '@nestjs/common';
import {
  Account,
  GateResult,
  MarketState,
  Order,
  SeatbeltConfig,
  SeatbeltResult,
} from '../seatbelt.types';
import { Gate1MarketHealthService } from './gate1-market-health.service';
import { Gate2RiskBoundaryService } from './gate2-risk-boundary.service';
import { Gate3DecisionAuditService } from './gate3-decision-audit.service';

@Injectable()
export class SeatbeltService {
  constructor(
    private gate1: Gate1MarketHealthService,
    private gate2: Gate2RiskBoundaryService,
    private gate3: Gate3DecisionAuditService,
  ) {}

  /**
   * CHECKPOINT 1: Validate Gates 1-3 only
   * Gates 4-5 will be implemented in subsequent checkpoints
   */
  async validateCheckpoint1(
    order: Order,
    account: Account,
    currentMarket: MarketState,
    config: SeatbeltConfig,
    tradeId: string,
  ): Promise<SeatbeltResult> {
    const gates: GateResult[] = [];

    // Gate 1: Market Health
    const gate1Result = await this.gate1.validate(order.symbol);
    gates.push(gate1Result);

    // Early exit if market is unhealthy
    if (!gate1Result.valid) {
      return {
        allGatesPass: false,
        gates,
        reason: `Gates failed: gate1`,
        timestamp: new Date(),
      };
    }

    // Gate 2: Risk Boundary
    const gate2Result = await this.gate2.validate(order, account, config);
    gates.push(gate2Result);

    // Early exit if risk boundary violated
    if (!gate2Result.valid) {
      return {
        allGatesPass: false,
        gates,
        reason: `Gates failed: gate2`,
        timestamp: new Date(),
      };
    }

    // Gate 3: Decision Audit
    const gate3Result = await this.gate3.validate(order, tradeId, currentMarket);
    gates.push(gate3Result);

    // Final result
    const allPass = gates.every((g) => g.valid);
    const failedGates = gates.filter((g) => !g.valid).map((g) => g.gate);

    return {
      allGatesPass: allPass,
      gates,
      reason: allPass ? 'All gates pass' : `Gates failed: ${failedGates.join(', ')}`,
      timestamp: new Date(),
    };
  }

  /**
   * Check if SEATBELT is enabled globally
   */
  isSeatbeltEnabled(config: SeatbeltConfig): boolean {
    return config.ENABLED;
  }
}
