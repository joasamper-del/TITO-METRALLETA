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
import { Gate4ExecutionReadinessService, BrokerStatus } from './gate4-execution-readiness.service';
import {
  Gate5PostTradeValidationService,
  TradeExecution,
} from './gate5-post-trade-validation.service';

@Injectable()
export class SeatbeltService {
  constructor(
    private gate1: Gate1MarketHealthService,
    private gate2: Gate2RiskBoundaryService,
    private gate3: Gate3DecisionAuditService,
    private gate4: Gate4ExecutionReadinessService,
    private gate5: Gate5PostTradeValidationService,
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
   * CHECKPOINT 2: Validate Gates 4-5 (execution readiness and broker connectivity)
   */
  async validateCheckpoint2(
    priorGatesResult: SeatbeltResult,
    brokerStatus: BrokerStatus,
    execution: TradeExecution,
    config: SeatbeltConfig,
  ): Promise<SeatbeltResult> {
    const gates: GateResult[] = [];

    // Gate 4: Execution Readiness
    const gate4Result = await this.gate4.validate(priorGatesResult, brokerStatus, config);
    gates.push(gate4Result);

    // Early exit if execution readiness fails
    if (!gate4Result.valid) {
      return {
        allGatesPass: false,
        gates,
        reason: `Gates failed: gate4`,
        timestamp: new Date(),
      };
    }

    // Gate 5: Broker Connectivity / Post-Trade Validation
    const gate5Result = await this.gate5.validate(execution);
    gates.push(gate5Result);

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
   * FULL VALIDATION: Run all 5 gates (CP1 + CP2)
   */
  async validateFull(
    order: Order,
    account: Account,
    currentMarket: MarketState,
    config: SeatbeltConfig,
    tradeId: string,
    brokerStatus: BrokerStatus,
    execution: TradeExecution,
  ): Promise<SeatbeltResult> {
    // Run CP1 (Gates 1-3)
    const cp1Result = await this.validateCheckpoint1(
      order,
      account,
      currentMarket,
      config,
      tradeId,
    );

    if (!cp1Result.allGatesPass) {
      return cp1Result;
    }

    // Run CP2 (Gates 4-5)
    const cp2Result = await this.validateCheckpoint2(cp1Result, brokerStatus, execution, config);

    // Merge all gates
    return {
      allGatesPass: cp2Result.allGatesPass,
      gates: [...cp1Result.gates, ...cp2Result.gates],
      reason: cp2Result.reason,
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
