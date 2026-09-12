import { Injectable } from '@nestjs/common';
import { Account, GateResult, Order, SeatbeltConfig } from '../seatbelt.types';

@Injectable()
export class Gate2RiskBoundaryService {
  /**
   * Gate 2: Risk Boundary
   * Validate that position respects risk limits:
   * - Position size <= maximum configured
   * - $ Risk = (qty × price × slippage) <= budget
   * - Drawdown accumulated <= threshold
   * - Account balance sufficient
   */
  async validate(order: Order, account: Account, config: SeatbeltConfig): Promise<GateResult> {
    // Validation 1: Position size
    const sizeCheck = this.validatePositionSize(order.qty, config);
    if (!sizeCheck.valid) {
      return { valid: false, reason: sizeCheck.reason, gate: 'gate2', timestamp: new Date() };
    }

    // Validation 2: Risk amount in dollars
    const riskCheck = this.validateRiskAmount(order, config);
    if (!riskCheck.valid) {
      return { valid: false, reason: riskCheck.reason, gate: 'gate2', timestamp: new Date() };
    }

    // Validation 3: Drawdown
    const drawdownCheck = this.validateDrawdown(account, config);
    if (!drawdownCheck.valid) {
      return { valid: false, reason: drawdownCheck.reason, gate: 'gate2', timestamp: new Date() };
    }

    // Validation 4: Balance
    const balanceCheck = this.validateBalance(order, account);
    if (!balanceCheck.valid) {
      return { valid: false, reason: balanceCheck.reason, gate: 'gate2', timestamp: new Date() };
    }

    return {
      valid: true,
      reason: 'Risk boundaries respected',
      gate: 'gate2',
      timestamp: new Date(),
    };
  }

  private validatePositionSize(
    qty: number,
    config: SeatbeltConfig,
  ): { valid: boolean; reason?: string } {
    if (qty > config.MAX_POSITION_SIZE_CRYPTO) {
      return {
        valid: false,
        reason: `Position size ${qty} > max ${config.MAX_POSITION_SIZE_CRYPTO}`,
      };
    }
    if (qty <= 0) {
      return {
        valid: false,
        reason: `Position size must be positive, got ${qty}`,
      };
    }
    return { valid: true };
  }

  private validateRiskAmount(
    order: Order,
    config: SeatbeltConfig,
  ): { valid: boolean; reason?: string } {
    const riskDollars = order.qty * order.price * 0.02; // 2% slippage assumption
    if (riskDollars > config.MAX_RISK_PER_TRADE) {
      return {
        valid: false,
        reason: `Risk $${riskDollars.toFixed(2)} > max $${config.MAX_RISK_PER_TRADE}`,
      };
    }
    return { valid: true };
  }

  private validateDrawdown(
    account: Account,
    config: SeatbeltConfig,
  ): { valid: boolean; reason?: string } {
    const drawdownPct = ((account.startBalance - account.balance) / account.startBalance) * 100;
    if (drawdownPct > config.MAX_DRAWDOWN_PCT) {
      return {
        valid: false,
        reason: `Drawdown ${drawdownPct.toFixed(2)}% > max ${config.MAX_DRAWDOWN_PCT}%`,
      };
    }
    return { valid: true };
  }

  private validateBalance(order: Order, account: Account): { valid: boolean; reason?: string } {
    const requiredBalance = order.qty * order.price * 1.1; // 10% buffer
    if (account.balance < requiredBalance) {
      return {
        valid: false,
        reason: `Insufficient balance: ${account.balance.toFixed(2)} < ${requiredBalance.toFixed(
          2,
        )} required`,
      };
    }
    return { valid: true };
  }
}
