/**
 * Order Validator - Prevención de 422 errors
 *
 * Valida payload antes de enviar a Alpaca.
 * Detecta bugs en construcción de órdenes:
 * - OCO con market orders (rechazado 422)
 * - SL/TP invertidos para BUY/SELL
 * - Campos obligatorios faltantes
 */

import { Logger } from '@nestjs/common';

export interface OrderPayload {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  limit_price?: number;
  stop_price?: number;
  take_profit?: any;
  stop_loss?: any;
  time_in_force?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class OrderValidator {
  private readonly logger = new Logger(OrderValidator.name);

  /**
   * Validar orden antes de enviar
   */
  validate(order: OrderPayload): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ========== VALIDACIONES BÁSICAS ==========

    if (!order.symbol || order.symbol.length === 0) {
      errors.push('symbol is required');
    }

    if (order.qty <= 0) {
      errors.push('qty must be > 0');
    }

    if (!['buy', 'sell'].includes(order.side)) {
      errors.push('side must be buy or sell');
    }

    if (!['market', 'limit'].includes(order.type)) {
      errors.push('type must be market or limit');
    }

    // ========== VALIDACIONES OCO ==========

    if (order.take_profit || order.stop_loss) {
      // OCO requiere limit order
      if (order.type !== 'limit') {
        errors.push('OCO orders must use type=limit (not market)');
      }

      const entryPrice = order.limit_price || 0;

      // Validar STOP_LOSS si está presente
      if (order.stop_loss) {
        const slPrice = order.stop_loss.stop_price;

        if (order.side === 'buy') {
          if (slPrice >= entryPrice) {
            errors.push(
              `For BUY orders: stop_loss (${slPrice}) must be < limit_price (${entryPrice})`
            );
          }
        } else if (order.side === 'sell') {
          if (slPrice <= entryPrice) {
            errors.push(
              `For SELL orders: stop_loss (${slPrice}) must be > limit_price (${entryPrice})`
            );
          }
        }
      }

      // Validar TAKE_PROFIT si está presente
      if (order.take_profit) {
        const tpPrice = order.take_profit.limit_price;

        if (order.side === 'buy') {
          if (tpPrice <= entryPrice) {
            errors.push(
              `For BUY orders: take_profit (${tpPrice}) must be > limit_price (${entryPrice})`
            );
          }
        } else if (order.side === 'sell') {
          if (tpPrice >= entryPrice) {
            errors.push(
              `For SELL orders: take_profit (${tpPrice}) must be < limit_price (${entryPrice})`
            );
          }
        }
      }

      // Validar relación SL/TP si AMBOS están presentes
      if (order.stop_loss && order.take_profit) {
        const slPrice = order.stop_loss.stop_price;
        const tpPrice = order.take_profit.limit_price;

        if (order.side === 'buy') {
          if (slPrice >= tpPrice) {
            errors.push(
              `For BUY orders: stop_loss (${slPrice}) must be < take_profit (${tpPrice})`
            );
          }
        } else if (order.side === 'sell') {
          if (tpPrice >= slPrice) {
            errors.push(
              `For SELL orders: take_profit (${tpPrice}) must be < stop_loss (${slPrice})`
            );
          }
        }
      }
    }

    // ========== WARNINGS ==========

    if (order.type === 'limit' && !order.limit_price) {
      warnings.push('limit order without limit_price will be rejected');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
