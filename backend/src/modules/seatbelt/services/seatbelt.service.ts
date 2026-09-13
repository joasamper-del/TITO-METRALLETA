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
import { DecisionAuditService } from '../../api/services/decision-audit.service';
import { PreExecutionEvidenceService } from '../../database/services/pre-execution-evidence.service';
import { PreExecutionEvidence } from '../../database/entities/pre-execution-evidence.entity';

@Injectable()
export class SeatbeltService {
  constructor(
    private gate1: Gate1MarketHealthService,
    private gate2: Gate2RiskBoundaryService,
    private gate3: Gate3DecisionAuditService,
    private decisionAudit: DecisionAuditService,
    private preExecutionEvidence: PreExecutionEvidenceService,
    @Optional() private gate4?: Gate4ExecutionEngineService,
    @Optional() private gate5?: Gate5BrokerConnectivityService,
  ) {}

  /**
   * CHECKPOINT 1: Validate Gates 1-3 only + Record Pre-Execution Evidence (TASK 4)
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

    // TASK 3 (OPTION B): Record decision in audit trail BEFORE validating gates
    // Ensures complete traceability: decision → execution → result
    const decisionRecord = await this.decisionAudit.recordDecision({
      symbol: order.symbol,
      decision: 'SEATBELT_CHECKPOINT1_INITIATED',
      timestamp: new Date(),
      marketData: { currentPrice: currentMarket.price, vix: currentMarket.vix },
      filtersApplied: { gates: ['gate1', 'gate2', 'gate3'] },
      notes: `SEATBELT checkpoint 1 validation for trade ${tradeId}`,
    });

    if (!decisionRecord || !decisionRecord.id) {
      return {
        allGatesPass: false,
        gates: [],
        reason: 'Failed to record decision in audit trail - traceability broken',
        timestamp: new Date(),
      };
    }

    // Initialize evidence record (TASK 4)
    let evidence = new PreExecutionEvidence();
    evidence.trade_id = tradeId;
    evidence.all_gates_pass = false;
    evidence.valid_until = new Date(Date.now() + 5 * 60 * 1000);

    try {
      // Gate 1: Market Health
      const gate1Result = await this.gate1.validate(order.symbol);
      gates.push(gate1Result);
      evidence.gate1_result = gate1Result;

      // TASK 4: Record evidence for Gate1
      try {
        await this.preExecutionEvidence.recordEvidence(evidence);
      } catch (error) {
        return {
          allGatesPass: false,
          gates,
          reason: `Cannot record pre-execution evidence for gate1 - ${error.message}`,
          timestamp: new Date(),
        };
      }

      // Early exit if market is unhealthy
      if (!gate1Result.valid) {
        evidence.all_gates_pass = false;
        await this.preExecutionEvidence.recordEvidence(evidence);
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
      evidence.gate2_result = gate2Result;

      // TASK 4: Record evidence for Gate2
      try {
        await this.preExecutionEvidence.recordEvidence(evidence);
      } catch (error) {
        return {
          allGatesPass: false,
          gates,
          reason: `Cannot record pre-execution evidence for gate2 - ${error.message}`,
          timestamp: new Date(),
        };
      }

      // Early exit if risk boundary violated
      if (!gate2Result.valid) {
        evidence.all_gates_pass = false;
        await this.preExecutionEvidence.recordEvidence(evidence);
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
      evidence.gate3_result = gate3Result;

      // TASK 4: Record evidence for Gate3
      try {
        await this.preExecutionEvidence.recordEvidence(evidence);
      } catch (error) {
        return {
          allGatesPass: false,
          gates,
          reason: `Cannot record pre-execution evidence for gate3 - ${error.message}`,
          timestamp: new Date(),
        };
      }

      // Early exit if gate3 failed
      if (!gate3Result.valid) {
        evidence.all_gates_pass = false;
        await this.preExecutionEvidence.recordEvidence(evidence);
        return {
          allGatesPass: false,
          gates,
          reason: `Gates failed: gate3`,
          timestamp: new Date(),
        };
      }

      // TASK 4: Mark all gates passed and persist final evidence
      evidence.all_gates_pass = true;
      try {
        await this.preExecutionEvidence.recordEvidence(evidence);
      } catch (error) {
        return {
          allGatesPass: false,
          gates,
          reason: `Cannot record final pre-execution evidence - ${error.message}`,
          timestamp: new Date(),
        };
      }

      // TASK 4: Validate integrity before returning
      const existingEvidence = await this.preExecutionEvidence.findByTradeId(tradeId);
      if (!existingEvidence || !this.preExecutionEvidence.validateIntegrityBeforeUse(existingEvidence)) {
        return {
          allGatesPass: false,
          gates,
          reason: 'Pre-execution evidence validation failed - missing or incomplete',
          timestamp: new Date(),
        };
      }

      // Final result
      const allPass = gates.every((g) => g.valid);
      const failedGates = gates.filter((g) => !g.valid).map((g) => g.gate);

      return {
        allGatesPass: allPass,
        gates,
        reason: allPass ? 'All gates pass' : `Gates failed: ${failedGates.join(', ')}`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        allGatesPass: false,
        gates,
        reason: `Unexpected error during SEATBELT validation - ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * FULL VALIDATION: Validate Gates 1-5 + Record Pre-Execution Evidence (TASK 4)
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

    // TASK 3 (OPTION B): Record decision in audit trail BEFORE validating gates
    // Ensures complete traceability: decision → execution → result
    const decisionRecord = await this.decisionAudit.recordDecision({
      symbol: order.symbol,
      decision: 'SEATBELT_FULL_INITIATED',
      timestamp: new Date(),
      marketData: { currentPrice: currentMarket.price, vix: currentMarket.vix },
      filtersApplied: { gates: ['gate1', 'gate2', 'gate3', 'gate4', 'gate5'] },
      notes: `SEATBELT full validation for trade ${tradeId}`,
    });

    if (!decisionRecord || !decisionRecord.id) {
      return {
        allGatesPass: false,
        gates: [],
        reason: 'Failed to record decision in audit trail - traceability broken',
        timestamp: new Date(),
      };
    }

    // Initialize evidence record (TASK 4)
    let evidence = new PreExecutionEvidence();
    evidence.trade_id = tradeId;
    evidence.all_gates_pass = false;
    evidence.valid_until = new Date(Date.now() + 5 * 60 * 1000);

    try {
      // Gate 1: Market Health
      const gate1Result = await this.gate1.validate(order.symbol);
      gates.push(gate1Result);
      evidence.gate1_result = gate1Result;

      // TASK 4: Record evidence for Gate1
      try {
        await this.preExecutionEvidence.recordEvidence(evidence);
      } catch (error) {
        return {
          allGatesPass: false,
          gates,
          reason: `Cannot record pre-execution evidence for gate1 - ${error.message}`,
          timestamp: new Date(),
        };
      }

      if (!gate1Result.valid) {
        evidence.all_gates_pass = false;
        await this.preExecutionEvidence.recordEvidence(evidence);
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
      evidence.gate2_result = gate2Result;

      // TASK 4: Record evidence for Gate2
      try {
        await this.preExecutionEvidence.recordEvidence(evidence);
      } catch (error) {
        return {
          allGatesPass: false,
          gates,
          reason: `Cannot record pre-execution evidence for gate2 - ${error.message}`,
          timestamp: new Date(),
        };
      }

      if (!gate2Result.valid) {
        evidence.all_gates_pass = false;
        await this.preExecutionEvidence.recordEvidence(evidence);
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
      evidence.gate3_result = gate3Result;

      // TASK 4: Record evidence for Gate3
      try {
        await this.preExecutionEvidence.recordEvidence(evidence);
      } catch (error) {
        return {
          allGatesPass: false,
          gates,
          reason: `Cannot record pre-execution evidence for gate3 - ${error.message}`,
          timestamp: new Date(),
        };
      }

      if (!gate3Result.valid) {
        evidence.all_gates_pass = false;
        await this.preExecutionEvidence.recordEvidence(evidence);
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
        evidence.gate4_result = gate4Result;

        // TASK 4: Record evidence for Gate4
        try {
          await this.preExecutionEvidence.recordEvidence(evidence);
        } catch (error) {
          return {
            allGatesPass: false,
            gates,
            reason: `Cannot record pre-execution evidence for gate4 - ${error.message}`,
            timestamp: new Date(),
          };
        }

        if (!gate4Result.valid) {
          evidence.all_gates_pass = false;
          await this.preExecutionEvidence.recordEvidence(evidence);
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
        evidence.gate5_result = gate5Result;

        // TASK 4: Record evidence for Gate5
        try {
          await this.preExecutionEvidence.recordEvidence(evidence);
        } catch (error) {
          return {
            allGatesPass: false,
            gates,
            reason: `Cannot record pre-execution evidence for gate5 - ${error.message}`,
            timestamp: new Date(),
          };
        }

        if (!gate5Result.valid) {
          evidence.all_gates_pass = false;
          await this.preExecutionEvidence.recordEvidence(evidence);
          return {
            allGatesPass: false,
            gates,
            reason: `Gates failed: gate5`,
            timestamp: new Date(),
          };
        }
      }

      // TASK 4: Mark all gates passed
      evidence.all_gates_pass = gates.every((g) => g.valid);
      try {
        await this.preExecutionEvidence.recordEvidence(evidence);
      } catch (error) {
        return {
          allGatesPass: false,
          gates,
          reason: `Cannot record final pre-execution evidence - ${error.message}`,
          timestamp: new Date(),
        };
      }

      // TASK 4: Validate integrity before returning
      const existingEvidence = await this.preExecutionEvidence.findByTradeId(tradeId);
      if (!existingEvidence || !this.preExecutionEvidence.validateIntegrityBeforeUse(existingEvidence)) {
        return {
          allGatesPass: false,
          gates,
          reason: 'Pre-execution evidence validation failed - missing or incomplete',
          timestamp: new Date(),
        };
      }

      // All gates passed
      return {
        allGatesPass: true,
        gates,
        reason: `All gates pass (${gates.length}/5)`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        allGatesPass: false,
        gates,
        reason: `Unexpected error during SEATBELT validation - ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check if SEATBELT is enabled globally
   */
  isSeatbeltEnabled(config: SeatbeltConfig): boolean {
    return config.ENABLED;
  }
}
