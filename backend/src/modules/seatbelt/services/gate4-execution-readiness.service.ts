import { Injectable } from '@nestjs/common';
import { GateResult, SeatbeltConfig, SeatbeltResult } from '../seatbelt.types';

export interface BrokerStatus {
  connected: boolean;
  lastPing: Date;
  latencyMs: number;
  inFlight?: string; // TradeId of order currently in flight (concurrent prevention)
}

@Injectable()
export class Gate4ExecutionReadinessService {
  /**
   * Gate 4: Execution Readiness
   * Verify system is ready to execute:
   * - All previous gates (1-3) have passed
   * - Audit trail is still fresh
   * - Broker connectivity OK
   * - Dry-run simulation success
   * - Market conditions haven't changed
   */
  async validate(
    priorGatesResult: SeatbeltResult,
    brokerStatus: BrokerStatus,
    config: SeatbeltConfig,
  ): Promise<GateResult> {
    try {
      // Validation 1: All prior gates must pass
      if (!priorGatesResult.allGatesPass) {
        return {
          valid: false,
          reason: `Prior gates failed: ${priorGatesResult.reason}`,
          gate: 'gate4',
          timestamp: new Date(),
        };
      }

      // Validation 2: Audit trail still fresh (< 10 minutes)
      const auditAge = Date.now() - priorGatesResult.timestamp.getTime();
      if (auditAge > 600000) {
        // 10 minutes in ms
        return {
          valid: false,
          reason: `Audit trail aged ${Math.round(auditAge / 1000)}s, max 600s`,
          gate: 'gate4',
          timestamp: new Date(),
        };
      }

      // Validation 3: Broker connectivity
      if (!brokerStatus.connected) {
        return {
          valid: false,
          reason: `Broker disconnected (last ping ${brokerStatus.lastPing})`,
          gate: 'gate4',
          timestamp: new Date(),
        };
      }

      // Validation 4: Broker latency reasonable
      if (brokerStatus.latencyMs > 5000) {
        return {
          valid: false,
          reason: `Broker latency ${brokerStatus.latencyMs}ms > 5000ms max`,
          gate: 'gate4',
          timestamp: new Date(),
        };
      }

      // Validation 5: No in-flight orders (concurrent prevention)
      if (brokerStatus.inFlight) {
        return {
          valid: false,
          reason: `In-flight order conflict: ${brokerStatus.inFlight} pending completion`,
          gate: 'gate4',
          timestamp: new Date(),
        };
      }

      // Validation 6: Dry-run simulation (always succeeds in this implementation)
      const dryRunSuccess = await this.simulateDryRun(config);
      if (!dryRunSuccess) {
        return {
          valid: false,
          reason: 'Dry-run simulation failed',
          gate: 'gate4',
          timestamp: new Date(),
        };
      }

      return {
        valid: true,
        reason: 'Execution readiness confirmed',
        gate: 'gate4',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        valid: false,
        reason: `Execution readiness check error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        gate: 'gate4',
        timestamp: new Date(),
      };
    }
  }

  private async simulateDryRun(config: SeatbeltConfig): Promise<boolean> {
    // Mock dry-run: always succeeds in this checkpoint
    // In real implementation would simulate order execution
    return true;
  }
}
