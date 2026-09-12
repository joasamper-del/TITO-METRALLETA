import { Injectable, Optional } from '@nestjs/common';
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
import { Gate4ExecutionEngineService } from './gate4-execution-engine.service';
import { Gate5BrokerConnectivityService } from './gate5-broker-connectivity.service';

@Injectable()
export class SeatbeltService {
  constructor(
    private gate1: Gate1MarketHealthService,
    private gate2: Gate2RiskBoundaryService,
    private gate3: Gate3DecisionAuditService,
    @Optional() private gate4?: Gate4ExecutionEngineService,
    @Optional() private gate5?: Gate5BrokerConnectivityService,
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
   * FULL VALIDATION: Validate Gates 1-5
   * All gates must pass (AND logic) for trade to be authorized
   */
  async validateFull(
    order: Order,
    account: Account,
    currentMarket: MarketState,
    config: SeatbeltConfig,
    tradeId: string,
    referencePrice?: number,
  ): Promise<SeatbeltResult> {
    const gates: GateResult[] = [];

    // Gate 1: Market Health
    const gate1Result = await this.gate1.validate(order.symbol);
    gates.push(gate1Result);

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

    if (!gate3Result.valid) {
      return {
        allGatesPass: false,
        gates,
        reason: `Gates failed: gate3`,
        timestamp: new Date(),
      };
    }

    // Gate 4: ExecutionEngine Pre-Validation (optional if not injected)
    if (this.gate4) {
      const gate4Result = await this.gate4.validate(order, referencePrice);
      gates.push(gate4Result);

      if (!gate4Result.valid) {
        return {
          allGatesPass: false,
          gates,
          reason: `Gates failed: gate4`,
          timestamp: new Date(),
        };
      }
    }

    // Gate 5: Broker Connectivity (optional if not injected)
    if (this.gate5) {
      const gate5Result = await this.gate5.validate(order.symbol, order.orderType);
      gates.push(gate5Result);

      if (!gate5Result.valid) {
        return {
          allGatesPass: false,
          gates,
          reason: `Gates failed: gate5`,
          timestamp: new Date(),
        };
      }
    }

    // All gates passed
    return {
      allGatesPass: true,
      gates,
      reason: `All gates pass (${gates.length}/5)`,
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
