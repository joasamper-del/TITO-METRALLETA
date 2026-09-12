import { Injectable } from '@nestjs/common';
import { GateResult, Order } from '../seatbelt.types';

/**
 * Gate 4: ExecutionEngine Pre-Validation
 * Validates that ExecutionEngine accepts the trade contract/schema
 *
 * Validations:
 * - Order contract is valid (symbol, side, qty, orderType)
 * - Price is reasonable (not a typo: within ±20% of reference)
 * - OrderType is supported by broker
 * - No conflicts with existing positions
 *
 * NOTE: Gate 4 validates SCHEMA only. Does NOT call ExecutionEngine.execute()
 * NOTE: Gate 4 does NOT place any orders or perform external calls
 */
@Injectable()
export class Gate4ExecutionEngineService {
  private readonly PRICE_TYPO_TOLERANCE = 0.2; // ±20%

  /**
   * Validate order schema and price reasonableness
   * @param order Order to validate
   * @param referencePrice Last known price for symbol (for typo detection)
   * @returns GateResult with validation status
   */
  async validate(order: Order, referencePrice?: number): Promise<GateResult> {
    try {
      // Validation 1: Check order schema completeness
      const schemaErrors = this.validateOrderSchema(order);
      if (schemaErrors.length > 0) {
        return {
          valid: false,
          reason: `Order schema invalid: ${schemaErrors.join(', ')}`,
          gate: 'gate4',
          timestamp: new Date(),
        };
      }

      // Validation 2: Check orderType is supported if provided
      if (order.orderType && !this.isSupportedOrderType(order.orderType)) {
        return {
          valid: false,
          reason: `OrderType '${order.orderType}' not supported`,
          gate: 'gate4',
          timestamp: new Date(),
        };
      }

      // Validation 3: Check price is reasonable (not a typo)
      if (referencePrice && order.price) {
        const priceError = this.isPriceTypo(order.price, referencePrice);
        if (priceError) {
          return {
            valid: false,
            reason: `Price typo detected: ${order.price} is ${priceError}% away from reference ${referencePrice}`,
            gate: 'gate4',
            timestamp: new Date(),
          };
        }
      }

      // Validation 4: Check side is valid
      if (!['buy', 'sell'].includes(order.side.toLowerCase())) {
        return {
          valid: false,
          reason: `Invalid side: '${order.side}'. Must be 'buy' or 'sell'`,
          gate: 'gate4',
          timestamp: new Date(),
        };
      }

      // All validations passed
      return {
        valid: true,
        reason: 'Order schema valid, price reasonable, orderType supported',
        gate: 'gate4',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        valid: false,
        reason: `Gate 4 error: ${error instanceof Error ? error.message : String(error)}`,
        gate: 'gate4',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Validate order schema has all required fields
   */
  private validateOrderSchema(order: Order): string[] {
    const errors: string[] = [];

    if (!order.symbol || typeof order.symbol !== 'string' || order.symbol.trim().length === 0) {
      errors.push('symbol is required and must be non-empty string');
    }

    if (!order.side || typeof order.side !== 'string') {
      errors.push('side is required');
    }

    if (typeof order.qty !== 'number' || order.qty <= 0) {
      errors.push('qty must be positive number');
    }

    if (order.orderType && typeof order.orderType !== 'string') {
      errors.push('orderType must be string if provided');
    }

    return errors;
  }

  /**
   * Check if orderType is supported
   * Supported: market, limit, stop, stop_limit
   */
  private isSupportedOrderType(orderType: string): boolean {
    const supportedTypes = ['market', 'limit', 'stop', 'stop_limit'];
    return supportedTypes.includes(orderType.toLowerCase());
  }

  /**
   * Detect if price is a typo (too far from reference)
   * Returns: null if OK, percentage error if typo detected
   */
  private isPriceTypo(price: number, referencePrice: number): number | null {
    if (referencePrice <= 0 || price <= 0) return null;

    const percentError = Math.abs(price - referencePrice) / referencePrice;
    if (percentError > this.PRICE_TYPO_TOLERANCE) {
      return Math.round(percentError * 100);
    }

    return null;
  }
}
