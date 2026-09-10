/**
 * OrderValidator Test Suite
 * 4 Test Suites con 15 casos de prueba total
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OrderValidator, OrderPayload } from './orderValidator';

describe('OrderValidator', () => {
  let validator: OrderValidator;

  beforeEach(() => {
    validator = new OrderValidator();
  });

  // ========== TEST SUITE 1: OCO Validation ==========
  describe('TEST SUITE 1: OCO Validation', () => {
    it('TEST 1.1: OCO con market order → invalid', () => {
      // SETUP
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',  // ← BUG
        stop_loss: { stop_price: 100 },
        take_profit: { limit_price: 110 },
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OCO orders must use type=limit (not market)');
    });

    it('TEST 1.2: OCO con limit order válido', () => {
      // SETUP
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'limit',
        limit_price: 105,
        stop_loss: { stop_price: 100 },
        take_profit: { limit_price: 110 },
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ========== TEST SUITE 2: BUY Order Validation ==========
  describe('TEST SUITE 2: BUY Order Validation', () => {
    it('TEST 2.1: BUY con SL < entry < TP → válido', () => {
      // SETUP
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'limit',
        limit_price: 105,
        stop_loss: { stop_price: 100 },
        take_profit: { limit_price: 110 },
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('TEST 2.2: BUY con SL >= entry → invalid', () => {
      // SETUP
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'limit',
        limit_price: 105,
        stop_loss: { stop_price: 110 },  // ← >= entry
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('stop_loss') && e.includes('must be <'))).toBe(true);
    });

    it('TEST 2.3: BUY con TP <= entry → invalid', () => {
      // SETUP
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'limit',
        limit_price: 105,
        take_profit: { limit_price: 100 },  // ← <= entry
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('take_profit') && e.includes('must be >'))).toBe(true);
    });
  });

  // ========== TEST SUITE 3: SELL Order Validation ==========
  describe('TEST SUITE 3: SELL Order Validation', () => {
    it('TEST 3.1: SELL con TP < entry < SL → válido', () => {
      // SETUP
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'sell',
        type: 'limit',
        limit_price: 105,
        take_profit: { limit_price: 100 },
        stop_loss: { stop_price: 110 },
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('TEST 3.2: SELL con TP >= entry → invalid', () => {
      // SETUP
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'sell',
        type: 'limit',
        limit_price: 105,
        take_profit: { limit_price: 110 },  // ← >= entry
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('take_profit') && e.includes('must be <'))).toBe(true);
    });

    it('TEST 3.3: SELL con SL <= entry → invalid', () => {
      // SETUP
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'sell',
        type: 'limit',
        limit_price: 105,
        stop_loss: { stop_price: 100 },  // ← <= entry
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('stop_loss') && e.includes('must be >'))).toBe(true);
    });
  });

  // ========== TEST SUITE 4: Required Fields ==========
  describe('TEST SUITE 4: Required Fields', () => {
    it('TEST 4.1: symbol vacío → invalid', () => {
      // SETUP
      const order: OrderPayload = {
        symbol: '',
        qty: 1,
        side: 'buy',
        type: 'market',
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('symbol is required');
    });

    it('TEST 4.2: qty <= 0 → invalid', () => {
      // SETUP
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 0,
        side: 'buy',
        type: 'market',
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('qty must be > 0');
    });

    it('TEST 4.3: side inválido → invalid', () => {
      // SETUP
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'buy_call' as any,  // ← Inválido
        type: 'market',
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('side must be buy or sell');
    });

    it('TEST 4.4: type inválido → invalid', () => {
      // SETUP
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'stop' as any,  // ← Inválido
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('type must be market or limit');
    });

    it('TEST 4.5: limit order sin limit_price → warning', () => {
      // SETUP
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'limit',
        // NO limit_price
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.warnings.some(w => w.includes('limit_price'))).toBe(true);
    });
  });

  // ========== TEST SUITE 5: Complex Scenarios ==========
  describe('TEST SUITE 5: Complex Scenarios', () => {
    it('TEST 5.1: Multiple SL/TP errors → todos reportados', () => {
      // SETUP: BUY con SL > TP y TP < entry
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'limit',
        limit_price: 105,
        stop_loss: { stop_price: 110 },  // > entry
        take_profit: { limit_price: 100 },  // < entry
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);  // Múltiples errores
    });

    it('TEST 5.2: Valid market order sin OCO', () => {
      // SETUP
      const order: OrderPayload = {
        symbol: 'SPY',
        qty: 1,
        side: 'buy',
        type: 'market',
        // Sin OCO
      };

      // ACT
      const result = validator.validate(order);

      // ASSERT
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
